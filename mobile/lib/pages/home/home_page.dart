import 'package:flutter/material.dart';
import '../../widgets/dashboard_widget.dart';
import '../../services/user_settings_service.dart';
import 'leaderboard_page.dart';
import '../quiz/quiz_page.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final _userSettingsService = UserSettingsService();
  
  // Real Data
  int _checkInDays = 0;
  bool _isCheckedInToday = false;
  int _totalQuestions = 0;
  int _completedQuestions = 0;
  int _dailyGoal = 20; // Default
  int _dailyProgress = 0;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final stats = await _userSettingsService.getUserStats();
      setState(() {
        _totalQuestions = stats['totalQuestions'] ?? 1000; // Mock total if not returned
        _completedQuestions = stats['totalAnswered'] ?? 0;
        _dailyProgress = stats['todayAnswered'] ?? 0;
        // _checkInDays = stats['streak'] ?? 0; // If API provides streak
        _isLoading = false;
      });
    } catch (e) {
      print('Failed to load stats: $e');
      setState(() => _isLoading = false);
    }
  }

  void _handleCheckIn() {
    if (_isCheckedInToday) return;
    setState(() {
      _isCheckedInToday = true;
      _checkInDays++;
    });
    // TODO: Call API to check in
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Checked in successfully! +1 Day')),
    );
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
                           builder: (_) => const QuizPage(mode: 'random', libraryCode: 'A_CLASS'),
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
                onTap: (){},
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
