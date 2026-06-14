import '../core/api_client.dart';
import '../models/question.dart';
import '../models/explanation.dart';
import '../models/question_library.dart';
import '../models/paged_result.dart';
import '../models/favorite_question.dart';
import '../models/practice_history.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

class QuestionService {
  final ApiClient _apiClient = ApiClient();

  bool _isCompletionError(Object error) {
    if (error is! DioException) return false;
    final data = error.response?.data;
    return error.response?.statusCode == 409 ||
        (data is Map && data['completed'] == true);
  }

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
      debugPrint('Failed to load libraries: $e');
      return [];
    }
  }

  Future<List<FavoriteQuestion>> getFavorites() async {
    final response = await _apiClient.client.get('favorites');
    final data = response.data;
    final List<dynamic> favoritesJson = data is Map<String, dynamic>
        ? (data['favorites'] as List<dynamic>? ?? <dynamic>[])
        : <dynamic>[];
    return favoritesJson
        .map((json) => FavoriteQuestion.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<List<PracticeSession>> getPracticeSessions({
    String? libraryCode,
    int limit = 20,
  }) async {
    final response = await _apiClient.client.get(
      'practice/sessions',
      queryParameters: {
        if (libraryCode != null) 'type': libraryCode,
        'limit': limit,
      },
    );
    final data = response.data;
    final List<dynamic> sessionsJson = data is Map<String, dynamic>
        ? (data['sessions'] as List<dynamic>? ?? <dynamic>[])
        : <dynamic>[];
    return sessionsJson
        .map((json) => PracticeSession.fromJson(json as Map<String, dynamic>))
        .toList();
  }

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
      return List.generate(
          10,
          (index) => Question(
                id: 'mock_$index',
                externalId: 'MOCK${index + 100}',
                title:
                    'This is a mock question #$index for testing purposes. Which option is correct?',
                type: 'CHOICE',
                options: [
                  QuestionOption(id: 'A', text: 'Option A is incorrect'),
                  QuestionOption(id: 'B', text: 'Option B is correct'),
                  QuestionOption(id: 'C', text: 'Option C is incorrect'),
                  QuestionOption(id: 'D', text: 'Option D is incorrect'),
                ],
                correctAnswers: ['B'],
                explanation:
                    'Option B is correct because this is a mock question.',
              ));
    }

    try {
      final response = await _apiClient.client.get(
        'practice/questions',
        queryParameters: {
          'type':
              libraryCode, // The API expects 'type' for library code (A_CLASS etc)
          'page': page,
          'limit':
              pageSize, // API uses 'limit' instead of 'pageSize' for random mode
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

      final List<dynamic> questionsJson =
          (data['questions'] != null) ? data['questions'] : data;
      return questionsJson.map((json) => Question.fromJson(json)).toList();
    } catch (e) {
      if (_isCompletionError(e)) {
        rethrow;
      }

      // Fallback to mock on error for now to unblock UI dev
      debugPrint('API Error: $e. Returning mock data.');
      if (libraryCode == 'A_CLASS') {
        return List.generate(
            1,
            (index) => Question(
                  id: 'error_fallback_$index',
                  externalId: 'ERR001',
                  title:
                      '【连接失败】请检查 API 地址配置\n\n当前尝试连接: ${_apiClient.client.options.baseUrl}\n错误信息: $e',
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

  Future<PagedQuestionResult> getQuestionsPaged({
    required String libraryCode,
    int page = 1,
    int pageSize = 20,
    String? category,
    String? search,
    String mode = 'sequential',
  }) async {
    if (libraryCode == 'MOCK') {
      final questions = List.generate(
          10,
          (index) => Question(
                id: 'mock_$index',
                externalId: 'MOCK${index + 100}',
                title:
                    'This is a mock question #$index for testing purposes. Which option is correct?',
                type: 'CHOICE',
                options: [
                  QuestionOption(id: 'A', text: 'Option A is incorrect'),
                  QuestionOption(id: 'B', text: 'Option B is correct'),
                  QuestionOption(id: 'C', text: 'Option C is incorrect'),
                  QuestionOption(id: 'D', text: 'Option D is incorrect'),
                ],
                correctAnswers: ['B'],
                explanation:
                    'Option B is correct because this is a mock question.',
              ));
      return PagedQuestionResult(
        questions: questions,
        total: questions.length,
        hasMore: false,
        page: page,
        totalPages: 1,
      );
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
      final List<dynamic> questionsJson =
          (data['questions'] != null) ? data['questions'] : data;
      final questions =
          questionsJson.map((json) => Question.fromJson(json)).toList();
      final total = (data['total'] as int?) ?? questions.length;
      final hasMore = (data['hasMore'] as bool?) ?? ((page * pageSize) < total);
      final totalPages = total == 0 ? 0 : ((total / pageSize).ceil());
      return PagedQuestionResult(
        questions: questions,
        total: total,
        hasMore: hasMore,
        page: page,
        totalPages: totalPages,
      );
    } catch (e) {
      if (_isCompletionError(e)) {
        rethrow;
      }

      debugPrint('API Error: $e. Returning mock data.');
      if (libraryCode == 'A_CLASS') {
        final questions = List.generate(
            1,
            (index) => Question(
                  id: 'error_fallback_$index',
                  externalId: 'ERR001',
                  title:
                      '【连接失败】请检查 API 地址配置\n\n当前尝试连接: ${_apiClient.client.options.baseUrl}\n错误信息: $e',
                  type: 'CHOICE',
                  options: [
                    QuestionOption(id: 'A', text: 'Retry'),
                    QuestionOption(id: 'B', text: 'Check Settings'),
                  ],
                  correctAnswers: ['A'],
                  explanation: '无法连接到服务器。请确保您的手机和电脑在同一局域网，且防火墙已允许端口访问。',
                ));
        return PagedQuestionResult(
          questions: questions,
          total: questions.length,
          hasMore: false,
          page: page,
          totalPages: 1,
        );
      }
      rethrow;
    }
  }

  Future<PagedQuestionResult> getPreviewQuestions({
    required String libraryCode,
    int page = 1,
    int pageSize = 10,
    String? category,
    String? search,
  }) async {
    final response = await _apiClient.client.get(
      'questions',
      queryParameters: {
        'library': libraryCode,
        'page': page,
        'pageSize': pageSize,
        if (category != null) 'category': category,
        if (search != null) 'search': search,
      },
    );

    final data = response.data as Map<String, dynamic>;
    final List<dynamic> questionsJson =
        (data['questions'] as List<dynamic>? ?? []);
    final questions =
        questionsJson.map((json) => Question.fromJson(json)).toList();
    final pagination = data['pagination'] as Map<String, dynamic>? ?? {};
    final total = (pagination['total'] as int?) ?? questions.length;
    final totalPages = (pagination['totalPages'] as int?) ??
        (total == 0 ? 0 : (total / pageSize).ceil());
    final currentPage = (pagination['page'] as int?) ?? page;
    final hasMore = totalPages > 0 && currentPage < totalPages;

    return PagedQuestionResult(
      questions: questions,
      total: total,
      hasMore: hasMore,
      page: currentPage,
      totalPages: totalPages,
    );
  }

  Future<Map<String, dynamic>> getNextQuestion({
    required String libraryCode,
    required String mode,
    String? currentId,
    String? questionId,
  }) async {
    final response = await _apiClient.client.get(
      'practice/next',
      queryParameters: {
        'library': libraryCode,
        'mode': mode,
        if (currentId != null) 'currentId': currentId,
        if (questionId != null) 'questionId': questionId,
      },
    );
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getHighErrorQuestion({
    required String libraryCode,
    String? currentId,
  }) async {
    final response = await _apiClient.client.get(
      'practice/error-rate',
      queryParameters: {
        'library': libraryCode,
        if (currentId != null) 'currentId': currentId,
      },
    );
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> submitPracticeAnswer({
    required String questionId,
    required dynamic userAnswer,
    Map<String, dynamic>? answerMapping,
    String mode = 'sequential',
    String? sessionId,
  }) async {
    final response = await _apiClient.client.post(
      'practice/submit',
      data: {
        'questionId': questionId,
        'userAnswer': userAnswer,
        if (answerMapping != null) 'answerMapping': answerMapping,
        'mode': mode,
        if (sessionId != null) 'sessionId': sessionId,
      },
    );
    return response.data as Map<String, dynamic>;
  }

  Future<void> markQuestionSeen({
    required String questionId,
  }) async {
    await _apiClient.client.post(
      'practice/seen',
      data: {'questionId': questionId},
    );
  }

  Future<List<Explanation>> getExplanations(String questionId) async {
    try {
      final response =
          await _apiClient.client.get('questions/$questionId/explanations');
      final List<dynamic> data = response.data;
      return data.map((json) => Explanation.fromJson(json)).toList();
    } catch (e) {
      debugPrint('Failed to load explanations: $e');
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
