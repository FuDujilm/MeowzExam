import '../core/api_client.dart';
import '../models/question.dart';
import '../models/explanation.dart';

class QuestionService {
  final ApiClient _apiClient = ApiClient();

  Future<List<Question>> getQuestions({
    required String libraryCode,
    int page = 1,
    int pageSize = 20,
    String? category,
    String? search,
    String mode = 'sequential', // 'sequential', 'random'
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
        'practice/questions',
        queryParameters: {
          'type': libraryCode, // The API expects 'type' for library code (A_CLASS etc)
          'page': page,
          'limit': pageSize, // API uses 'limit' instead of 'pageSize' for random mode
          'offset': (page - 1) * pageSize, // API uses offset for sequential
          'mode': mode,
          if (category != null) 'category': category,
          if (search != null) 'search': search,
        },
      );

      final data = response.data;
      // The API structure for /practice/questions might return a list directly or nested
      // Based on typical Next.js route analysis:
      // If random mode: returns { questions: [...] } or just [...]
      // Let's assume consistent wrapper based on previous analysis
      
      final List<dynamic> questionsJson = (data['questions'] != null) ? data['questions'] : data;
      return questionsJson.map((json) => Question.fromJson(json)).toList();
    } catch (e) {
      // Fallback to mock on error for now to unblock UI dev
      print('API Error: $e. Returning mock data.');
      if (libraryCode == 'A_CLASS') {
          return List.generate(1, (index) => Question(
            id: 'error_fallback_$index',
            externalId: 'ERR001',
            title: '【连接失败】请检查 API 地址配置\n\n当前尝试连接: ${_apiClient.client.options.baseUrl}\n错误信息: $e',
            type: 'CHOICE',
            options: [
              QuestionOption(id: 'A', text: 'Retry'),
              QuestionOption(id: 'B', text: 'Check Settings'),
            ],
            correctAnswers: ['A'],
            explanation: '无法连接到服务器。请确保您的手机和电脑在同一局域网，且防火墙已允许端口访问。',
          ));
      }
      rethrow;
    }
  }

  Future<List<Explanation>> getExplanations(String questionId) async {
    try {
      final response = await _apiClient.client.get('questions/$questionId/explanations');
      final List<dynamic> data = response.data;
      return data.map((json) => Explanation.fromJson(json)).toList();
    } catch (e) {
      print('Failed to load explanations: $e');
      return [];
    }
  }

  Future<Question> getQuestionDetails(String questionId) async {
    try {
      final response = await _apiClient.client.get('questions/$questionId');
      return Question.fromJson(response.data['question']);
    } catch (e) {
      rethrow;
    }
  }
}
