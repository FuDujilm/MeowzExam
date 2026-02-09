import 'package:flutter/material.dart';
import '../quiz/quiz_page.dart';

class PracticePage extends StatelessWidget {
  const PracticePage({super.key});

  void _navigateToQuiz(BuildContext context, String mode, {String libraryCode = 'A_CLASS'}) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => QuizPage(mode: mode, libraryCode: libraryCode),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          // 1. Library Selection
          Card(
            margin: const EdgeInsets.only(bottom: 16),
            child: ListTile(
              leading: const Icon(Icons.library_books),
              title: const Text('Current Library'),
              subtitle: const Text('Class A - Amateur Radio'),
              trailing: const Icon(Icons.change_circle_outlined),
              onTap: () {
                // Show library switcher
              },
            ),
          ),

          const Text('Core Practice', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          const SizedBox(height: 8),
          
          _PracticeModeTile(
            title: 'Sequential Practice',
            subtitle: 'Go through questions one by one',
            icon: Icons.list_alt,
            color: Colors.blue,
            onTap: () => _navigateToQuiz(context, 'sequential', libraryCode: 'A_CLASS'),
          ),
          _PracticeModeTile(
            title: 'Random Practice',
            subtitle: 'Shuffle questions for a challenge',
            icon: Icons.shuffle,
            color: Colors.purple,
            onTap: () => _navigateToQuiz(context, 'random', libraryCode: 'A_CLASS'),
          ),
          _PracticeModeTile(
            title: 'Mock Exam',
            subtitle: 'Simulate real exam conditions',
            icon: Icons.timer,
            color: Colors.red,
            onTap: () => _navigateToQuiz(context, 'mock', libraryCode: 'A_CLASS'),
          ),

          const SizedBox(height: 24),
          const Text('Focused Training', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          const SizedBox(height: 8),

          _PracticeModeTile(
            title: 'High Error Rate',
            subtitle: 'Focus on your weak spots',
            icon: Icons.warning_amber_rounded,
            color: Colors.orange,
            onTap: () {},
          ),
          _PracticeModeTile(
            title: 'Mistake Review',
            subtitle: 'Review questions you got wrong',
            icon: Icons.history_edu,
            color: Colors.teal,
            onTap: () {},
          ),
           _PracticeModeTile(
            title: 'Daily Selection',
            subtitle: '30 questions curated for today',
            icon: Icons.calendar_today,
            color: Colors.green,
            onTap: () {},
          ),

          const SizedBox(height: 24),
          const Text('Tools', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          const SizedBox(height: 8),
          
          _PracticeModeTile(
            title: 'Browse All Questions',
            subtitle: 'Search and filter the question bank',
            icon: Icons.search,
            color: Colors.grey,
            onTap: () {},
          ),
          _PracticeModeTile(
            title: 'Favorites',
            subtitle: 'Questions you saved',
            icon: Icons.bookmark,
            color: Colors.pink,
            onTap: () {},
          ),
           _PracticeModeTile(
            title: 'History',
            subtitle: 'Your past practice sessions',
            icon: Icons.history,
            color: Colors.blueGrey,
            onTap: () {},
          ),
        ],
      ),
    );
  }
}

class _PracticeModeTile extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _PracticeModeTile({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      color: Theme.of(context).colorScheme.surfaceContainer,
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: color),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}
