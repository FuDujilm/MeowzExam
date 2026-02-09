import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../pages/main_screen.dart'; // Just to get context if needed, though we navigate to Login
import '../../main.dart'; // For LoginPage navigation

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  // Mock Settings State
  bool _enableWrongQuestionWeight = false;
  double _dailyQuestionLimit = 20;
  String _aiStyle = 'Rigorous';
  bool _isDarkMode = false;
  
  // User Info Mock
  final _callsignController = TextEditingController(text: 'BI4XYZ');

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('设置')),
      body: ListView(
        children: [
          // 1. User Profile Header
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                const CircleAvatar(
                  radius: 32,
                  child: Icon(Icons.person, size: 32),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('用户名', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                      Text('user@example.com', style: TextStyle(color: Colors.grey[600])),
                    ],
                  ),
                ),
                IconButton(icon: const Icon(Icons.edit), onPressed: () {}),
              ],
            ),
          ),
          const Divider(),

          // 2. Personal Info
          ListTile(
            leading: const Icon(Icons.badge),
            title: const Text('电台呼号'),
            subtitle: const Text('设置您的业余无线电呼号'),
            trailing: SizedBox(
              width: 100,
              child: TextField(
                controller: _callsignController,
                textAlign: TextAlign.end,
                decoration: const InputDecoration(border: InputBorder.none, hintText: '未设置'),
              ),
            ),
          ),

          const Divider(),
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text('学习偏好', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.deepPurple)),
          ),

          SwitchListTile(
            secondary: const Icon(Icons.priority_high),
            title: const Text('优先错题'),
            subtitle: const Text('增加错题出现的概率'),
            value: _enableWrongQuestionWeight,
            onChanged: (val) => setState(() => _enableWrongQuestionWeight = val),
          ),
          
          ListTile(
            leading: const Icon(Icons.fitness_center),
            title: const Text('每日题量目标'),
            subtitle: Text('${_dailyQuestionLimit.toInt()} 题 / 天'),
            trailing: SizedBox(
              width: 120,
              child: Slider(
                value: _dailyQuestionLimit,
                min: 5,
                max: 50,
                divisions: 9,
                label: _dailyQuestionLimit.toInt().toString(),
                onChanged: (val) => setState(() => _dailyQuestionLimit = val),
              ),
            ),
          ),

          const Divider(),
           const Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text('AI 助手', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.deepPurple)),
          ),
          
          ListTile(
            leading: const Icon(Icons.smart_toy),
            title: const Text('解析风格'),
            trailing: DropdownButton<String>(
              value: _aiStyle,
              underline: const SizedBox(),
              items: ['Rigorous', 'Humorous', 'Encouraging'].map((e) => DropdownMenuItem(value: e, child: Text(e == 'Rigorous' ? '严谨' : (e == 'Humorous' ? '幽默' : '鼓励')))).toList(),
              onChanged: (val) => setState(() => _aiStyle = val!),
            ),
          ),

          const Divider(),
           const Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text('系统', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.deepPurple)),
          ),
          
          SwitchListTile(
            secondary: Icon(_isDarkMode ? Icons.dark_mode : Icons.light_mode),
            title: const Text('深色模式'),
            value: _isDarkMode,
            onChanged: (val) => setState(() => _isDarkMode = val),
          ),

          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text('退出登录', style: TextStyle(color: Colors.red)),
            onTap: () async {
              await context.read<AuthService>().logout();
              if (mounted) {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const LoginPage()),
                  (route) => false,
                );
              }
            },
          ),
          const SizedBox(height: 32),
          const Center(child: Text('版本 1.0.0', style: TextStyle(color: Colors.grey))),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}
