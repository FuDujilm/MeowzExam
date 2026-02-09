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
      return response.data['settings'] ?? {};
    } catch (e) {
      print('Failed to load settings: $e');
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
      print('Failed to load user stats: $e');
      return {};
    }
  }

  Future<Map<String, dynamic>> getCheckInStatus() async {
    try {
      final response = await _apiClient.client.get('points/checkin');
      return response.data;
    } catch (e) {
      print('Failed to load check-in status: $e');
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

  Future<List<dynamic>> getLeaderboard() async {
    try {
      final response = await _apiClient.client.get('points/leaderboard');
      return response.data; // Assuming list of {user: {...}, points: 100}
    } catch (e) {
      // Return empty list instead of mock data on error
      print('Failed to load leaderboard: $e');
      return [];
    }
  }
}
