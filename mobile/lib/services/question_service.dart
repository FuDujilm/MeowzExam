import '../core/api_client.dart';
import '../models/question.dart';
import '../models/explanation.dart';
import '../models/question_library.dart';
import '../models/paged_result.dart';

class QuestionService {
  final ApiClient _apiClient = ApiClient();

  Future<List<QuestionLibrary>> getLibraries() async {
    try {
      final response = await _apiClient.client.get('question-libraries');
      final data = response.data;
      if (data['libraries'] != null) {
        return (data['libraries'] as List)
            .map((json) => QuestionLibrary.fromJson(json))
            .toList();
      }
      return [];
    } catch (e) {
      print('Failed to load libraries: $e');
      return [];
    }
  }

  Future<PagedQuestionResult> getQuestions({
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
      final questions = List.generate(10, (index) => Question(
        id: 'mock_${page}_$index',
        externalId: 'MOCK${(page-1)*10 + index + 100}',
        title: 'This is a mock question #${(page-1)*10 + index} for testing purposes. Which option is correct?',
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
      return PagedQuestionResult(questions: questions, total: 50, hasMore: page < 5);
    }

    try {
      final response = await _apiClient.client.get(
        'practice/questions',
        queryParameters: {
          'type': libraryCode, 
          'page': page,
          'limit': pageSize, 
          'offset': (page - 1) * pageSize,
          'mode': mode,
          if (category != null) 'category': category,
          if (search != null) 'search': search,
        },
      );

      final data = response.data;
      // The API structure for /practice/questions:
      // { questions: [...], total: 123, hasMore: true }
      
      final List<dynamic> questionsJson = (data['questions'] != null) ? data['questions'] : (data is List ? data : []);
      final questions = questionsJson.map((json) => Question.fromJson(json)).toList();
      final total = data['total'] as int? ?? questions.length;
      final hasMore = data['hasMore'] as bool? ?? false;

      return PagedQuestionResult(questions: questions, total: total, hasMore: hasMore);
    } catch (e) {
      // Fallback to mock on error for now to unblock UI dev
      print('API Error: $e. Returning fallback data.');
      if (libraryCode == 'A_CLASS') {
          final q = Question(
            id: 'error_fallback',
            externalId: 'ERR001',
            title: '【连接失败】请检查 API 地址配置\n\n当前尝试连接: ${_apiClient.client.options.baseUrl}\n错误信息: $e',
            type: 'CHOICE',
            options: [
              QuestionOption(id: 'A', text: 'Retry'),
              QuestionOption(id: 'B', text: 'Check Settings'),
            ],
            correctAnswers: ['A'],
            explanation: '无法连接到服务器。请确保您的手机和电脑在同一局域网，且防火墙已允许端口访问。',
          );
          return PagedQuestionResult(questions: [q], total: 1, hasMore: false);
      }
      rethrow;
    }
  }

  Future<Map<String, dynamic>> submitAnswer({
    required String questionId,
    required dynamic userAnswer,
    String mode = 'sequential',
  }) async {
    try {
      final response = await _apiClient.client.post(
        'practice/submit',
        data: {
          'questionId': questionId,
          'userAnswer': userAnswer,
          'mode': mode == 'sequential' ? 'daily' : mode, 
        },
      );
      return response.data;
    } catch (e) {
      // Don't block UI if stats fail, but maybe log it
      print('Failed to submit answer: $e');
      return {};
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
