import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/radio_profile.dart';
import '../../services/auth_service.dart';
import '../../services/local_data_backup_service.dart';
import '../../services/local_database_service.dart';
import '../../services/theme_controller.dart';
import '../../services/user_settings_service.dart';
import 'discovery_settings_page.dart';
import 'theme_page.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  final _userSettingsService = UserSettingsService();
  final _backupService = LocalDataBackupService();
  final _databaseService = LocalDatabaseService();
  final _callsignController = TextEditingController();
  final _qthController = TextEditingController();
  final _gridController = TextEditingController();
  final _licenseExpiryController = TextEditingController();

  bool _isLoading = true;
  bool _isSaving = false;
  bool _isLoggedIn = false;
  bool _enableWrongQuestionWeight = false;
  double _dailyQuestionLimit = 10;
  String _examQuestionPreference = 'SYSTEM_PRESET';
  String _licenseClass = 'A 级';

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  @override
  void dispose() {
    _callsignController.dispose();
    _qthController.dispose();
    _gridController.dispose();
    _licenseExpiryController.dispose();
    super.dispose();
  }

  Future<void> _loadSettings() async {
    final isLoggedIn = await context.read<AuthService>().isLoggedIn();
    final settings = await _userSettingsService.getSettings();
    final radioProfile = await _databaseService.getRadioProfile();
    final callsign =
        (settings['callsign'] as String?)?.trim().isNotEmpty == true
            ? settings['callsign'] as String
            : radioProfile.callsign;

    if (!mounted) return;
    setState(() {
      _isLoggedIn = isLoggedIn;
      _callsignController.text =
          callsign == RadioProfile.defaults.callsign ? '' : callsign;
      _qthController.text =
          radioProfile.qth == RadioProfile.defaults.qth ? '' : radioProfile.qth;
      _gridController.text = radioProfile.grid == RadioProfile.defaults.grid
          ? ''
          : radioProfile.grid;
      _licenseClass = radioProfile.licenseClass;
      _licenseExpiryController.text =
          radioProfile.licenseExpiry == RadioProfile.defaults.licenseExpiry
              ? ''
              : radioProfile.licenseExpiry;
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
      await _databaseService.saveRadioProfile(
        RadioProfile(
          callsign: _callsignController.text.trim().isEmpty
              ? RadioProfile.defaults.callsign
              : _callsignController.text.trim().toUpperCase(),
          qth: _qthController.text.trim().isEmpty
              ? RadioProfile.defaults.qth
              : _qthController.text.trim(),
          grid: _gridController.text.trim().isEmpty
              ? RadioProfile.defaults.grid
              : _gridController.text.trim().toUpperCase(),
          licenseClass: _licenseClass,
          licenseExpiry: _licenseExpiryController.text.trim().isEmpty
              ? RadioProfile.defaults.licenseExpiry
              : _licenseExpiryController.text.trim(),
        ),
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

  Future<void> _login() async {
    try {
      final user = await context.read<AuthService>().loginWithOAuth();
      final callsign = user['callsign'] as String?;
      if (callsign != null && callsign.trim().isNotEmpty) {
        final profile = await _databaseService.getRadioProfile();
        await _databaseService.saveRadioProfile(
          profile.copyWith(callsign: callsign.trim().toUpperCase()),
        );
      }
      if (!mounted) return;
      await _loadSettings();
      if (!mounted) return;
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

  Future<void> _exportLocalData() async {
    try {
      final path = await _backupService.exportToJsonFile();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('已导出到 $path')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('导出失败: $e'), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _importLocalData() async {
    try {
      await _backupService.importFromJsonFile();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('导入完成')),
      );
      await context.read<ThemeController>().load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('导入失败: $e'), backgroundColor: Colors.red),
      );
    }
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
                ],
                if (!_isLoggedIn)
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Card(
                      elevation: 0,
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          children: [
                            const CircleAvatar(
                              radius: 28,
                              child: Icon(Icons.person_outline, size: 30),
                            ),
                            const SizedBox(width: 16),
                            const Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '未登录',
                                    style: TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  SizedBox(height: 4),
                                  Text('登录后同步学习进度和考试记录'),
                                ],
                              ),
                            ),
                            FilledButton.icon(
                              onPressed: _login,
                              icon: const Icon(Icons.login),
                              label: const Text('登录'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                const Divider(),
                const _SectionTitle('电台资料'),
                ListTile(
                  leading: const Icon(Icons.badge),
                  title: const Text('电台呼号'),
                  subtitle: const Text('登录后优先同步账号呼号，也可手动修改'),
                  trailing: SizedBox(
                    width: 120,
                    child: TextField(
                      controller: _callsignController,
                      textAlign: TextAlign.end,
                      textCapitalization: TextCapitalization.characters,
                      decoration: const InputDecoration(
                        border: InputBorder.none,
                        hintText: '未设置',
                      ),
                    ),
                  ),
                ),
                ListTile(
                  leading: const Icon(Icons.place),
                  title: const Text('QTH'),
                  subtitle: const Text('所在地展示在首页资料卡'),
                  trailing: SizedBox(
                    width: 130,
                    child: TextField(
                      controller: _qthController,
                      textAlign: TextAlign.end,
                      decoration: const InputDecoration(
                        border: InputBorder.none,
                        hintText: '北京',
                      ),
                    ),
                  ),
                ),
                ListTile(
                  leading: const Icon(Icons.public),
                  title: const Text('Grid'),
                  subtitle: const Text('Maidenhead 网格定位'),
                  trailing: SizedBox(
                    width: 130,
                    child: TextField(
                      controller: _gridController,
                      textAlign: TextAlign.end,
                      textCapitalization: TextCapitalization.characters,
                      decoration: const InputDecoration(
                        border: InputBorder.none,
                        hintText: 'CN87uj',
                      ),
                    ),
                  ),
                ),
                ListTile(
                  leading: const Icon(Icons.workspace_premium),
                  title: const Text('执照等级'),
                  trailing: DropdownButton<String>(
                    value: _licenseClass,
                    underline: const SizedBox(),
                    items: const [
                      DropdownMenuItem(value: 'A 级', child: Text('A 级')),
                      DropdownMenuItem(value: 'B 级', child: Text('B 级')),
                      DropdownMenuItem(value: 'C 级', child: Text('C 级')),
                    ],
                    onChanged: (value) {
                      if (value != null) {
                        setState(() => _licenseClass = value);
                      }
                    },
                  ),
                ),
                ListTile(
                  leading: const Icon(Icons.event_available),
                  title: const Text('执照到期日'),
                  subtitle: const Text('例如 2027-05-01'),
                  trailing: SizedBox(
                    width: 130,
                    child: TextField(
                      controller: _licenseExpiryController,
                      textAlign: TextAlign.end,
                      decoration: const InputDecoration(
                        border: InputBorder.none,
                        hintText: '未设置',
                      ),
                    ),
                  ),
                ),
                const Divider(),
                ListTile(
                  leading: const Icon(Icons.palette),
                  title: const Text('主题'),
                  subtitle: const Text('主题模式、配色方案和自定义颜色'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const ThemePage()),
                  ),
                ),
                ListTile(
                  leading: const Icon(Icons.explore),
                  title: const Text('发现源配置'),
                  subtitle: const Text('地区推荐、资讯源、卫星过境 TLE'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const DiscoverySettingsPage(),
                    ),
                  ),
                ),
                const Divider(),
                const _SectionTitle('学习偏好'),
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
                  const _SectionTitle('AI 助手'),
                  const ListTile(
                    leading: Icon(Icons.smart_toy),
                    title: Text('解析风格'),
                    subtitle: Text('移动端暂使用系统默认风格'),
                    trailing: Text('系统默认'),
                  ),
                ],
                const Divider(),
                const _SectionTitle('本地数据'),
                ListTile(
                  leading: const Icon(Icons.upload_file),
                  title: const Text('导出本地数据'),
                  subtitle: const Text('导出通联日志等非考试本地数据'),
                  onTap: _exportLocalData,
                ),
                ListTile(
                  leading: const Icon(Icons.download),
                  title: const Text('导入本地数据'),
                  subtitle: const Text('从 Beacon JSON 备份恢复本地数据'),
                  onTap: _importLocalData,
                ),
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

class _SectionTitle extends StatelessWidget {
  final String title;

  const _SectionTitle(this.title);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Text(
        title,
        style: TextStyle(
          fontWeight: FontWeight.bold,
          color: Theme.of(context).colorScheme.primary,
        ),
      ),
    );
  }
}
