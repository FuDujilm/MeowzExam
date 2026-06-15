import 'package:flutter/material.dart';

import '../developer/developer_page.dart';
import '../home/calendar_page.dart';
import '../home/leaderboard_page.dart';
import '../practice/practice_page.dart';
import '../../models/practice_history.dart';
import '../../models/radio_profile.dart';
import '../../services/exam_service.dart';
import '../../services/local_database_service.dart';
import '../../services/user_settings_service.dart';
import 'frequency_table_page.dart';
import 'radio_placeholder_page.dart';
import 'radio_theme.dart';

class RadioHomePage extends StatefulWidget {
  const RadioHomePage({super.key});

  @override
  State<RadioHomePage> createState() => _RadioHomePageState();
}

class _RadioHomePageState extends State<RadioHomePage> {
  final _userSettingsService = UserSettingsService();
  final _examService = ExamService();
  final _databaseService = LocalDatabaseService();
  int _developerTapCount = 0;
  bool _examStatsLoading = true;
  int _todayAnswered = 0;
  int _weekAnswered = 0;
  double _weekAccuracy = 0;
  int _completedQuestions = 0;
  int _totalQuestions = 0;
  int _recentExamPassed = 0;
  int _recentExamTotal = 0;
  String _currentLibraryName = '题库';
  RadioProfile _radioProfile = RadioProfile.defaults;
  DateTime? _lastDeveloperTapAt;

  @override
  void initState() {
    super.initState();
    _loadExamStats();
  }

  Future<void> _loadExamStats() async {
    try {
      final settings = await _userSettingsService.getSettings();
      final radioProfile = await _databaseService.getRadioProfile();
      final remoteCallsign = settings['callsign'] as String?;
      final resolvedRadioProfile =
          remoteCallsign != null && remoteCallsign.trim().isNotEmpty
              ? radioProfile.copyWith(
                  callsign: remoteCallsign.trim().toUpperCase(),
                )
              : radioProfile;
      if (resolvedRadioProfile.callsign != radioProfile.callsign) {
        await _databaseService.saveRadioProfile(resolvedRadioProfile);
      }
      final libraryCode = settings['examType'] as String? ?? 'A_CLASS';
      final results = await Future.wait([
        _userSettingsService.getUserStats(),
        _userSettingsService.getLibraryStats(libraryCode),
        _examService.getExamSummaries(),
      ]);

      final userStats = results[0] as Map<String, dynamic>;
      final libraryStats = results[1] as Map<String, dynamic>;
      final examSummaries = results[2] as List<ExamSummary>;
      final examSummary = examSummaries.isNotEmpty ? examSummaries.first : null;

      if (!mounted) return;
      setState(() {
        _todayAnswered = (userStats['todayAnswered'] as num?)?.toInt() ?? 0;
        _weekAnswered = (userStats['weekAnswered'] as num?)?.toInt() ?? 0;
        _weekAccuracy =
            (userStats['weekAccuracy'] as num?)?.toDouble() ?? 0;
        _completedQuestions =
            (libraryStats['browsedCount'] as num?)?.toInt() ?? 0;
        _totalQuestions =
            (libraryStats['totalQuestions'] as num?)?.toInt() ?? 0;
        _currentLibraryName =
            libraryStats['libraryName'] as String? ?? libraryCode;
        _radioProfile = resolvedRadioProfile;
        _recentExamPassed = examSummary?.recentFivePassed ?? 0;
        _recentExamTotal = examSummary?.recentFiveTotal ?? 0;
        _examStatsLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _examStatsLoading = false);
    }
  }

  void _handleTitleTap() {
    final now = DateTime.now();
    final lastTapAt = _lastDeveloperTapAt;
    final isContinuous =
        lastTapAt != null && now.difference(lastTapAt).inMilliseconds <= 1200;

    _lastDeveloperTapAt = now;
    _developerTapCount = isContinuous ? _developerTapCount + 1 : 1;

    if (_developerTapCount >= 5) {
      _developerTapCount = 0;
      Navigator.of(context).push(
        MaterialPageRoute(builder: (context) => const DeveloperPage()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = radioThemeColors(context);

    return Scaffold(
      backgroundColor: colors.page,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            backgroundColor: colors.appBar,
            foregroundColor: colors.text,
            pinned: true,
            expandedHeight: 288,
            leading: IconButton(
              tooltip: '菜单',
              onPressed: () {},
              icon: const Icon(Icons.menu),
            ),
            actions: [
              IconButton(
                tooltip: '通知',
                onPressed: () {},
                icon: const Icon(Icons.notifications_none),
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: _HeroPanel(
                radioProfile: _radioProfile,
                onTitleTap: _handleTitleTap,
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(18, 18, 18, 110),
            sliver: SliverList(
              delegate: SliverChildListDelegate(
                [
                  _SectionHeader(
                    title: '常用工具',
                    action: '全部工具',
                    onTap: () {},
                  ),
                  const SizedBox(height: 12),
                  GridView.count(
                    physics: const NeverScrollableScrollPhysics(),
                    shrinkWrap: true,
                    crossAxisCount: 4,
                    crossAxisSpacing: 10,
                    mainAxisSpacing: 10,
                    childAspectRatio: 0.92,
                    children: [
                      _ToolTile(
                        title: '呼号查询',
                        icon: Icons.search,
                        color: const Color(0xff347cff),
                        onTap: () => _openPlaceholder(
                          context,
                          '呼号查询',
                          Icons.search,
                          '查询电台呼号、QTH 与基础资料。',
                        ),
                      ),
                      _ToolTile(
                        title: 'QTH 定位',
                        icon: Icons.public,
                        color: const Color(0xff6a6dff),
                        onTap: () => _openPlaceholder(
                          context,
                          'QTH 定位',
                          Icons.public,
                          '经纬度与 Maidenhead 网格定位工具。',
                        ),
                      ),
                      _ToolTile(
                        title: '频率表',
                        icon: Icons.radio,
                        color: const Color(0xff38c77b),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const FrequencyTablePage(),
                          ),
                        ),
                      ),
                      _ToolTile(
                        title: '考试题库',
                        icon: Icons.assignment,
                        color: const Color(0xffffa33c),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const PracticePage(),
                          ),
                        ),
                      ),
                      _ToolTile(
                        title: '天线计算',
                        icon: Icons.settings_input_antenna,
                        color: const Color(0xff2196f3),
                        onTap: () => _openPlaceholder(
                          context,
                          '天线计算',
                          Icons.settings_input_antenna,
                          '计算天线长度、增益与常见换算。',
                        ),
                      ),
                      _ToolTile(
                        title: '对讲计算',
                        icon: Icons.calculate,
                        color: const Color(0xffb26a2e),
                        onTap: () => _openPlaceholder(
                          context,
                          '对讲计算',
                          Icons.calculate,
                          '中继频差、亚音与常用参数计算。',
                        ),
                      ),
                      _ToolTile(
                        title: '通联日志',
                        icon: Icons.event_note,
                        color: const Color(0xffca5d9a),
                        onTap: () => _openPlaceholder(
                          context,
                          '通联日志',
                          Icons.event_note,
                          '记录 QSO、导出日志与同步统计。',
                        ),
                      ),
                      _ToolTile(
                        title: '学习日历',
                        icon: Icons.calendar_month,
                        color: const Color(0xff34aadc),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const CalendarPage(),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 22),
                  const _InfoGrid(),
                  const SizedBox(height: 22),
                  _SectionHeader(
                    title: '考试训练',
                    action: '进入题库',
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const PracticePage()),
                    ),
                  ),
                  const SizedBox(height: 12),
                  _ExamPanel(
                    isLoading: _examStatsLoading,
                    todayAnswered: _todayAnswered,
                    weekAnswered: _weekAnswered,
                    weekAccuracy: _weekAccuracy,
                    completedQuestions: _completedQuestions,
                    totalQuestions: _totalQuestions,
                    recentExamPassed: _recentExamPassed,
                    recentExamTotal: _recentExamTotal,
                    currentLibraryName: _currentLibraryName,
                    onPractice: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const PracticePage()),
                    ),
                    onLeaderboard: () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const LeaderboardPage(),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _openPlaceholder(
    BuildContext context,
    String title,
    IconData icon,
    String subtitle,
  ) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => RadioPlaceholderPage(
          title: title,
          icon: icon,
          subtitle: subtitle,
        ),
      ),
    );
  }
}

class _HeroPanel extends StatelessWidget {
  final RadioProfile radioProfile;
  final VoidCallback onTitleTap;

  const _HeroPanel({
    required this.radioProfile,
    required this.onTitleTap,
  });

  @override
  Widget build(BuildContext context) {
    final colors = radioThemeColors(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final titleColor = isDark ? Colors.white : colors.text;
    final heroGradient = isDark
        ? const [
            Color(0xff081a36),
            Color(0xff04375a),
            Color(0xff081426),
          ]
        : [
            colors.accent.withValues(alpha: 0.22),
            colors.page,
            colors.panelAlt,
          ];

    return Stack(
      fit: StackFit.expand,
      children: [
        DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: heroGradient,
            ),
          ),
        ),
        Positioned(
          right: -28,
          top: 54,
          child: Icon(
            Icons.settings_input_antenna,
            size: 210,
            color: colors.accent.withValues(alpha: isDark ? 0.08 : 0.11),
          ),
        ),
        Positioned(
          left: 28,
          right: 28,
          bottom: 22,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: onTitleTap,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Beacon',
                      style: TextStyle(
                        color: titleColor,
                        fontSize: 46,
                        fontWeight: FontWeight.w900,
                        height: 1.05,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Beacon业余无线电工具箱',
                style: TextStyle(
                  color: isDark ? const Color(0xffb4c7e3) : colors.muted,
                  letterSpacing: 0,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 18),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark
                      ? const Color(0xff07182c).withValues(alpha: 0.82)
                      : colors.panel.withValues(alpha: 0.92),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: isDark ? const Color(0xff214366) : colors.border,
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                radioProfile.callsign,
                                style: TextStyle(
                                  color: titleColor,
                                  fontSize: 22,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              SizedBox(width: 8),
                              Icon(Icons.circle,
                                  color: Color(0xff52dc62), size: 9),
                              SizedBox(width: 4),
                              Text('在线',
                                  style: TextStyle(
                                    color: isDark
                                        ? const Color(0xff9fc2e8)
                                        : colors.muted,
                                  )),
                            ],
                          ),
                          SizedBox(height: 8),
                          Text(
                            '${radioProfile.qth} · ${radioProfile.grid}',
                            style: TextStyle(
                              color: isDark
                                  ? const Color(0xff9fb1ca)
                                  : colors.muted,
                            ),
                          ),
                        ],
                      ),
                    ),
                    SizedBox(width: 16),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '业余电台执照',
                          style: TextStyle(color: Color(0xff5fed70)),
                        ),
                        SizedBox(height: 2),
                        Text(
                          radioProfile.licenseClass,
                          style: TextStyle(
                            color: Color(0xff6cff72),
                            fontSize: 26,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        Text(
                          radioProfile.licenseExpiry ==
                                  RadioProfile.defaults.licenseExpiry
                              ? radioProfile.licenseExpiry
                              : '${radioProfile.licenseExpiry} 到期',
                          style: TextStyle(
                            color: isDark
                                ? const Color(0xff8fa1bc)
                                : colors.muted,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final String action;
  final VoidCallback onTap;

  const _SectionHeader({
    required this.title,
    required this.action,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colors = radioThemeColors(context);

    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: TextStyle(
              color: colors.text,
              fontSize: 20,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
        TextButton(
          onPressed: onTap,
          child: Text(action),
        ),
      ],
    );
  }
}

class _ToolTile extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _ToolTile({
    required this.title,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colors = radioThemeColors(context);

    return Material(
      color: colors.panelAlt,
      borderRadius: BorderRadius.circular(16),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            border: Border.all(color: colors.border),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.92),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: Colors.white, size: 25),
              ),
              const SizedBox(height: 10),
              Text(
                title,
                maxLines: 2,
                textAlign: TextAlign.center,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: colors.text,
                  fontWeight: FontWeight.w800,
                  fontSize: 12,
                  height: 1.2,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoGrid extends StatelessWidget {
  const _InfoGrid();

  @override
  Widget build(BuildContext context) {
    return const Row(
      children: [
        Expanded(
          child: _MetricCard(
            title: '实时信息',
            value: '7.074.00',
            unit: 'MHz',
            chips: ['40m', 'FT8'],
            icon: Icons.graphic_eq,
          ),
        ),
        SizedBox(width: 12),
        Expanded(
          child: _MetricCard(
            title: '太阳活动',
            value: 'Kp 2',
            unit: 'SFI 156',
            chips: ['安静', 'HF 良好'],
            icon: Icons.wb_sunny,
          ),
        ),
      ],
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String title;
  final String value;
  final String unit;
  final List<String> chips;
  final IconData icon;

  const _MetricCard({
    required this.title,
    required this.value,
    required this.unit,
    required this.chips,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final colors = radioThemeColors(context);

    return Container(
      height: 150,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: colors.panelAlt,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    color: colors.text,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              Icon(icon, color: const Color(0xff55a4ff)),
            ],
          ),
          const Spacer(),
          Text(
            value,
            style: TextStyle(
              color: colors.text,
              fontSize: 25,
              fontWeight: FontWeight.w900,
            ),
          ),
          Text(unit, style: TextStyle(color: colors.muted)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            children: chips
                .map(
                  (chip) => Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: colors.accent.withValues(alpha: 0.14),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      chip,
                      style: TextStyle(
                        color: colors.accent,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                )
                .toList(),
          ),
        ],
      ),
    );
  }
}

class _ExamPanel extends StatelessWidget {
  final bool isLoading;
  final int todayAnswered;
  final int weekAnswered;
  final double weekAccuracy;
  final int completedQuestions;
  final int totalQuestions;
  final int recentExamPassed;
  final int recentExamTotal;
  final String currentLibraryName;
  final VoidCallback onPractice;
  final VoidCallback onLeaderboard;

  const _ExamPanel({
    required this.isLoading,
    required this.todayAnswered,
    required this.weekAnswered,
    required this.weekAccuracy,
    required this.completedQuestions,
    required this.totalQuestions,
    required this.recentExamPassed,
    required this.recentExamTotal,
    required this.currentLibraryName,
    required this.onPractice,
    required this.onLeaderboard,
  });

  @override
  Widget build(BuildContext context) {
    final colors = radioThemeColors(context);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: colors.panelAlt,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'CRAC 考试训练',
            style: TextStyle(
              color: colors.text,
              fontSize: 20,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            currentLibraryName,
            style: TextStyle(color: colors.muted, height: 1.4),
          ),
          const SizedBox(height: 14),
          if (isLoading)
            const LinearProgressIndicator()
          else
            Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: _ExamStatTile(
                        label: '今日答题',
                        value: '$todayAnswered',
                        unit: '题',
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _ExamStatTile(
                        label: '本周答题',
                        value: '$weekAnswered',
                        unit: '题',
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: _ExamStatTile(
                        label: '本周正确率',
                        value: '${weekAccuracy.toStringAsFixed(1)}%',
                        unit: '',
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _ExamStatTile(
                        label: '近五次合格',
                        value: '$recentExamPassed/$recentExamTotal',
                        unit: '',
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: LinearProgressIndicator(
                    value: totalQuestions == 0
                        ? 0
                        : (completedQuestions / totalQuestions)
                            .clamp(0, 1)
                            .toDouble(),
                    minHeight: 8,
                  ),
                ),
                const SizedBox(height: 6),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    '题库进度 $completedQuestions / $totalQuestions',
                    style: TextStyle(color: colors.muted),
                  ),
                ),
              ],
            ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: onPractice,
                  icon: const Icon(Icons.play_arrow),
                  label: const Text('开始练习'),
                ),
              ),
              const SizedBox(width: 10),
              IconButton.filledTonal(
                tooltip: '排行榜',
                onPressed: onLeaderboard,
                icon: const Icon(Icons.leaderboard),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ExamStatTile extends StatelessWidget {
  final String label;
  final String value;
  final String unit;

  const _ExamStatTile({
    required this.label,
    required this.value,
    required this.unit,
  });

  @override
  Widget build(BuildContext context) {
    final colors = radioThemeColors(context);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colors.panel,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: colors.muted,
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                value,
                style: TextStyle(
                  color: colors.text,
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
              ),
              if (unit.isNotEmpty) ...[
                const SizedBox(width: 4),
                Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: Text(
                    unit,
                    style: TextStyle(color: colors.muted),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
