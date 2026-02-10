import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/question.dart';
import '../../services/question_service.dart';
import '../../services/exam_service.dart';
import '../practice/exam_result_page.dart';
import '../../widgets/question_explanation_panel.dart';

class QuizPage extends StatefulWidget {
  final String mode; // 'sequential', 'random', 'mock'
  final String libraryCode;
  final String? startQuestionId;

  const QuizPage({
    super.key,
    required this.mode,
    this.libraryCode = 'A_CLASS',
    this.startQuestionId,
  });

  @override
  State<QuizPage> createState() => _QuizPageState();
}

class _QuizPageState extends State<QuizPage> {
  final _questionService = QuestionService();
  final _examService = ExamService();
  final PageController _pageController = PageController();
  
  List<Question> _questions = [];
  int _totalQuestions = 0;
  int _page = 1;
  bool _hasMore = false;
  bool _isPaging = false;
  int _browsedCount = 0;
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

  bool get _isExamMode => widget.mode == 'mock';
  bool get _isSequentialMode => widget.mode == 'sequential';

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

      _page = 1;
      if (_isSequentialMode) {
        final payload = await _questionService.getNextQuestion(
          libraryCode: widget.libraryCode,
          mode: widget.mode,
          questionId: widget.startQuestionId,
        );
        final question = Question.fromJson(payload['question']);
        setState(() {
          _questions = [question];
          _totalQuestions = payload['totalQuestions'] ?? 0;
          _browsedCount = payload['browsedCount'] ?? 0;
          _hasMore = true;
          _isLoading = false;
        });
      } else {
        final result = await _questionService.getQuestionsPaged(
          libraryCode: widget.libraryCode,
          pageSize: _isExamMode ? 30 : 50, // Exam usually has fixed size
          mode: widget.mode,
        );

        setState(() {
          _questions = result.questions;
          _totalQuestions = result.total;
          _hasMore = (widget.mode == 'sequential' || widget.mode == 'wrong') ? result.hasMore : false;
          _isLoading = false;
          if (_isExamMode) {
            _startTimer();
          }
        });
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _loadMoreQuestions() async {
    if (_isPaging || !_hasMore) return;
    setState(() => _isPaging = true);

    try {
      final nextPage = _page + 1;
      final result = await _questionService.getQuestionsPaged(
        libraryCode: widget.libraryCode,
        page: nextPage,
        pageSize: _isExamMode ? 30 : 50,
        mode: widget.mode,
      );

      if (mounted) {
        setState(() {
          _page = nextPage;
          _questions.addAll(result.questions);
          _totalQuestions = result.total;
          _hasMore = result.hasMore;
          _isPaging = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isPaging = false);
      }
    }
  }

  Future<bool> _fetchNextSequentialQuestion() async {
    try {
      final currentId = _questions.isNotEmpty ? _questions.last.id : null;
      final payload = await _questionService.getNextQuestion(
        libraryCode: widget.libraryCode,
        mode: widget.mode,
        currentId: currentId,
      );
      final question = Question.fromJson(payload['question']);
      if (mounted) {
        setState(() {
          _questions.add(question);
          _totalQuestions = payload['totalQuestions'] ?? _totalQuestions;
          _browsedCount = payload['browsedCount'] ?? _browsedCount;
        });
      }
      return true;
    } catch (_) {
      return false;
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
        }
      }
    });
  }

  Future<void> _submitQuestion(Question question) async {
     if (_revealedAnswers[question.id] == true) return;

     setState(() {
        if (question.isMultipleChoice) {
            // Commit pending selections to userAnswers
            final selected = _pendingSelections[question.id] ?? {};
            if (selected.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('请至少选择一个选项')),
                );
                return;
            }
            _userAnswers[question.id] = selected.toList();
        } else {
            // For single choice, it might already be set, but ensure it's marked revealed
            if (_userAnswers[question.id] == null) {
                 // Or skip?
                 return;
            }
        }
        _revealedAnswers[question.id] = true;
     });

     if (!_isExamMode) {
       try {
         final answer = _userAnswers[question.id] ?? [];
         await _questionService.submitPracticeAnswer(
           questionId: question.id,
           userAnswer: question.isMultipleChoice ? answer : (answer.isNotEmpty ? answer.first : ''),
           answerMapping: question.answerMapping,
           mode: widget.mode,
         );
         if (_isSequentialMode) {
           setState(() {
             if (_browsedCount < _totalQuestions) {
               _browsedCount += 1;
             }
           });
         }
       } catch (_) {
         // Ignore submit failure to avoid blocking UI
       }
     }
  }
  
  Future<void> _skipQuestion(Question question) async {
      setState(() {
          _revealedAnswers[question.id] = true;
          // Don't mark any answer, just reveal
      });

      if (!_isExamMode) {
        try {
          await _questionService.markQuestionSeen(questionId: question.id);
          if (_isSequentialMode) {
            setState(() {
              if (_browsedCount < _totalQuestions) {
                _browsedCount += 1;
              }
            });
          }
        } catch (_) {
          // Ignore mark failure
        }
      }
  }

  Future<void> _submitExam() async {
    _timer?.cancel();
    setState(() => _isLoading = true);

    try {
      // Calculate score locally for immediate feedback (or rely on backend response)
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
    final int currentIndex = _pageController.hasClients ? _pageController.page?.round() ?? 0 : 0;
    final int displayTotal = _totalQuestions > 0 ? _totalQuestions : _questions.length;
    final int displayIndex = _isSequentialMode ? (_browsedCount + 1).clamp(1, displayTotal) : (currentIndex + 1);

    return Scaffold(
      appBar: AppBar(
        title: _isExamMode
            ? Text('剩余时间: ${_formatTime(_secondsRemaining)}')
            : Text('${_getModeTitle()} ${displayTotal > 0 ? '$displayIndex/$displayTotal' : ''}'),
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
                  value: displayTotal > 0
                      ? (displayIndex) / displayTotal
                      : 0,
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
                          onPressed: () async {
                               if (currentQuestion != null) {
                                 await _skipQuestion(currentQuestion);
                               }
                               if (currentIndex < _questions.length - 1) {
                                   _pageController.nextPage(
                                      duration: const Duration(milliseconds: 300),
                                      curve: Curves.easeInOut,
                                   );
                               } else {
                                   if (_isSequentialMode) {
                                     final loaded = await _fetchNextSequentialQuestion();
                                     if (loaded && mounted) {
                                       _pageController.nextPage(
                                         duration: const Duration(milliseconds: 300),
                                         curve: Curves.easeInOut,
                                       );
                                     } else {
                                       ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('已经是最后一题了')));
                                     }
                                   } else {
                                     // Last question skipped? Show toast or result?
                                     ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('已经是最后一题了')));
                                   }
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
                      onPressed: () async {
                         if (currentQuestion != null) {
                             if (_revealedAnswers[currentQuestion.id] == true) {
                                 // Already submitted/revealed, go to next
                                 if (currentIndex < _questions.length - 1) {
                                     _pageController.nextPage(
                                         duration: const Duration(milliseconds: 300),
                                         curve: Curves.easeInOut,
                                     );
                                 } else {
                                     if (_isSequentialMode) {
                                       final loaded = await _fetchNextSequentialQuestion();
                                       if (loaded && mounted) {
                                         _pageController.nextPage(
                                           duration: const Duration(milliseconds: 300),
                                           curve: Curves.easeInOut,
                                         );
                                       } else {
                                         Navigator.pop(context);
                                       }
                                     } else {
                                       // Finish
                                       Navigator.pop(context); 
                                     }
                                 }
                             } else {
                                 // Submit
                                 await _submitQuestion(currentQuestion);
                             }
                         }
                      },
                      style: FilledButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      child: Text(
                          (currentQuestion != null && _revealedAnswers[currentQuestion.id] == true)
                              ? (currentIndex < _questions.length - 1 ? '下一题' : (_isSequentialMode ? '下一题' : '完成练习'))
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
        if ((widget.mode == 'sequential' || widget.mode == 'wrong') &&
            index >= _questions.length - 3) {
          if (_isSequentialMode) {
            _fetchNextSequentialQuestion();
          } else {
            _loadMoreQuestions();
          }
        }
        setState(() {}); // Rebuild to update progress bar and button label
      },
    );
  }

  Widget _buildQuestionCard(Question question, int index) {
    final userAnswers = _userAnswers[question.id] ?? [];
    final pendingAnswers = _pendingSelections[question.id] ?? {};
    final isRevealed = _revealedAnswers[question.id] == true;
    final displayTotal = _totalQuestions > 0 ? _totalQuestions : _questions.length;
    final displayIndex = _isSequentialMode ? (_browsedCount + 1).clamp(1, displayTotal) : (index + 1);

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
                '第 ${displayIndex}/${displayTotal} 题',
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
                  question.isMultipleChoice ? '多选题' : (question.type == 'JUDGEMENT' ? '判断题' : '单选题'),
                  style: Theme.of(context).textTheme.labelSmall,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (question.externalId.isNotEmpty) _buildTagChip('题号 ${question.externalId}'),
              if (question.category != null && question.category!.isNotEmpty)
                _buildTagChip(question.category!),
              if (question.categoryCode != null && question.categoryCode!.isNotEmpty)
                _buildTagChip(question.categoryCode!),
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
             // Explanation Area
             QuestionExplanationPanel(question: question),
          ],
        ],
      ),
    );
  }

  Widget _buildTagChip(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        text,
        style: Theme.of(context).textTheme.labelSmall,
      ),
    );
  }
}
