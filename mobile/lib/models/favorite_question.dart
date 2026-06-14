class FavoriteQuestion {
  final String id;
  final DateTime createdAt;
  final FavoriteQuestionDetail question;

  FavoriteQuestion({
    required this.id,
    required this.createdAt,
    required this.question,
  });

  factory FavoriteQuestion.fromJson(Map<String, dynamic> json) {
    return FavoriteQuestion(
      id: json['id'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      question: FavoriteQuestionDetail.fromJson(
        json['question'] as Map<String, dynamic>,
      ),
    );
  }
}

class FavoriteQuestionDetail {
  final String id;
  final String externalId;
  final String title;
  final String questionType;
  final String? category;
  final String? categoryCode;
  final String? difficulty;

  FavoriteQuestionDetail({
    required this.id,
    required this.externalId,
    required this.title,
    required this.questionType,
    this.category,
    this.categoryCode,
    this.difficulty,
  });

  factory FavoriteQuestionDetail.fromJson(Map<String, dynamic> json) {
    return FavoriteQuestionDetail(
      id: json['id'] as String,
      externalId: json['externalId'] as String,
      title: json['title'] as String,
      questionType: json['questionType'] as String? ?? '',
      category: json['category'] as String?,
      categoryCode: json['categoryCode'] as String?,
      difficulty: json['difficulty'] as String?,
    );
  }
}
