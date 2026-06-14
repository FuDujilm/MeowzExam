import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:percent_indicator/percent_indicator.dart';

class DashboardWidget extends StatelessWidget {
  final int totalQuestions;
  final int completedQuestions;
  final int dailyGoal;
  final int dailyProgress;
  final List<int> weeklyProgress; // 7 days of question counts
  final List<double> weeklyAccuracy; // 7 days of accuracy percentages
  final int weekAnswered;
  final double weekAccuracy;
  final int activeDaysThisWeek;

  const DashboardWidget({
    super.key,
    required this.totalQuestions,
    required this.completedQuestions,
    required this.dailyGoal,
    required this.dailyProgress,
    this.weeklyProgress = const [], // No mock data by default
    this.weeklyAccuracy = const [],
    this.weekAnswered = 0,
    this.weekAccuracy = 0,
    this.activeDaysThisWeek = 0,
  });

  @override
  Widget build(BuildContext context) {
    // Fallback if data is empty
    final safeWeeklyProgress =
        weeklyProgress.isEmpty ? List.filled(7, 0) : weeklyProgress;
    final safeWeeklyAccuracy =
        weeklyAccuracy.isEmpty ? List.filled(7, 0) : weeklyAccuracy;

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
                      const Text('总进度',
                          style: TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 16),
                      Center(
                        child: CircularPercentIndicator(
                          radius: 50.0,
                          lineWidth: 8.0,
                          percent: totalQuestions > 0
                              ? (completedQuestions / totalQuestions)
                                  .clamp(0.0, 1.0)
                              : 0.0,
                          center: Text(
                            "${totalQuestions > 0 ? ((completedQuestions / totalQuestions) * 100).toStringAsFixed(0) : 0}%",
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          progressColor: Theme.of(context).colorScheme.primary,
                          backgroundColor: Theme.of(context)
                              .colorScheme
                              .surfaceContainerHighest,
                          circularStrokeCap: CircularStrokeCap.round,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Center(
                          child: Text('$completedQuestions / $totalQuestions')),
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
                      const Text('今日目标',
                          style: TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 24),
                      LinearPercentIndicator(
                        lineHeight: 12.0,
                        percent: dailyGoal > 0
                            ? (dailyProgress / dailyGoal).clamp(0.0, 1.0)
                            : 0.0,
                        progressColor: Colors.orange,
                        backgroundColor: Colors.orange.withValues(alpha: 0.2),
                        barRadius: const Radius.circular(6),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        '$dailyProgress / $dailyGoal 题',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      const SizedBox(height: 8),
                      if (dailyProgress >= dailyGoal && dailyGoal > 0)
                        const Text('🎉 目标达成!',
                            style: TextStyle(
                                color: Colors.green,
                                fontWeight: FontWeight.bold))
                      else
                        Text('继续加油!',
                            style: TextStyle(color: Colors.grey[600])),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Card(
          elevation: 2,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                Expanded(
                  child: _WeeklyMetric(
                    label: '本周答题',
                    value: '$weekAnswered',
                    suffix: '题',
                    icon: Icons.assignment_turned_in,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _WeeklyMetric(
                    label: '活跃天数',
                    value: '$activeDaysThisWeek',
                    suffix: '/ 7',
                    icon: Icons.local_fire_department,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _WeeklyMetric(
                    label: '周正确率',
                    value: weekAccuracy.toStringAsFixed(0),
                    suffix: '%',
                    icon: Icons.track_changes,
                  ),
                ),
              ],
            ),
          ),
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
                const Text('本周活跃度',
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
                              const days = ['一', '二', '三', '四', '五', '六', '日'];
                              if (value.toInt() < days.length) {
                                return Padding(
                                  padding: const EdgeInsets.only(top: 8.0),
                                  child: Text(days[value.toInt()],
                                      style: const TextStyle(
                                          color: Colors.grey, fontSize: 12)),
                                );
                              }
                              return const SizedBox();
                            },
                          ),
                        ),
                      ),
                      borderData: FlBorderData(show: false),
                      barGroups: safeWeeklyProgress.asMap().entries.map((e) {
                        return BarChartGroupData(
                          x: e.key,
                          barRods: [
                            BarChartRodData(
                              toY: e.value.toDouble(),
                              color: e.value >= 10
                                  ? Theme.of(context).colorScheme.primary
                                  : Theme.of(context)
                                      .colorScheme
                                      .primary
                                      .withValues(alpha: 0.5),
                              width: 12,
                              borderRadius: const BorderRadius.vertical(
                                  top: Radius.circular(4)),
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
        const SizedBox(height: 12),
        // 4. Weekly Accuracy (Line)
        Card(
          elevation: 2,
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('本周正确率',
                    style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 24),
                SizedBox(
                  height: 150,
                  child: LineChart(
                    LineChartData(
                      minY: 0,
                      maxY: 100,
                      gridData: const FlGridData(show: false),
                      borderData: FlBorderData(show: false),
                      titlesData: FlTitlesData(
                        leftTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            reservedSize: 32,
                            getTitlesWidget: (value, meta) {
                              if (value == 0 || value == 50 || value == 100) {
                                return Text('${value.toInt()}%',
                                    style: const TextStyle(
                                        color: Colors.grey, fontSize: 10));
                              }
                              return const SizedBox();
                            },
                          ),
                        ),
                        rightTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false),
                        ),
                        topTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false),
                        ),
                        bottomTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            getTitlesWidget: (double value, TitleMeta meta) {
                              const days = ['一', '二', '三', '四', '五', '六', '日'];
                              if (value.toInt() < days.length) {
                                return Padding(
                                  padding: const EdgeInsets.only(top: 8.0),
                                  child: Text(days[value.toInt()],
                                      style: const TextStyle(
                                          color: Colors.grey, fontSize: 12)),
                                );
                              }
                              return const SizedBox();
                            },
                          ),
                        ),
                      ),
                      lineBarsData: [
                        LineChartBarData(
                          spots: safeWeeklyAccuracy
                              .asMap()
                              .entries
                              .map((e) =>
                                  FlSpot(e.key.toDouble(), e.value.toDouble()))
                              .toList(),
                          isCurved: true,
                          barWidth: 3,
                          color: Theme.of(context).colorScheme.secondary,
                          dotData: const FlDotData(show: true),
                          belowBarData: BarAreaData(
                            show: true,
                            color: Theme.of(context)
                                .colorScheme
                                .secondary
                                .withValues(alpha: 0.1),
                          ),
                        ),
                      ],
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

class _WeeklyMetric extends StatelessWidget {
  final String label;
  final String value;
  final String suffix;
  final IconData icon;

  const _WeeklyMetric({
    required this.label,
    required this.value,
    required this.suffix,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 16, color: colorScheme.primary),
            const SizedBox(width: 4),
            Flexible(
              child: Text(
                label,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          textBaseline: TextBaseline.alphabetic,
          crossAxisAlignment: CrossAxisAlignment.baseline,
          children: [
            Text(
              value,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(width: 2),
            Text(
              suffix,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
            ),
          ],
        ),
      ],
    );
  }
}
