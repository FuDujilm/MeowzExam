import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/question_service.dart';
import '../models/question.dart';
import '../models/user.dart';

class HomePage extends StatefulWidget {
  final User? user;
  const HomePage({super.key, this.user});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final _questionService = QuestionService();
  final List<Question> _questions = [];
  bool _isLoading = false;
  int _page = 1;
  bool _hasMore = true;
  String _currentLibrary = 'A_CLASS'; // Default, ideally from User settings

  @override
  void initState() {
    super.initState();
    if (widget.user?.selectedExamType != null) {
      _currentLibrary = widget.user!.selectedExamType!;
    }
    _loadQuestions();
  }

  Future<void> _loadQuestions() async {
    if (_isLoading || !_hasMore) return;

    setState(() => _isLoading = true);
    try {
      final newQuestions = await _questionService.getQuestions(
        libraryCode: _currentLibrary,
        page: _page,
      );

      if (mounted) {
        setState(() {
          if (newQuestions.isEmpty) {
            _hasMore = false;
          } else {
            _questions.addAll(newQuestions);
            _page++;
          }
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load questions: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('${_currentLibrary} Questions'),
        actions: [
          // Filter button placeholder
          IconButton(icon: const Icon(Icons.filter_list), onPressed: () {}),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          setState(() {
            _questions.clear();
            _page = 1;
            _hasMore = true;
          });
          await _loadQuestions();
        },
        child: ListView.separated(
          itemCount: _questions.length + (_hasMore ? 1 : 0),
          separatorBuilder: (context, index) => const Divider(),
          itemBuilder: (context, index) {
            if (index == _questions.length) {
              _loadQuestions(); // Simple infinite scroll
              return const Center(child: Padding(
                padding: EdgeInsets.all(8.0),
                child: CircularProgressIndicator(),
              ));
            }

            final question = _questions[index];
            return ListTile(
              leading: CircleAvatar(
                child: Text(question.type == 'CHOICE' ? 'C' : 'J'),
              ),
              title: Text(
                question.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              subtitle: Text('${question.externalId} • ${question.category ?? "General"}'),
              onTap: () {
                // Navigate to detail page (to be implemented)
              },
            );
          },
        ),
      ),
    );
  }
}
