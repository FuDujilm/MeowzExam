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
              title: const Text('当前题库'),
              subtitle: Text(_currentLibraryName),
              trailing: const Icon(Icons.change_circle_outlined),
              onTap: () {
                _showLibraryPicker(context);
              },
            ),
          ),

          const Text('核心练习', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          const SizedBox(height: 8),
          
          _PracticeModeTile(
            title: '顺序练习',
            subtitle: '按照顺序逐一练习',
            icon: Icons.list_alt,
            color: Colors.blue,
            onTap: () => _navigateToQuiz(context, 'sequential'),
          ),
          _PracticeModeTile(
            title: '随机练习',
            subtitle: '随机抽取题目进行练习',
            icon: Icons.shuffle,
            color: Colors.purple,
            onTap: () => _navigateToQuiz(context, 'random'),
          ),
          _PracticeModeTile(
            title: '模拟考试',
            subtitle: '全真模拟考试环境',
            icon: Icons.timer,
            color: Colors.red,
            onTap: () => _navigateToQuiz(context, 'mock'),
          ),

          const SizedBox(height: 24),
          const Text('专项强化', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          const SizedBox(height: 8),

          _PracticeModeTile(
            title: '高频错题',
            subtitle: '针对薄弱环节进行强化',
            icon: Icons.warning_amber_rounded,
            color: Colors.orange,
            onTap: () {},
          ),
          _PracticeModeTile(
            title: '错题回顾',
            subtitle: '查看并复习做错的题目',
            icon: Icons.history_edu,
            color: Colors.teal,
            onTap: () {},
          ),
           _PracticeModeTile(
            title: '每日精选',
            subtitle: '每日 30 道精选题目',
            icon: Icons.calendar_today,
            color: Colors.green,
            onTap: () {},
          ),

          const SizedBox(height: 24),
          const Text('辅助工具', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          const SizedBox(height: 8),
          
          _PracticeModeTile(
            title: '浏览题库',
            subtitle: '搜索和查看所有题目',
            icon: Icons.search,
            color: Colors.grey,
            onTap: () {},
          ),
          _PracticeModeTile(
            title: '我的收藏',
            subtitle: '查看收藏的题目',
            icon: Icons.bookmark,
            color: Colors.pink,
            onTap: () {},
          ),
           _PracticeModeTile(
            title: '练习历史',
            subtitle: '查看过往练习记录',
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
                          title: const Text('A类 - 业余无线电台操作证书'),
                          onTap: () {
                              setState(() {
                                  _currentLibraryCode = 'A_CLASS';
                                  _currentLibraryName = 'A类 - 业余无线电台操作证书';
                              });
                              Navigator.pop(context);
                          },
                          selected: _currentLibraryCode == 'A_CLASS',
                      ),
                      ListTile(
                          title: const Text('B类 - 业余无线电台操作证书'),
                          onTap: () {
                              setState(() {
                                  _currentLibraryCode = 'B_CLASS';
                                  _currentLibraryName = 'B类 - 业余无线电台操作证书';
                              });
                              Navigator.pop(context);
                          },
                          selected: _currentLibraryCode == 'B_CLASS',
                      ),
                      ListTile(
                          title: const Text('C类 - 业余无线电台操作证书'),
                          onTap: () {
                              setState(() {
                                  _currentLibraryCode = 'C_CLASS';
                                  _currentLibraryName = 'C类 - 业余无线电台操作证书';
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
