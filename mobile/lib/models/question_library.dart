class QuestionLibrary {
  final String id;
  final String code;
  final String name;
  final String? description;
  final int totalQuestions;

  QuestionLibrary({
    required this.id,
    required this.code,
    required this.name,
    this.description,
    this.totalQuestions = 0,
  });

  factory QuestionLibrary.fromJson(Map<String, dynamic> json) {
    return QuestionLibrary(
      id: json['id'] as String,
      code: json['code'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      totalQuestions: json['totalQuestions'] as int? ?? 0,
    );
  }
}