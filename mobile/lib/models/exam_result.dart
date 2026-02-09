class ExamResult {
  final String id;
  final String userId;
  final String examId;
  final String? libraryCode;
  final int score;
  final int totalQuestions;
  final int correctCount;
  final bool passed;
  final int? timeSpent;
  final DateTime createdAt;

  ExamResult({
    required this.id,
    required this.userId,
    required this.examId,
    this.libraryCode,
    required this.score,
    required this.totalQuestions,
    required this.correctCount,
    required this.passed,
    this.timeSpent,
    required this.createdAt,
  });

  factory ExamResult.fromJson(Map<String, dynamic> json) {
    return ExamResult(
      id: json['id'],
      userId: json['userId'],
      examId: json['examId'],
      libraryCode: json['libraryCode'],
      score: json['score'],
      totalQuestions: json['totalQuestions'],
      correctCount: json['correctCount'],
      passed: json['passed'],
      timeSpent: json['timeSpent'],
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}
