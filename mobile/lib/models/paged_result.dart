import 'question.dart';

class PagedQuestionResult {
  final List<Question> questions;
  final int total;
  final bool hasMore;

  PagedQuestionResult({
    required this.questions,
    required this.total,
    required this.hasMore,
  });

  factory PagedQuestionResult.empty() {
    return PagedQuestionResult(questions: [], total: 0, hasMore: false);
  }
}
