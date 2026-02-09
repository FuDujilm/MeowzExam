import 'package:flutter/material.dart';
import '../quiz/quiz_page.dart';
import '../../services/user_settings_service.dart';

class PracticePage extends StatefulWidget {
  const PracticePage({super.key});

  @override
  State<PracticePage> createState() => _PracticePageState();
}

class _PracticePageState extends State<PracticePage> {
  String _currentLibraryCode = 'A_CLASS';
  String _currentLibraryName = 'Class A - Amateur Radio';
  
  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    // TODO: Fetch real user settings
    // For now, default to A_CLASS
  }

  void _navigateToQuiz(BuildContext context, String mode, {String? libraryCode}) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => QuizPage(
            mode: mode, 
            libraryCode: libraryCode ?? _currentLibraryCode
        ),
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
              subtitle: Text(_currentLibraryName),
              trailing: const Icon(Icons.change_circle_outlined),
              onTap: () {
                _showLibraryPicker(context);
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
            onTap: () => _navigateToQuiz(context, 'sequential'),
          ),
          _PracticeModeTile(
            title: 'Random Practice',
            subtitle: 'Shuffle questions for a challenge',
            icon: Icons.shuffle,
            color: Colors.purple,
            onTap: () => _navigateToQuiz(context, 'random'),
          ),
          _PracticeModeTile(
            title: 'Mock Exam',
            subtitle: 'Simulate real exam conditions',
            icon: Icons.timer,
            color: Colors.red,
            onTap: () => _navigateToQuiz(context, 'mock'),
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

  void _showLibraryPicker(BuildContext context) {
      showModalBottomSheet(
          context: context, 
          builder: (context) {
              return Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                      ListTile(
                          title: const Text('Class A - Amateur Radio'),
                          onTap: () {
                              setState(() {
                                  _currentLibraryCode = 'A_CLASS';
                                  _currentLibraryName = 'Class A - Amateur Radio';
                              });
                              Navigator.pop(context);
                          },
                          selected: _currentLibraryCode == 'A_CLASS',
                      ),
                      ListTile(
                          title: const Text('Class B - Amateur Radio'),
                          onTap: () {
                              setState(() {
                                  _currentLibraryCode = 'B_CLASS';
                                  _currentLibraryName = 'Class B - Amateur Radio';
                              });
                              Navigator.pop(context);
                          },
                          selected: _currentLibraryCode == 'B_CLASS',
                      ),
                      ListTile(
                          title: const Text('Class C - Amateur Radio'),
                          onTap: () {
                              setState(() {
                                  _currentLibraryCode = 'C_CLASS';
                                  _currentLibraryName = 'Class C - Amateur Radio';
                              });
                              Navigator.pop(context);
                          },
                          selected: _currentLibraryCode == 'C_CLASS',
                      ),
                  ],
              );
          }
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
