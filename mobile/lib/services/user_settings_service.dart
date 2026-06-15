import 'package:flutter/foundation.dart';

import '../core/api_client.dart';
import '../models/user.dart';

class UserSettingsService {
  final ApiClient _apiClient = ApiClient();

  Future<User> updateProfile({String? callsign, String? name}) async {
    try {
      final response = await _apiClient.client.patch(
        'user/profile',
        data: {
          if (callsign != null) 'callsign': callsign,
          if (name != null) 'name': name,
        },
      );
      return User.fromJson(response.data);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getSettings() async {
    try {
      final response = await _apiClient.client.get('user/settings');
      final settings = Map<String, dynamic>.from(
        response.data['settings'] as Map? ?? {},
      );
      final user = response.data['user'];
      if (user is Map && user['callsign'] != null) {
        settings['callsign'] = user['callsign'];
      }
      return settings;
    } catch (e) {
      debugPrint('Failed to load settings: $e');
      return {};
    }
  }

  Future<void> updateSettings(Map<String, dynamic> settings) async {
    try {
      // API uses POST for updates
      await _apiClient.client.post('user/settings', data: settings);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getUserStats() async {
    try {
      final response = await _apiClient.client.get('user/stats');
      return response.data;
    } catch (e) {
      // Return empty stats instead of throwing to prevent UI crash
      debugPrint('Failed to load user stats: $e');
      return {};
    }
  }

  Future<int> getLibraryBrowsedCount(String code) async {
    try {
      final stats = await getLibraryStats(code);
      return stats['browsedCount'] ?? 0;
    } catch (e) {
      debugPrint('Failed to load library stats: $e');
      return 0;
    }
  }

  Future<Map<String, dynamic>> getLibraryStats(String code) async {
    try {
      final response = await _apiClient.client.get(
        'user/library-stats',
        queryParameters: {'code': code},
      );
      return response.data as Map<String, dynamic>;
    } catch (e) {
      debugPrint('Failed to load library stats: $e');
      return {};
    }
  }

  Future<Map<String, dynamic>> getCheckInStatus() async {
    try {
      final response = await _apiClient.client.get('points/checkin');
      return response.data;
    } catch (e) {
      debugPrint('Failed to load check-in status: $e');
      return {};
    }
  }

  Future<Map<String, dynamic>> checkIn() async {
    try {
      final response = await _apiClient.client.post('points/checkin');
      return response.data;
    } catch (e) {
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> getStudyCalendar(
      String start, String end) async {
    try {
      final response = await _apiClient.client.get(
        'user/calendar',
        queryParameters: {'start': start, 'end': end},
      );
      if (response.data['records'] != null) {
        return List<Map<String, dynamic>>.from(response.data['records']);
      }
      return [];
    } catch (e) {
      debugPrint('Failed to load study calendar: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>> getLeaderboard() async {
    try {
      final response = await _apiClient.client.get('points/leaderboard');
      // API returns { users: [...], total: ..., pointsName: ... }
      return response.data;
    } catch (e) {
      debugPrint('Failed to load leaderboard: $e');
      return {'users': [], 'pointsName': '积分'};
    }
  }
}
