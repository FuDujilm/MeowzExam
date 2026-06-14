import 'package:flutter/material.dart';
import '../../models/practice_history.dart';
import '../../services/exam_service.dart';
import '../../services/question_service.dart';

class PracticeHistoryPage extends StatefulWidget {
  final String libraryCode;

  const PracticeHistoryPage({
    super.key,
    required this.libraryCode,
  });

  @override
  State<PracticeHistoryPage> createState() => _PracticeHistoryPageState();
}

class _PracticeHistoryPageState extends State<PracticeHistoryPage> {
  final _questionService = QuestionService();
  final _examService = ExamService();

  bool _isLoading = true;
  String? _error;
  List<PracticeSession> _sessions = [];
  List<ExamSummary> _examSummaries = [];

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      List<PracticeSession> sessions = [];
      List<ExamSummary> examSummaries = [];
      final errors = <String>[];

      try {
        sessions = await _questionService.getPracticeSessions(
          libraryCode: widget.libraryCode,
          limit: 30,
        );
      } catch (e) {
        errors.add('练题历史加载失败');
      }

      try {
        examSummaries = await _examService.getExamSummaries();
      } catch (e) {
        errors.add('模拟考试记录加载失败');
      }

      if (!mounted) return;
      setState(() {
        _sessions = sessions;
        _examSummaries = examSummaries;
        _error = errors.length >= 2 ? errors.join('，') : null;
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

  String _formatDateTime(DateTime value) {
    final local = value.toLocal();
    String two(int n) => n.toString().padLeft(2, '0');
    return '${two(local.month)}-${two(local.day)} ${two(local.hour)}:${two(local.minute)}';
  }

  Color _accuracyColor(double accuracy) {
    if (accuracy >= 80) return Colors.green;
    if (accuracy >= 60) return Colors.orange;
    return Colors.red;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('练习历史'),
        actions: [
          IconButton(
            onPressed: _loadHistory,
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
              FilledButton(onPressed: _loadHistory, child: const Text('重试')),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadHistory,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildReminderCard(),
          const SizedBox(height: 16),
          _buildExamSection(),
          const SizedBox(height: 24),
          _buildPracticeSection(),
        ],
      ),
    );
  }

  Widget _buildReminderCard() {
    return Card(
      elevation: 0,
      color: Colors.amber.withValues(alpha: 0.12),
      child: const Padding(
        padding: EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.tips_and_updates, color: Colors.amber),
            SizedBox(width: 12),
            Expanded(
              child: Text(
                '提醒：通常最近五次模拟考试内有及格记录时，参加正式考试更容易通过考试。',
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildExamSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '模拟考试',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        if (_examSummaries.isEmpty)
          const _EmptyCard(text: '暂无模拟考试记录')
        else
          ..._examSummaries.map((summary) {
            final latest = summary.latest;
            return Card(
              elevation: 0,
              color: Theme.of(context).colorScheme.surfaceContainer,
              margin: const EdgeInsets.only(bottom: 8),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            summary.libraryName ??
                                summary.libraryCode ??
                                summary.presetCode ??
                                '模拟考试',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        _StatusPill(
                          text: latest?.passed == true ? '合格' : '未合格',
                          color: latest?.passed == true
                              ? Colors.green
                              : Colors.red,
                        ),
                      ],
                    ),
                    if (latest != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        '最近一次：${latest.correctCount}/${latest.totalQuestions} · ${latest.score} 分',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                    const SizedBox(height: 8),
                    Text(
                      '最近五次及格 ${summary.recentFivePassed}/${summary.recentFiveTotal}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      summary.advice,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.amber[800],
                          ),
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }

  Widget _buildPracticeSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '练题历史',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        if (_sessions.isEmpty)
          const _EmptyCard(text: '暂无练题历史')
        else
          ..._sessions.map((session) {
            final color = _accuracyColor(session.accuracy);
            return Card(
              elevation: 0,
              color: Theme.of(context).colorScheme.surfaceContainer,
              margin: const EdgeInsets.only(bottom: 8),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: color.withValues(alpha: 0.12),
                      child: Icon(Icons.history, color: color),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            session.modeName,
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _formatDateTime(session.lastAnsweredAt),
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          const SizedBox(height: 6),
                          Text(
                            '总数 ${session.totalQuestions} · 正确 ${session.correctCount} · 错误 ${session.incorrectCount}',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                    _StatusPill(
                      text: '${session.accuracy.toStringAsFixed(1)}%',
                      color: color,
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }
}

class _StatusPill extends StatelessWidget {
  final String text;
  final Color color;

  const _StatusPill({
    required this.text,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.bold,
          fontSize: 12,
        ),
      ),
    );
  }
}

class _EmptyCard extends StatelessWidget {
  final String text;

  const _EmptyCard({required this.text});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      color: Theme.of(context).colorScheme.surfaceContainer,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Center(child: Text(text)),
      ),
    );
  }
}
