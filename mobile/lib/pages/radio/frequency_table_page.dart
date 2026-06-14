import 'package:flutter/material.dart';

class FrequencyTablePage extends StatefulWidget {
  const FrequencyTablePage({super.key});

  @override
  State<FrequencyTablePage> createState() => _FrequencyTablePageState();
}

class _FrequencyTablePageState extends State<FrequencyTablePage> {
  int _selectedBand = 2;

  static const _bands = [
    _Band('全部', ''),
    _Band('80m', '3.500 - 3.900 MHz'),
    _Band('40m', '7.000 - 7.200 MHz'),
    _Band('20m', '14.000 - 14.350 MHz'),
    _Band('15m', '21.000 - 21.450 MHz'),
    _Band('10m', '28.000 - 29.700 MHz'),
  ];

  static const _rows = [
    _FrequencyRow('7.000', 'LSB', '下边带通话', Color(0xff4fd36b)),
    _FrequencyRow('7.030', 'LSB', 'DX 窗口', Color(0xff4fd36b)),
    _FrequencyRow('7.074', 'FT8', '常用数字频率', Color(0xffffa85a)),
    _FrequencyRow('7.100', 'LSB', '国内通联', Color(0xff4fd36b)),
    _FrequencyRow('7.150', 'LSB', '地区通话', Color(0xff4fd36b)),
    _FrequencyRow('7.175', 'PSK31', '数字模式', Color(0xff9b78ff)),
    _FrequencyRow('7.180', 'RTTY', '数字模式', Color(0xffff6fb4)),
    _FrequencyRow('7.190', 'FT8', '数字模式', Color(0xffffa85a)),
    _FrequencyRow('7.200', 'CW', 'CW 频段上限', Color(0xffffd557)),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xff061426),
      appBar: AppBar(
        backgroundColor: const Color(0xff071a31),
        foregroundColor: Colors.white,
        title: const Text('频率表'),
        actions: [
          IconButton(
            tooltip: '筛选',
            onPressed: () {},
            icon: const Icon(Icons.tune),
          ),
        ],
      ),
      body: Column(
        children: [
          _SegmentedTabs(
            tabs: const ['业余频段', '广播频段', '常用频率', '自定义'],
            selectedIndex: 0,
            onSelected: (_) {},
          ),
          SizedBox(
            height: 64,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              scrollDirection: Axis.horizontal,
              itemCount: _bands.length,
              separatorBuilder: (_, __) => const SizedBox(width: 10),
              itemBuilder: (context, index) {
                final selected = index == _selectedBand;
                return ChoiceChip(
                  selected: selected,
                  label: Text(_bands[index].name),
                  onSelected: (_) => setState(() => _selectedBand = index),
                  labelStyle: TextStyle(
                    color: selected ? Colors.white : const Color(0xffa8bad4),
                    fontWeight: FontWeight.w700,
                  ),
                  selectedColor: const Color(0xff2f7cff),
                  backgroundColor: const Color(0xff10243d),
                  side: BorderSide(
                    color: selected
                        ? const Color(0xff2f7cff)
                        : const Color(0xff1c3554),
                  ),
                );
              },
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 96),
              children: [
                _FrequencyCard(
                  title: '${_bands[_selectedBand].name} '
                      '(${_bands[_selectedBand].range})',
                  rows: _rows,
                ),
                const SizedBox(height: 14),
                const Text(
                  '* 频率数据仅供参考，请遵守当地法规。',
                  style: TextStyle(color: Color(0xff7f91ac), fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xff2f7cff),
        foregroundColor: Colors.white,
        onPressed: () {},
        icon: const Icon(Icons.star_border),
        label: const Text('收藏'),
      ),
    );
  }
}

class _SegmentedTabs extends StatelessWidget {
  final List<String> tabs;
  final int selectedIndex;
  final ValueChanged<int> onSelected;

  const _SegmentedTabs({
    required this.tabs,
    required this.selectedIndex,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 54,
      color: const Color(0xff071a31),
      child: Row(
        children: [
          for (var i = 0; i < tabs.length; i++)
            Expanded(
              child: InkWell(
                onTap: () => onSelected(i),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Text(
                      tabs[i],
                      style: TextStyle(
                        color: i == selectedIndex
                            ? const Color(0xff3f8cff)
                            : const Color(0xff91a2ba),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 12),
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      height: 3,
                      width: i == selectedIndex ? 72 : 0,
                      decoration: BoxDecoration(
                        color: const Color(0xff3f8cff),
                        borderRadius: BorderRadius.circular(999),
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
}

class _FrequencyCard extends StatelessWidget {
  final String title;
  final List<_FrequencyRow> rows;

  const _FrequencyCard({
    required this.title,
    required this.rows,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: const Color(0xff0b1d34),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xff1d385d)),
      ),
      child: Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            color: const Color(0xff173458),
            child: Text(
              title,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const _FrequencyHeader(),
          for (final row in rows) _FrequencyTile(row: row),
        ],
      ),
    );
  }
}

class _FrequencyHeader extends StatelessWidget {
  const _FrequencyHeader();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      color: const Color(0xff07182c),
      child: const Row(
        children: [
          Expanded(
            flex: 3,
            child: Text('频率 (MHz)', style: _headerStyle),
          ),
          Expanded(
            flex: 2,
            child: Text('模式', style: _headerStyle),
          ),
          Expanded(
            flex: 3,
            child: Text('用途 / 说明', style: _headerStyle),
          ),
        ],
      ),
    );
  }
}

class _FrequencyTile extends StatelessWidget {
  final _FrequencyRow row;

  const _FrequencyTile({required this.row});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: Color(0xff173052))),
      ),
      child: Row(
        children: [
          Expanded(
            flex: 3,
            child: Text(
              row.frequency,
              style: const TextStyle(
                color: Color(0xffd8e5fb),
                fontSize: 16,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          Expanded(
            flex: 2,
            child: Align(
              alignment: Alignment.centerLeft,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: row.color.withValues(alpha: 0.16),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: row.color.withValues(alpha: 0.42)),
                ),
                child: Text(
                  row.mode,
                  style: TextStyle(
                    color: row.color,
                    fontWeight: FontWeight.w900,
                    fontSize: 12,
                  ),
                ),
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              row.note,
              style: const TextStyle(
                color: Color(0xffaab9cf),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

const _headerStyle = TextStyle(
  color: Color(0xff8394ad),
  fontWeight: FontWeight.w700,
);

class _Band {
  final String name;
  final String range;

  const _Band(this.name, this.range);
}

class _FrequencyRow {
  final String frequency;
  final String mode;
  final String note;
  final Color color;

  const _FrequencyRow(this.frequency, this.mode, this.note, this.color);
}
