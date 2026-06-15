import 'dart:math';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../models/discovery.dart';
import '../../models/radio_profile.dart';
import '../../services/satellite_service.dart';

class SatelliteDetailPage extends StatefulWidget {
  final String satelliteName;
  final RadioProfile radioProfile;
  final List<String> tleSourceUrls;
  final SatelliteService service;

  const SatelliteDetailPage({
    super.key,
    required this.satelliteName,
    required this.radioProfile,
    required this.tleSourceUrls,
    required this.service,
  });

  @override
  State<SatelliteDetailPage> createState() => _SatelliteDetailPageState();
}

class _SatelliteDetailPageState extends State<SatelliteDetailPage> {
  late Future<SatelliteDetail> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<SatelliteDetail> _load() {
    return widget.service.getSatelliteDetail(
      grid: widget.radioProfile.grid,
      tleSourceUrls: widget.tleSourceUrls,
      satelliteName: widget.satelliteName,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.satelliteName)),
      body: FutureBuilder<SatelliteDetail>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return _DetailStateMessage(
              icon: Icons.satellite_alt,
              title: '无法加载卫星详情',
              subtitle: snapshot.error.toString(),
              action: OutlinedButton.icon(
                onPressed: () => setState(() => _future = _load()),
                icon: const Icon(Icons.refresh),
                label: const Text('重试'),
              ),
            );
          }

          final detail = snapshot.data!;
          final nextPass = detail.nextPass;
          return RefreshIndicator(
            onRefresh: () async => setState(() => _future = _load()),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
              children: [
                _HeroCard(detail: detail),
                const SizedBox(height: 16),
                if (nextPass != null) ...[
                  _PassRadarCard(pass: nextPass),
                  const SizedBox(height: 16),
                  _PhoneAimCard(pass: nextPass),
                  const SizedBox(height: 16),
                ],
                _TransponderPanel(transponders: detail.transponders),
                const SizedBox(height: 16),
                _UpcomingPassPanel(passes: detail.passes),
                const SizedBox(height: 16),
                _TlePanel(detail: detail),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  final SatelliteDetail detail;

  const _HeroCard({required this.detail});

  @override
  Widget build(BuildContext context) {
    final pass = detail.nextPass;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF063A5F), Color(0xFF101827)],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  color: Colors.white.withValues(alpha: 0.12),
                ),
                child: const Icon(Icons.satellite_alt, color: Colors.white),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      detail.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      detail.noradCatId == null
                          ? 'NORAD 未知'
                          : 'NORAD ${detail.noradCatId}',
                      style: const TextStyle(color: Colors.white70),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _HeroMetric(
                  label: '下一次 AOS',
                  value: pass == null
                      ? '暂无'
                      : DateFormat('HH:mm').format(pass.aos),
                ),
              ),
              Expanded(
                child: _HeroMetric(
                  label: '最高仰角',
                  value: pass == null
                      ? '--'
                      : '${pass.maxElevation.toStringAsFixed(0)}°',
                ),
              ),
              Expanded(
                child: _HeroMetric(
                  label: '转发器',
                  value: '${detail.transponders.length}',
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          LinearProgressIndicator(
            value: pass == null
                ? 0
                : (pass.maxElevation / 90).clamp(0.08, 1).toDouble(),
            color: const Color(0xFF38BDF8),
            backgroundColor: Colors.white.withValues(alpha: 0.18),
            borderRadius: BorderRadius.circular(99),
          ),
          const SizedBox(height: 8),
          Text(
            '观测点 ${detail.tleSource}',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.68),
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroMetric extends StatelessWidget {
  final String label;
  final String value;

  const _HeroMetric({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(color: Colors.white70, fontSize: 12)),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.w900,
          ),
        ),
      ],
    );
  }
}

class _PassRadarCard extends StatelessWidget {
  final SatellitePass pass;

  const _PassRadarCard({required this.pass});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return _DetailPanel(
      title: '过境轨迹',
      icon: Icons.radar,
      child: Row(
        children: [
          SizedBox(
            width: 156,
            height: 156,
            child: CustomPaint(painter: _PassRadarPainter(pass, scheme)),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              children: [
                _InfoRow('AOS', DateFormat('MM-dd HH:mm').format(pass.aos)),
                _InfoRow('LOS', DateFormat('HH:mm').format(pass.los)),
                _InfoRow('时长', '${pass.duration.inMinutes} 分钟'),
                _InfoRow('入/出方位',
                    '${pass.aosAzimuth.toStringAsFixed(0)}° / ${pass.losAzimuth.toStringAsFixed(0)}°'),
                _InfoRow('最高仰角', '${pass.maxElevation.toStringAsFixed(0)}°'),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PhoneAimCard extends StatelessWidget {
  final SatellitePass pass;

  const _PhoneAimCard({required this.pass});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final targetAzimuth = ((pass.aosAzimuth + pass.losAzimuth) / 2) % 360;
    return _DetailPanel(
      title: '手机对星',
      icon: Icons.explore,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          color: scheme.primaryContainer.withValues(alpha: 0.28),
        ),
        child: Row(
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: scheme.primary.withValues(alpha: 0.12),
                border:
                    Border.all(color: scheme.primary.withValues(alpha: 0.4)),
              ),
              child: Transform.rotate(
                angle: targetAzimuth * pi / 180,
                child: Icon(Icons.navigation, color: scheme.primary, size: 34),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '目标 ${targetAzimuth.toStringAsFixed(0)}° / ${pass.maxElevation.toStringAsFixed(0)}°',
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '当前版本提供目标方位和仰角。接入传感器后可显示实时手机朝向、偏差和震动提示。',
                    style: TextStyle(color: scheme.onSurfaceVariant),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TransponderPanel extends StatelessWidget {
  final List<SatelliteTransponder> transponders;

  const _TransponderPanel({required this.transponders});

  @override
  Widget build(BuildContext context) {
    return _DetailPanel(
      title: '转发器',
      icon: Icons.settings_input_antenna,
      child: transponders.isEmpty
          ? const Text('暂无公开转发器信息')
          : Column(
              children: transponders
                  .map((item) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _TransponderCard(transponder: item),
                      ))
                  .toList(),
            ),
    );
  }
}

class _TransponderCard extends StatelessWidget {
  final SatelliteTransponder transponder;

  const _TransponderCard({required this.transponder});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        color: scheme.surfaceContainerHighest.withValues(alpha: 0.48),
        border:
            Border.all(color: scheme.outlineVariant.withValues(alpha: 0.55)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  transponder.description,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
              ),
              _StatusPill(label: transponder.status),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                  child: _MiniMetric(
                      '上行', _formatFrequency(transponder.uplinkLow))),
              Expanded(
                  child: _MiniMetric(
                      '下行', _formatFrequency(transponder.downlinkLow))),
              Expanded(
                  child: _MiniMetric('模式',
                      transponder.mode.isEmpty ? '--' : transponder.mode)),
            ],
          ),
        ],
      ),
    );
  }
}

class _UpcomingPassPanel extends StatelessWidget {
  final List<SatellitePass> passes;

  const _UpcomingPassPanel({required this.passes});

  @override
  Widget build(BuildContext context) {
    return _DetailPanel(
      title: '后续过境',
      icon: Icons.schedule,
      child: Column(
        children: passes.take(10).map((pass) => _PassRow(pass: pass)).toList(),
      ),
    );
  }
}

class _PassRow extends StatelessWidget {
  final SatellitePass pass;

  const _PassRow({required this.pass});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              color: scheme.primary.withValues(alpha: 0.1),
            ),
            child: Text(
              '${pass.maxElevation.toStringAsFixed(0)}°',
              style: TextStyle(
                color: scheme.primary,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  DateFormat('MM-dd HH:mm').format(pass.aos),
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 2),
                Text(
                  '${pass.duration.inMinutes} 分钟 · ${pass.aosAzimuth.toStringAsFixed(0)}° -> ${pass.losAzimuth.toStringAsFixed(0)}°',
                  style: TextStyle(color: scheme.outline, fontSize: 12),
                ),
              ],
            ),
          ),
          IconButton(
            tooltip: '提醒',
            onPressed: () {},
            icon: const Icon(Icons.notifications_none),
          ),
        ],
      ),
    );
  }
}

class _TlePanel extends StatelessWidget {
  final SatelliteDetail detail;

  const _TlePanel({required this.detail});

  @override
  Widget build(BuildContext context) {
    return _DetailPanel(
      title: '轨道数据',
      icon: Icons.storage,
      child: Column(
        children: [
          _InfoRow('来源', detail.tleSource),
          _InfoRow(
            '缓存更新时间',
            detail.tleUpdatedAt == null
                ? '本次未记录'
                : DateFormat('MM-dd HH:mm').format(detail.tleUpdatedAt!),
          ),
          const _InfoRow('计算方式', 'TLE 本地近似'),
        ],
      ),
    );
  }
}

class _DetailPanel extends StatelessWidget {
  final String title;
  final IconData icon;
  final Widget child;

  const _DetailPanel({
    required this.title,
    required this.icon,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, color: scheme.primary),
            const SizedBox(width: 8),
            Text(
              title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        child,
      ],
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          SizedBox(
            width: 72,
            child: Text(
              label,
              style: TextStyle(color: scheme.outline, fontSize: 12),
            ),
          ),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
          ),
        ],
      ),
    );
  }
}

class _MiniMetric extends StatelessWidget {
  final String label;
  final String value;

  const _MiniMetric(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(color: scheme.outline, fontSize: 12)),
        const SizedBox(height: 3),
        Text(
          value,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontWeight: FontWeight.w900),
        ),
      ],
    );
  }
}

class _StatusPill extends StatelessWidget {
  final String label;

  const _StatusPill({required this.label});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(6),
        color: scheme.primary.withValues(alpha: 0.12),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: scheme.primary,
          fontSize: 12,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _DetailStateMessage extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Widget? action;

  const _DetailStateMessage({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.action,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 42, color: Theme.of(context).colorScheme.primary),
            const SizedBox(height: 12),
            Text(title, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(subtitle, textAlign: TextAlign.center),
            if (action != null) ...[
              const SizedBox(height: 16),
              action!,
            ],
          ],
        ),
      ),
    );
  }
}

class _PassRadarPainter extends CustomPainter {
  final SatellitePass pass;
  final ColorScheme scheme;

  _PassRadarPainter(this.pass, this.scheme);

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = min(size.width, size.height) / 2 - 8;
    final gridPaint = Paint()
      ..color = scheme.outlineVariant
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    final axisPaint = Paint()
      ..color = scheme.outlineVariant.withValues(alpha: 0.65)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    final pathPaint = Paint()
      ..color = scheme.primary
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 4;

    for (final scale in [1.0, 0.66, 0.33]) {
      canvas.drawCircle(center, radius * scale, gridPaint);
    }
    canvas.drawLine(
      Offset(center.dx, center.dy - radius),
      Offset(center.dx, center.dy + radius),
      axisPaint,
    );
    canvas.drawLine(
      Offset(center.dx - radius, center.dy),
      Offset(center.dx + radius, center.dy),
      axisPaint,
    );

    final start = _point(center, radius, pass.aosAzimuth, 0);
    final peak = _point(center, radius, (pass.aosAzimuth + pass.losAzimuth) / 2,
        pass.maxElevation);
    final end = _point(center, radius, pass.losAzimuth, 0);
    final path = Path()
      ..moveTo(start.dx, start.dy)
      ..quadraticBezierTo(peak.dx, peak.dy, end.dx, end.dy);
    canvas.drawPath(path, pathPaint);

    final dotPaint = Paint()..color = scheme.tertiary;
    canvas.drawCircle(peak, 5, dotPaint);

    final textPainter = TextPainter(
      text: TextSpan(
        text: 'N',
        style: TextStyle(
          color: scheme.onSurface,
          fontSize: 12,
          fontWeight: FontWeight.w900,
        ),
      ),
      textDirection: ui.TextDirection.ltr,
    )..layout();
    textPainter.paint(canvas, Offset(center.dx - 4, center.dy - radius - 3));
  }

  Offset _point(
      Offset center, double radius, double azimuth, double elevation) {
    final polarRadius = radius * (1 - elevation.clamp(0, 90) / 90);
    final angle = (azimuth - 90) * pi / 180;
    return Offset(
      center.dx + cos(angle) * polarRadius,
      center.dy + sin(angle) * polarRadius,
    );
  }

  @override
  bool shouldRepaint(covariant _PassRadarPainter oldDelegate) {
    return oldDelegate.pass != pass || oldDelegate.scheme != scheme;
  }
}

String _formatFrequency(int? hz) {
  if (hz == null || hz <= 0) return '--';
  return '${(hz / 1000000).toStringAsFixed(3)} MHz';
}
