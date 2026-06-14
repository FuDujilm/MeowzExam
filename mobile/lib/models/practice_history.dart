import 'exam_result.dart';

class PracticeSession {
  final String id;
  final String mode;
  final String modeName;
  final String? libraryCode;
  final String? libraryName;
  final int totalQuestions;
  final int correctCount;
  final int incorrectCount;
  final double accuracy;
  final DateTime startedAt;
  final DateTime lastAnsweredAt;

  PracticeSession({
    required this.id,
    required this.mode,
    required this.modeName,
    this.libraryCode,
    this.libraryName,
    required this.totalQuestions,
    required this.correctCount,
    required this.incorrectCount,
    required this.accuracy,
    required this.startedAt,
    required this.lastAnsweredAt,
  });

  factory PracticeSession.fromJson(Map<String, dynamic> json) {
    return PracticeSession(
      id: json['id'] as String,
      mode: json['mode'] as String? ?? '',
      modeName: json['modeName'] as String? ?? '练习',
      libraryCode: json['libraryCode'] as String?,
      libraryName: json['libraryName'] as String?,
      totalQuestions: json['totalQuestions'] as int? ?? 0,
      correctCount: json['correctCount'] as int? ?? 0,
      incorrectCount: json['incorrectCount'] as int? ?? 0,
      accuracy: (json['accuracy'] as num?)?.toDouble() ?? 0,
      startedAt: DateTime.parse(json['startedAt'] as String),
      lastAnsweredAt: DateTime.parse(json['lastAnsweredAt'] as String),
    );
  }
}

class ExamSummary {
  final String key;
  final String? libraryCode;
  final String? libraryName;
  final String? presetCode;
  final int totalAttempts;
  final int recentFiveTotal;
  final int recentFivePassed;
  final ExamResult? latest;
  final String advice;

  ExamSummary({
    required this.key,
    this.libraryCode,
    this.libraryName,
    this.presetCode,
    required this.totalAttempts,
    required this.recentFiveTotal,
    required this.recentFivePassed,
    this.latest,
    required this.advice,
  });

  factory ExamSummary.fromJson(Map<String, dynamic> json) {
    final latestJson = json['latest'];
    return ExamSummary(
      key: json['key'] as String,
      libraryCode: json['libraryCode'] as String?,
      libraryName: json['libraryName'] as String?,
      presetCode: json['presetCode'] as String?,
      totalAttempts: json['totalAttempts'] as int? ?? 0,
      recentFiveTotal: json['recentFiveTotal'] as int? ?? 0,
      recentFivePassed: json['recentFivePassed'] as int? ?? 0,
      latest: latestJson is Map<String, dynamic>
          ? ExamResult.fromJson(latestJson)
          : null,
      advice: json['advice'] as String? ?? '',
    );
  }
}
