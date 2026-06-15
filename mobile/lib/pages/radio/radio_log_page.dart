import 'package:flutter/material.dart';

import '../../models/exam_result.dart';
import '../../models/practice_history.dart';
import '../../models/qso_log.dart';
import '../../services/exam_service.dart';
import '../../services/local_database_service.dart';
import '../../services/question_service.dart';
import '../../services/user_settings_service.dart';

class RadioLogPage extends StatefulWidget {
  const RadioLogPage({super.key});

  @override
  State<RadioLogPage> createState() => _RadioLogPageState();
}

class _RadioLogPageState extends State<RadioLogPage> {
  final _settingsService = UserSettingsService();
  final _questionService = QuestionService();
  final _examService = ExamService();
  final _databaseService = LocalDatabaseService();

  DateTime _focusedMonth = DateTime(DateTime.now().year, DateTime.now().month);
  DateTime _selectedDate = DateTime.now();
  int _selectedTab = 0;
  bool _isLoading = true;
  Map<String, dynamic> _studyCalendar = {};
  List<PracticeSession> _practiceSessions = [];
  List<ExamResult> _examResults = [];
  List<QsoLog> _qsoLogs = [];

  @override
  void initState() {
    super.initState();
    _loadLogs();
  }

  Future<void> _loadLogs() async {
    setState(() => _isLoading = true);
    final monthStart = DateTime(_focusedMonth.year, _focusedMonth.month, 1);
    final monthEnd = DateTime(_focusedMonth.year, _focusedMonth.month + 1, 0);

    try {
      final results = await Future.wait([
        _settingsService.getStudyCalendar(
          _dateKey(monthStart),
          _dateKey(monthEnd),
        ),
        _questionService.getPracticeSessions(limit: 60),
        _examService.getExamHistory(),
        _databaseService.getQsoLogs(),
      ]);

      final studyMap = <String, dynamic>{};
      for (final record in results[0] as List<Map<String, dynamic>>) {
        final date = record['date'];
        if (date != null) {
          studyMap[date.toString().split('T').first] = record;
        }
      }

      if (!mounted) return;
      setState(() {
        _studyCalendar = studyMap;
        _practiceSessions = results[1] as List<PracticeSession>;
        _examResults = results[2] as List<ExamResult>;
        _qsoLogs = results[3] as List<QsoLog>;
        _isLoading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('日志加载失败: $error')),
      );
    }
  }

  Future<void> _openAddQsoSheet() async {
    final log = await showModalBottomSheet<QsoLog>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => _AddQsoSheet(initialDate: _selectedDate),
    );

    if (log == null) return;
    await _databaseService.insertQsoLog(log);
    if (!mounted) return;
    setState(() {
      _qsoLogs = [log, ..._qsoLogs]
        ..sort((a, b) => b.dateTime.compareTo(a.dateTime));
      _selectedDate = log.date;
      _focusedMonth = DateTime(log.date.year, log.date.month);
      _selectedTab = 0;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('已保存 ${log.callsign} 的通联记录')),
    );
  }

  void _changeMonth(int offset) {
    setState(() {
      _focusedMonth =
          DateTime(_focusedMonth.year, _focusedMonth.month + offset, 1);
      _selectedDate = DateTime(_focusedMonth.year, _focusedMonth.month, 1);
    });
    _loadLogs();
  }

  @override
  Widget build(BuildContext context) {
    final qsoCount = _qsoLogs.length;
    final studyCount = _practiceSessions.length + _examResults.length;

    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openAddQsoSheet,
        icon: const Icon(Icons.add),
        label: const Text('添加通联'),
      ),
      body: RefreshIndicator(
        onRefresh: _loadLogs,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 48, 18, 118),
          children: [
            _HeroHeader(
              qsoCount: qsoCount,
              studyCount: studyCount,
              onAddQso: _openAddQsoSheet,
            ),
            const SizedBox(height: 16),
            _CalendarPanel(
              focusedMonth: _focusedMonth,
              selectedDate: _selectedDate,
              studyCalendar: _studyCalendar,
              qsoLogs: _qsoLogs,
              onMonthChanged: _changeMonth,
              onDateSelected: (date) => setState(() => _selectedDate = date),
            ),
            const SizedBox(height: 16),
            _SegmentedTabs(
              selectedIndex: _selectedTab,
              onChanged: (index) => setState(() => _selectedTab = index),
            ),
            const SizedBox(height: 16),
            if (_isLoading)
              const Padding(
                padding: EdgeInsets.only(top: 56),
                child: Center(child: CircularProgressIndicator()),
              )
            else
              ..._buildSelectedTab(),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildSelectedTab() {
    return switch (_selectedTab) {
      0 => _buildQsoSection(),
      1 => _buildStudySection(),
      _ => [
          ..._buildQsoSection(),
          const SizedBox(height: 18),
          ..._buildStudySection(),
        ],
    };
  }

  List<Widget> _buildQsoSection() {
    final selectedLogs = _qsoLogs
        .where((log) => DateUtils.isSameDay(log.date, _selectedDate))
        .toList();

    return [
      _DayHeader(
        date: _selectedDate,
        trailing: '${selectedLogs.length} 条通联',
      ),
      const SizedBox(height: 10),
      if (selectedLogs.isEmpty)
        _EmptyStateCard(
          icon: Icons.radio,
          title: '当天暂无通联',
          subtitle: '点击右下角“添加通联”记录呼号、频率、模式和信号报告。',
          actionLabel: '添加通联',
          onAction: _openAddQsoSheet,
        )
      else
        ...selectedLogs.map((log) => _QsoLogCard(log: log)),
    ];
  }

  List<Widget> _buildStudySection() {
    final selectedSessions = _practiceSessions
        .where((session) => DateUtils.isSameDay(
              session.lastAnsweredAt.toLocal(),
              _selectedDate,
            ))
        .toList();
    final selectedExams = _examResults
        .where((exam) => DateUtils.isSameDay(
              exam.createdAt.toLocal(),
              _selectedDate,
            ))
        .toList();

    return [
      _DayHeader(
        date: _selectedDate,
        trailing: '${selectedSessions.length + selectedExams.length} 条学习',
      ),
      const SizedBox(height: 10),
      if (selectedSessions.isEmpty && selectedExams.isEmpty)
        const _EmptyStateCard(
          icon: Icons.menu_book,
          title: '当天暂无学习历史',
          subtitle: '练习题库或完成模拟考试后，学习记录会出现在这里。',
        )
      else ...[
        ...selectedSessions.map((session) => _StudyLogCard(session: session)),
        ...selectedExams.map((exam) => _ExamLogCard(exam: exam)),
      ],
    ];
  }
}

class _HeroHeader extends StatelessWidget {
  final int qsoCount;
  final int studyCount;
  final VoidCallback onAddQso;

  const _HeroHeader({
    required this.qsoCount,
    required this.studyCount,
    required this.onAddQso,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            scheme.primaryContainer,
            scheme.secondaryContainer.withValues(alpha: 0.82),
          ],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '日志',
                  style: TextStyle(
                    color: scheme.onPrimaryContainer,
                    fontSize: 40,
                    fontWeight: FontWeight.w900,
                    height: 1,
                  ),
                ),
              ),
              FilledButton.icon(
                onPressed: onAddQso,
                icon: const Icon(Icons.add),
                label: const Text('通联'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '日历、学习历史和通联日志集中管理',
            style: TextStyle(
              color: scheme.onPrimaryContainer.withValues(alpha: 0.76),
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: _HeroStat(
                  label: '通联日志',
                  value: '$qsoCount',
                  icon: Icons.radio,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _HeroStat(
                  label: '学习记录',
                  value: '$studyCount',
                  icon: Icons.history_edu,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HeroStat extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;

  const _HeroStat({
    required this.label,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: scheme.surface.withValues(alpha: 0.72),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.5)),
      ),
      child: Row(
        children: [
          Icon(icon, color: scheme.primary),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: TextStyle(
                    color: scheme.onSurface,
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                Text(label, style: TextStyle(color: scheme.onSurfaceVariant)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CalendarPanel extends StatelessWidget {
  final DateTime focusedMonth;
  final DateTime selectedDate;
  final Map<String, dynamic> studyCalendar;
  final List<QsoLog> qsoLogs;
  final ValueChanged<int> onMonthChanged;
  final ValueChanged<DateTime> onDateSelected;

  const _CalendarPanel({
    required this.focusedMonth,
    required this.selectedDate,
    required this.studyCalendar,
    required this.qsoLogs,
    required this.onMonthChanged,
    required this.onDateSelected,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return _SurfaceCard(
      padding: const EdgeInsets.fromLTRB(14, 16, 14, 16),
      child: Column(
        children: [
          Row(
            children: [
              IconButton(
                onPressed: () => onMonthChanged(-1),
                icon: const Icon(Icons.chevron_left),
              ),
              Expanded(
                child: Text(
                  '${focusedMonth.year}年 ${focusedMonth.month}月',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: scheme.onSurface,
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              IconButton(
                onPressed: () => onMonthChanged(1),
                icon: const Icon(Icons.chevron_right),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Row(
            children: [
              _WeekdayCell('日'),
              _WeekdayCell('一'),
              _WeekdayCell('二'),
              _WeekdayCell('三'),
              _WeekdayCell('四'),
              _WeekdayCell('五'),
              _WeekdayCell('六'),
            ],
          ),
          const SizedBox(height: 8),
          _CalendarGrid(
            focusedMonth: focusedMonth,
            selectedDate: selectedDate,
            studyCalendar: studyCalendar,
            qsoLogs: qsoLogs,
            onDateSelected: onDateSelected,
          ),
          const SizedBox(height: 14),
          const Wrap(
            alignment: WrapAlignment.center,
            spacing: 18,
            runSpacing: 8,
            children: [
              _LegendDot(color: Color(0xff20d174), label: '通联'),
              _LegendDot(color: Color(0xff3889ff), label: '学习'),
              _LegendDot(color: Color(0xffffb547), label: '混合'),
            ],
          ),
        ],
      ),
    );
  }
}

class _CalendarGrid extends StatelessWidget {
  final DateTime focusedMonth;
  final DateTime selectedDate;
  final Map<String, dynamic> studyCalendar;
  final List<QsoLog> qsoLogs;
  final ValueChanged<DateTime> onDateSelected;

  const _CalendarGrid({
    required this.focusedMonth,
    required this.selectedDate,
    required this.studyCalendar,
    required this.qsoLogs,
    required this.onDateSelected,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final daysInMonth =
        DateUtils.getDaysInMonth(focusedMonth.year, focusedMonth.month);
    final firstDay = DateTime(focusedMonth.year, focusedMonth.month, 1);
    final offset = firstDay.weekday % 7;
    final totalCells = ((daysInMonth + offset + 6) ~/ 7) * 7;

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: totalCells,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 7,
        mainAxisSpacing: 6,
        crossAxisSpacing: 6,
      ),
      itemBuilder: (context, index) {
        if (index < offset || index >= daysInMonth + offset) {
          return const SizedBox();
        }

        final day = index - offset + 1;
        final date = DateTime(focusedMonth.year, focusedMonth.month, day);
        final selected = DateUtils.isSameDay(date, selectedDate);
        final key = _dateKey(date);
        final hasStudy = studyCalendar.containsKey(key);
        final hasQso =
            qsoLogs.any((log) => DateUtils.isSameDay(log.date, date));
        final markerColor = hasStudy && hasQso
            ? const Color(0xffffb547)
            : hasQso
                ? const Color(0xff20d174)
                : const Color(0xff3889ff);

        return InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => onDateSelected(date),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 160),
            decoration: BoxDecoration(
              color: selected ? scheme.primary : Colors.transparent,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: selected ? scheme.primary : scheme.outlineVariant,
                width: selected ? 0 : 0.7,
              ),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  '$day',
                  style: TextStyle(
                    color: selected ? scheme.onPrimary : scheme.onSurface,
                    fontWeight: selected ? FontWeight.w900 : FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                if (hasQso || hasStudy)
                  _TinyDot(color: selected ? scheme.onPrimary : markerColor)
                else
                  const SizedBox(height: 6),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _SegmentedTabs extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onChanged;

  const _SegmentedTabs({
    required this.selectedIndex,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    const tabs = ['通联', '学习', '全部'];
    final scheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(5),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          for (var i = 0; i < tabs.length; i++)
            Expanded(
              child: InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: () => onChanged(i),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 160),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    color: i == selectedIndex ? scheme.primary : null,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Text(
                    tabs[i],
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: i == selectedIndex
                          ? scheme.onPrimary
                          : scheme.onSurfaceVariant,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _DayHeader extends StatelessWidget {
  final DateTime date;
  final String trailing;

  const _DayHeader({
    required this.date,
    required this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Row(
      children: [
        Expanded(
          child: Text(
            '${date.month}月${date.day}日 ${_weekdayName(date)}',
            style: TextStyle(
              color: scheme.onSurface,
              fontSize: 20,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
        Text(
          trailing,
          style: TextStyle(
            color: scheme.onSurfaceVariant,
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    );
  }
}

class _QsoLogCard extends StatelessWidget {
  final QsoLog log;

  const _QsoLogCard({required this.log});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return _TimelineCard(
      accentColor: const Color(0xff20d174),
      leading: _formatTime(log.time),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  log.callsign,
                  style: TextStyle(
                    color: scheme.onSurface,
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              _Pill(text: log.mode, color: const Color(0xff3889ff)),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '${log.country} · ${log.band} · ${log.frequency}',
            style: TextStyle(
              color: scheme.onSurfaceVariant,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _Pill(text: 'RST ${log.report}', color: const Color(0xff20d174)),
              if (log.grid.isNotEmpty)
                _Pill(text: log.grid, color: scheme.primary),
            ],
          ),
        ],
      ),
    );
  }
}

class _StudyLogCard extends StatelessWidget {
  final PracticeSession session;

  const _StudyLogCard({required this.session});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return _TimelineCard(
      accentColor: const Color(0xff3889ff),
      leading: _timeFromDate(session.lastAnsweredAt),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            session.modeName,
            style: TextStyle(
              color: scheme.onSurface,
              fontSize: 18,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '${session.libraryName ?? session.libraryCode ?? '题库'} · '
            '${session.correctCount}/${session.totalQuestions} 正确 · '
            '${session.accuracy.toStringAsFixed(1)}%',
            style: TextStyle(color: scheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

class _ExamLogCard extends StatelessWidget {
  final ExamResult exam;

  const _ExamLogCard({required this.exam});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final passed = exam.passed;
    return _TimelineCard(
      accentColor: passed ? const Color(0xff20d174) : const Color(0xffffb547),
      leading: _timeFromDate(exam.createdAt),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '${exam.libraryCode ?? '题库'} 模拟考试',
                  style: TextStyle(
                    color: scheme.onSurface,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              _Pill(
                text: passed ? '已合格' : '未合格',
                color:
                    passed ? const Color(0xff20d174) : const Color(0xffffb547),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '${exam.score} 分 · ${exam.correctCount}/${exam.totalQuestions} 正确'
            '${exam.timeSpent == null ? '' : ' · ${exam.timeSpent} 分钟'}',
            style: TextStyle(color: scheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

class _TimelineCard extends StatelessWidget {
  final Color accentColor;
  final String leading;
  final Widget child;

  const _TimelineCard({
    required this.accentColor,
    required this.leading,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return _SurfaceCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Text(
                leading,
                style: TextStyle(
                  color: accentColor,
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 10),
              Container(
                width: 4,
                height: 54,
                decoration: BoxDecoration(
                  color: accentColor,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            ],
          ),
          const SizedBox(width: 14),
          Expanded(child: child),
          Icon(Icons.chevron_right, color: scheme.onSurfaceVariant),
        ],
      ),
    );
  }
}

class _SurfaceCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;

  const _SurfaceCard({
    required this.child,
    this.padding,
    this.margin,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      margin: margin,
      padding: padding ?? const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.surfaceContainer,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.7)),
      ),
      child: child,
    );
  }
}

class _EmptyStateCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;

  const _EmptyStateCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return _SurfaceCard(
      child: Column(
        children: [
          Icon(icon, color: scheme.primary, size: 34),
          const SizedBox(height: 10),
          Text(
            title,
            style: TextStyle(
              color: scheme.onSurface,
              fontSize: 18,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: TextStyle(color: scheme.onSurfaceVariant),
          ),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: 14),
            FilledButton.icon(
              onPressed: onAction,
              icon: const Icon(Icons.add),
              label: Text(actionLabel!),
            ),
          ],
        ],
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  final String text;
  final Color color;

  const _Pill({
    required this.text,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.13),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.45)),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w900,
          fontSize: 12,
        ),
      ),
    );
  }
}

class _WeekdayCell extends StatelessWidget {
  final String text;

  const _WeekdayCell(this.text);

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Center(
        child: Text(
          text,
          style: TextStyle(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

class _LegendDot extends StatelessWidget {
  final Color color;
  final String label;

  const _LegendDot({
    required this.color,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _TinyDot(color: color),
        const SizedBox(width: 7),
        Text(
          label,
          style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
        ),
      ],
    );
  }
}

class _TinyDot extends StatelessWidget {
  final Color color;

  const _TinyDot({required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 6,
      height: 6,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    );
  }
}

class _AddQsoSheet extends StatefulWidget {
  final DateTime initialDate;

  const _AddQsoSheet({required this.initialDate});

  @override
  State<_AddQsoSheet> createState() => _AddQsoSheetState();
}

class _AddQsoSheetState extends State<_AddQsoSheet> {
  final _formKey = GlobalKey<FormState>();
  final _callsignController = TextEditingController();
  final _countryController = TextEditingController(text: '中国');
  final _frequencyController = TextEditingController(text: '14.074 MHz');
  final _reportController = TextEditingController(text: '59 / 59');
  final _gridController = TextEditingController();
  String _band = '20m';
  String _mode = 'FT8';
  late DateTime _date;
  late TimeOfDay _time;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _date = DateTime(
      widget.initialDate.year,
      widget.initialDate.month,
      widget.initialDate.day,
    );
    _time = TimeOfDay(hour: now.hour, minute: now.minute);
  }

  @override
  void dispose() {
    _callsignController.dispose();
    _countryController.dispose();
    _frequencyController.dispose();
    _reportController.dispose();
    _gridController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (picked != null) {
      setState(() => _date = picked);
    }
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _time,
    );
    if (picked != null) {
      setState(() => _time = picked);
    }
  }

  void _submit() {
    if (_formKey.currentState?.validate() != true) return;
    Navigator.of(context).pop(
      QsoLog(
        time: _time,
        callsign: _callsignController.text.trim().toUpperCase(),
        country: _countryController.text.trim(),
        band: _band,
        mode: _mode,
        frequency: _frequencyController.text.trim(),
        report: _reportController.text.trim(),
        grid: _gridController.text.trim().toUpperCase(),
        date: _date,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: EdgeInsets.only(
        left: 18,
        right: 18,
        top: 18,
        bottom: MediaQuery.of(context).viewInsets.bottom + 18,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 42,
                  height: 4,
                  decoration: BoxDecoration(
                    color: scheme.outlineVariant,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Text(
                '添加通联',
                style: TextStyle(
                  color: scheme.onSurface,
                  fontSize: 26,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '记录呼号、频率、模式、RST 和网格定位，数据仅保存到本地。',
                style: TextStyle(color: scheme.onSurfaceVariant),
              ),
              const SizedBox(height: 18),
              _QsoTextField(
                controller: _callsignController,
                label: '呼号',
                hint: '例如 BG7ABC',
                icon: Icons.badge,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return '请输入呼号';
                  }
                  return null;
                },
              ),
              Row(
                children: [
                  Expanded(
                    child: _QsoDropdown(
                      label: '频段',
                      value: _band,
                      values: const [
                        '160m',
                        '80m',
                        '40m',
                        '30m',
                        '20m',
                        '17m',
                        '15m',
                        '12m',
                        '10m',
                        '2m',
                        '70cm',
                      ],
                      onChanged: (value) => setState(() => _band = value),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _QsoDropdown(
                      label: '模式',
                      value: _mode,
                      values: const ['SSB', 'CW', 'FT8', 'RTTY', 'FM', 'AM'],
                      onChanged: (value) => setState(() => _mode = value),
                    ),
                  ),
                ],
              ),
              _QsoTextField(
                controller: _frequencyController,
                label: '频率',
                hint: '例如 14.074 MHz',
                icon: Icons.graphic_eq,
              ),
              Row(
                children: [
                  Expanded(
                    child: _QsoActionField(
                      label: '日期',
                      value: _formatDate(_date),
                      icon: Icons.calendar_month,
                      onTap: _pickDate,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _QsoActionField(
                      label: '时间',
                      value: _formatTime(_time),
                      icon: Icons.schedule,
                      onTap: _pickTime,
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  Expanded(
                    child: _QsoTextField(
                      controller: _reportController,
                      label: 'RST',
                      hint: '例如 59 / 59',
                      icon: Icons.signal_cellular_alt,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _QsoTextField(
                      controller: _gridController,
                      label: 'Grid',
                      hint: '例如 OL63xx',
                      icon: Icons.public,
                    ),
                  ),
                ],
              ),
              _QsoTextField(
                controller: _countryController,
                label: '国家 / 地区',
                hint: '例如 中国',
                icon: Icons.flag,
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _submit,
                  icon: const Icon(Icons.save),
                  label: const Text('保存通联'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QsoTextField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String hint;
  final IconData icon;
  final String? Function(String?)? validator;

  const _QsoTextField({
    required this.controller,
    required this.label,
    required this.hint,
    required this.icon,
    this.validator,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        controller: controller,
        validator: validator,
        textCapitalization: TextCapitalization.characters,
        decoration: InputDecoration(
          prefixIcon: Icon(icon),
          labelText: label,
          hintText: hint,
          filled: true,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
        ),
      ),
    );
  }
}

class _QsoDropdown extends StatelessWidget {
  final String label;
  final String value;
  final List<String> values;
  final ValueChanged<String> onChanged;

  const _QsoDropdown({
    required this.label,
    required this.value,
    required this.values,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: DropdownButtonFormField<String>(
        value: value,
        items: values
            .map((item) => DropdownMenuItem(value: item, child: Text(item)))
            .toList(),
        onChanged: (value) {
          if (value != null) {
            onChanged(value);
          }
        },
        decoration: InputDecoration(
          labelText: label,
          filled: true,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
        ),
      ),
    );
  }
}

class _QsoActionField extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final VoidCallback onTap;

  const _QsoActionField({
    required this.label,
    required this.value,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: InputDecorator(
          decoration: InputDecoration(
            prefixIcon: Icon(icon),
            labelText: label,
            filled: true,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
          ),
          child: Text(value),
        ),
      ),
    );
  }
}

String _dateKey(DateTime date) {
  String two(int value) => value.toString().padLeft(2, '0');
  return '${date.year}-${two(date.month)}-${two(date.day)}';
}

String _formatDate(DateTime date) {
  String two(int value) => value.toString().padLeft(2, '0');
  return '${date.year}-${two(date.month)}-${two(date.day)}';
}

String _formatTime(TimeOfDay time) {
  String two(int value) => value.toString().padLeft(2, '0');
  return '${two(time.hour)}:${two(time.minute)}';
}

String _timeFromDate(DateTime date) {
  final local = date.toLocal();
  String two(int value) => value.toString().padLeft(2, '0');
  return '${two(local.hour)}:${two(local.minute)}';
}

String _weekdayName(DateTime date) {
  const names = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
  return names[date.weekday - 1];
}
