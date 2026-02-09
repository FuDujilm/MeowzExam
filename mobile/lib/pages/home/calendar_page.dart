import 'package:flutter/material.dart';
import '../../services/user_settings_service.dart';

class CalendarPage extends StatefulWidget {
  const CalendarPage({super.key});

  @override
  State<CalendarPage> createState() => _CalendarPageState();
}

class _CalendarPageState extends State<CalendarPage> {
  final _userSettingsService = UserSettingsService();
  DateTime _focusedDate = DateTime.now();
  Map<String, dynamic> _events = {}; // 'YYYY-MM-DD' -> record
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadEvents();
  }

  void _loadEvents() async {
    setState(() => _isLoading = true);
    try {
      // Load current month +/- 1 month to handle edge cases or scrolling (if implemented)
      // For simplicity, just load current month for now
      final start = DateTime(_focusedDate.year, _focusedDate.month, 1);
      final end = DateTime(_focusedDate.year, _focusedDate.month + 1, 0);
      
      final records = await _userSettingsService.getStudyCalendar(
        start.toIso8601String().split('T')[0],
        end.toIso8601String().split('T')[0],
      );

      final events = <String, dynamic>{};
      for (var r in records) {
        // r['date'] is expected to be 'YYYY-MM-DD' or ISO string
        // The API returns 'YYYY-MM-DD' if stored as string, or DateTime if prisma returns Date object.
        // Prisma `dailyPracticeRecord.date` is String.
        if (r['date'] != null) {
          events[r['date']] = r;
        }
      }

      if (mounted) {
        setState(() {
          _events = events;
          _isLoading = false;
        });
      }
    } catch (e) {
      print(e);
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _onMonthChanged(int offset) {
    setState(() {
      _focusedDate = DateTime(_focusedDate.year, _focusedDate.month + offset, 1);
    });
    _loadEvents();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('学习日历'),
      ),
      body: Column(
        children: [
          _buildHeader(),
          _buildWeekDays(),
          Expanded(child: _buildCalendarGrid()),
          _buildLegend(),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left),
            onPressed: () => _onMonthChanged(-1),
          ),
          Text(
            '${_focusedDate.year}年 ${_focusedDate.month}月',
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right),
            onPressed: () => _onMonthChanged(1),
          ),
        ],
      ),
    );
  }

  Widget _buildWeekDays() {
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    return Row(
      children: days.map((d) => Expanded(
        child: Center(
          child: Text(d, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
        ),
      )).toList(),
    );
  }

  Widget _buildCalendarGrid() {
    if (_isLoading) return const Center(child: CircularProgressIndicator());

    final daysInMonth = DateUtils.getDaysInMonth(_focusedDate.year, _focusedDate.month);
    final firstDay = DateTime(_focusedDate.year, _focusedDate.month, 1);
    // 0 for Sunday? DateUtils/DateTime weekday is 1(Mon)..7(Sun).
    // We want 0(Sun)..6(Sat) layout usually? Or 1(Mon)..7(Sun).
    // Chinese calendars usually start on Monday or Sunday. Let's use Sunday start (standard grid).
    // DateTime.weekday: Mon=1 ... Sun=7.
    // To make Sunday index 0: (weekday % 7).
    final offset = firstDay.weekday % 7; 

    return GridView.builder(
      padding: const EdgeInsets.all(8),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 7),
      itemCount: daysInMonth + offset,
      itemBuilder: (context, index) {
        if (index < offset) return const SizedBox();
        
        final day = index - offset + 1;
        final date = DateTime(_focusedDate.year, _focusedDate.month, day);
        final dateKey = "${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}";
        
        final event = _events[dateKey];
        final hasStudy = event != null && (event['questionCount'] as int? ?? 0) > 0;
        final isCompleted = event != null && (event['completed'] as bool? ?? false);

        Color? bgColor;
        Color? textColor;

        if (isCompleted) {
          bgColor = Colors.green;
          textColor = Colors.white;
        } else if (hasStudy) {
          bgColor = Colors.green.withOpacity(0.3);
          textColor = Colors.black;
        }

        // Today
        final now = DateTime.now();
        final isToday = date.year == now.year && date.month == now.month && date.day == now.day;
        if (isToday) {
          if (bgColor == null) {
             bgColor = Theme.of(context).primaryColor.withOpacity(0.1);
             textColor = Theme.of(context).primaryColor;
          }
        }

        return Container(
          margin: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: bgColor,
            shape: BoxShape.circle,
            border: isToday ? Border.all(color: Theme.of(context).primaryColor, width: 2) : null,
          ),
          alignment: Alignment.center,
          child: Text(
            '$day',
            style: TextStyle(
              color: textColor,
              fontWeight: (isToday || isCompleted) ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        );
      },
    );
  }

  Widget _buildLegend() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _legendItem(Colors.green, '目标达成'),
          const SizedBox(width: 16),
          _legendItem(Colors.green.withOpacity(0.3), '已练习'),
          const SizedBox(width: 16),
          _legendItem(Colors.transparent, '未学习', border: true),
        ],
      ),
    );
  }

  Widget _legendItem(Color color, String label, {bool border = false}) {
    return Row(
      children: [
        Container(
          width: 16,
          height: 16,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            border: border ? Border.all(color: Colors.grey) : null,
          ),
        ),
        const SizedBox(width: 8),
        Text(label),
      ],
    );
  }
}
