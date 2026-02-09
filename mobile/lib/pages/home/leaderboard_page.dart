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

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final data = await _userService.getLeaderboard();
      setState(() {
        _leaderboard = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Leaderboard')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView.builder(
              itemCount: _leaderboard.length,
              itemBuilder: (context, index) {
                final item = _leaderboard[index];
                final user = item['user'] ?? {};
                final points = item['totalPoints'] ?? 0;
                
                Color? rankColor;
                if (index == 0) rankColor = Colors.amber;
                else if (index == 1) rankColor = Colors.grey[400];
                else if (index == 2) rankColor = Colors.orangeAccent[100];

                return ListTile(
                  leading: CircleAvatar(
                    backgroundColor: rankColor ?? Colors.transparent,
                    foregroundColor: rankColor != null ? Colors.white : Colors.grey,
                    child: Text('${index + 1}'),
                  ),
                  title: Text(user['callsign'] ?? user['name'] ?? 'Unknown'),
                  subtitle: Text(user['email'] ?? ''),
                  trailing: Text(
                    '$points pts',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                );
              },
            ),
    );
  }
}
