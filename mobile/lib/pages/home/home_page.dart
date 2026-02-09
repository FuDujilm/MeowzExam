import 'package:flutter/material.dart';
import '../../widgets/dashboard_widget.dart';
import '../../services/user_settings_service.dart';
import '../../services/question_service.dart';
import '../../models/question_library.dart';
import 'leaderboard_page.dart';
import '../quiz/quiz_page.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final _userSettingsService = UserSettingsService();
  final _questionService = QuestionService();
  
  // Real Data
  int _checkInDays = 0;
  bool _isCheckedInToday = false;
  int _totalQuestions = 0;
  int _completedQuestions = 0;
  int _dailyGoal = 20; // Default
  int _dailyProgress = 0;
  bool _isLoading = true;

  // Library Selection
  List<QuestionLibrary> _libraries = [];
  String _currentLibraryCode = 'A_CLASS';
  String _currentLibraryName = '加载中...';

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      // 1. Fetch Libraries
      final libraries = await _questionService.getLibraries();
      
      // 2. Fetch User Settings
      final settings = await _userSettingsService.getSettings();
      final savedExamType = settings['examType'] as String?;
      
      // 3. Determine current library
      String initialCode = savedExamType ?? 'A_CLASS';
      String initialName = 'A类题库'; // Fallback
      
      if (libraries.isNotEmpty) {
        // Check if saved code exists in available libraries
        final match = libraries.where((l) => l.code == initialCode).firstOrNull;
        if (match != null) {
          initialName = match.name;
        } else {
          // If not found, default to first available
          initialCode = libraries.first.code;
          initialName = libraries.first.name;
        }
      }

      // 4. Fetch Stats & Check-in
      final stats = await _userSettingsService.getUserStats();
      final checkInStatus = await _userSettingsService.getCheckInStatus();
      
      if (mounted) {
        setState(() {
          _libraries = libraries;
          _currentLibraryCode = initialCode;
          _currentLibraryName = initialName;
          
          _totalQuestions = stats['totalQuestions'] ?? 0;
          _completedQuestions = stats['totalAnswered'] ?? 0;
          _dailyProgress = stats['todayAnswered'] ?? 0;
          _checkInDays = checkInStatus['currentStreak'] ?? 0;
          _isCheckedInToday = checkInStatus['hasCheckedIn'] ?? false;
          _isLoading = false;
        });
      }
    } catch (e) {
      print('Failed to load stats: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _handleLibraryChange() async {
    if (_libraries.isEmpty) return;

    final QuestionLibrary? selected = await showModalBottomSheet<QuestionLibrary>(
      context: context,
      builder: (context) {
        return Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('选择题库', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              Expanded(
                child: ListView.builder(
                  itemCount: _libraries.length,
                  itemBuilder: (context, index) {
                    final lib = _libraries[index];
                    return ListTile(
                      title: Text(lib.name),
                      subtitle: Text('${lib.totalQuestions} 题'),
                      trailing: lib.code == _currentLibraryCode ? const Icon(Icons.check, color: Colors.blue) : null,
                      onTap: () => Navigator.pop(context, lib),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );

    if (selected != null && selected.code != _currentLibraryCode) {
      setState(() {
        _currentLibraryCode = selected.code;
        _currentLibraryName = selected.name;
        _isLoading = true; // Reload stats for new library
      });

      // Save preference
      try {
        await _userSettingsService.updateSettings({'examType': selected.code});
        // Reload stats to reflect new library context if backend stats are library-specific
        // (Currently stats are global, but good practice to reload)
        _loadData(); 
      } catch (e) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('保存设置失败: $e')));
        setState(() => _isLoading = false);
      }
    }
  }


  void _handleCheckIn() async {
    if (_isCheckedInToday) return;
    
    try {
      final result = await _userSettingsService.checkIn();
      if (result['success'] == true) {
        if (mounted) {
          setState(() {
            _isCheckedInToday = true;
            _checkInDays = result['streak'] ?? (_checkInDays + 1);
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('签到成功! ${result['bonusReason'] ?? ''} 积分 +${result['points']}')),
          );
        }
      } else {
        throw Exception(result['error'] ?? 'Check-in failed');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('签到失败: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 0. Library Selector
            Card(
              elevation: 0,
              color: Theme.of(context).colorScheme.surfaceContainerHighest.withOpacity(0.5),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: BorderSide(color: Theme.of(context).colorScheme.outlineVariant),
              ),
              child: ListTile(
                leading: const Icon(Icons.library_books),
                title: const Text('当前题库'),
                subtitle: Text(_currentLibraryName),
                trailing: const Icon(Icons.swap_horiz),
                onTap: _handleLibraryChange,
              ),
            ),
            const SizedBox(height: 16),

            // 1. Header Card with Check-in
            Card(
              color: Theme.of(context).colorScheme.primaryContainer,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '坚持就是胜利!',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                color: Theme.of(context).colorScheme.onPrimaryContainer,
                              ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '连续打卡 $_checkInDays 天',
                          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.onPrimaryContainer,
                              ),
                        ),
                      ],
                    ),
                    const Spacer(),
                    FilledButton.icon(
                      onPressed: _isCheckedInToday ? null : _handleCheckIn,
                      icon: Icon(_isCheckedInToday ? Icons.check : Icons.touch_app),
                      label: Text(_isCheckedInToday ? '已签到' : '签到'),
                      style: FilledButton.styleFrom(
                        backgroundColor: Theme.of(context).colorScheme.primary,
                        foregroundColor: Theme.of(context).colorScheme.onPrimary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // 2. Dashboard
            Text(
              '学习进度',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            DashboardWidget(
              totalQuestions: _totalQuestions,
              completedQuestions: _completedQuestions,
              dailyGoal: _dailyGoal,
              dailyProgress: _dailyProgress,
            ),
            const SizedBox(height: 24),

            // 3. Shortcuts
            Text(
              '快捷入口',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _ShortcutCard(
                    icon: Icons.flash_on,
                    title: '每日一练',
                    color: Colors.orange,
                    onTap: () {
                       Navigator.of(context).push(
                         MaterialPageRoute(
                           builder: (_) => QuizPage(mode: 'random', libraryCode: _currentLibraryCode),
                         ),
                       );
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _ShortcutCard(
                    icon: Icons.leaderboard,
                    title: '排行榜',
                    color: Colors.blue,
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const LeaderboardPage()),
                      );
                    },
                  ),
                ),
              ],
            ),
             const SizedBox(height: 12),
            // Optional: Calendar or other info
             Card(
              child: ListTile(
                leading: const Icon(Icons.calendar_today),
                title: const Text('学习日历'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('学习日历功能开发中，敬请期待!')),
                  );
                },
              ),
             )
          ],
        ),
      ),
    );
  }
}

class _ShortcutCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final Color color;
  final VoidCallback onTap;

  const _ShortcutCard({
    required this.icon,
    required this.title,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 24.0, horizontal: 16.0),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, size: 32, color: color),
              ),
              const SizedBox(height: 12),
              Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
            ],
          ),
        ),
      ),
    );
  }
}
