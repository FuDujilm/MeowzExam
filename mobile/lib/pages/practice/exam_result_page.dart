import 'package:flutter/material.dart';
import 'package:percent_indicator/percent_indicator.dart';

class ExamResultPage extends StatelessWidget {
  final int score;
  final int correctCount;
  final int totalQuestions;
  final int timeSpent; // in seconds
  final bool? passed;
  final List<dynamic>? detailedResults;

  const ExamResultPage({
    super.key,
    required this.score,
    required this.correctCount,
    required this.totalQuestions,
    required this.timeSpent,
    this.passed,
    this.detailedResults,
  });

  String _formatTime(int seconds) {
    final m = seconds ~/ 60;
    final s = seconds % 60;
    return '${m}m ${s}s';
  }

  @override
  Widget build(BuildContext context) {
    final hasTotal = totalQuestions > 0;
    final percent = hasTotal ? (correctCount / totalQuestions).clamp(0.0, 1.0) : (score / 100).clamp(0.0, 1.0);
    final percentLabel = (percent * 100).round();
    final displayScore = hasTotal ? '$correctCount/$totalQuestions' : '$score';
    final bool isPass = passed ?? (hasTotal ? (correctCount / totalQuestions) >= 0.6 : score >= 60); // 60% 及格

    return Scaffold(
      appBar: AppBar(title: const Text('考试结果')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const SizedBox(height: 24),
            CircularPercentIndicator(
              radius: 80.0,
              lineWidth: 12.0,
              percent: percent,
              center: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    '$percentLabel%',
                    style: const TextStyle(fontSize: 48, fontWeight: FontWeight.bold),
                  ),
                  Text(displayScore, style: const TextStyle(color: Colors.grey)),
                ],
              ),
              progressColor: isPass ? Colors.green : Colors.red,
              backgroundColor: Colors.grey[200]!,
              circularStrokeCap: CircularStrokeCap.round,
              animation: true,
            ),
            const SizedBox(height: 24),
            Text(
              isPass ? '恭喜！考试通过！' : '很遗憾，未通过',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: isPass ? Colors.green : Colors.red,
              ),
            ),
            const SizedBox(height: 48),
            
            // Stats Grid
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatItem(context, Icons.check_circle, '$correctCount', '答对', Colors.green),
                _buildStatItem(context, Icons.cancel, '${totalQuestions - correctCount}', '答错', Colors.red),
                _buildStatItem(context, Icons.timer, _formatTime(timeSpent), '用时', Colors.blue),
              ],
            ),

            if (detailedResults != null) ...[
               const SizedBox(height: 32),
               const Divider(),
               const SizedBox(height: 16),
               const Align(
                 alignment: Alignment.centerLeft,
                 child: Text('错题解析', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
               ),
               const SizedBox(height: 16),
               _buildWrongQuestionsList(context),
            ],

            const SizedBox(height: 64),
            
            SizedBox(
              width: double.infinity,
              height: 50,
              child: FilledButton(
                onPressed: () {
                  Navigator.of(context).pop(); // Go back to practice menu
                },
                child: const Text('返回菜单'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(BuildContext context, IconData icon, String value, String label, Color color) {
    return Column(
      children: [
        Icon(icon, color: color, size: 32),
        const SizedBox(height: 8),
        Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        Text(label, style: const TextStyle(color: Colors.grey)),
      ],
    );
  }

  Widget _buildWrongQuestionsList(BuildContext context) {
      final wrongQuestions = detailedResults!.where((r) => r['isCorrect'] == false).toList();
      
      if (wrongQuestions.isEmpty) {
          return const Center(child: Text('太棒了！没有错题。', style: TextStyle(color: Colors.green, fontSize: 16)));
      }

      return Column(
          children: wrongQuestions.map<Widget>((q) {
              final options = (q['options'] as List?) ?? [];
              final userAnswers = (q['userAnswer'] as List?)?.map((e) => e.toString()).toList() ?? [];
              final correctAnswers = (q['correctAnswers'] as List?)?.map((e) => e.toString()).toList() ?? [];
              
              String getOptionText(String id) {
                  final opt = options.firstWhere((o) => o['id'] == id, orElse: () => null);
                  // Only show ID (A/B..) if text is long, or show both?
                  // Usually just "A" is enough if user can see options, but here we might want to show text too.
                  // For simplicity, let's show "A. Option Text" if available.
                  return opt != null ? '${opt['id']}. ${opt['text']}' : id;
              }

              return Card(
                  margin: const EdgeInsets.only(bottom: 16),
                  child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                              Text('第 ${q['questionNumber']} 题', style: const TextStyle(color: Colors.grey)),
                              const SizedBox(height: 8),
                              Text(q['title'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                              const SizedBox(height: 12),
                              Text('你的答案: ${userAnswers.map(getOptionText).join(', ')}', 
                                   style: const TextStyle(color: Colors.red)),
                              Text('正确答案: ${correctAnswers.map(getOptionText).join(', ')}', 
                                   style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                              if (q['explanation'] != null) ...[
                                  const SizedBox(height: 8),
                                  Container(
                                      width: double.infinity,
                                      padding: const EdgeInsets.all(8),
                                      decoration: BoxDecoration(
                                        color: Colors.blue.withOpacity(0.05),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text('解析: ${q['explanation']}', style: const TextStyle(color: Colors.black87)),
                                  )
                              ]
                          ],
                      ),
                  ),
              );
          }).toList(),
      );
  }
}
