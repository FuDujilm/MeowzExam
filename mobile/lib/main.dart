import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/constants.dart';
import 'services/auth_service.dart';
import 'pages/main_screen.dart';
import 'models/user.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        Provider(create: (_) => AuthService()),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MeowzExam Mobile',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const LoginPage(),
    );
  }
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  bool _isLoading = false;

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );
  }

  void _showSuccess(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.green),
    );
  }

  void _showServerConfigDialog() async {
    final authService = context.read<AuthService>();
    String currentUrl = await authService.getApiUrl();
    final controller = TextEditingController(text: currentUrl);

    if (!mounted) return;

    showDialog(
      context: context,
      builder: (context) {
        bool isTesting = false;
        Map<String, dynamic>? testResult;

        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: const Text('配置服务器地址'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('请输入 API 地址 (例如 http://192.168.1.5:3001/api)', style: TextStyle(fontSize: 12, color: Colors.grey)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: controller,
                    decoration: const InputDecoration(
                      labelText: 'API URL',
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    ),
                    style: const TextStyle(fontSize: 14),
                  ),
                  const SizedBox(height: 16),
                  if (testResult != null)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: testResult!['success'] ? Colors.green.shade50 : Colors.red.shade50,
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: testResult!['success'] ? Colors.green.shade200 : Colors.red.shade200),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            testResult!['success'] ? '连接成功' : '连接失败',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: testResult!['success'] ? Colors.green[700] : Colors.red[700],
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${testResult!['message']}\n耗时: ${testResult!['latency']}ms',
                            style: TextStyle(fontSize: 12, color: testResult!['success'] ? Colors.green[900] : Colors.red[900]),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: isTesting ? null : () async {
                    setState(() => isTesting = true);
                    testResult = null;
                    
                    // Update URL temporarily/permanently to test
                    await authService.updateApiUrl(controller.text.trim());
                    
                    final result = await authService.checkConnectivity();
                    
                    if (context.mounted) {
                      setState(() {
                        isTesting = false;
                        testResult = result;
                      });
                    }
                  },
                  child: isTesting 
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) 
                    : const Text('测试连接'),
                ),
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('取消'),
                ),
                FilledButton(
                  onPressed: () async {
                    await authService.updateApiUrl(controller.text.trim());
                    if (mounted) {
                      Navigator.pop(context);
                      _showSuccess('服务器地址已保存，请重启 App 生效');
                    }
                  },
                  child: const Text('保存'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _loginWithOAuth() async {
    setState(() => _isLoading = true);
    try {
      final userData = await context.read<AuthService>().loginWithOAuth();
      if (mounted) {
        final user = User.fromJson(userData);
        _showSuccess('Welcome back, ${user.email}!');
        // Navigate to home page
         Navigator.of(context).pushReplacement(
           MaterialPageRoute(builder: (_) => const MainScreen()),
         );
      }
    } catch (e) {
      _showError(e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            tooltip: '配置服务器',
            onPressed: _showServerConfigDialog,
          ),
        ],
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.school, size: 80, color: Colors.deepPurple),
              const SizedBox(height: 24),
              Text(
                'MeowzExam',
                style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: Colors.deepPurple,
                    ),
              ),
              const SizedBox(height: 48),
              if (_isLoading)
                const CircularProgressIndicator()
              else
                Column(
                  children: [
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: FilledButton.icon(
                    onPressed: _loginWithOAuth,
                    icon: const Icon(Icons.login),
                    label: const Text('微信一键登录 (OAuth)', style: TextStyle(fontSize: 18)),
                  ),
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () {
                     Navigator.of(context).pushReplacement(
                       MaterialPageRoute(builder: (_) => const MainScreen()),
                     );
                  },
                  child: const Text('游客试用 (跳过登录)'),
                ),
              ],
            ),
        ],
      ),
        ),
      ),
    );
  }
}
