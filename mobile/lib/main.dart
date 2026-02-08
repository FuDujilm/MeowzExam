import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/constants.dart';
import 'services/auth_service.dart';
import 'pages/home_page.dart';
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
  final _emailController = TextEditingController();
  final _codeController = TextEditingController();
  bool _codeSent = false;
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

  Future<void> _sendCode() async {
    if (_emailController.text.isEmpty) {
      _showError('Please enter email');
      return;
    }

    setState(() => _isLoading = true);
    try {
      await context.read<AuthService>().sendCode(_emailController.text);
      setState(() => _codeSent = true);
      _showSuccess('Verification code sent!');
    } catch (e) {
      _showError(e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _login() async {
    if (_codeController.text.isEmpty) {
      _showError('Please enter verification code');
      return;
    }

    setState(() => _isLoading = true);
    try {
      final userData = await context.read<AuthService>().login(
            _emailController.text,
            _codeController.text,
          );
      if (mounted) {
        final user = User.fromJson(userData);
        _showSuccess('Welcome back, ${user.email}!');
        // Navigate to home page
         Navigator.of(context).pushReplacement(
           MaterialPageRoute(builder: (_) => HomePage(user: user)),
         );
      }
    } catch (e) {
      _showError(e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
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
           MaterialPageRoute(builder: (_) => HomePage(user: user)),
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
      appBar: AppBar(title: const Text('Login')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            TextField(
              controller: _emailController,
              decoration: const InputDecoration(
                labelText: 'Email',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 16),
            if (_codeSent) ...[
              TextField(
                controller: _codeController,
                decoration: const InputDecoration(
                  labelText: 'Verification Code',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _isLoading ? null : _login,
                  child: _isLoading
                      ? const CircularProgressIndicator()
                      : const Text('Login'),
                ),
              ),
            ] else ...[
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _isLoading ? null : _sendCode,
                  child: _isLoading
                      ? const CircularProgressIndicator()
                      : const Text('Send Verification Code'),
                ),
              ),
              const SizedBox(height: 24),
              const Row(
                children: [
                  Expanded(child: Divider()),
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16),
                    child: Text('OR'),
                  ),
                  Expanded(child: Divider()),
                ],
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _isLoading ? null : _loginWithOAuth,
                  icon: const Icon(Icons.login),
                  label: const Text('Login with OAuth (Web)'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
