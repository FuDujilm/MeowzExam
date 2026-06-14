import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';

class DeveloperPage extends StatefulWidget {
  const DeveloperPage({super.key});

  @override
  State<DeveloperPage> createState() => _DeveloperPageState();
}

class _DeveloperPageState extends State<DeveloperPage> {
  final _apiUrlController = TextEditingController();
  bool _isLoading = true;
  bool _isSaving = false;
  bool _isTesting = false;
  Map<String, dynamic>? _testResult;

  @override
  void initState() {
    super.initState();
    _loadApiUrl();
  }

  @override
  void dispose() {
    _apiUrlController.dispose();
    super.dispose();
  }

  Future<void> _loadApiUrl() async {
    final currentUrl = await context.read<AuthService>().getApiUrl();
    if (!mounted) return;
    setState(() {
      _apiUrlController.text = currentUrl;
      _isLoading = false;
    });
  }

  Future<void> _testConnection() async {
    setState(() {
      _isTesting = true;
      _testResult = null;
    });

    final authService = context.read<AuthService>();
    final previousUrl = await authService.getApiUrl();
    await authService.updateApiUrl(_apiUrlController.text.trim());
    final result = await authService.checkConnectivity();
    await authService.updateApiUrl(previousUrl);

    if (!mounted) return;
    setState(() {
      _testResult = result;
      _isTesting = false;
    });
  }

  Future<void> _saveApiUrl() async {
    final nextUrl = _apiUrlController.text.trim();
    if (nextUrl.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('请输入服务器 API 地址')),
      );
      return;
    }

    setState(() => _isSaving = true);
    try {
      await context.read<AuthService>().updateApiUrl(nextUrl);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('服务器地址已保存')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('保存失败: $e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final result = _testResult;

    return Scaffold(
      appBar: AppBar(title: const Text('开发者设置')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                TextField(
                  controller: _apiUrlController,
                  decoration: const InputDecoration(
                    labelText: '服务器 API 地址',
                    hintText: 'http://192.168.1.5:3001',
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: TextInputType.url,
                ),
                const SizedBox(height: 8),
                const Text(
                  '可填写服务器根地址，保存时会自动补全 /api/。',
                  style: TextStyle(color: Colors.grey, fontSize: 12),
                ),
                const SizedBox(height: 16),
                if (result != null)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: result['success'] == true
                          ? Colors.green.shade50
                          : Colors.red.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: result['success'] == true
                            ? Colors.green.shade200
                            : Colors.red.shade200,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          result['success'] == true ? '连接成功' : '连接失败',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: result['success'] == true
                                ? Colors.green[700]
                                : Colors.red[700],
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${result['message']}\n耗时: ${result['latency']}ms',
                          style: TextStyle(
                            fontSize: 12,
                            color: result['success'] == true
                                ? Colors.green[900]
                                : Colors.red[900],
                          ),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _isTesting ? null : _testConnection,
                        icon: _isTesting
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child:
                                    CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.wifi_tethering),
                        label: Text(_isTesting ? '测试中...' : '测试连接'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: _isSaving ? null : _saveApiUrl,
                        icon: _isSaving
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child:
                                    CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.save),
                        label: Text(_isSaving ? '保存中...' : '保存'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
    );
  }
}
