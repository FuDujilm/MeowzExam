import 'dart:async';
import 'dart:ui';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../../models/question.dart';
import '../../services/exam_service.dart';
import '../../services/question_service.dart';
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
  late final String _sessionId =
      'mobile-${widget.mode}-${widget.libraryCode}-${DateTime.now().millisecondsSinceEpoch}';

  List<Question> _questions = [];
  int _totalQuestions = 0;
  int _browsedCount = 0;
  bool _isLoading = true;
  String? _error;
  bool _isCompleted = false;
  final Map<String, int> _questionOrderMap = {};

  // Track answers: questionId -> selectedOptionIds
  final Map<String, List<String>> _userAnswers = {};
  // Track if answer was revealed: questionId -> true
  final Map<String, bool> _revealedAnswers = {};
  // Track currently selected (unsubmitted) answers for multiple choice
  final Map<String, Set<String>> _pendingSelections = {};

  // Exam Mode
  Timer? _timer;
  int _secondsRemaining = 45 * 60; // 45 minutes default for exam
  int _examDurationSeconds = 45 * 60;
  String? _examId;
  String? _examResultId;

  bool get _isExamMode => widget.mode == 'mock';
  bool get _isSequentialMode => widget.mode == 'sequential';
  bool get _isRandomMode => widget.mode == 'random';
  bool get _isHighErrorMode => widget.mode == 'high_error';
  bool get _usesNextQuestionFlow =>
      _isSequentialMode ||
      widget.mode == 'wrong' ||
      widget.mode == 'daily' ||
      _isHighErrorMode;

  bool get _hasReachedDisplayTotal =>
      !_isExamMode &&
      _totalQuestions > 0 &&
      _questions.length >= _totalQuestions;

  int _displayQuestionIndex(Question? question, int fallbackIndex) {
    if (!_isSequentialMode) {
      if (_totalQuestions <= 0) {
        return fallbackIndex < 1 ? 1 : fallbackIndex;
      }
      return fallbackIndex.clamp(1, _totalQuestions);
    }

    final resolvedIndex =
        _questionOrderMap[question?.id] ?? (_browsedCount + 1);
    if (_totalQuestions <= 0) {
      return resolvedIndex < 1 ? 1 : resolvedIndex;
    }

    return resolvedIndex.clamp(1, _totalQuestions);
  }

  String _readableError(Object error) {
    if (error is DioException) {
      final data = error.response?.data;
      if (data is Map && data['error'] is String) {
        return data['error'] as String;
      }
      if (error.response?.statusCode == 404) {
        return '没有找到可用题目，请切换题库或练习模式。';
      }
      if (error.response?.statusCode == 409) {
        return '当前练习已完成。';
      }
      return error.message ?? '请求失败，请稍后重试。';
    }
    return error.toString();
  }

  bool _isCompletionError(Object error) {
    if (error is! DioException) return false;
    final data = error.response?.data;
    return data is Map && data['completed'] == true;
  }

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
        _isCompleted = false;
      });

      if (_isExamMode) {
        final startedExam = await _examService.startExam(
          libraryCode: widget.libraryCode,
        );
        setState(() {
          _examId = startedExam.examId;
          _examResultId = startedExam.examResultId;
          _questions = startedExam.questions;
          _totalQuestions = startedExam.questions.length;
          _examDurationSeconds = startedExam.durationMinutes * 60;
          _secondsRemaining = _examDurationSeconds;
          _isLoading = false;
          _startTimer();
        });
      } else if (_usesNextQuestionFlow) {
        final payload = await _loadNextQuestionPayload();
        final question = Question.fromJson(payload['question']);
        final int? questionIndex = payload['questionIndex'] as int?;
        final dailyPractice = payload['dailyPractice'] as Map<String, dynamic>?;
        setState(() {
          _questions = [question];
          _totalQuestions = (dailyPractice?['target'] as int?) ??
              (payload['totalQuestions'] as int?) ??
              0;
          _browsedCount = (dailyPractice?['count'] as int?) ??
              (payload['browsedCount'] as int?) ??
              0;
          if (questionIndex != null) {
            _questionOrderMap[question.id] = questionIndex;
          }
          _isLoading = false;
        });
      } else {
        final result = await _questionService.getQuestionsPaged(
          libraryCode: widget.libraryCode,
          pageSize: 50,
          mode: widget.mode,
        );

        setState(() {
          _questions = result.questions;
          _totalQuestions = result.total;
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = _readableError(e);
        _isCompleted = _isCompletionError(e);
        _isLoading = false;
      });
    }
  }

  Future<Map<String, dynamic>> _loadNextQuestionPayload({String? currentId}) {
    if (_isHighErrorMode) {
      return _questionService.getHighErrorQuestion(
        libraryCode: widget.libraryCode,
        currentId: currentId,
      );
    }

    return _questionService.getNextQuestion(
      libraryCode: widget.libraryCode,
      mode: widget.mode,
      currentId: currentId,
      questionId: currentId == null ? widget.startQuestionId : null,
    );
  }

  Future<bool> _fetchNextFlowQuestion() async {
    try {
      final currentId = _questions.isNotEmpty ? _questions.last.id : null;
      final payload = await _loadNextQuestionPayload(currentId: currentId);
      final question = Question.fromJson(payload['question']);
      final int? questionIndex = payload['questionIndex'] as int?;
      final dailyPractice = payload['dailyPractice'] as Map<String, dynamic>?;
      if (mounted) {
        setState(() {
          _questions.add(question);
          _totalQuestions = (dailyPractice?['target'] as int?) ??
              (payload['totalQuestions'] as int?) ??
              _totalQuestions;
          _browsedCount = (dailyPractice?['count'] as int?) ??
              (payload['browsedCount'] as int?) ??
              _browsedCount;
          if (questionIndex != null) {
            _questionOrderMap[question.id] = questionIndex;
          }
        });
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> _fetchNextRandomQuestion() async {
    if (_hasReachedDisplayTotal) {
      return false;
    }

    try {
      for (var attempt = 0; attempt < 8; attempt += 1) {
        final currentIndex =
            _pageController.hasClients ? _pageController.page?.round() ?? 0 : 0;
        final currentId =
            _questions.isNotEmpty && currentIndex < _questions.length
                ? _questions[currentIndex].id
                : null;
        final payload = await _questionService.getNextQuestion(
          libraryCode: widget.libraryCode,
          mode: widget.mode,
          currentId: currentId,
        );
        final question = Question.fromJson(payload['question']);
        final nextTotal = payload['totalQuestions'] ?? _totalQuestions;
        if (mounted && _totalQuestions != nextTotal) {
          setState(() => _totalQuestions = nextTotal);
        }

        final alreadyLoaded = _questions.any((item) => item.id == question.id);
        if (alreadyLoaded) {
          continue;
        }

        if (mounted) {
          setState(() {
            _questions.add(question);
            _totalQuestions = nextTotal;
          });
        }
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  Future<bool> _fetchNextPracticeQuestion() {
    if (_usesNextQuestionFlow) {
      return _fetchNextFlowQuestion();
    }
    if (widget.mode == 'random') {
      return _fetchNextRandomQuestion();
    }
    return Future.value(false);
  }

  Future<bool> _goToNextPracticeQuestion() async {
    final currentIndex =
        _pageController.hasClients ? _pageController.page?.round() ?? 0 : 0;

    if (currentIndex < _questions.length - 1) {
      await _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
      return true;
    }

    final loaded = await _fetchNextPracticeQuestion();
    if (loaded && mounted) {
      await _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
      return true;
    }
    return false;
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
        // Single choice: update directly. Practice mode reveals on submit.
        _userAnswers[question.id] = [optionId];
      }
    });

    if (!_isExamMode && !question.isMultipleChoice) {
      _submitQuestion(question);
    }
  }

  Future<void> _submitQuestion(Question question) async {
    final wasRevealed = _revealedAnswers[question.id] == true;
    var canSubmit = true;

    setState(() {
      if (question.isMultipleChoice) {
        // Commit pending selections to userAnswers
        final selected = _pendingSelections[question.id] ?? {};
        if (selected.isEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('请至少选择一个选项')),
          );
          canSubmit = false;
          return;
        }
        _userAnswers[question.id] = selected.toList();
      } else {
        // For single choice, it might already be set, but ensure it's marked revealed
        if (_userAnswers[question.id] == null) {
          // Or skip?
          canSubmit = false;
          return;
        }
      }
      _revealedAnswers[question.id] = true;
    });

    if (!canSubmit) return;

    if (!_isExamMode) {
      try {
        final answer = _userAnswers[question.id] ?? [];
        await _questionService.submitPracticeAnswer(
          questionId: question.id,
          userAnswer: question.isMultipleChoice
              ? answer
              : (answer.isNotEmpty ? answer.first : ''),
          answerMapping: question.answerMapping,
          mode: widget.mode,
          sessionId: _sessionId,
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

    if (!wasRevealed && !_isExamMode && _isAnswerCorrect(question)) {
      _advanceAfterCorrectAnswer();
    }
  }

  bool _isAnswerCorrect(Question question) {
    final answer = _userAnswers[question.id] ?? [];
    return answer.length == question.correctAnswers.length &&
        answer.toSet().containsAll(question.correctAnswers);
  }

  Future<void> _advanceAfterCorrectAnswer() async {
    await Future.delayed(const Duration(milliseconds: 450));
    if (!mounted) return;

    await _goToNextPracticeQuestion();
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
      final timeSpent = _examDurationSeconds - _secondsRemaining;
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

      Map<String, dynamic>? submitResult;
      if (_examId != null && _examResultId != null) {
        submitResult = await _examService.submitExam({
          'examId': _examId,
          'examResultId': _examResultId,
          'answers': _userAnswers,
          'answerMappings': {
            for (final question in _questions)
              if (question.answerMapping != null)
                question.id: question.answerMapping,
          },
        });
      }

      final resultCorrectCount =
          (submitResult?['correctCount'] as num?)?.toInt() ?? correctCount;
      final resultTotalQuestions =
          (submitResult?['totalQuestions'] as num?)?.toInt() ??
              _questions.length;
      final resultPassed = submitResult?['passed'] as bool?;

      // Navigate to Result Page
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => ExamResultPage(
              score: resultTotalQuestions > 0
                  ? (resultCorrectCount / resultTotalQuestions * 100).toInt()
                  : 0,
              correctCount: resultCorrectCount,
              totalQuestions: resultTotalQuestions,
              timeSpent: timeSpent,
              passed: resultPassed,
              detailedResults:
                  submitResult?['questionResults'] as List<dynamic>?,
            ),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('提交考试失败: $e')),
      );
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final int currentIndex =
        _pageController.hasClients ? _pageController.page?.round() ?? 0 : 0;
    final int displayTotal =
        _totalQuestions > 0 ? _totalQuestions : _questions.length;
    final Question? currentQuestion =
        _questions.isNotEmpty && currentIndex < _questions.length
            ? _questions[currentIndex]
            : null;
    final int displayIndex =
        _displayQuestionIndex(currentQuestion, currentIndex + 1);

    return Scaffold(
      appBar: AppBar(
        title: _isExamMode
            ? Text('剩余时间: ${_formatTime(_secondsRemaining)}')
            : Text(
                '${_getModeTitle()} ${displayTotal > 0 ? '$displayIndex/$displayTotal' : ''}'),
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
                      ? (displayIndex / displayTotal).clamp(0.0, 1.0)
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
                        if (_pageController.page!.toInt() ==
                            _questions.length - 1) {
                          _submitExam();
                        } else {
                          _pageController.nextPage(
                            duration: const Duration(milliseconds: 300),
                            curve: Curves.easeInOut,
                          );
                        }
                      },
                      icon: Icon(_pageController.hasClients &&
                              _pageController.page!.toInt() ==
                                  _questions.length - 1
                          ? Icons.check
                          : Icons.arrow_forward),
                      label: Text(_pageController.hasClients &&
                              _pageController.page!.toInt() ==
                                  _questions.length - 1
                          ? '交卷'
                          : '下一题'),
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
    final int currentIndex =
        _pageController.hasClients ? _pageController.page?.round() ?? 0 : 0;
    final Question? currentQuestion =
        _questions.isNotEmpty && currentIndex < _questions.length
            ? _questions[currentIndex]
            : null;

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
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
              color: Theme.of(context)
                  .colorScheme
                  .surfaceContainer
                  .withValues(alpha: 0.7),
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.2),
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
                      border: Border(
                          bottom: BorderSide(
                              color: Theme.of(context)
                                  .dividerColor
                                  .withValues(alpha: 0.1))),
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
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: currentIndex > 0
                              ? () {
                                  _pageController.previousPage(
                                    duration: const Duration(milliseconds: 300),
                                    curve: Curves.easeInOut,
                                  );
                                }
                              : null,
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
                            final moved = await _goToNextPracticeQuestion();
                            if (!moved && mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('已经是最后一题了')));
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
                  padding:
                      const EdgeInsets.only(left: 16, right: 16, bottom: 16),
                  child: SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () async {
                        if (currentQuestion != null) {
                          if (_revealedAnswers[currentQuestion.id] == true) {
                            // Already submitted/revealed, go to next
                            final moved = await _goToNextPracticeQuestion();
                            if (!moved && mounted) {
                              Navigator.pop(context);
                            }
                          } else {
                            // Submit
                            await _submitQuestion(currentQuestion);
                          }
                        }
                      },
                      style: FilledButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        textStyle: const TextStyle(
                            fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      child: Text((currentQuestion != null &&
                              _revealedAnswers[currentQuestion.id] == true)
                          ? ((_isRandomMode && _hasReachedDisplayTotal) ||
                                  (!_isRandomMode &&
                                      !_isSequentialMode &&
                                      currentIndex >= _questions.length - 1)
                              ? '完成练习'
                              : '下一题')
                          : '提交答案'),
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
      case 'sequential':
        return '顺序练习';
      case 'random':
        return '随机练习';
      case 'mock':
        return '模拟考试';
      case 'wrong':
        return '错题回顾';
      case 'daily':
        return '每日精选';
      case 'high_error':
        return '高频错题';
      default:
        return '练题';
    }
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                _isCompleted ? Icons.check_circle_outline : Icons.error_outline,
                size: 56,
                color: _isCompleted ? Colors.green : Colors.red,
              ),
              const SizedBox(height: 16),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _isCompleted
                    ? () => Navigator.of(context).pop()
                    : _loadQuestions,
                child: Text(_isCompleted ? '返回' : '重试'),
              ),
            ],
          ),
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
        if (_usesNextQuestionFlow && index >= _questions.length - 3) {
          _fetchNextFlowQuestion();
        }
        setState(() {}); // Rebuild to update progress bar and button label
      },
    );
  }

  Widget _buildQuestionCard(Question question, int index) {
    final userAnswers = _userAnswers[question.id] ?? [];
    final pendingAnswers = _pendingSelections[question.id] ?? {};
    final isRevealed = _revealedAnswers[question.id] == true;
    final displayTotal =
        _totalQuestions > 0 ? _totalQuestions : _questions.length;
    final displayIndex = _displayQuestionIndex(question, index + 1);

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
                '第 $displayIndex/$displayTotal 题',
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
                  question.isMultipleChoice
                      ? '多选题'
                      : (question.type == 'JUDGEMENT' ? '判断题' : '单选题'),
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
              if (question.externalId.isNotEmpty)
                _buildTagChip('题号 ${question.externalId}'),
              if (question.category != null && question.category!.isNotEmpty)
                _buildTagChip(question.category!),
              if (question.categoryCode != null &&
                  question.categoryCode!.isNotEmpty)
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
            const successColor = Color(0xFF2E7D32);
            const successBackground = Color(0xFFEAF7EF);
            const successMutedBackground = Color(0xFFF3FBF5);
            const errorColor = Color(0xFFD32F2F);
            const errorBackground = Color(0xFFFDECEC);
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
                cardColor = isCorrect ? successBackground : errorBackground;
                borderColor = isCorrect ? successColor : errorColor;
              } else if (isCorrect) {
                // Show correct answer if user picked wrong one or missed it
                cardColor = successMutedBackground;
                borderColor = successColor.withValues(alpha: 0.7);
              }
            } else if (isSelected) {
              // Exam mode or just selected but not revealed
              cardColor = Theme.of(context).colorScheme.primaryContainer;
              borderColor = Theme.of(context).colorScheme.primary;
            }

            return Card(
              elevation: 0,
              color: cardColor,
              surfaceTintColor: Colors.transparent,
              margin: const EdgeInsets.only(bottom: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
                side: BorderSide(
                  color: borderColor,
                  width: 2,
                ),
              ),
              child: InkWell(
                onTap: (isRevealed && !_isExamMode)
                    ? null
                    : () => _handleOptionSelected(question, option.id),
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
                          shape: question.isMultipleChoice
                              ? BoxShape.rectangle
                              : BoxShape.circle,
                          borderRadius: question.isMultipleChoice
                              ? BorderRadius.circular(4)
                              : null,
                          border: Border.all(
                            color: isSelected || (isRevealed && isCorrect)
                                ? (isRevealed
                                    ? (isCorrect ? successColor : errorColor)
                                    : Theme.of(context).colorScheme.primary)
                                : Colors.grey,
                          ),
                          color: isSelected || (isRevealed && isCorrect)
                              ? (isRevealed
                                  ? (isCorrect ? successColor : errorColor)
                                  : Theme.of(context).colorScheme.primary)
                              : null,
                        ),
                        child: isSelected || (isRevealed && isCorrect)
                            ? Icon(
                                isRevealed
                                    ? (isCorrect ? Icons.check : Icons.close)
                                    : (question.isMultipleChoice
                                        ? Icons.check
                                        : Icons.circle),
                                size: 16, // Slightly bigger for checkbox
                                color: Colors.white)
                            : Text(
                                String.fromCharCode(65 +
                                    question.options
                                        .indexOf(option)), // A, B, C...
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold),
                              ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          option.text,
                          style: TextStyle(
                            color:
                                isRevealed && isCorrect ? successColor : null,
                            fontWeight: isRevealed && isCorrect
                                ? FontWeight.bold
                                : null,
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
