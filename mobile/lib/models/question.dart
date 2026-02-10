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
  final String? categoryCode;
  final String? difficulty;
  final List<QuestionOption> options;
  final bool hasImage;
  final String? imagePath;
  final String? libraryName;
  final List<String> correctAnswers;
  final String? explanation;

  final String? questionType; // Store original questionType for multi-choice check

  Question({
    required this.id,
    required this.externalId,
    required this.title,
    required this.type,
    this.questionType,
    this.category,
    this.categoryCode,
    this.difficulty,
    required this.options,
    this.hasImage = false,
    this.imagePath,
    this.libraryName,
    this.correctAnswers = const [],
    this.explanation,
  });

  bool get isMultipleChoice => questionType == 'multiple_choice';

  factory Question.fromJson(Map<String, dynamic> json) {
    // Map backend questionType (single_choice/true_false) to App type (CHOICE/JUDGEMENT)
    String mappedType = 'CHOICE';
    final rawType = json['questionType'] as String?;
    
    if (rawType != null) {
      if (rawType.toLowerCase().contains('true_false') || rawType == 'JUDGEMENT') {
        mappedType = 'JUDGEMENT';
      } else {
        mappedType = 'CHOICE';
      }
    }

    return Question(
      id: json['id'] as String,
      externalId: json['externalId'] as String,
      title: json['title'] as String,
      type: mappedType,
      questionType: rawType,
      category: json['category'] as String?,
      categoryCode: json['categoryCode'] as String?,
      difficulty: json['difficulty'] as String?,
      options: (json['options'] as List<dynamic>?)
              ?.map((e) => QuestionOption.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      hasImage: json['hasImage'] == true,
      imagePath: json['imagePath'] as String?,
      libraryName: json['libraryName'] as String?,
      correctAnswers: (json['correctAnswers'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      explanation: json['explanation'] as String? ?? json['aiExplanation'] as String?,
    );
  }
}
