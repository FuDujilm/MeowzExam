import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../services/user_settings_service.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  final _userSettingsService = UserSettingsService();
  final _callsignController = TextEditingController();

  bool _isLoading = true;
  bool _isSaving = false;
  bool _isLoggedIn = false;
  bool _enableWrongQuestionWeight = false;
  double _dailyQuestionLimit = 10;
  String _examQuestionPreference = 'SYSTEM_PRESET';

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  @override
  void dispose() {
    _callsignController.dispose();
    super.dispose();
  }

  Future<void> _loadSettings() async {
    final isLoggedIn = await context.read<AuthService>().isLoggedIn();
    final settings = await _userSettingsService.getSettings();

    if (!mounted) return;
    setState(() {
      _isLoggedIn = isLoggedIn;
      _callsignController.text = settings['callsign'] as String? ?? '';
      _enableWrongQuestionWeight =
          settings['enableWrongQuestionWeight'] == true;
      final dailyTarget = settings['dailyPracticeTarget'];
      if (dailyTarget is num) {
        _dailyQuestionLimit = dailyTarget.toDouble().clamp(5, 50);
      }
      final preference = settings['examQuestionPreference'];
      if (preference == 'FULL_RANDOM' || preference == 'SYSTEM_PRESET') {
        _examQuestionPreference = preference as String;
      }
      _isLoading = false;
    });
  }

  Future<void> _saveSettings() async {
    setState(() => _isSaving = true);
    try {
      final learningPreferences = {
        'enableWrongQuestionWeight': _enableWrongQuestionWeight,
        'examQuestionPreference': _examQuestionPreference,
        'dailyPracticeTarget': _dailyQuestionLimit.round(),
      };

      await _userSettingsService.updateSettings(
        _isLoggedIn
            ? {
                ...learningPreferences,
                'callsign': _callsignController.text.trim(),
              }
            : learningPreferences,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('设置已保存')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('保存失败: $e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _isSaving = false);
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_isLoggedIn ? '个人设置' : '学习偏好')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              children: [
                if (_isLoggedIn) ...[
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
                              const Text('已登录账号',
                                  style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 18)),
                              Text('账号资料和 AI 偏好仅登录后展示',
                                  style: TextStyle(color: Colors.grey[600])),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Divider(),
                  ListTile(
                    leading: const Icon(Icons.badge),
                    title: const Text('电台呼号'),
                    subtitle: const Text('设置您的业余无线电呼号'),
                    trailing: SizedBox(
                      width: 120,
                      child: TextField(
                        controller: _callsignController,
                        textAlign: TextAlign.end,
                        decoration: const InputDecoration(
                            border: InputBorder.none, hintText: '未设置'),
                      ),
                    ),
                  ),
                ],
                const Divider(),
                const Padding(
                  padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: Text('学习偏好',
                      style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.deepPurple)),
                ),
                SwitchListTile(
                  secondary: const Icon(Icons.priority_high),
                  title: const Text('错题权重增强'),
                  subtitle: const Text('在随机练习中提高错题出现的概率'),
                  value: _enableWrongQuestionWeight,
                  onChanged: (val) =>
                      setState(() => _enableWrongQuestionWeight = val),
                ),
                ListTile(
                  leading: const Icon(Icons.shuffle),
                  title: const Text('模拟考试出题偏好'),
                  trailing: DropdownButton<String>(
                    value: _examQuestionPreference,
                    underline: const SizedBox(),
                    items: const [
                      DropdownMenuItem(
                          value: 'SYSTEM_PRESET', child: Text('系统预设')),
                      DropdownMenuItem(
                          value: 'FULL_RANDOM', child: Text('完全随机')),
                    ],
                    onChanged: (val) {
                      if (val != null) {
                        setState(() => _examQuestionPreference = val);
                      }
                    },
                  ),
                ),
                ListTile(
                  leading: const Icon(Icons.fitness_center),
                  title: const Text('每日练习题量'),
                  subtitle: Text('${_dailyQuestionLimit.round()} 题 / 天'),
                  trailing: SizedBox(
                    width: 120,
                    child: Slider(
                      value: _dailyQuestionLimit,
                      min: 5,
                      max: 50,
                      divisions: 9,
                      label: _dailyQuestionLimit.round().toString(),
                      onChanged: (val) =>
                          setState(() => _dailyQuestionLimit = val),
                    ),
                  ),
                ),
                if (_isLoggedIn) ...[
                  const Divider(),
                  const Padding(
                    padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
                    child: Text('AI 助手',
                        style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.deepPurple)),
                  ),
                  const ListTile(
                    leading: Icon(Icons.smart_toy),
                    title: Text('解析风格'),
                    subtitle: Text('移动端暂使用系统默认风格'),
                    trailing: Text('系统默认'),
                  ),
                ],
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: FilledButton.icon(
                    onPressed: _isSaving ? null : _saveSettings,
                    icon: _isSaving
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.save),
                    label: Text(_isSaving ? '保存中...' : '保存设置'),
                  ),
                ),
                if (_isLoggedIn)
                  ListTile(
                    leading: const Icon(Icons.logout, color: Colors.red),
                    title:
                        const Text('退出登录', style: TextStyle(color: Colors.red)),
                    onTap: _logout,
                  ),
                const SizedBox(height: 32),
                const Center(
                    child:
                        Text('版本 1.0.0', style: TextStyle(color: Colors.grey))),
                const SizedBox(height: 32),
              ],
            ),
    );
  }
}
