import '../core/api_client.dart';
import '../models/ai_explanation.dart';

class AiService {
  final ApiClient _apiClient = ApiClient();

  /// Generate or retrieve AI explanation
  /// Returns a map with 'explanation' (AiExplanation object) and 'message' (String)
  Future<Map<String, dynamic>> generateExplanation({
    required String questionId,
    bool regenerate = false,
  }) async {
    try {
      final response = await _apiClient.client.post(
        'ai/explain',
        data: {
          'questionId': questionId,
          'mode': 'structured',
          'regenerate': regenerate,
        },
      );

      final data = response.data;
      if (data['explanation'] != null) {
        return {
          'explanation': AiExplanation.fromJson(data['explanation']),
          'message': data['message'] ?? '解析已生成',
          'deductedPoints': data['deductedPoints'] ?? 0,
        };
      } else {
        throw Exception('API returned no explanation data');
      }
    } catch (e) {
      print('AI Generate Error: $e');
      rethrow;
    }
  }
}
