import '../core/api_client.dart';
import '../models/question.dart';

class QuestionService {
  final ApiClient _apiClient = ApiClient();

  Future<List<Question>> getQuestions({
    required String libraryCode,
    int page = 1,
    int pageSize = 20,
    String? category,
    String? search,
  }) async {
    try {
      final response = await _apiClient.client.get(
        '/questions',
        queryParameters: {
          'library': libraryCode,
          'page': page,
          'pageSize': pageSize,
          if (category != null) 'category': category,
          if (search != null) 'search': search,
        },
      );

      final data = response.data;
      // The API returns { questions: [...], pagination: {...} }
      final List<dynamic> questionsJson = data['questions'];
      return questionsJson.map((json) => Question.fromJson(json)).toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> submitExam(Map<String, dynamic> payload) async {
    await _apiClient.client.post('/exam/submit', data: payload);
  }
}
