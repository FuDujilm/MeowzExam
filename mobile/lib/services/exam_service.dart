import '../core/api_client.dart';
import '../models/exam_result.dart';

class ExamService {
  final ApiClient _apiClient = ApiClient();

  Future<void> submitExam(Map<String, dynamic> payload) async {
    // payload structure:
    // {
    //   "examId": "...",
    //   "examResultId": "...",
    //   "answers": { "questionId": "optionId" },
    //   "answerMappings": { "questionId": "A/B/C" } // optional
    // }
    try {
      await _apiClient.client.post('exam/submit', data: payload);
    } catch (e) {
      rethrow;
    }
  }

  Future<List<ExamResult>> getExamHistory() async {
    try {
      final response = await _apiClient.client.get('user/exams'); // Assuming this endpoint exists or similar
      // If not, we might need to use /practice/history with filters
      final List<dynamic> data = response.data;
      return data.map((json) => ExamResult.fromJson(json)).toList();
    } catch (e) {
      print('Failed to load exam history: $e');
      return [];
    }
  }
}
