import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/question.dart';
import '../../services/question_service.dart';
import '../../services/exam_service.dart';
import '../practice/exam_result_page.dart';

class QuizPage extends StatefulWidget {
  final String mode; // 'sequential', 'random', 'mock'
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
  final _examService = ExamService();
  final PageController _pageController = PageController();
  
  List<Question> _questions = [];
  bool _isLoading = true;
  String? _error;
  
  // Track answers: questionId -> selectedOptionId
  final Map<String, String> _userAnswers = {};
  // Track if answer was revealed: questionId -> true
  final Map<String, bool> _revealedAnswers = {};

  // Exam Mode
  Timer? _timer;
  int _secondsRemaining = 45 * 60; // 45 minutes default for exam

  bool get _isExamMode => widget.mode == 'mock';

  @override
  void initState() {
    super.initState();
    _loadQuestions();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _loadQuestions() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      final questions = await _questionService.getQuestions(
        libraryCode: widget.libraryCode,
        pageSize: _isExamMode ? 30 : 50, // Exam usually has fixed size
        mode: widget.mode,
      );

      setState(() {
        _questions = questions;
        _isLoading = false;
        if (_isExamMode) {
          _startTimer();
        }
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsRemaining > 0) {
        setState(() {
          _secondsRemaining--;
        });
      } else {
        _timer?.cancel();
        _submitExam();
      }
    });
  }

  String _formatTime(int seconds) {
    final m = seconds ~/ 60;
    final s = seconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  void _handleOptionSelected(Question question, String optionId) {
    setState(() {
      _userAnswers[question.id] = optionId;
      if (!_isExamMode) {
        _revealedAnswers[question.id] = true; 
      }
    });
  }

  Future<void> _submitExam() async {
    _timer?.cancel();
    setState(() => _isLoading = true);

    try {
      // Calculate score locally for immediate feedback (or rely on backend response)
      int correctCount = 0;
      for (var q in _questions) {
        final answer = _userAnswers[q.id];
        if (answer != null && q.correctAnswers.contains(answer)) {
          correctCount++;
        }
      }
      
      // Navigate to Result Page
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => ExamResultPage(
              score: (correctCount / _questions.length * 100).toInt(),
              correctCount: correctCount,
              totalQuestions: _questions.length,
              timeSpent: (45 * 60) - _secondsRemaining,
            ),
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to submit: $e')),
      );
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: _isExamMode 
          ? Text('剩余时间: ${_formatTime(_secondsRemaining)}') 
          : Text(_getModeTitle()),
        actions: [
          if (_isExamMode)
            TextButton(
              onPressed: _submitExam,
              child: const Text('交卷', style: TextStyle(color: Colors.white)),
            ),
          if (!_isExamMode)
            IconButton(
              icon: const Icon(Icons.info_outline),
              onPressed: () {},
            ),
        ],
      ),
      body: Column(
        children: [
          if (!_isLoading && _questions.isNotEmpty)
            LinearProgressIndicator(
              value: (_questions.isEmpty) ? 0 : (_pageController.hasClients ? _pageController.page ?? 0 : 0) / _questions.length,
              minHeight: 4,
            ),
          Expanded(child: _buildBody()),
          if (!_isLoading && _questions.isNotEmpty)
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  OutlinedButton.icon(
                    onPressed: () {
                      _pageController.previousPage(
                        duration: const Duration(milliseconds: 300),
                        curve: Curves.easeInOut,
                      );
                    },
                    icon: const Icon(Icons.arrow_back),
                    label: const Text('上一题'),
                  ),
                  FilledButton.icon(
                    onPressed: () {
                      if (_pageController.page!.toInt() == _questions.length - 1) {
                         if (_isExamMode) {
                           _submitExam();
                         } else {
                           Navigator.pop(context);
                         }
                      } else {
                        _pageController.nextPage(
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeInOut,
                        );
                      }
                    },
                    icon: Icon(_pageController.hasClients && _pageController.page!.toInt() == _questions.length - 1 ? Icons.check : Icons.arrow_forward),
                    label: Text(_pageController.hasClients && _pageController.page!.toInt() == _questions.length - 1 ? (_isExamMode ? '交卷' : '完成') : '下一题'),
                    iconAlignment: IconAlignment.end, 
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  String _getModeTitle() {
    switch (widget.mode) {
      case 'sequential': return '顺序练习';
      case 'random': return '随机练习';
      case 'mock': return '模拟考试';
      default: return '练题';
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
            Text('出错了: $_error'),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _loadQuestions,
              child: const Text('重试'),
            ),
          ],
        ),
      );
    }

    if (_questions.isEmpty) {
      return const Center(child: Text('没有找到题目。'));
    }

    return PageView.builder(
      controller: _pageController,
      itemCount: _questions.length,
      itemBuilder: (context, index) {
        return _buildQuestionCard(_questions[index], index);
      },
      onPageChanged: (index) {
        setState(() {}); // Rebuild to update progress bar and button label
      },
    );
  }

  Widget _buildQuestionCard(Question question, int index) {
    final userAnswer = _userAnswers[question.id];
    final isAnswered = userAnswer != null;
    final isRevealed = _revealedAnswers[question.id] == true;

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
                '第 ${index + 1}/${_questions.length} 题',
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
            
            if (isRevealed) {
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
            } else if (isSelected) {
                // Exam mode or just selected but not revealed
                cardColor = Theme.of(context).colorScheme.primaryContainer;
                borderColor = Theme.of(context).colorScheme.primary;
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
                onTap: (isRevealed && !_isExamMode) ? null : () => _handleOptionSelected(question, option.id),
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
                            color: isSelected || (isRevealed && isCorrect)
                                ? ((isRevealed && !isCorrect && !isSelected) ? Colors.green : (isSelected ? Theme.of(context).colorScheme.primary : Colors.grey))
                                : Colors.grey,
                          ),
                          color: isSelected || (isRevealed && isCorrect)
                              ? (isRevealed 
                                  ? (isCorrect ? Colors.green : (isSelected ? Colors.red : null)) 
                                  : Theme.of(context).colorScheme.primary)
                              : null,
                        ),
                        child: isSelected || (isRevealed && isCorrect)
                            ? Icon(
                                isRevealed 
                                  ? (isCorrect ? Icons.check : Icons.close)
                                  : Icons.circle, // Just a dot for selected in exam
                                size: 12, 
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
                                color: isRevealed && isCorrect ? Colors.green[800] : null,
                                fontWeight: isRevealed && isCorrect ? FontWeight.bold : null,
                            ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),

          if (isRevealed) ...[
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
