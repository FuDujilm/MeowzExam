import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:percent_indicator/percent_indicator.dart';

class DashboardWidget extends StatelessWidget {
  final int totalQuestions;
  final int completedQuestions;
  final int dailyGoal;
  final int dailyProgress;
  final List<int> weeklyProgress; // 7 days of question counts

  const DashboardWidget({
    super.key,
    required this.totalQuestions,
    required this.completedQuestions,
    required this.dailyGoal,
    required this.dailyProgress,
    this.weeklyProgress = const [5, 12, 0, 20, 8, 15, 10], // Mock data
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // 1. Overall Progress (Circular)
        Row(
          children: [
            Expanded(
              child: Card(
                elevation: 2,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Total Progress',
                          style: TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 16),
                      Center(
                        child: CircularPercentIndicator(
                          radius: 50.0,
                          lineWidth: 8.0,
                          percent: (completedQuestions / totalQuestions).clamp(0.0, 1.0),
                          center: Text(
                            "${((completedQuestions / totalQuestions) * 100).toStringAsFixed(0)}%",
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          progressColor: Theme.of(context).colorScheme.primary,
                          backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                          circularStrokeCap: CircularStrokeCap.round,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Center(child: Text('$completedQuestions / $totalQuestions')),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            // 2. Daily Goal (Linear)
            Expanded(
              child: Card(
                elevation: 2,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Today\'s Goal',
                          style: TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 24),
                      LinearPercentIndicator(
                        lineHeight: 12.0,
                        percent: (dailyProgress / dailyGoal).clamp(0.0, 1.0),
                        progressColor: Colors.orange,
                        backgroundColor: Colors.orange.withOpacity(0.2),
                        barRadius: const Radius.circular(6),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        '$dailyProgress / $dailyGoal Questions',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      const SizedBox(height: 8),
                      if (dailyProgress >= dailyGoal)
                         const Text('🎉 Goal Reached!', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold))
                      else
                         Text('Keep going!', style: TextStyle(color: Colors.grey[600])),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        // 3. Weekly Trend (Chart)
        Card(
          elevation: 2,
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Weekly Activity',
                    style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 24),
                SizedBox(
                  height: 150,
                  child: BarChart(
                    BarChartData(
                      gridData: const FlGridData(show: false),
                      titlesData: FlTitlesData(
                        leftTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false),
                        ),
                        topTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false),
                        ),
                        rightTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false),
                        ),
                        bottomTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            getTitlesWidget: (double value, TitleMeta meta) {
                              const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
                              if (value.toInt() < days.length) {
                                return Padding(
                                  padding: const EdgeInsets.only(top: 8.0),
                                  child: Text(days[value.toInt()], style: const TextStyle(color: Colors.grey, fontSize: 12)),
                                );
                              }
                              return const SizedBox();
                            },
                          ),
                        ),
                      ),
                      borderData: FlBorderData(show: false),
                      barGroups: weeklyProgress.asMap().entries.map((e) {
                        return BarChartGroupData(
                          x: e.key,
                          barRods: [
                            BarChartRodData(
                              toY: e.value.toDouble(),
                              color: e.value >= 10 ? Theme.of(context).colorScheme.primary : Theme.of(context).colorScheme.primary.withOpacity(0.5),
                              width: 12,
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                            ),
                          ],
                        );
                      }).toList(),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
