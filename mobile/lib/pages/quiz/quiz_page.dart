import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/question.dart';
import '../../services/question_service.dart';

class QuizPage extends StatefulWidget {
  final String mode; // 'sequential', 'random', etc.
  final String libraryCode;

  const QuizPage({
    super.key,
    required this.mode,
    this.libraryCode = 'A_CLASS',
  });

  @override
  State<QuizPage> createState() => _QuizPageState();
}

class _QuizPageState extends State<QuizPage> {
  final _questionService = QuestionService();
  final PageController _pageController = PageController();
  
  List<Question> _questions = [];
  bool _isLoading = true;
  String? _error;
  
  // Track answers: questionId -> selectedOptionId
  final Map<String, String> _userAnswers = {};
  // Track if answer was revealed: questionId -> true
  final Map<String, bool> _revealedAnswers = {};

  @override
  void initState() {
    super.initState();
    _loadQuestions();
  }

  Future<void> _loadQuestions() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      // TODO: Implement different loading logic based on widget.mode
      // For now, just load the first page of the library
      final questions = await _questionService.getQuestions(
        libraryCode: widget.libraryCode,
        pageSize: 50, // Load a batch
      );

      setState(() {
        _questions = questions;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  void _handleOptionSelected(Question question, String optionId) {
    if (_userAnswers.containsKey(question.id)) return; // Already answered

    setState(() {
      _userAnswers[question.id] = optionId;
      _revealedAnswers[question.id] = true; // Show result immediately
    });

    // TODO: Send answer to backend/analytics
    
    // Auto-advance after a short delay if correct? 
    // For now, let user swipe manually or click next.
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_getModeTitle()),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline),
            onPressed: () {
              // Show quiz info
            },
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  String _getModeTitle() {
    switch (widget.mode) {
      case 'sequential': return 'Sequential Practice';
      case 'random': return 'Random Practice';
      case 'mock': return 'Mock Exam';
      default: return 'Practice';
    }
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text('Error: $_error'),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _loadQuestions,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_questions.isEmpty) {
      return const Center(child: Text('No questions found.'));
    }

    return PageView.builder(
      controller: _pageController,
      itemCount: _questions.length,
      itemBuilder: (context, index) {
        return _buildQuestionCard(_questions[index], index);
      },
    );
  }

  Widget _buildQuestionCard(Question question, int index) {
    final userAnswer = _userAnswers[question.id];
    final isAnswered = userAnswer != null;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Question Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Question ${index + 1}/${_questions.length}',
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: Colors.grey,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  question.type == 'JUDGEMENT' ? '判断题' : '选择题',
                  style: Theme.of(context).textTheme.labelSmall,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          
          // Question Title
          Text(
            question.title,
            style: Theme.of(context).textTheme.titleLarge,
          ),
          
          const SizedBox(height: 24),

          // Options
          ...question.options.map((option) {
            final isSelected = userAnswer == option.id;
            final isCorrect = question.correctAnswers.contains(option.id);
            
            Color? cardColor;
            Color borderColor = Colors.transparent;
            
            if (isAnswered) {
                if (isSelected) {
                    cardColor = isCorrect 
                        ? Colors.green.withOpacity(0.1) 
                        : Colors.red.withOpacity(0.1);
                    borderColor = isCorrect ? Colors.green : Colors.red;
                } else if (isCorrect) {
                    // Show correct answer if user picked wrong one
                     cardColor = Colors.green.withOpacity(0.1);
                     borderColor = Colors.green;
                }
            }

            return Card(
              color: cardColor,
              margin: const EdgeInsets.only(bottom: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
                side: BorderSide(
                  color: borderColor,
                  width: 2,
                ),
              ),
              child: InkWell(
                onTap: isAnswered ? null : () => _handleOptionSelected(question, option.id),
                borderRadius: BorderRadius.circular(8),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Row(
                    children: [
                      Container(
                        width: 24,
                        height: 24,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isSelected || (isAnswered && isCorrect)
                                ? (isCorrect ? Colors.green : Colors.red)
                                : Colors.grey,
                          ),
                          color: isSelected || (isAnswered && isCorrect)
                              ? (isCorrect ? Colors.green : Colors.red)
                              : null,
                        ),
                        child: isSelected || (isAnswered && isCorrect)
                            ? Icon(
                                isCorrect ? Icons.check : Icons.close,
                                size: 16, 
                                color: Colors.white
                              )
                            : Text(
                                String.fromCharCode(65 + question.options.indexOf(option)), // A, B, C...
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                            option.text,
                            style: TextStyle(
                                color: isAnswered && isCorrect ? Colors.green[800] : null,
                                fontWeight: isAnswered && isCorrect ? FontWeight.bold : null,
                            ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),

          if (isAnswered) ...[
             const SizedBox(height: 24),
             // Explanation Area
             Container(
               padding: const EdgeInsets.all(16),
               decoration: BoxDecoration(
                 color: Colors.blue.withOpacity(0.05),
                 borderRadius: BorderRadius.circular(8),
                 border: Border.all(color: Colors.blue.withOpacity(0.3)),
               ),
               child: Column(
                 crossAxisAlignment: CrossAxisAlignment.start,
                 children: [
                    const Row(
                        children: [
                            Icon(Icons.lightbulb, color: Colors.amber),
                            SizedBox(width: 8),
                            Text('Explanation', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blueGrey)),
                        ],
                    ),
                    const SizedBox(height: 8),
                    Text(question.explanation ?? 'No explanation available.'),
                 ],
               ),
             )
          ],
        ],
      ),
    );
  }
}
