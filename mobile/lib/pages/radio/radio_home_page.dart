import 'package:flutter/material.dart';

import '../developer/developer_page.dart';
import '../home/calendar_page.dart';
import '../home/leaderboard_page.dart';
import '../practice/practice_page.dart';
import 'frequency_table_page.dart';
import 'radio_placeholder_page.dart';

class RadioHomePage extends StatefulWidget {
  const RadioHomePage({super.key});

  @override
  State<RadioHomePage> createState() => _RadioHomePageState();
}

class _RadioHomePageState extends State<RadioHomePage> {
  int _developerTapCount = 0;
  DateTime? _lastDeveloperTapAt;

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
    return Scaffold(
      backgroundColor: const Color(0xff061426),
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            backgroundColor: const Color(0xff071a31),
            foregroundColor: Colors.white,
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
              background: _HeroPanel(onTitleTap: _handleTitleTap),
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
  final VoidCallback onTitleTap;

  const _HeroPanel({required this.onTitleTap});

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color(0xff081a36),
                Color(0xff04375a),
                Color(0xff081426),
              ],
            ),
          ),
        ),
        Positioned(
          right: -28,
          top: 54,
          child: Icon(
            Icons.settings_input_antenna,
            size: 210,
            color: Colors.white.withValues(alpha: 0.08),
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
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '业余无线电',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 28,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    Text(
                      '工具箱',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 46,
                        fontWeight: FontWeight.w900,
                        height: 1.05,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'HAM RADIO TOOLBOX',
                style: TextStyle(
                  color: Color(0xffb4c7e3),
                  letterSpacing: 0,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 18),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xff07182c).withValues(alpha: 0.82),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xff214366)),
                ),
                child: const Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                'BG4FQK',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 22,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              SizedBox(width: 8),
                              Icon(Icons.circle,
                                  color: Color(0xff52dc62), size: 9),
                              SizedBox(width: 4),
                              Text('在线',
                                  style: TextStyle(color: Color(0xff9fc2e8))),
                            ],
                          ),
                          SizedBox(height: 8),
                          Text(
                            '北京 · CN87uj',
                            style: TextStyle(color: Color(0xff9fb1ca)),
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
                          'A 级',
                          style: TextStyle(
                            color: Color(0xff6cff72),
                            fontSize: 26,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        Text(
                          '2027-05-01 到期',
                          style: TextStyle(color: Color(0xff8fa1bc)),
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
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: const TextStyle(
              color: Colors.white,
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
    return Material(
      color: const Color(0xff0d2139),
      borderRadius: BorderRadius.circular(16),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            border: Border.all(color: const Color(0xff1d385d)),
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
                style: const TextStyle(
                  color: Color(0xffdce9fb),
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
    return Container(
      height: 150,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xff0d2139),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xff1d385d)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
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
            style: const TextStyle(
              color: Colors.white,
              fontSize: 25,
              fontWeight: FontWeight.w900,
            ),
          ),
          Text(unit, style: const TextStyle(color: Color(0xff91a2ba))),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            children: chips
                .map(
                  (chip) => Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xff173458),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      chip,
                      style: const TextStyle(
                        color: Color(0xff8ddcff),
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
  final VoidCallback onPractice;
  final VoidCallback onLeaderboard;

  const _ExamPanel({
    required this.onPractice,
    required this.onLeaderboard,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xff0d2139),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xff1d385d)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'CRAC 考试训练',
            style: TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            '题库练习、模拟考试、错题回顾和学习统计统一放在工具箱内。',
            style: TextStyle(color: Color(0xff91a2ba), height: 1.4),
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
