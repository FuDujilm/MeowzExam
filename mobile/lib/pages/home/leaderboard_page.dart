import 'package:flutter/material.dart';
import '../../services/user_settings_service.dart';

class LeaderboardPage extends StatefulWidget {
  const LeaderboardPage({super.key});

  @override
  State<LeaderboardPage> createState() => _LeaderboardPageState();
}

class _LeaderboardPageState extends State<LeaderboardPage> {
  final _userService = UserSettingsService();
  List<dynamic> _leaderboard = [];
  bool _isLoading = true;
  String _pointsName = '积分';

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final data = await _userService.getLeaderboard();
      if (mounted) {
        setState(() {
          _leaderboard = data['users'] as List<dynamic>? ?? [];
          _pointsName = data['pointsName'] as String? ?? '积分';
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('积分排行榜'),
        centerTitle: true,
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _leaderboard.isEmpty 
              ? const Center(child: Text('暂无排名数据'))
              : CustomScrollView(
                  slivers: [
                    SliverToBoxAdapter(
                      child: _buildTopThree(context),
                    ),
                    SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          // Items start from index 3 (4th place)
                          if (index + 3 >= _leaderboard.length) return null;
                          return _buildRankItem(context, _leaderboard[index + 3], index + 4);
                        },
                        childCount: _leaderboard.length > 3 ? _leaderboard.length - 3 : 0,
                      ),
                    ),
                    const SliverPadding(padding: EdgeInsets.only(bottom: 32)),
                  ],
                ),
    );
  }

  Widget _buildTopThree(BuildContext context) {
    if (_leaderboard.isEmpty) return const SizedBox.shrink();

    final first = _leaderboard.isNotEmpty ? _leaderboard[0] : null;
    final second = _leaderboard.length > 1 ? _leaderboard[1] : null;
    final third = _leaderboard.length > 2 ? _leaderboard[2] : null;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 32),
      decoration: BoxDecoration(
        color: Theme.of(context).primaryColor.withOpacity(0.05),
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(32),
          bottomRight: Radius.circular(32),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // 2nd Place
          if (second != null)
            Expanded(child: _buildPodiumItem(context, second, 2, Colors.grey.shade400, 140)),
          
          // 1st Place
          if (first != null)
            Expanded(flex: 1, child: _buildPodiumItem(context, first, 1, Colors.amber, 170)),
          
          // 3rd Place
          if (third != null)
            Expanded(child: _buildPodiumItem(context, third, 3, Colors.orangeAccent.shade100, 140)),
            
          // If less than 3 people, fill empty space
          if (second == null) const Spacer(),
          if (third == null && first != null) const Spacer(), 
        ],
      ),
    );
  }

  Widget _buildPodiumItem(BuildContext context, dynamic item, int rank, Color color, double height) {
    final name = item['name'] ?? 'Unknown';
    final points = item['points'] ?? 0;
    final streak = item['streak'] ?? 0;

    return Column(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        Stack(
          alignment: Alignment.topCenter,
          children: [
             Container(
               margin: const EdgeInsets.only(top: 8), // Space for crown
               decoration: BoxDecoration(
                 shape: BoxShape.circle,
                 border: Border.all(color: color, width: 3),
                 boxShadow: [
                   BoxShadow(
                     color: color.withOpacity(0.3),
                     blurRadius: 12,
                     offset: const Offset(0, 4),
                   )
                 ],
               ),
               child: CircleAvatar(
                 radius: rank == 1 ? 36 : 28,
                 backgroundColor: Theme.of(context).colorScheme.surface,
                 child: Text(
                   name.isNotEmpty ? name[0].toUpperCase() : '?',
                   style: TextStyle(
                     fontSize: rank == 1 ? 24 : 18,
                     fontWeight: FontWeight.bold,
                     color: Theme.of(context).colorScheme.onSurface,
                   ),
                 ),
               ),
             ),
             if (rank == 1)
               const Positioned(
                 top: 0,
                 child: Icon(Icons.emoji_events, color: Colors.amber, size: 24),
               ),
             Positioned(
               bottom: -8,
               child: Container(
                 padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                 decoration: BoxDecoration(
                   color: color,
                   borderRadius: BorderRadius.circular(12),
                 ),
                 child: Text(
                   '$rank',
                   style: const TextStyle(
                     color: Colors.white,
                     fontWeight: FontWeight.bold,
                     fontSize: 12,
                   ),
                 ),
               ),
             ),
          ],
        ),
        const SizedBox(height: 16),
        Text(
          name,
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: rank == 1 ? 16 : 14,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        const SizedBox(height: 4),
        Text(
          '$points',
          style: TextStyle(
            color: color,
            fontWeight: FontWeight.w900,
            fontSize: rank == 1 ? 20 : 16,
          ),
        ),
        Text(
          _pointsName,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 10),
        ),
        const SizedBox(height: 4),
        if (streak > 0)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: Colors.orange.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.orange.withOpacity(0.3)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.local_fire_department, size: 10, color: Colors.orange),
                const SizedBox(width: 2),
                Text(
                  '连签 $streak 天',
                  style: const TextStyle(fontSize: 10, color: Colors.orange),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildRankItem(BuildContext context, dynamic item, int rank) {
    final name = item['name'] ?? 'Unknown';
    final points = item['points'] ?? 0;
    final streak = item['streak'] ?? 0;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Theme.of(context).dividerColor.withOpacity(0.1)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            SizedBox(
              width: 30,
              child: Text(
                '$rank',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey,
                ),
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(width: 16),
            CircleAvatar(
              radius: 20,
              backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
              child: Text(
                name.isNotEmpty ? name[0].toUpperCase() : '?',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  if (streak > 0)
                    Row(
                      children: [
                        const Icon(Icons.local_fire_department, size: 14, color: Colors.orange),
                        const SizedBox(width: 4),
                        Text(
                          '连续签到 $streak 天',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.orange),
                        ),
                      ],
                    ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '$points',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                    color: Theme.of(context).primaryColor,
                  ),
                ),
                Text(
                  _pointsName,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
