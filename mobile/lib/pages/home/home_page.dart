import 'package:flutter/material.dart';
import '../../widgets/dashboard_widget.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  // Mock Data - In real app, this comes from a Provider/Service
  int _checkInDays = 5;
  bool _isCheckedInToday = false;

  void _handleCheckIn() {
    if (_isCheckedInToday) return;
    setState(() {
      _isCheckedInToday = true;
      _checkInDays++;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Checked in successfully! +1 Day')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SingleChildScrollView(
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
                          'Keep it up!',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                color: Theme.of(context).colorScheme.onPrimaryContainer,
                              ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '$_checkInDays Day Streak',
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
                      label: Text(_isCheckedInToday ? 'Done' : 'Check In'),
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
              'Your Progress',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            const DashboardWidget(
              totalQuestions: 1000,
              completedQuestions: 350,
              dailyGoal: 20,
              dailyProgress: 12,
            ),
            const SizedBox(height: 24),

            // 3. Shortcuts
            Text(
              'Quick Actions',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _ShortcutCard(
                    icon: Icons.flash_on,
                    title: 'Daily Practice',
                    color: Colors.orange,
                    onTap: () {
                       // Navigate to practice logic
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _ShortcutCard(
                    icon: Icons.leaderboard,
                    title: 'Leaderboard',
                    color: Colors.blue,
                    onTap: () {
                      // Navigate to leaderboard
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
                title: const Text('Study Calendar'),
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
