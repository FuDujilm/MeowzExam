import 'package:flutter/material.dart';
import '../models/ai_explanation.dart';
import '../models/question.dart';
import '../models/question_explanation.dart';
import '../services/ai_service.dart';
import '../services/explanation_service.dart';

class QuestionExplanationPanel extends StatefulWidget {
  final Question question;

  const QuestionExplanationPanel({
    super.key,
    required this.question,
  });

  @override
  State<QuestionExplanationPanel> createState() => _QuestionExplanationPanelState();
}

class _QuestionExplanationPanelState extends State<QuestionExplanationPanel> {
  final ExplanationService _explanationService = ExplanationService();
  final AiService _aiService = AiService();

  List<QuestionExplanation> _explanations = [];
  String _filter = 'all';
  String _sort = 'default';
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final result = await _explanationService.getQuestionExplanations(widget.question.id);
    if (!mounted) return;
    setState(() {
      _explanations = result;
      _loading = false;
    });
  }

  Future<void> _generateAiExplanation() async {
    setState(() => _loading = true);
    try {
      await _aiService.generateExplanation(questionId: widget.question.id, regenerate: false);
      await _load();
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  Future<void> _submitUserExplanation() async {
    final controller = TextEditingController();

    final submitted = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('贡献解析'),
          content: TextField(
            controller: controller,
            maxLines: 6,
            decoration: const InputDecoration(
              hintText: '请输入你的解析（至少20字）',
              border: OutlineInputBorder(),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('取消'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('提交'),
            )
          ],
        );
      },
    );

    if (submitted != true) return;

    try {
      final content = controller.text.trim();
      if (content.length < 20) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('解析内容至少需要20个字符')),
        );
        return;
      }
      await _explanationService.submitExplanation(
        questionId: widget.question.id,
        content: content,
      );
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('提交失败: $e')),
        );
      }
    }
  }

  Future<void> _editExplanation(QuestionExplanation explanation) async {
    if (!explanation.canEdit || explanation.format != 'text') return;

    final controller = TextEditingController(
      text: explanation.content?.toString() ?? '',
    );

    final submitted = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('编辑解析'),
          content: TextField(
            controller: controller,
            maxLines: 6,
            decoration: const InputDecoration(
              hintText: '请输入你的解析（至少20字）',
              border: OutlineInputBorder(),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('取消'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('保存'),
            )
          ],
        );
      },
    );

    if (submitted != true) return;

    final content = controller.text.trim();
    if (content.length < 20) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('解析内容至少需要20个字符')),
      );
      return;
    }

    try {
      await _explanationService.updateExplanation(
        questionId: widget.question.id,
        explanationId: explanation.id,
        content: content,
      );
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('更新失败: $e')),
        );
      }
    }
  }

  Future<void> _reportExplanation(QuestionExplanation explanation) async {
    if (explanation.isLegacy) return;
    final controller = TextEditingController();

    final submitted = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('举报解析'),
          content: TextField(
            controller: controller,
            maxLines: 4,
            decoration: const InputDecoration(
              hintText: '请输入举报原因（必填）',
              border: OutlineInputBorder(),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('取消'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('提交'),
            )
          ],
        );
      },
    );

    if (submitted != true) return;

    final reason = controller.text.trim();
    if (reason.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('举报原因不能为空')),
      );
      return;
    }

    try {
      await _explanationService.voteExplanation(
        explanationId: explanation.id,
        vote: 'REPORT',
        reportReason: reason,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('已提交举报')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('举报失败: $e')),
        );
      }
    }
  }

  Future<void> _vote(QuestionExplanation explanation, String vote) async {
    if (explanation.isLegacy) return;

    try {
      final result = await _explanationService.voteExplanation(
        explanationId: explanation.id,
        vote: vote,
      );

      if (!mounted) return;
      final updatedVote = result['vote'] as String?;
      setState(() {
        _explanations = _explanations.map((item) {
          if (item.id != explanation.id) return item;

          int upvotes = item.upvotes;
          int downvotes = item.downvotes;
          final previous = item.userVote;

          if (previous == 'UP') upvotes -= 1;
          if (previous == 'DOWN') downvotes -= 1;

          if (updatedVote == 'UP') upvotes += 1;
          if (updatedVote == 'DOWN') downvotes += 1;

          return QuestionExplanation(
            id: item.id,
            type: item.type,
            format: item.format,
            content: item.content,
            upvotes: upvotes,
            downvotes: downvotes,
            userVote: updatedVote,
            canEdit: item.canEdit,
            createdById: item.createdById,
            createdBy: item.createdBy,
            createdAt: item.createdAt,
          );
        }).toList();
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('投票失败: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Container(
        padding: const EdgeInsets.all(16),
        alignment: Alignment.center,
        child: const CircularProgressIndicator(),
      );
    }

    if (_error != null) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.red.withOpacity(0.05),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.red.withOpacity(0.2)),
        ),
        child: Column(
          children: [
            const Icon(Icons.error_outline, color: Colors.red),
            const SizedBox(height: 8),
            Text('解析加载失败: $_error'),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: _load,
              child: const Text('重试'),
            ),
          ],
        ),
      );
    }

    if (_explanations.isEmpty) {
      return _buildEmptyState();
    }

    final explanations = _applyFilterAndSort(_explanations);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildToolbar(),
        const SizedBox(height: 12),
        ...explanations.map(_buildExplanationCard),
      ],
    );
  }

  Widget _buildEmptyState() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest.withOpacity(0.3),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Row(
            children: [
              Icon(Icons.info_outline, color: Colors.blueAccent),
              SizedBox(width: 8),
              Text('还没有解析内容', style: TextStyle(fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '这道题还没有任何解析，您可以通过 AI 一键生成，或贡献自己的思考。',
            style: TextStyle(color: Colors.grey[600]),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              FilledButton.icon(
                onPressed: _generateAiExplanation,
                icon: const Icon(Icons.auto_awesome),
                label: const Text('AI 快速生成'),
              ),
              const SizedBox(width: 12),
              OutlinedButton.icon(
                onPressed: _submitUserExplanation,
                icon: const Icon(Icons.add_circle_outline),
                label: const Text('我来贡献解析'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildToolbar() {
    return Row(
      children: [
        Expanded(
          child: DropdownButtonFormField<String>(
            value: _filter,
            decoration: const InputDecoration(
              labelText: '筛选',
              isDense: true,
              border: OutlineInputBorder(),
            ),
            items: const [
              DropdownMenuItem(value: 'all', child: Text('全部解析')),
              DropdownMenuItem(value: 'official', child: Text('官方解析')),
              DropdownMenuItem(value: 'ai', child: Text('AI 解析')),
              DropdownMenuItem(value: 'user', child: Text('用户解析')),
            ],
            onChanged: (value) {
              if (value == null) return;
              setState(() => _filter = value);
            },
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: DropdownButtonFormField<String>(
            value: _sort,
            decoration: const InputDecoration(
              labelText: '排序',
              isDense: true,
              border: OutlineInputBorder(),
            ),
            items: const [
              DropdownMenuItem(value: 'default', child: Text('默认排序')),
              DropdownMenuItem(value: 'upvotes', child: Text('按点赞')),
              DropdownMenuItem(value: 'newest', child: Text('最新优先')),
            ],
            onChanged: (value) {
              if (value == null) return;
              setState(() => _sort = value);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildExplanationCard(QuestionExplanation explanation) {
    final title = _explanationTitle(explanation.type);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Theme.of(context).dividerColor.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(
                    explanation.type == 'AI' ? Icons.auto_awesome : Icons.description_outlined,
                    color: explanation.type == 'AI' ? Colors.indigo : Colors.blueGrey,
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
                  if (explanation.createdBy != null) ...[
                    const SizedBox(width: 8),
                    Text('by ${explanation.createdBy}', style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                  ]
                ],
              ),
              Row(
                children: [
                  if (!explanation.isLegacy) ...[
                    IconButton(
                      icon: Icon(
                        explanation.userVote == 'UP' ? Icons.thumb_up : Icons.thumb_up_outlined,
                        size: 18,
                      ),
                      onPressed: () => _vote(explanation, 'UP'),
                    ),
                    Text('${explanation.upvotes}'),
                    const SizedBox(width: 8),
                    IconButton(
                      icon: Icon(
                        explanation.userVote == 'DOWN' ? Icons.thumb_down : Icons.thumb_down_outlined,
                        size: 18,
                      ),
                      onPressed: () => _vote(explanation, 'DOWN'),
                    ),
                    Text('${explanation.downvotes}'),
                    const SizedBox(width: 8),
                    IconButton(
                      icon: const Icon(Icons.flag_outlined, size: 18),
                      onPressed: () => _reportExplanation(explanation),
                    ),
                  ],
                  if (explanation.canEdit && explanation.format == 'text')
                    TextButton.icon(
                      onPressed: () => _editExplanation(explanation),
                      icon: const Icon(Icons.edit, size: 16),
                      label: const Text('编辑'),
                      style: TextButton.styleFrom(visualDensity: VisualDensity.compact),
                    ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildExplanationContent(explanation),
        ],
      ),
    );
  }

  Widget _buildExplanationContent(QuestionExplanation explanation) {
    if (explanation.format == 'structured' && explanation.content is Map<String, dynamic>) {
      final ai = AiExplanation.fromJson(Map<String, dynamic>.from(explanation.content));
      return _buildStructuredExplanation(ai);
    }

    final text = explanation.content?.toString().trim();
    if (text == null || text.isEmpty) {
      return const Text('暂无解析。');
    }
    return Text(text);
  }

  Widget _buildStructuredExplanation(AiExplanation ai) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.indigo.withOpacity(0.05),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: Colors.indigo.withOpacity(0.2)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.check_circle_outline, color: Colors.green, size: 18),
                  SizedBox(width: 6),
                  Text('结论', style: TextStyle(fontWeight: FontWeight.bold)),
                ],
              ),
              const SizedBox(height: 8),
              Text(ai.summary),
              const SizedBox(height: 6),
              Text(
                '正确答案: ${ai.answer.join(', ')}',
                style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        const Text('逐项分析', style: TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        ...ai.optionAnalysis.map((opt) {
          final isCorrect = opt.isCorrect;
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: isCorrect ? Colors.green.withOpacity(0.05) : Colors.red.withOpacity(0.05),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: isCorrect ? Colors.green.withOpacity(0.3) : Colors.red.withOpacity(0.3),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: isCorrect ? Colors.green : Colors.red,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        opt.option,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      isCorrect ? '正确' : '错误',
                      style: TextStyle(
                        color: isCorrect ? Colors.green : Colors.red,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(opt.reason, style: const TextStyle(fontSize: 13)),
              ],
            ),
          );
        }),
        if (ai.keyPoints.isNotEmpty) ...[
          const SizedBox(height: 8),
          const Text('考点', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          ...ai.keyPoints.map((p) => Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('• '),
                Expanded(child: Text(p)),
              ],
            ),
          )),
        ],
        if (ai.memoryAids.isNotEmpty) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.amber.withOpacity(0.1), Colors.orange.withOpacity(0.1)],
              ),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.amber.withOpacity(0.3)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.lightbulb_outline, color: Colors.amber),
                    SizedBox(width: 6),
                    Text('助记技巧', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.orange)),
                  ],
                ),
                const SizedBox(height: 6),
                ...ai.memoryAids.map((aid) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text('${aid.type == "MNEMONIC" ? "口诀" : aid.type}: ${aid.text}'),
                )),
              ],
            ),
          ),
        ],
      ],
    );
  }

  String _explanationTitle(String type) {
    switch (type) {
      case 'AI':
        return 'AI 解析';
      case 'USER':
        return '用户解析';
      case 'OFFICIAL':
      default:
        return '官方解析';
    }
  }

  List<QuestionExplanation> _applyFilterAndSort(List<QuestionExplanation> list) {
    Iterable<QuestionExplanation> filtered = list;

    switch (_filter) {
      case 'official':
        filtered = filtered.where((e) => e.type == 'OFFICIAL');
        break;
      case 'ai':
        filtered = filtered.where((e) => e.type == 'AI');
        break;
      case 'user':
        filtered = filtered.where((e) => e.type == 'USER');
        break;
      default:
        break;
    }

    final result = filtered.toList();

    switch (_sort) {
      case 'upvotes':
        result.sort((a, b) => b.upvotes.compareTo(a.upvotes));
        break;
      case 'newest':
        result.sort((a, b) {
          final aTime = a.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
          final bTime = b.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
          return bTime.compareTo(aTime);
        });
        break;
      default:
        break;
    }

    return result;
  }
}
