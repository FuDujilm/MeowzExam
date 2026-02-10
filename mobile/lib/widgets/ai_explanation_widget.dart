import 'package:flutter/material.dart';
import '../models/ai_explanation.dart';
import '../models/question.dart';
import '../services/ai_service.dart';

class AiExplanationWidget extends StatefulWidget {
  final Question question;
  final Function(String?)? onExplanationLoaded;

  const AiExplanationWidget({
    super.key,
    required this.question,
    this.onExplanationLoaded,
  });

  @override
  State<AiExplanationWidget> createState() => _AiExplanationWidgetState();
}

class _AiExplanationWidgetState extends State<AiExplanationWidget> {
  final AiService _aiService = AiService();
  AiExplanation? _explanation;
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    // If question already has cached explanation string, we might want to parse it if it's JSON?
    // But standard `explanation` field in Question model is usually a simple string.
    // The API returns structured JSON.
    // We can try to fetch it if we think it exists, or just wait for user interaction.
    // For now, let's start empty unless we persist it in Question model.
    // (Assuming `Question` model doesn't hold the full AiExplanation object yet)
  }

  Future<void> _generateExplanation({bool regenerate = false}) async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final result = await _aiService.generateExplanation(
        questionId: widget.question.id,
        regenerate: regenerate,
      );

      if (mounted) {
        setState(() {
          _explanation = result['explanation'];
          _isLoading = false;
        });
        
        if (result['message'] != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(result['message'])),
          );
        }
        
        // Callback to parent if needed (e.g. to save locally)
        // widget.onExplanationLoaded?.call(...);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Container(
        padding: const EdgeInsets.all(24),
        alignment: Alignment.center,
        child: Column(
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 16),
            Text(
              'AI 正在思考中...\n生成深度解析可能需要几秒钟',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[600]),
            ),
          ],
        ),
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
            Text('生成失败: $_error'),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: () => _generateExplanation(),
              child: const Text('重试'),
            ),
          ],
        ),
      );
    }

    if (_explanation == null) {
      // Check if basic explanation exists
      final basicExplanation = widget.question.explanation;
      final hasBasic = basicExplanation != null && basicExplanation.isNotEmpty && basicExplanation != '暂无解析。' && basicExplanation != 'No explanation available.';

      if (hasBasic) {
         return Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.blue.withOpacity(0.05),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.blue.withOpacity(0.2)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Row(
                  children: [
                    Icon(Icons.description_outlined, color: Colors.blueGrey),
                    SizedBox(width: 8),
                    Text('基础解析', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blueGrey)),
                  ],
                ),
                const SizedBox(height: 12),
                Text(basicExplanation),
                const SizedBox(height: 16),
                const Divider(),
                const SizedBox(height: 8),
                InkWell(
                  onTap: () => _generateExplanation(),
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                       gradient: LinearGradient(colors: [Colors.indigo.withOpacity(0.1), Colors.purple.withOpacity(0.1)]),
                       borderRadius: BorderRadius.circular(8),
                       border: Border.all(color: Colors.indigo.withOpacity(0.2)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.auto_awesome, color: Colors.indigo, size: 20),
                        const SizedBox(width: 8),
                        Text('AI 深度解析', style: TextStyle(color: Colors.indigo[700], fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                )
              ],
            ),
         );
      }

      // Empty State
      return Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest.withOpacity(0.3),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withOpacity(0.1)),
        ),
        child: Column(
          children: [
            const Icon(Icons.psychology, size: 48, color: Colors.blueAccent),
            const SizedBox(height: 16),
            const Text(
              '还没有解析内容',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              '这道题还没有详细解析，您可以让 AI 一键生成深度分析，或贡献您的思考。',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[600]),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                FilledButton.icon(
                  onPressed: () => _generateExplanation(),
                  icon: const Icon(Icons.auto_awesome),
                  label: const Text('AI 快速生成'),
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.indigoAccent,
                    foregroundColor: Colors.white,
                  ),
                ),
                const SizedBox(width: 12),
                OutlinedButton.icon(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('贡献功能开发中')),
                    );
                  },
                  icon: const Icon(Icons.add_circle_outline),
                  label: const Text('我来贡献解析'),
                ),
              ],
            ),
          ],
        ),
      );
    }

    // Render Structured Explanation
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Header Actions
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                const Icon(Icons.auto_awesome, color: Colors.indigoAccent, size: 20),
                const SizedBox(width: 8),
                Text(
                  'AI 深度解析',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.indigo[300],
                  ),
                ),
              ],
            ),
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.thumb_up_outlined, size: 18),
                  onPressed: () {}, // TODO: Vote
                ),
                IconButton(
                  icon: const Icon(Icons.thumb_down_outlined, size: 18),
                  onPressed: () {},
                ),
                TextButton.icon(
                  onPressed: () => _generateExplanation(regenerate: true),
                  icon: const Icon(Icons.refresh, size: 16),
                  label: const Text('重新生成'),
                  style: TextButton.styleFrom(
                    visualDensity: VisualDensity.compact,
                  ),
                ),
              ],
            )
          ],
        ),
        const SizedBox(height: 12),

        // 1. Summary Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.indigo.withOpacity(0.05),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.indigo.withOpacity(0.2)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.check_circle_outline, color: Colors.green, size: 20),
                  const SizedBox(width: 8),
                  const Text('结论', style: TextStyle(fontWeight: FontWeight.bold)),
                ],
              ),
              const SizedBox(height: 8),
              Text(_explanation!.summary),
              const SizedBox(height: 8),
              Text(
                '正确答案: ${_explanation!.answer.join(", ")}',
                style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // 2. Option Analysis
        const Text('逐项分析', style: TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        ..._explanation!.optionAnalysis.map((opt) {
          final isCorrect = opt.isCorrect;
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
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
        const SizedBox(height: 16),

        // 3. Key Points
        if (_explanation!.keyPoints.isNotEmpty) ...[
          const Row(
            children: [
              Icon(Icons.book_outlined, size: 18),
              SizedBox(width: 8),
              Text('考点', style: TextStyle(fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainer,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: _explanation!.keyPoints
                  .map((p) => Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('• ', style: TextStyle(fontWeight: FontWeight.bold)),
                            Expanded(child: Text(p)),
                          ],
                        ),
                      ))
                  .toList(),
            ),
          ),
          const SizedBox(height: 16),
        ],

        // 4. Memory Aids
        if (_explanation!.memoryAids.isNotEmpty) ...[
          Container(
            padding: const EdgeInsets.all(12),
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
                    SizedBox(width: 8),
                    Text('助记技巧', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.orange)),
                  ],
                ),
                const SizedBox(height: 8),
                ..._explanation!.memoryAids.map((aid) => Padding(
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
}
