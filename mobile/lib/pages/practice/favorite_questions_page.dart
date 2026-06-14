import 'package:flutter/material.dart';
import '../../models/favorite_question.dart';
import '../../services/question_service.dart';
import '../quiz/quiz_page.dart';

class FavoriteQuestionsPage extends StatefulWidget {
  final String libraryCode;

  const FavoriteQuestionsPage({
    super.key,
    required this.libraryCode,
  });

  @override
  State<FavoriteQuestionsPage> createState() => _FavoriteQuestionsPageState();
}

class _FavoriteQuestionsPageState extends State<FavoriteQuestionsPage> {
  final _questionService = QuestionService();
  bool _isLoading = true;
  String? _error;
  List<FavoriteQuestion> _favorites = [];

  @override
  void initState() {
    super.initState();
    _loadFavorites();
  }

  Future<void> _loadFavorites() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final favorites = await _questionService.getFavorites();
      if (!mounted) return;
      setState(() {
        _favorites = favorites;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  String _formatQuestionType(String type) {
    switch (type) {
      case 'single_choice':
        return '单选';
      case 'multiple_choice':
        return '多选';
      case 'true_false':
        return '判断';
      default:
        return '题目';
    }
  }

  void _openQuestion(FavoriteQuestion item) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => QuizPage(
          mode: 'sequential',
          libraryCode: widget.libraryCode,
          startQuestionId: item.question.id,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('我的收藏'),
        actions: [
          IconButton(
            onPressed: _loadFavorites,
            icon: const Icon(Icons.refresh),
            tooltip: '刷新',
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 12),
              Text('加载失败：$_error', textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(onPressed: _loadFavorites, child: const Text('重试')),
            ],
          ),
        ),
      );
    }

    if (_favorites.isEmpty) {
      return const Center(child: Text('暂无收藏题目'));
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _favorites.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        final item = _favorites[index];
        return Card(
          elevation: 0,
          color: Theme.of(context).colorScheme.surfaceContainer,
          child: ListTile(
            onTap: () => _openQuestion(item),
            leading: const Icon(Icons.bookmark, color: Colors.pink),
            title: Text(
              '${item.question.externalId} · ${_formatQuestionType(item.question.questionType)}',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 4),
                Text(
                  item.question.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                if (item.question.category != null) ...[
                  const SizedBox(height: 6),
                  Text(
                    item.question.category!,
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                ],
              ],
            ),
            trailing: const Icon(Icons.chevron_right),
          ),
        );
      },
    );
  }
}
