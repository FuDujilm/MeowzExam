import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/question.dart';
import '../../services/question_service.dart';
import '../../services/exam_service.dart';
import '../practice/exam_result_page.dart';
import '../../widgets/ai_explanation_widget.dart';

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
  
  // Track answers: questionId -> selectedOptionIds
  final Map<String, List<String>> _userAnswers = {};
  // Track if answer was revealed: questionId -> true
  final Map<String, bool> _revealedAnswers = {};
  // Track currently selected (unsubmitted) answers for multiple choice
  final Map<String, Set<String>> _pendingSelections = {};

  // Exam Mode
  Timer? _timer;
  int _secondsRemaining = 45 * 60; // 45 minutes default for exam
  
  // Backend Exam Session Data
  String? _examId;
  String? _examResultId;
  Map<String, dynamic> _answerMappings = {};

  // Pagination
  int _totalQuestions = 0;
  int _currentPage = 1;
  bool _hasMore = true;
  bool _isFetchingMore = false;

  bool get _isExamMode => widget.mode == 'mock';
  bool get _isSequential => widget.mode == 'sequential';

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

  Future<void> _loadQuestions({bool refresh = true}) async {
    if (_isFetchingMore) return;
    if (!refresh && !_hasMore) return;

    try {
      if (refresh) {
        setState(() {
          _isLoading = true;
          _error = null;
          _questions = [];
          _currentPage = 1;
          _hasMore = true;
        });
      } else {
        setState(() {
          _isFetchingMore = true;
        });
      }

      if (_isExamMode) {
        // ... (Exam mode logic remains same, usually not paginated in this simple implementation)
        // For simplicity, exam mode loads all questions at once (e.g. 100) or handles pagination internally
        // Current implementation:
        final result = await _examService.startExam(widget.libraryCode);
        _examId = result['examId'];
        _examResultId = result['examResultId'];
        
        final questionsData = result['questions'] as List;
        final List<Question> questions = [];
        
        for (var qData in questionsData) {
           questions.add(Question.fromJson(qData));
           if (qData['answerMapping'] != null) {
             _answerMappings[qData['id']] = qData['answerMapping'];
           }
        }
        
        if (result['config'] != null && result['config']['duration'] != null) {
            _secondsRemaining = (result['config']['duration'] as int) * 60;
        }

        setState(() {
          _questions = questions;
          _totalQuestions = questions.length;
          _isLoading = false;
          _startTimer();
        });
        
      } else {
        // Practice Mode (Sequential / Random)
        final result = await _questionService.getQuestions(
          libraryCode: widget.libraryCode,
          page: _currentPage,
          pageSize: 20, // Load 20 at a time
          mode: widget.mode,
        );

        setState(() {
          if (refresh) {
            _questions = result.questions;
          } else {
            _questions.addAll(result.questions);
          }
          
          _totalQuestions = result.total;
          _hasMore = result.hasMore;
          _currentPage++;
          _isLoading = false;
          _isFetchingMore = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
        _isFetchingMore = false;
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
    if (_revealedAnswers[question.id] == true && !_isExamMode) return;

    setState(() {
      if (question.isMultipleChoice) {
        // Toggle selection for multiple choice
        final currentSelections = _pendingSelections[question.id] ?? {};
        if (currentSelections.contains(optionId)) {
          currentSelections.remove(optionId);
        } else {
          currentSelections.add(optionId);
        }
        _pendingSelections[question.id] = currentSelections;
      } else {
        // Single choice: update directly and reveal if not exam mode
        _userAnswers[question.id] = [optionId];
        
        if (!_isExamMode) {
          _revealedAnswers[question.id] = true;
          
          // Auto-advance logic for sequential practice
          if (_isSequential) {
             final isCorrect = question.correctAnswers.contains(optionId);
             if (isCorrect) {
                 Future.delayed(const Duration(milliseconds: 800), () {
                     if (mounted && _pageController.hasClients) {
                         // Check if we are still on the same page and it's revealed
                         // Simple check: navigate next
                         if (_pageController.page!.toInt() < _totalQuestions - 1) {
                             _pageController.nextPage(
                                duration: const Duration(milliseconds: 300), 
                                curve: Curves.easeInOut
                             );
                         } else if (_hasMore) {
                             // Trigger load more explicitly if at boundary? 
                             // _onPageChanged should handle it, but nextPage might not trigger it if we are at strict end of list before fetch?
                             // _loadQuestions will append.
                             // Just trying nextPage might fail if page doesn't exist yet.
                             // But we load ahead.
                         }
                     }
                 });
             }
          }
        }
      }
    });
  }

  void _submitQuestion(Question question) {
     if (_revealedAnswers[question.id] == true) return;

     setState(() {
        List<String> selectedAnswer = [];
        if (question.isMultipleChoice) {
            // Commit pending selections to userAnswers
            final selected = _pendingSelections[question.id] ?? {};
            if (selected.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('请至少选择一个选项')),
                );
                return;
            }
            selectedAnswer = selected.toList();
            _userAnswers[question.id] = selectedAnswer;
        } else {
            // For single choice, it might already be set, but ensure it's marked revealed
            if (_userAnswers[question.id] == null) {
                 // Or skip?
                 return;
            }
            selectedAnswer = _userAnswers[question.id]!;
        }
        _revealedAnswers[question.id] = true;
        
        // Record answer in backend (Practice Mode)
        if (!_isExamMode) {
            _questionService.submitAnswer(
                questionId: question.id,
                userAnswer: question.isMultipleChoice ? selectedAnswer : selectedAnswer.first,
                mode: widget.mode, // 'sequential' maps to 'daily' in service if needed
            ).then((result) {
                if (result['pointsEarned'] != null && (result['pointsEarned'] as int) > 0) {
                     ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('回答正确 +${result['pointsEarned']} 积分')),
                     );
                }
            });
        }
     });
  }
  
  void _skipQuestion(Question question) {
      setState(() {
          _revealedAnswers[question.id] = true;
          // Don't mark any answer, just reveal
      });
  }

  Future<void> _submitExam() async {
    _timer?.cancel();
    setState(() => _isLoading = true);

    try {
      // 1. Prepare Answers
      final Map<String, dynamic> answersPayload = {};
      for (var entry in _userAnswers.entries) {
          if (entry.value.isNotEmpty) {
             // If multiple choice, send list. If single, send string? 
             // Backend normalizeAnswerList handles list or string.
             // Usually for single choice we send string ID.
             if (entry.value.length == 1) {
                 answersPayload[entry.key] = entry.value.first;
             } else {
                 answersPayload[entry.key] = entry.value;
             }
          }
      }

      // 2. Submit to Backend if Exam Mode
      if (_isExamMode && _examId != null && _examResultId != null) {
          final result = await _examService.submitExam({
             'examId': _examId,
             'examResultId': _examResultId,
             'answers': answersPayload,
             'answerMappings': _answerMappings,
          });
          
          if (mounted) {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                builder: (_) => ExamResultPage(
                  score: result['score'] ?? 0,
                  correctCount: result['correctCount'] ?? 0,
                  totalQuestions: result['totalQuestions'] ?? 0,
                  timeSpent: (45 * 60) - _secondsRemaining, // Approx
                  passed: result['passed'] ?? false,
                  detailedResults: result['questionResults'],
                ),
              ),
            );
          }
          return;
      }

      // Fallback for offline/local calculation (should rarely happen if startExam works)
      int correctCount = 0;
      for (var q in _questions) {
        final answer = _userAnswers[q.id]; // List<String>
        if (answer != null) {
            // Check if lists contain same elements
            final isCorrect = answer.length == q.correctAnswers.length && 
                              answer.toSet().containsAll(q.correctAnswers);
            if (isCorrect) correctCount++;
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
    final currentIndex = _pageController.hasClients ? _pageController.page?.round() ?? 0 : 0;
    final currentTotal = _isExamMode ? _questions.length : _totalQuestions;
    
    return Scaffold(
      appBar: AppBar(
        centerTitle: true,
        title: Column(
          children: [
             Text(_isExamMode ? '剩余时间: ${_formatTime(_secondsRemaining)}' : _getModeTitle(), style: const TextStyle(fontSize: 16)),
             if (!_isLoading)
               Text('${currentIndex + 1}/$currentTotal', style: const TextStyle(fontSize: 12, color: Colors.grey)),
          ],
        ),
        actions: [
          if (_isExamMode)
            TextButton(
              onPressed: _submitExam,
              child: const Text('交卷', style: TextStyle(color: Colors.white)),
            ),
        ],
      ),
      body: Stack(
        children: [
          // Content
          Column(
            children: [
              if (!_isLoading && _questions.isNotEmpty)
                LinearProgressIndicator(
                  value: (_questions.isEmpty) ? 0 : (_pageController.hasClients ? _pageController.page ?? 0 : 0) / _questions.length,
                  minHeight: 4,
                ),
              Expanded(child: _buildBody()),
              // Add padding at bottom to avoid overlap with floating panel
              if (!_isExamMode) const SizedBox(height: 200),
            ],
          ),
          
          // Floating Control Panel (Only in Practice Mode)
          if (!_isExamMode && !_isLoading && _questions.isNotEmpty)
             Positioned(
               left: 16,
               right: 16,
               bottom: 16,
               child: _buildFloatingControlPanel(),
             ),
             
          // Exam Mode Bottom Bar (Standard)
          if (_isExamMode && !_isLoading && _questions.isNotEmpty)
             Positioned(
               left: 0,
               right: 0,
               bottom: 0,
               child: Container(
                 padding: const EdgeInsets.all(16),
                 color: Theme.of(context).colorScheme.surface,
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
                           _submitExam();
                        } else {
                          _pageController.nextPage(
                            duration: const Duration(milliseconds: 300),
                            curve: Curves.easeInOut,
                          );
                        }
                      },
                      icon: Icon(_pageController.hasClients && _pageController.page!.toInt() == _questions.length - 1 ? Icons.check : Icons.arrow_forward),
                      label: Text(_pageController.hasClients && _pageController.page!.toInt() == _questions.length - 1 ? '交卷' : '下一题'),
                      iconAlignment: IconAlignment.end, 
                    ),
                  ],
                 ),
               ),
             ),
        ],
      ),
    );
  }

  Widget _buildFloatingControlPanel() {
    // Current Question
    final int currentIndex = _pageController.hasClients ? _pageController.page?.round() ?? 0 : 0;
    final Question? currentQuestion = _questions.isNotEmpty && currentIndex < _questions.length ? _questions[currentIndex] : null;

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
           BoxShadow(
             color: Colors.black.withOpacity(0.1),
             blurRadius: 10,
             offset: const Offset(0, 4),
           )
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainer.withOpacity(0.7),
              border: Border.all(
                color: Colors.white.withOpacity(0.2),
                width: 0.5,
              ),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Row 1: Return to Home
                InkWell(
                  onTap: () => Navigator.of(context).pop(),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor.withOpacity(0.1))),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                         Icon(Icons.chevron_left, size: 20, color: Colors.grey),
                         SizedBox(width: 4),
                         Text('返回首页', style: TextStyle(color: Colors.grey)),
                      ],
                    ),
                  ),
                ),
                
                // Row 2: Previous | Skip
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: currentIndex > 0 ? () {
                              _pageController.previousPage(
                                duration: const Duration(milliseconds: 300),
                                curve: Curves.easeInOut,
                              );
                          } : null,
                          icon: const Icon(Icons.arrow_back, size: 18),
                          label: const Text('上一题'),
                          style: OutlinedButton.styleFrom(
                             padding: const EdgeInsets.symmetric(vertical: 12),
                             backgroundColor: Colors.transparent, 
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                               if (currentQuestion != null) _skipQuestion(currentQuestion);
                               if (currentIndex < _questions.length - 1) {
                                   _pageController.nextPage(
                                      duration: const Duration(milliseconds: 300),
                                      curve: Curves.easeInOut,
                                   );
                               } else {
                                   // Last question skipped? Show toast or result?
                                   ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('已经是最后一题了')));
                               }
                          },
                          icon: const Icon(Icons.skip_next, size: 18),
                          label: const Text('跳过'),
                          iconAlignment: IconAlignment.end,
                          style: OutlinedButton.styleFrom(
                             padding: const EdgeInsets.symmetric(vertical: 12),
                             backgroundColor: Colors.transparent,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Row 3: Submit Answer
                Padding(
                  padding: const EdgeInsets.only(left: 16, right: 16, bottom: 16),
                  child: SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () {
                         if (currentQuestion != null) {
                             if (_revealedAnswers[currentQuestion.id] == true) {
                                 // Already submitted/revealed, go to next
                                 if (currentIndex < _questions.length - 1) {
                                     _pageController.nextPage(
                                         duration: const Duration(milliseconds: 300),
                                         curve: Curves.easeInOut,
                                     );
                                 } else {
                                     // Finish
                                     Navigator.pop(context); 
                                 }
                             } else {
                                 // Submit
                                 _submitQuestion(currentQuestion);
                             }
                         }
                      },
                      style: FilledButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      child: Text(
                          (currentQuestion != null && _revealedAnswers[currentQuestion.id] == true)
                              ? (currentIndex < _questions.length - 1 ? '下一题' : '完成练习')
                              : '提交答案'
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
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
        
        // Load more if approaching end
        if (!_isExamMode && _hasMore && !_isFetchingMore && index >= _questions.length - 3) {
          _loadQuestions(refresh: false);
        }
      },
    );
  }

  Widget _buildQuestionCard(Question question, int index) {
    final userAnswers = _userAnswers[question.id] ?? [];
    final pendingAnswers = _pendingSelections[question.id] ?? {};
    final isRevealed = _revealedAnswers[question.id] == true;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Question Header Tags
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
               if (question.category != null)
                 Container(
                   padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                   decoration: BoxDecoration(
                     color: Colors.blue.withOpacity(0.1),
                     borderRadius: BorderRadius.circular(4),
                     border: Border.all(color: Colors.blue.withOpacity(0.3)),
                   ),
                   child: Text(
                     question.category!,
                     style: TextStyle(fontSize: 12, color: Colors.blue[700], fontWeight: FontWeight.bold),
                   ),
                 ),
               Container(
                 padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                 decoration: BoxDecoration(
                   color: Theme.of(context).colorScheme.surfaceContainerHighest,
                   borderRadius: BorderRadius.circular(4),
                 ),
                 child: Text(
                   question.isMultipleChoice ? '多选题' : (question.type == 'JUDGEMENT' ? '判断题' : '单选题'),
                   style: Theme.of(context).textTheme.labelSmall,
                 ),
               ),
               if (question.externalId.isNotEmpty)
                 Container(
                   padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                   decoration: BoxDecoration(
                     color: Colors.grey.withOpacity(0.1),
                     borderRadius: BorderRadius.circular(4),
                     border: Border.all(color: Colors.grey.withOpacity(0.3)),
                   ),
                   child: Text(
                     question.externalId,
                     style: TextStyle(fontSize: 12, color: Colors.grey[700], fontFamily: 'monospace'),
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
            final isSelected = isRevealed 
                ? userAnswers.contains(option.id)
                : (question.isMultipleChoice 
                    ? pendingAnswers.contains(option.id) 
                    : userAnswers.contains(option.id));
            
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
                    // Show correct answer if user picked wrong one or missed it
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
                          shape: question.isMultipleChoice ? BoxShape.rectangle : BoxShape.circle,
                          borderRadius: question.isMultipleChoice ? BorderRadius.circular(4) : null,
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
                                  : (question.isMultipleChoice ? Icons.check : Icons.circle), 
                                size: 16, // Slightly bigger for checkbox
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
             // AI Explanation Widget
             AiExplanationWidget(question: question),
             // Add extra padding for floating panel
             const SizedBox(height: 80), 
          ],
        ],
      ),
    );
  }
}
