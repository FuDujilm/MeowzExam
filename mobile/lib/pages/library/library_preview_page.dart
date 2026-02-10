import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../models/question.dart';
import '../../models/question_library.dart';
import '../../services/question_service.dart';
import '../../services/user_settings_service.dart';
import '../quiz/quiz_page.dart';

class LibraryPreviewPage extends StatefulWidget {
  const LibraryPreviewPage({super.key});

  @override
  State<LibraryPreviewPage> createState() => _LibraryPreviewPageState();
}

class _LibraryPreviewPageState extends State<LibraryPreviewPage> {
  final _questionService = QuestionService();
  final _userSettingsService = UserSettingsService();
  final _apiClient = ApiClient();
  final _searchController = TextEditingController();

  List<QuestionLibrary> _libraries = [];
  QuestionLibrary? _selectedLibrary;
  bool _librariesLoading = true;
  String? _librariesError;

  List<Question> _questions = [];
  bool _questionsLoading = false;
  String? _questionsError;
  int _page = 1;
  int _totalPages = 0;
  int _total = 0;

  @override
  void initState() {
    super.initState();
    _loadLibraries();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadLibraries() async {
    setState(() {
      _librariesLoading = true;
      _librariesError = null;
    });

    try {
      final libraries = await _questionService.getLibraries();
      final settings = await _userSettingsService.getSettings();
      final savedExamType = settings['examType'] as String?;

      QuestionLibrary? selected;
      if (savedExamType != null) {
        selected = libraries.where((lib) => lib.code == savedExamType).firstOrNull;
      }
      selected ??= libraries.isNotEmpty ? libraries.first : null;

      if (!mounted) return;
      setState(() {
        _libraries = libraries;
        _selectedLibrary = selected;
        _librariesLoading = false;
      });

      if (selected != null) {
        await _loadQuestions(page: 1);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _librariesLoading = false;
        _librariesError = e.toString();
      });
    }
  }

  Future<void> _loadQuestions({int page = 1}) async {
    if (_selectedLibrary == null) return;
    setState(() {
      _questionsLoading = true;
      _questionsError = null;
    });

    try {
      final result = await _questionService.getPreviewQuestions(
        libraryCode: _selectedLibrary!.code,
        page: page,
        pageSize: 8,
        search: _searchController.text.trim().isEmpty
            ? null
            : _searchController.text.trim(),
      );

      if (!mounted) return;
      setState(() {
        _questions = result.questions;
        _page = result.page ?? page;
        _totalPages = result.totalPages ?? 0;
        _total = result.total;
        _questionsLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _questionsError = e.toString();
        _questionsLoading = false;
      });
    }
  }

  Future<void> _handleLibrarySelect(QuestionLibrary library) async {
    if (_selectedLibrary?.code == library.code) return;
    setState(() {
      _selectedLibrary = library;
      _questions = [];
      _page = 1;
      _totalPages = 0;
      _total = 0;
    });
    await _userSettingsService.updateSettings({'examType': library.code});
    await _loadQuestions(page: 1);
  }

  void _openLibraryPicker() async {
    if (_libraries.isEmpty) return;
    String keyword = '';
    final result = await showModalBottomSheet<QuestionLibrary>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            final filtered = _libraries.where((library) {
              if (keyword.isEmpty) return true;
              final lower = keyword.toLowerCase();
              return library.name.toLowerCase().contains(lower) ||
                  library.code.toLowerCase().contains(lower) ||
                  (library.shortName ?? '').toLowerCase().contains(lower) ||
                  (library.displayLabel ?? '').toLowerCase().contains(lower);
            }).toList();

            return SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('选择题库', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    TextField(
                      decoration: const InputDecoration(
                        prefixIcon: Icon(Icons.search),
                        hintText: '搜索题库名称或代码',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                      onChanged: (value) {
                        setModalState(() => keyword = value.trim());
                      },
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: MediaQuery.of(context).size.height * 0.6,
                      child: ListView.builder(
                        itemCount: filtered.length,
                        itemBuilder: (context, index) {
                          final lib = filtered[index];
                          return ListTile(
                            title: Text(lib.displayLabel ?? lib.name),
                            subtitle: Text('${lib.totalQuestions} 题'),
                            trailing: lib.code == _selectedLibrary?.code
                                ? const Icon(Icons.check, color: Colors.blue)
                                : null,
                            onTap: () => Navigator.of(context).pop(lib),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );

    if (result != null) {
      await _handleLibrarySelect(result);
    }
  }

  void _handleSearch() {
    _loadQuestions(page: 1);
  }

  String? _resolveImageUrl(String? path) {
    if (path == null || path.isEmpty) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    var base = _apiClient.client.options.baseUrl;
    if (base.endsWith('/')) base = base.substring(0, base.length - 1);
    if (base.endsWith('/api')) base = base.substring(0, base.length - 4);
    if (base.isEmpty) return path;
    if (path.startsWith('/')) return '$base$path';
    return '$base/$path';
  }

  String _formatQuestionType(Question question) {
    final raw = question.questionType?.toLowerCase();
    if (raw == null) return '单选题';
    if (raw.contains('multiple')) return '多选题';
    if (raw.contains('single')) return '单选题';
    if (raw.contains('true_false')) return '判断题';
    return raw.toUpperCase();
  }

  String _formatDifficulty(Question question) {
    final raw = question.difficulty?.toLowerCase();
    if (raw == null) return '未知';
    switch (raw) {
      case 'easy':
        return '简单';
      case 'medium':
        return '中等';
      case 'hard':
        return '困难';
      default:
        return raw;
    }
  }

  Widget _buildLibrarySummary(QuestionLibrary library) {
    final presets = library.presets.map((preset) {
      final duration = preset.durationMinutes != null ? '${preset.durationMinutes}分钟' : null;
      final count = preset.totalQuestions != null ? '${preset.totalQuestions}题' : null;
      final parts = [duration, count].whereType<String>().toList();
      return '${preset.name}${parts.isNotEmpty ? ' · ${parts.join(' / ')}' : ''}';
    }).toList();
    final presetSummary = presets.isEmpty ? null : presets.join(' | ');

    return Card(
      color: Theme.of(context).colorScheme.primaryContainer.withOpacity(0.1),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('当前题库', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            Text(library.name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            if (library.description != null && library.description!.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(library.description!, style: const TextStyle(fontSize: 13, color: Colors.black54)),
            ],
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                _MetaChip(label: library.visibility ?? '可见'),
                if (library.region != null) _MetaChip(label: '地区：${library.region}'),
                if (library.version != null) _MetaChip(label: '版本：${library.version}'),
                if (library.sourceType != null) _MetaChip(label: '类型：${library.sourceType}'),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _StatCard(label: '总题量', value: library.totalQuestions),
                _StatCard(label: '单选', value: library.singleChoiceCount),
                _StatCard(label: '多选', value: library.multipleChoiceCount),
                _StatCard(label: '判断', value: library.trueFalseCount),
              ],
            ),
            if (presetSummary != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text('可用考试预设：$presetSummary', style: const TextStyle(fontSize: 12)),
              ),
            ],
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerLeft,
              child: OutlinedButton.icon(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => QuizPage(
                        mode: 'sequential',
                        libraryCode: library.code,
                      ),
                    ),
                  );
                },
                icon: const Icon(Icons.play_arrow),
                label: const Text('在顺序练习中打开'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuestionCard(Question question) {
    final imageUrl = _resolveImageUrl(question.imagePath);
    final tags = question.tags;
    final options = question.options;

    return Card(
      elevation: 0,
      color: Theme.of(context).colorScheme.surfaceContainer,
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                _MetaChip(label: question.externalId, bold: true),
                if (question.libraryShortName != null || question.libraryCode != null)
                  _MetaChip(label: question.libraryShortName ?? question.libraryCode ?? ''),
                if (question.category != null) _MetaChip(label: question.category!),
                if (question.categoryCode != null &&
                    question.categoryCode != question.category)
                  _MetaChip(label: question.categoryCode!),
                if (question.subSection != null) _MetaChip(label: '章节 ${question.subSection}'),
                _MetaChip(label: _formatQuestionType(question)),
                _MetaChip(label: '难度：${_formatDifficulty(question)}'),
                if (question.hasImage) _MetaChip(label: '含图'),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              question.title,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
            ),
            if (imageUrl != null) ...[
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(
                  imageUrl,
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => const SizedBox(
                    height: 120,
                    child: Center(child: Text('图片加载失败')),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 12),
            if (options.isEmpty)
              const Text('该题暂无选项数据。', style: TextStyle(fontSize: 12, color: Colors.black45))
            else
              Column(
                children: options.map((option) {
                  final isPreviewCorrect = option.id.toUpperCase() == 'A';
                  return Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isPreviewCorrect
                          ? Colors.green.withOpacity(0.12)
                          : Theme.of(context).colorScheme.surface,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: isPreviewCorrect ? Colors.green : Colors.grey.shade300,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text('${option.id}.', style: const TextStyle(fontWeight: FontWeight.bold)),
                            const Spacer(),
                            if (isPreviewCorrect)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.green,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Text(
                                  '预览正确',
                                  style: TextStyle(color: Colors.white, fontSize: 11),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(option.text, style: const TextStyle(fontSize: 13)),
                      ],
                    ),
                  );
                }).toList(),
              ),
            if (tags.isNotEmpty) ...[
              const SizedBox(height: 6),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: tags.take(4).map((tag) => _MetaChip(label: '#$tag')).toList(),
              ),
            ],
            const SizedBox(height: 6),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: () {
                  if (_selectedLibrary == null) return;
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => QuizPage(
                        mode: 'sequential',
                        libraryCode: _selectedLibrary!.code,
                        startQuestionId: question.id,
                      ),
                    ),
                  );
                },
                icon: const Icon(Icons.play_circle_outline, size: 18),
                label: const Text('在练习中打开'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuestionList() {
    if (_questionsLoading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 40),
        child: Center(child: CircularProgressIndicator()),
      );
    }

    if (_questionsError != null) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Center(child: Text('题目加载失败：$_questionsError')),
      );
    }

    if (_questions.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Center(child: Text('暂无题目，请尝试调整搜索条件。')),
      );
    }

    return Column(
      children: [
        ..._questions.map(_buildQuestionCard).toList(),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('共 $_total 题，第 $_page / ${_totalPages == 0 ? 1 : _totalPages} 页'),
            Row(
              children: [
                TextButton(
                  onPressed: _page <= 1 ? null : () => _loadQuestions(page: _page - 1),
                  child: const Text('上一页'),
                ),
                TextButton(
                  onPressed: _totalPages == 0 || _page >= _totalPages
                      ? null
                      : () => _loadQuestions(page: _page + 1),
                  child: const Text('下一页'),
                ),
              ],
            ),
          ],
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('题库预览'),
      ),
      body: _librariesLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadLibraries,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Text(
                    '浏览当前选定题库的题目，支持模糊搜索；预览模式默认将 A 选项视为正确答案。',
                    style: TextStyle(color: Colors.grey.shade600),
                  ),
                  const SizedBox(height: 12),
                  Card(
                    elevation: 0,
                    color: Theme.of(context).colorScheme.surfaceContainer,
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: _openLibraryPicker,
                                  icon: const Icon(Icons.library_books),
                                  label: Text(_selectedLibrary?.displayLabel ?? _selectedLibrary?.name ?? '请选择题库'),
                                ),
                              ),
                              const SizedBox(width: 8),
                              IconButton(
                                onPressed: _loadLibraries,
                                icon: const Icon(Icons.refresh),
                                tooltip: '刷新列表',
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _searchController,
                                  decoration: const InputDecoration(
                                    prefixIcon: Icon(Icons.search),
                                    hintText: '搜索题干、题号或关键词',
                                    border: OutlineInputBorder(),
                                    isDense: true,
                                  ),
                                  onSubmitted: (_) => _handleSearch(),
                                ),
                              ),
                              const SizedBox(width: 8),
                              ElevatedButton(
                                onPressed: _selectedLibrary == null ? null : _handleSearch,
                                child: const Text('搜索'),
                              ),
                            ],
                          ),
                          if (_librariesError != null) ...[
                            const SizedBox(height: 8),
                            Text(
                              '题库加载失败：$_librariesError',
                              style: const TextStyle(color: Colors.redAccent, fontSize: 12),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  if (_selectedLibrary != null) _buildLibrarySummary(_selectedLibrary!),
                  const SizedBox(height: 16),
                  _buildQuestionList(),
                ],
              ),
            ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final int value;

  const _StatCard({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 80,
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Column(
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.black54)),
          const SizedBox(height: 4),
          Text(value.toString(), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  final String label;
  final bool bold;

  const _MetaChip({required this.label, this.bold = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: bold ? FontWeight.bold : FontWeight.normal,
        ),
      ),
    );
  }
}
