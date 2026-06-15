import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../models/discovery.dart';
import '../../services/discovery_service.dart';

class DiscoveryDetailPage extends StatefulWidget {
  final DiscoveryFeedItem item;

  const DiscoveryDetailPage({super.key, required this.item});

  @override
  State<DiscoveryDetailPage> createState() => _DiscoveryDetailPageState();
}

class _DiscoveryDetailPageState extends State<DiscoveryDetailPage> {
  final _service = DiscoveryService();
  late Future<DiscoveryDetail> _detailFuture;

  @override
  void initState() {
    super.initState();
    _detailFuture = _service.getDetail(
      widget.item.id,
      exam: widget.item.contentType == 'exam_info',
      apiBaseUrl: widget.item.apiBaseUrl,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('资讯详情')),
      body: FutureBuilder<DiscoveryDetail>(
        future: _detailFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text('加载失败：${snapshot.error}'),
              ),
            );
          }
          final detail = snapshot.data!;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                detail.title,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _Chip(label: _typeLabel(detail.contentType)),
                  if (detail.province != null) _Chip(label: detail.province!),
                  if (detail.city != null) _Chip(label: detail.city!),
                  if (detail.examLevel != null)
                    _Chip(label: '${detail.examLevel} 类'),
                  if (detail.isExpired) const _Chip(label: '已过期'),
                ],
              ),
              const SizedBox(height: 16),
              if (detail.summary != null && detail.summary!.isNotEmpty)
                Text(detail.summary!,
                    style: Theme.of(context).textTheme.bodyLarge),
              const SizedBox(height: 16),
              if (detail.contentType == 'exam_info') ...[
                _InfoRow(
                    label: '报名开始',
                    value: _formatTime(detail.registrationStart)),
                _InfoRow(
                    label: '报名截止', value: _formatTime(detail.registrationEnd)),
                _InfoRow(label: '考试时间', value: _formatTime(detail.examTime)),
                _InfoRow(label: '考试地点', value: detail.venue ?? '未公布'),
                _InfoRow(label: '状态', value: _statusLabel(detail.status)),
                const SizedBox(height: 12),
              ],
              _InfoRow(label: '来源', value: detail.sourceName),
              _InfoRow(label: '发布时间', value: _formatTime(detail.publishedAt)),
              _InfoRow(label: '抓取时间', value: _formatTime(detail.fetchedAt)),
              const SizedBox(height: 16),
              if (detail.signupUrl != null && detail.signupUrl!.isNotEmpty)
                SelectableText('报名链接：${detail.signupUrl}'),
              if (detail.sourceUrl.isNotEmpty) ...[
                const SizedBox(height: 8),
                SelectableText('原文链接：${detail.sourceUrl}'),
              ],
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(detail.disclaimer),
              ),
            ],
          );
        },
      ),
    );
  }

  String _formatTime(DateTime? time) {
    if (time == null) return '未公布';
    return DateFormat('yyyy-MM-dd HH:mm').format(time.toLocal());
  }

  String _typeLabel(String type) {
    return switch (type) {
      'exam_info' => '考试信息',
      'license_renewal' => '换证通知',
      'policy' => '政策公告',
      'activity' => '活动通知',
      _ => '资讯',
    };
  }

  String _statusLabel(String status) {
    return switch (status) {
      'open' => '报名中',
      'closed' => '报名结束',
      'scheduled' => '已排期',
      'finished' => '已结束',
      'cancelled' => '已取消',
      _ => '未知',
    };
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 78,
            child: Text(label,
                style: TextStyle(color: Theme.of(context).colorScheme.outline)),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final String label;

  const _Chip({required this.label});

  @override
  Widget build(BuildContext context) {
    return Chip(label: Text(label), visualDensity: VisualDensity.compact);
  }
}
