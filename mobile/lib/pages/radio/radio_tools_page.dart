import 'package:flutter/material.dart';

import '../home/calendar_page.dart';
import '../practice/practice_page.dart';
import 'frequency_table_page.dart';
import 'radio_placeholder_page.dart';
import 'radio_theme.dart';

class RadioToolsPage extends StatefulWidget {
  const RadioToolsPage({super.key});

  @override
  State<RadioToolsPage> createState() => _RadioToolsPageState();
}

class _RadioToolsPageState extends State<RadioToolsPage> {
  int _categoryIndex = 0;

  final _categories = const ['常用', '计算', '频率', '传播', '日志', '考试', '其他'];

  @override
  Widget build(BuildContext context) {
    final tools = _tools(context);
    final colors = radioThemeColors(context);

    return Scaffold(
      backgroundColor: colors.page,
      appBar: AppBar(
        backgroundColor: colors.appBar,
        foregroundColor: colors.text,
        title: const Text('工具'),
        actions: [
          IconButton(
            tooltip: '统计',
            onPressed: () {},
            icon: const Icon(Icons.query_stats),
          ),
        ],
      ),
      body: Row(
        children: [
          Container(
            width: 96,
            color: colors.panel,
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(vertical: 16),
              itemCount: _categories.length,
              itemBuilder: (context, index) {
                final selected = index == _categoryIndex;
                return InkWell(
                  onTap: () => setState(() => _categoryIndex = index),
                  child: Container(
                    height: 62,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      border: Border(
                        left: BorderSide(
                          color: selected
                              ? const Color(0xff3f8cff)
                              : Colors.transparent,
                          width: 3,
                        ),
                      ),
                    ),
                    child: Text(
                      _categories[index],
                      style: TextStyle(
                        color: selected
                            ? colors.text
                            : colors.muted,
                        fontWeight:
                            selected ? FontWeight.w900 : FontWeight.w700,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 110),
              itemCount: tools.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) => _ToolRow(tool: tools[index]),
            ),
          ),
        ],
      ),
    );
  }

  List<_RadioTool> _tools(BuildContext context) {
    return [
      _RadioTool(
        '呼号查询',
        '查询电台信息、B站/QRZ 数据',
        Icons.search,
        const Color(0xff347cff),
        () => _openPlaceholder(context, '呼号查询', Icons.search),
      ),
      _RadioTool(
        'QTH 定位',
        '经纬度与 Maidenhead 网格定位',
        Icons.public,
        const Color(0xff5b73ff),
        () => _openPlaceholder(context, 'QTH 定位', Icons.public),
      ),
      _RadioTool(
        '频率表',
        '业余频段划分与常用频率',
        Icons.radio,
        const Color(0xff38c77b),
        () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const FrequencyTablePage()),
        ),
      ),
      _RadioTool(
        '卫星追踪',
        '实时卫星位置与过境预报',
        Icons.satellite_alt,
        const Color(0xff3f8cff),
        () => _openPlaceholder(context, '卫星追踪', Icons.satellite_alt),
      ),
      _RadioTool(
        '天线计算器',
        '天线长度、增益等计算工具',
        Icons.settings_input_antenna,
        const Color(0xffef9743),
        () => _openPlaceholder(context, '天线计算器', Icons.settings_input_antenna),
      ),
      _RadioTool(
        '声码器',
        'CTCSS / DCS / DTCS 查询',
        Icons.graphic_eq,
        const Color(0xff7357d9),
        () => _openPlaceholder(context, '声码器', Icons.graphic_eq),
      ),
      _RadioTool(
        '传播预测',
        'HF 传播预测与电离层数据',
        Icons.cloud_queue,
        const Color(0xff4bc987),
        () => _openPlaceholder(context, '传播预测', Icons.cloud_queue),
      ),
      _RadioTool(
        '考试题库',
        'CRAC 题库、模拟考试与错题回顾',
        Icons.assignment,
        const Color(0xffffa33c),
        () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const PracticePage()),
        ),
      ),
      _RadioTool(
        '学习日历',
        '练习记录与活跃天数',
        Icons.calendar_month,
        const Color(0xff34aadc),
        () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const CalendarPage()),
        ),
      ),
    ];
  }

  void _openPlaceholder(BuildContext context, String title, IconData icon) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => RadioPlaceholderPage(
          title: title,
          icon: icon,
          subtitle: '$title 功能正在接入，当前版本先提供统一入口。',
        ),
      ),
    );
  }
}

class _ToolRow extends StatelessWidget {
  final _RadioTool tool;

  const _ToolRow({required this.tool});

  @override
  Widget build(BuildContext context) {
    final colors = radioThemeColors(context);
    return Material(
      color: colors.panelAlt,
      borderRadius: BorderRadius.circular(16),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: tool.onTap,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: colors.border),
          ),
          child: Row(
            children: [
              Container(
                width: 54,
                height: 54,
                decoration: BoxDecoration(
                  color: tool.color,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(tool.icon, color: Colors.white, size: 30),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tool.title,
                      style: TextStyle(
                        color: colors.text,
                        fontSize: 17,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      tool.subtitle,
                      style: TextStyle(color: colors.muted),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: colors.muted),
            ],
          ),
        ),
      ),
    );
  }
}

class _RadioTool {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _RadioTool(
    this.title,
    this.subtitle,
    this.icon,
    this.color,
    this.onTap,
  );
}
