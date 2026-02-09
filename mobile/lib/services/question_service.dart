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
    // Return mock data for testing if libraryCode is 'MOCK'
    if (libraryCode == 'MOCK') {
      await Future.delayed(const Duration(milliseconds: 500));
      return List.generate(10, (index) => Question(
        id: 'mock_$index',
        externalId: 'MOCK${index + 100}',
        title: 'This is a mock question #$index for testing purposes. Which option is correct?',
        type: 'CHOICE',
        options: [
          QuestionOption(id: 'A', text: 'Option A is incorrect'),
          QuestionOption(id: 'B', text: 'Option B is correct'),
          QuestionOption(id: 'C', text: 'Option C is incorrect'),
          QuestionOption(id: 'D', text: 'Option D is incorrect'),
        ],
        correctAnswers: ['B'],
        explanation: 'Option B is correct because this is a mock question.',
      ));
    }

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
      // Fallback to mock on error for now to unblock UI dev
      print('API Error: $e. Returning mock data.');
      if (libraryCode == 'A_CLASS') {
          return List.generate(5, (index) => Question(
            id: 'fallback_$index',
            externalId: 'FB${index + 100}',
            title: 'Fallback Question #$index (API Failed)',
            type: 'CHOICE',
            options: [
              QuestionOption(id: 'A', text: 'Fallback A'),
              QuestionOption(id: 'B', text: 'Fallback B'),
            ],
            correctAnswers: ['A'],
            explanation: 'API failed, so here is a fallback question.',
          ));
      }
      rethrow;
    }
  }

  Future<void> submitExam(Map<String, dynamic> payload) async {
    await _apiClient.client.post('/exam/submit', data: payload);
  }
}
