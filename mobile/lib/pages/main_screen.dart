import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import 'developer/developer_page.dart';
import 'home/home_page.dart';
import 'practice/practice_page.dart';
import 'profile/profile_page.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _selectedIndex = 0;
  bool _isLoggedIn = false;
  bool _authLoading = true;
  int _developerTapCount = 0;
  int _homePageVersion = 0;
  DateTime? _lastDeveloperTapAt;

  List<Widget> get _pages => <Widget>[
        HomePage(key: ValueKey(_homePageVersion)),
        const PracticePage(),
      ];

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  void initState() {
    super.initState();
    _loadAuthState();
  }

  Future<void> _loadAuthState() async {
    final isLoggedIn = await context.read<AuthService>().isLoggedIn();
    if (!mounted) return;
    setState(() {
      _isLoggedIn = isLoggedIn;
      _authLoading = false;
    });
  }

  Future<void> _login() async {
    try {
      await context.read<AuthService>().loginWithOAuth();
      if (!mounted) return;
      setState(() => _isLoggedIn = true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('登录成功')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('登录失败: $e'), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _logout() async {
    await context.read<AuthService>().logout();
    if (!mounted) return;
    setState(() => _isLoggedIn = false);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('已退出登录')),
    );
  }

  void _handleTitleTap() {
    final now = DateTime.now();
    final lastTapAt = _lastDeveloperTapAt;
    final isContinuous =
        lastTapAt != null && now.difference(lastTapAt).inMilliseconds <= 1200;

    _lastDeveloperTapAt = now;
    _developerTapCount = isContinuous ? _developerTapCount + 1 : 1;

    if (_developerTapCount >= 5) {
      _developerTapCount = 0;
      Navigator.of(context)
          .push(
        MaterialPageRoute(builder: (context) => const DeveloperPage()),
      )
          .then((_) {
        if (!mounted) return;
        setState(() => _homePageVersion++);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: _handleTitleTap,
          child: const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: Text('MeowzExam'),
          ),
        ),
        actions: [
          TextButton.icon(
            onPressed: () async {
              await Navigator.of(context).push(
                MaterialPageRoute(builder: (context) => const ProfilePage()),
              );
              if (mounted) {
                _loadAuthState();
              }
            },
            icon: const Icon(Icons.settings),
            label: const Text('设置'),
          ),
          if (_authLoading)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            )
          else if (_isLoggedIn)
            TextButton.icon(
              onPressed: _logout,
              icon: const Icon(Icons.logout),
              label: const Text('登出'),
            )
          else
            TextButton.icon(
              onPressed: _login,
              icon: const Icon(Icons.login),
              label: const Text('登录'),
            ),
        ],
      ),
      body: _pages[_selectedIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: _onItemTapped,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysHide,
        destinations: const <NavigationDestination>[
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: '首页',
          ),
          NavigationDestination(
            icon: Icon(Icons.assignment_outlined),
            selectedIcon: Icon(Icons.assignment),
            label: '练题',
          ),
        ],
      ),
    );
  }
}
