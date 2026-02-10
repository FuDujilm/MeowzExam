class QuestionExplanation {
  final String id;
  final String type; // OFFICIAL | USER | AI
  final String format; // text | structured
  final dynamic content; // String or Map
  final int upvotes;
  final int downvotes;
  final String? userVote; // UP | DOWN | REPORT | null
  final String? createdBy;
  final DateTime? createdAt;

  QuestionExplanation({
    required this.id,
    required this.type,
    required this.format,
    required this.content,
    required this.upvotes,
    required this.downvotes,
    this.userVote,
    this.createdBy,
    this.createdAt,
  });

  bool get isLegacy => id.startsWith('legacy-');

  factory QuestionExplanation.fromJson(Map<String, dynamic> json) {
    return QuestionExplanation(
      id: json['id'] as String,
      type: json['type'] as String? ?? 'OFFICIAL',
      format: json['format'] as String? ?? 'text',
      content: json['content'],
      upvotes: json['upvotes'] as int? ?? 0,
      downvotes: json['downvotes'] as int? ?? 0,
      userVote: json['userVote'] as String?,
      createdBy: json['createdBy']?['name'] as String?,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt']) : null,
    );
  }
}
