class Explanation {
  final String id;
  final String questionId;
  final String type; // 'OFFICIAL' | 'USER' | 'AI'
  final Map<String, dynamic> contentJson;
  final String lang;
  final String status;
  final int upvotes;
  final int downvotes;
  final String? createdBy;
  final DateTime createdAt;

  Explanation({
    required this.id,
    required this.questionId,
    required this.type,
    required this.contentJson,
    required this.lang,
    required this.status,
    required this.upvotes,
    required this.downvotes,
    this.createdBy,
    required this.createdAt,
  });

  factory Explanation.fromJson(Map<String, dynamic> json) {
    return Explanation(
      id: json['id'],
      questionId: json['questionId'],
      type: json['type'],
      contentJson: json['contentJson'],
      lang: json['lang'],
      status: json['status'],
      upvotes: json['upvotes'] ?? 0,
      downvotes: json['downvotes'] ?? 0,
      createdBy: json['createdBy'] != null ? json['createdBy']['name'] : null,
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}
