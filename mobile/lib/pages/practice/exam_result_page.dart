import 'package:flutter/material.dart';
import 'package:percent_indicator/percent_indicator.dart';

class ExamResultPage extends StatelessWidget {
  final int score;
  final int correctCount;
  final int totalQuestions;
  final int timeSpent; // in seconds

  const ExamResultPage({
    super.key,
    required this.score,
    required this.correctCount,
    required this.totalQuestions,
    required this.timeSpent,
  });

  String _formatTime(int seconds) {
    final m = seconds ~/ 60;
    final s = seconds % 60;
    return '${m}m ${s}s';
  }

  @override
  Widget build(BuildContext context) {
    final bool isPass = score >= 60; // Assuming 60% is pass

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
              percent: score / 100,
              center: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    '$score',
                    style: const TextStyle(fontSize: 48, fontWeight: FontWeight.bold),
                  ),
                  const Text('得分', style: TextStyle(color: Colors.grey)),
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
}
