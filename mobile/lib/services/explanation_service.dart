import '../core/api_client.dart';
import '../models/question_explanation.dart';

class ExplanationService {
  final ApiClient _apiClient = ApiClient();

  Future<List<QuestionExplanation>> getQuestionExplanations(String questionId) async {
    try {
      final response = await _apiClient.client.get('questions/$questionId/explanations');
      final data = response.data;
      final List<dynamic> list = (data['explanations'] as List?) ?? [];
      return list.map((json) => QuestionExplanation.fromJson(json)).toList();
    } catch (e) {
      print('Failed to load explanations: $e');
      return [];
    }
  }

  Future<QuestionExplanation?> submitExplanation({
    required String questionId,
    required String content,
  }) async {
    try {
      final response = await _apiClient.client.post(
        'questions/$questionId/explanations',
        data: {
          'content': content,
          'format': 'text',
        },
      );

      final data = response.data;
      if (data['explanation'] != null) {
        return QuestionExplanation.fromJson(data['explanation']);
      }
      return null;
    } catch (e) {
      rethrow;
    }
  }

  Future<QuestionExplanation?> updateExplanation({
    required String questionId,
    required String explanationId,
    required String content,
  }) async {
    try {
      final response = await _apiClient.client.patch(
        'questions/$questionId/explanations',
        data: {
          'explanationId': explanationId,
          'content': content,
          'format': 'text',
        },
      );

      final data = response.data;
      if (data['explanation'] != null) {
        return QuestionExplanation.fromJson(data['explanation']);
      }
      return null;
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> voteExplanation({
    required String explanationId,
    required String vote, // UP | DOWN | REPORT
    String? reportReason,
  }) async {
    final response = await _apiClient.client.post(
      'explanations/$explanationId/vote',
      data: {
        'vote': vote,
        if (reportReason != null) 'reportReason': reportReason,
      },
    );
    return response.data as Map<String, dynamic>;
  }
}
