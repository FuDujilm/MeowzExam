import 'package:flutter/material.dart';

import '../../models/discovery.dart';
import '../../services/discovery_preferences_service.dart';

class DiscoverySettingsPage extends StatefulWidget {
  const DiscoverySettingsPage({super.key});

  @override
  State<DiscoverySettingsPage> createState() => _DiscoverySettingsPageState();
}

class _DiscoverySettingsPageState extends State<DiscoverySettingsPage> {
  final _preferencesService = DiscoveryPreferencesService();
  final _provinceController = TextEditingController();
  final _cityController = TextEditingController();
  final _keywordsController = TextEditingController();
  final _tleController = TextEditingController();
  final _satellitesController = TextEditingController();
  final _sourceNameController = TextEditingController();
  final _sourceUrlController = TextEditingController();

  DiscoveryPreferences _preferences = const DiscoveryPreferences();
  String? _examLevel;
  bool _isLoading = true;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _provinceController.dispose();
    _cityController.dispose();
    _keywordsController.dispose();
    _tleController.dispose();
    _satellitesController.dispose();
    _sourceNameController.dispose();
    _sourceUrlController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final preferences = await _preferencesService.getPreferences();
    if (!mounted) return;
    setState(() {
      _preferences = preferences;
      _provinceController.text = preferences.province ?? '';
      _cityController.text = preferences.city ?? '';
      _keywordsController.text = preferences.keywords.join(', ');
      _tleController.text = preferences.tleSourceUrls.join('\n');
      _satellitesController.text = preferences.satelliteNames.join(', ');
      _examLevel = preferences.examLevel;
      _isLoading = false;
    });
  }

  Future<void> _save() async {
    setState(() => _isSaving = true);
    final preferences = _preferences.copyWith(
      province: _emptyToNull(_provinceController.text),
      city: _emptyToNull(_cityController.text),
      examLevel: _examLevel,
      clearProvince: _provinceController.text.trim().isEmpty,
      clearCity: _cityController.text.trim().isEmpty,
      clearExamLevel: _examLevel == null,
      keywords: _splitCsv(_keywordsController.text),
      tleSourceUrls: _tleController.text
          .split(RegExp(r'\r?\n'))
          .map((item) => item.trim())
          .where((item) => item.isNotEmpty)
          .toList(),
      satelliteNames: _splitCsv(_satellitesController.text),
    );
    await _preferencesService.savePreferences(preferences);
    if (!mounted) return;
    setState(() {
      _preferences = preferences;
      _isSaving = false;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('发现配置已保存')),
    );
  }

  Future<void> _addApiSource() async {
    final name = _sourceNameController.text.trim();
    final url = _sourceUrlController.text.trim();
    final normalizedUrl = _normalizeApiBaseUrl(url);
    final uri = Uri.tryParse(normalizedUrl);
    if (name.isEmpty || uri == null || !uri.hasScheme || uri.host.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('请输入源名称和有效 API 地址')),
      );
      return;
    }
    if (uri.scheme != 'http' && uri.scheme != 'https') {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('API 地址仅支持 http 或 https')),
      );
      return;
    }

    final exists = _preferences.apiSources.any(
      (source) => source.baseUrl == normalizedUrl,
    );
    if (exists) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('这个发现 API 源已经存在')),
      );
      return;
    }

    final source = DiscoveryApiSource(
      name: name,
      baseUrl: normalizedUrl,
      createdAt: DateTime.now(),
    );
    final preferences = _preferences.copyWith(
      apiSources: [source, ..._preferences.apiSources],
    );
    await _preferencesService.savePreferences(preferences);

    if (!mounted) return;
    setState(() {
      _preferences = preferences;
      _sourceNameController.clear();
      _sourceUrlController.clear();
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('发现 API 源已添加')),
    );
  }

  Future<void> _toggleApiSource(DiscoveryApiSource source, bool enabled) async {
    final sources = _preferences.apiSources
        .map((item) => item.baseUrl == source.baseUrl
            ? item.copyWith(enabled: enabled)
            : item)
        .toList();
    final preferences = _preferences.copyWith(apiSources: sources);
    await _preferencesService.savePreferences(preferences);
    if (!mounted) return;
    setState(() => _preferences = preferences);
  }

  Future<void> _removeApiSource(DiscoveryApiSource source) async {
    final sources = _preferences.apiSources
        .where((item) => item.baseUrl != source.baseUrl)
        .toList();
    final preferences = _preferences.copyWith(apiSources: sources);
    await _preferencesService.savePreferences(preferences);
    if (!mounted) return;
    setState(() => _preferences = preferences);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('发现源配置')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _Section(
                  title: '推荐筛选',
                  children: [
                    TextField(
                      controller: _provinceController,
                      decoration: const InputDecoration(
                        labelText: '省份',
                        hintText: '例如 浙江省',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _cityController,
                      decoration: const InputDecoration(
                        labelText: '城市',
                        hintText: '例如 杭州市',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String?>(
                      initialValue: _examLevel,
                      decoration: const InputDecoration(
                        labelText: '考试等级',
                        border: OutlineInputBorder(),
                      ),
                      items: const [
                        DropdownMenuItem(value: null, child: Text('不限')),
                        DropdownMenuItem(value: 'A', child: Text('A 类')),
                        DropdownMenuItem(value: 'B', child: Text('B 类')),
                        DropdownMenuItem(value: 'C', child: Text('C 类')),
                      ],
                      onChanged: (value) => setState(() => _examLevel = value),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _keywordsController,
                      decoration: const InputDecoration(
                        labelText: '关键词',
                        hintText: '多个关键词用逗号分隔',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ],
                ),
                _Section(
                  title: '卫星过境',
                  children: [
                    TextField(
                      controller: _satellitesController,
                      decoration: const InputDecoration(
                        labelText: '关注卫星',
                        hintText: 'ISS (ZARYA), AO-91, SO-50',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _tleController,
                      minLines: 2,
                      maxLines: 4,
                      decoration: const InputDecoration(
                        labelText: 'TLE 源',
                        hintText: '每行一个 TLE URL',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ],
                ),
                _Section(
                  title: '发现 API 源',
                  children: [
                    TextField(
                      controller: _sourceNameController,
                      decoration: const InputDecoration(
                        labelText: '源名称',
                        hintText: '例如 我的 Beacon API',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _sourceUrlController,
                      keyboardType: TextInputType.url,
                      decoration: const InputDecoration(
                        labelText: 'API 地址',
                        hintText: 'https://example.com/v1',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    FilledButton.icon(
                      onPressed: _addApiSource,
                      icon: const Icon(Icons.add_link),
                      label: const Text('添加 API 源'),
                    ),
                  ],
                ),
                if (_preferences.apiSources.isNotEmpty)
                  _Section(
                    title: '已添加 API 源',
                    children: _preferences.apiSources
                        .map(
                          (source) => ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: const Icon(Icons.api),
                            title: Text(source.name),
                            subtitle: Text(
                              source.baseUrl,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Switch(
                                  value: source.enabled,
                                  onChanged: (value) =>
                                      _toggleApiSource(source, value),
                                ),
                                IconButton(
                                  onPressed: () => _removeApiSource(source),
                                  icon: const Icon(Icons.delete_outline),
                                ),
                              ],
                            ),
                          ),
                        )
                        .toList(),
                  ),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: _isSaving ? null : _save,
                  icon: _isSaving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.save),
                  label: Text(_isSaving ? '保存中...' : '保存配置'),
                ),
              ],
            ),
    );
  }

  List<String> _splitCsv(String value) {
    return value
        .split(RegExp(r'[,，]'))
        .map((item) => item.trim())
        .where((item) => item.isNotEmpty)
        .toList();
  }

  String? _emptyToNull(String value) {
    final trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }

  String _normalizeApiBaseUrl(String url) {
    final trimmed = url.trim();
    final withoutTrailingSlash = trimmed.replaceFirst(RegExp(r'/+$'), '');
    final uri = Uri.tryParse(withoutTrailingSlash);
    if (uri == null || !uri.hasScheme || uri.host.isEmpty) {
      return withoutTrailingSlash;
    }

    final path = uri.path.replaceFirst(RegExp(r'/+$'), '');
    if (path.isEmpty) {
      return uri
          .replace(path: '/v1')
          .toString()
          .replaceFirst(RegExp(r'/+$'), '');
    }
    if (path.endsWith('/v1')) {
      return withoutTrailingSlash;
    }
    return uri
        .replace(path: '$path/v1')
        .toString()
        .replaceFirst(RegExp(r'/+$'), '');
  }
}

class _Section extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _Section({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    );
  }
}
