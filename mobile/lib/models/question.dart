class QuestionOption {
  final String id;
  final String text;

  QuestionOption({required this.id, required this.text});

  factory QuestionOption.fromJson(Map<String, dynamic> json) {
    return QuestionOption(
      id: json['id'] as String,
      text: json['text'] as String,
    );
  }
}

class Question {
  final String id;
  final String externalId;
  final String title;
  final String type; // CHOICE, JUDGEMENT
  final String? category;
  final List<QuestionOption> options;
  final bool hasImage;
  final String? imagePath;
  final String? libraryName;

  Question({
    required this.id,
    required this.externalId,
    required this.title,
    required this.type,
    this.category,
    required this.options,
    this.hasImage = false,
    this.imagePath,
    this.libraryName,
  });

  factory Question.fromJson(Map<String, dynamic> json) {
    return Question(
      id: json['id'] as String,
      externalId: json['externalId'] as String,
      title: json['title'] as String,
      type: json['type'] as String,
      category: json['category'] as String?,
      options: (json['options'] as List<dynamic>?)
              ?.map((e) => QuestionOption.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      hasImage: json['hasImage'] == true,
      imagePath: json['imagePath'] as String?,
      libraryName: json['libraryName'] as String?,
    );
  }
}
