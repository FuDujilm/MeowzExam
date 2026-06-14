import '../core/api_client.dart';
import '../models/exam_result.dart';
import '../models/practice_history.dart';
import '../models/question.dart';
import 'package:flutter/foundation.dart';

class StartedExam {
  final String examId;
  final String examResultId;
  final List<Question> questions;
  final int durationMinutes;
  final int passScore;

  StartedExam({
    required this.examId,
    required this.examResultId,
    required this.questions,
    required this.durationMinutes,
    required this.passScore,
  });

  factory StartedExam.fromJson(Map<String, dynamic> json) {
    final config = json['config'] as Map<String, dynamic>? ?? {};
    return StartedExam(
      examId: json['examId'] as String,
      examResultId: json['examResultId'] as String,
      questions: (json['questions'] as List<dynamic>? ?? [])
          .map((item) => Question.fromJson(item as Map<String, dynamic>))
          .toList(),
      durationMinutes: (config['duration'] as num?)?.toInt() ?? 45,
      passScore: (config['passScore'] as num?)?.toInt() ?? 60,
    );
  }
}

class ExamService {
  final ApiClient _apiClient = ApiClient();

  Future<StartedExam> startExam({
    required String libraryCode,
    String? presetCode,
  }) async {
    final response = await _apiClient.client.post(
      'exam/start',
      data: {
        'library': libraryCode,
        if (presetCode != null) 'presetCode': presetCode,
      },
    );
    return StartedExam.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> submitExam(Map<String, dynamic> payload) async {
    // payload structure:
    // {
    //   "examId": "...",
    //   "examResultId": "...",
    //   "answers": { "questionId": "optionId" },
    //   "answerMappings": { "questionId": "A/B/C" } // optional
    // }
    try {
      final response =
          await _apiClient.client.post('exam/submit', data: payload);
      return response.data as Map<String, dynamic>;
    } catch (e) {
      rethrow;
    }
  }

  Future<List<ExamResult>> getExamHistory() async {
    try {
      final response = await _apiClient.client.get('user/exams');
      final raw = response.data;
      final List<dynamic> data = raw is List
          ? raw
          : (raw is Map<String, dynamic> && raw['exams'] is List
              ? raw['exams'] as List<dynamic>
              : <dynamic>[]);
      return data.map((json) => ExamResult.fromJson(json)).toList();
    } catch (e) {
      debugPrint('Failed to load exam history: $e');
      return [];
    }
  }

  Future<List<ExamSummary>> getExamSummaries() async {
    try {
      final response = await _apiClient.client.get('user/exams');
      final raw = response.data;
      final List<dynamic> data = raw is Map<String, dynamic>
          ? (raw['summaries'] as List<dynamic>? ?? <dynamic>[])
          : <dynamic>[];
      return data
          .map((json) => ExamSummary.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('Failed to load exam summaries: $e');
      return [];
    }
  }
}
