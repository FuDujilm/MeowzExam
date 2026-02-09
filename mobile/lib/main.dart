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

  void _showEmailLoginDialog() {
    final emailController = TextEditingController();
    final codeController = TextEditingController();
    bool isSending = false;
    bool isLoggingIn = false;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('邮箱登录'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: emailController,
                decoration: const InputDecoration(
                  labelText: '邮箱',
                  prefixIcon: Icon(Icons.email),
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: codeController,
                      decoration: const InputDecoration(
                        labelText: '验证码',
                        prefixIcon: Icon(Icons.lock),
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                    ),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: isSending ? null : () async {
                      if (emailController.text.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('请输入邮箱')));
                        return;
                      }
                      setState(() => isSending = true);
                      try {
                        await context.read<AuthService>().sendCode(emailController.text.trim());
                        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('验证码已发送')));
                      } catch (e) {
                        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('发送失败: $e')));
                      } finally {
                        setState(() => isSending = false);
                      }
                    },
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
                    ),
                    child: isSending 
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('获取'),
                  ),
                ],
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('取消'),
            ),
            FilledButton(
              onPressed: isLoggingIn ? null : () async {
                if (emailController.text.isEmpty || codeController.text.isEmpty) {
                  return;
                }
                setState(() => isLoggingIn = true);
                try {
                  final user = await context.read<AuthService>().login(
                    emailController.text.trim(),
                    codeController.text.trim(),
                  );
                  if (mounted) {
                    Navigator.pop(context); // Close dialog
                    _showSuccess('欢迎回来, ${user['name'] ?? 'User'}!');
                    Navigator.of(context).pushReplacement(
                      MaterialPageRoute(builder: (_) => const MainScreen()),
                    );
                  }
                } catch (e) {
                  if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('登录失败: $e')));
                } finally {
                  setState(() => isLoggingIn = false);
                }
              },
              child: isLoggingIn 
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('登录'),
            ),
          ],
        ),
      ),
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
        backgroundColor: Colors.deepPurple.shade50, // Make AppBar visible
        title: const Text('Login', style: TextStyle(fontSize: 16)),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings, color: Colors.deepPurple),
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
                        onPressed: _showEmailLoginDialog,
                        icon: const Icon(Icons.email),
                        label: const Text('邮箱验证码登录', style: TextStyle(fontSize: 18)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: OutlinedButton.icon(
                    onPressed: _loginWithOAuth,
                    icon: const Icon(Icons.login),
                    label: const Text('OAuth 统一认证登录', style: TextStyle(fontSize: 18)),
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
                const SizedBox(height: 24),
                // Fallback Settings Button
                OutlinedButton.icon(
                  onPressed: _showServerConfigDialog,
                  icon: const Icon(Icons.settings, size: 16),
                  label: const Text('服务器设置'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.grey,
                  ),
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
