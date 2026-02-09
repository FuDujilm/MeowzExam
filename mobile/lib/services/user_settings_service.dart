import '../core/api_client.dart';
import '../models/user.dart';

class UserSettingsService {
  final ApiClient _apiClient = ApiClient();

  Future<User> updateProfile({String? callsign, String? name}) async {
    try {
      final response = await _apiClient.client.patch(
        '/user/profile',
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

  Future<void> updateSettings(Map<String, dynamic> settings) async {
    try {
      await _apiClient.client.patch('/user/settings', data: settings);
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getUserStats() async {
    try {
      final response = await _apiClient.client.get('/user/stats');
      return response.data;
    } catch (e) {
      rethrow;
    }
  }

  Future<List<dynamic>> getLeaderboard() async {
    try {
      final response = await _apiClient.client.get('/points/leaderboard');
      return response.data; // Assuming list of {user: {...}, points: 100}
    } catch (e) {
      // Return mock data if API fails (e.g., 404 or auth error in guest mode)
      return List.generate(10, (index) => {
        'user': {
            'name': 'User ${index + 1}',
            'callsign': 'BI4XX${index}',
            'image': null
        },
        'totalPoints': 1000 - (index * 50)
      });
    }
  }
}
