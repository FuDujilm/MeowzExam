import 'package:flutter/material.dart';
import '../quiz/quiz_page.dart';
import '../library/library_preview_page.dart';
import '../../services/user_settings_service.dart';
import '../../services/question_service.dart';
import '../../models/question_library.dart';

class PracticePage extends StatefulWidget {
  const PracticePage({super.key});

  @override
  State<PracticePage> createState() => _PracticePageState();
}

class _PracticePageState extends State<PracticePage> {
  final _userSettingsService = UserSettingsService();
  final _questionService = QuestionService();

  String _currentLibraryCode = 'A_CLASS';
  String _currentLibraryName = '加载中...';
  List<QuestionLibrary> _libraries = [];
  bool _isLoading = true;
  
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

      if (mounted) {
        setState(() {
          _libraries = libraries;
          _currentLibraryCode = initialCode;
          _currentLibraryName = initialName;
          _isLoading = false;
        });
      }
    } catch (e) {
      print('Failed to load settings: $e');
      if (mounted) setState(() => _isLoading = false);
    }
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

  void _showLibraryPicker(BuildContext context) async {
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
      });

      // Save preference
      try {
        await _userSettingsService.updateSettings({'examType': selected.code});
      } catch (e) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('保存设置失败: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return const Center(child: CircularProgressIndicator());

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
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const LibraryPreviewPage()),
              );
            },
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
