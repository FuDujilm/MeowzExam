import 'question.dart';

class PagedQuestionResult {
  final List<Question> questions;
  final int total;
  final bool hasMore;
  final int? page;
  final int? totalPages;

  PagedQuestionResult({
    required this.questions,
    required this.total,
    required this.hasMore,
    this.page,
    this.totalPages,
  });

  factory PagedQuestionResult.empty() {
    return PagedQuestionResult(questions: [], total: 0, hasMore: false);
  }
}
