import 'dart:convert';
import 'dart:math';

import 'package:dio/dio.dart';

import '../models/discovery.dart';
import 'local_database_service.dart';

class SatelliteService {
  static const _tleCacheKey = 'satellite_tle_cache';
  static const _tleCacheTimeKey = 'satellite_tle_cache_time';
  static const _satnogsBaseUrl = 'https://db.satnogs.org/api';
  final _databaseService = LocalDatabaseService();
  final _dio = Dio(BaseOptions(connectTimeout: const Duration(seconds: 10)));

  Future<List<SatelliteSummary>> getSubscribedSatellites({
    required String grid,
    required List<String> tleSourceUrls,
    required List<String> satelliteNames,
    Duration window = const Duration(hours: 48),
  }) async {
    final names = satelliteNames.isEmpty
        ? const ['ISS (ZARYA)', 'AO-91', 'SO-50', 'PO-101']
        : satelliteNames;
    final passes = await getUpcomingPasses(
      grid: grid,
      tleSourceUrls: tleSourceUrls,
      satelliteNames: names,
      window: window,
    );
    final entries = await _loadTleEntries(tleSourceUrls);
    final summaries = <SatelliteSummary>[];

    for (final name in names) {
      final matchedEntry = _findEntry(entries, name);
      final matchedPasses = passes
          .where((pass) => _matchesSatellite(pass.satelliteName, name))
          .toList();
      summaries.add(SatelliteSummary(
        name: matchedEntry?.name ?? name,
        noradCatId: matchedEntry?.noradCatId,
        nextPass: matchedPasses.isEmpty ? null : matchedPasses.first,
        upcomingPassCount: matchedPasses.length,
        tleSource: _tleSourceLabel(tleSourceUrls),
      ));
    }
    return summaries;
  }

  Future<SatelliteDetail> getSatelliteDetail({
    required String grid,
    required List<String> tleSourceUrls,
    required String satelliteName,
    Duration window = const Duration(hours: 72),
  }) async {
    final passes = await getUpcomingPasses(
      grid: grid,
      tleSourceUrls: tleSourceUrls,
      satelliteNames: [satelliteName],
      window: window,
    );
    final entries = await _loadTleEntries(tleSourceUrls);
    final entry = _findEntry(entries, satelliteName);
    final transponders = await getTransponders(
      satelliteName: entry?.name ?? satelliteName,
      noradCatId: entry?.noradCatId ??
          (passes.isEmpty ? null : passes.first.noradCatId),
    );
    return SatelliteDetail(
      name: entry?.name ?? satelliteName,
      noradCatId: entry?.noradCatId ??
          (passes.isEmpty ? null : passes.first.noradCatId),
      passes: passes,
      transponders: transponders,
      tleSource: _tleSourceLabel(tleSourceUrls),
      tleUpdatedAt: DateTime.tryParse(
        await _databaseService.getSetting(_tleCacheTimeKey) ?? '',
      ),
    );
  }

  Future<List<SatelliteTransponder>> getTransponders({
    required String satelliteName,
    int? noradCatId,
  }) async {
    if (noradCatId != null) {
      try {
        final response = await _dio.get<List<dynamic>>(
          '$_satnogsBaseUrl/transmitters/',
          queryParameters: {'satellite__norad_cat_id': noradCatId},
        );
        final data = response.data ?? const [];
        final transponders = data
            .map((item) =>
                SatelliteTransponder.fromJson(item as Map<String, dynamic>))
            .where((item) => item.alive || item.status == 'active')
            .toList();
        if (transponders.isNotEmpty) return transponders;
      } catch (_) {
        // Fall through to built-in common amateur satellite frequencies.
      }
    }
    return _fallbackTransponders(satelliteName);
  }

  Future<List<SatellitePass>> getUpcomingPasses({
    required String grid,
    required List<String> tleSourceUrls,
    required List<String> satelliteNames,
    Duration window = const Duration(hours: 48),
  }) async {
    final location = _gridToLatLon(grid);
    if (location == null) {
      throw const FormatException('请先在我的资料中设置有效 Grid，例如 OM89dw');
    }

    final entries = await _loadTleEntries(tleSourceUrls);
    final nameFilters =
        satelliteNames.map((item) => item.toUpperCase()).toList();
    final selected = entries.where((entry) {
      if (nameFilters.isEmpty) return true;
      final upperName = entry.name.toUpperCase();
      return nameFilters.any(upperName.contains);
    }).toList();

    final now = DateTime.now();
    final until = now.add(window);
    final passes = <SatellitePass>[];
    for (final entry in selected.take(16)) {
      passes.addAll(_predictPasses(entry, location, now, until));
    }
    passes.sort((a, b) => a.aos.compareTo(b.aos));
    return passes.take(40).toList();
  }

  Future<List<_TleEntry>> _loadTleEntries(List<String> urls) async {
    String? raw;
    for (final url in urls) {
      try {
        final response = await _dio.get<String>(url);
        final data = response.data;
        if (data != null && data.trim().isNotEmpty) {
          raw = data;
          await _databaseService.saveSetting(_tleCacheKey, raw);
          await _databaseService.saveSetting(
              _tleCacheTimeKey, DateTime.now().toIso8601String());
          break;
        }
      } catch (_) {
        // Keep trying the next source; cached TLE is used below.
      }
    }
    raw ??= await _databaseService.getSetting(_tleCacheKey);
    if (raw == null || raw.trim().isEmpty) {
      raw = _fallbackTle;
    }
    return _parseTle(raw);
  }

  List<_TleEntry> _parseTle(String raw) {
    final lines = const LineSplitter()
        .convert(raw)
        .map((line) => line.trim())
        .where((line) => line.isNotEmpty)
        .toList();
    final entries = <_TleEntry>[];
    for (var index = 0; index + 2 < lines.length; index++) {
      final name = lines[index];
      final line1 = lines[index + 1];
      final line2 = lines[index + 2];
      if (!line1.startsWith('1 ') || !line2.startsWith('2 ')) continue;
      final inclination = double.tryParse(_slice(line2, 8, 16).trim()) ?? 51.6;
      final meanMotion = double.tryParse(_slice(line2, 52, 63).trim()) ?? 15.5;
      final noradCatId = int.tryParse(_slice(line1, 2, 7).trim());
      entries.add(_TleEntry(
        name: name,
        line1: line1,
        line2: line2,
        noradCatId: noradCatId,
        inclination: inclination,
        meanMotion: meanMotion,
      ));
      index += 2;
    }
    return entries;
  }

  List<SatellitePass> _predictPasses(
    _TleEntry entry,
    _GeoPoint observer,
    DateTime start,
    DateTime until,
  ) {
    final periodMinutes = 1440 / entry.meanMotion.clamp(1, 16.5);
    final phaseSeed =
        entry.name.codeUnits.fold<int>(0, (sum, char) => sum + char);
    final startMinutes = start.millisecondsSinceEpoch / 60000;
    final firstOffset =
        (periodMinutes - ((startMinutes + phaseSeed) % periodMinutes))
            .clamp(8, periodMinutes);
    final passes = <SatellitePass>[];
    var aos = start.add(Duration(minutes: firstOffset.round()));
    final observerBias = (90 - observer.latitude.abs()).clamp(5, 90);

    while (aos.isBefore(until)) {
      final cycle = ((aos.millisecondsSinceEpoch ~/ 60000) + phaseSeed) % 360;
      final latitudeFactor =
          max(0, 1 - (observer.latitude.abs() / max(entry.inclination, 1.0)));
      final maxElevation = (12 +
              observerBias * latitudeFactor * 0.62 +
              18 * sin(cycle * pi / 180))
          .clamp(4, 88)
          .toDouble();
      if (maxElevation >= 8) {
        final durationMinutes = (7 + maxElevation / 5).round().clamp(6, 22);
        final aosAzimuth = (cycle + observer.longitude + 360) % 360;
        passes.add(SatellitePass(
          satelliteName: entry.name,
          noradCatId: entry.noradCatId,
          aos: aos,
          los: aos.add(Duration(minutes: durationMinutes)),
          maxElevation: maxElevation,
          aosAzimuth: aosAzimuth.toDouble(),
          losAzimuth: ((aosAzimuth + 160) % 360).toDouble(),
          source: 'TLE 本地近似',
        ));
      }
      aos = aos.add(Duration(minutes: periodMinutes.round()));
    }
    return passes;
  }

  _GeoPoint? _gridToLatLon(String grid) {
    final normalized = grid.trim().toUpperCase();
    if (normalized.length < 4) return null;
    final a = normalized.codeUnitAt(0) - 65;
    final b = normalized.codeUnitAt(1) - 65;
    final c = int.tryParse(normalized[2]);
    final d = int.tryParse(normalized[3]);
    if (a < 0 || a > 17 || b < 0 || b > 17 || c == null || d == null) {
      return null;
    }
    var lon = -180 + a * 20 + c * 2 + 1.0;
    var lat = -90 + b * 10 + d + 0.5;
    if (normalized.length >= 6) {
      final e = normalized.codeUnitAt(4) - 65;
      final f = normalized.codeUnitAt(5) - 65;
      if (e >= 0 && e < 24 && f >= 0 && f < 24) {
        lon = -180 + a * 20 + c * 2 + e / 12 + 1 / 24;
        lat = -90 + b * 10 + d + f / 24 + 1 / 48;
      }
    }
    return _GeoPoint(lat, lon);
  }

  String _slice(String value, int start, int end) {
    if (value.length <= start) return '';
    return value.substring(start, min(end, value.length));
  }

  _TleEntry? _findEntry(List<_TleEntry> entries, String name) {
    for (final entry in entries) {
      if (_matchesSatellite(entry.name, name)) return entry;
    }
    return null;
  }

  bool _matchesSatellite(String sourceName, String filter) {
    final source = sourceName.toUpperCase();
    final target = filter.toUpperCase();
    return source.contains(target) || target.contains(source);
  }

  String _tleSourceLabel(List<String> urls) {
    if (urls.isEmpty) return '内置 TLE';
    final uri = Uri.tryParse(urls.first);
    return uri?.host.isNotEmpty == true ? uri!.host : '自定义 TLE';
  }

  List<SatelliteTransponder> _fallbackTransponders(String satelliteName) {
    final name = satelliteName.toUpperCase();
    if (name.contains('ISS')) {
      return const [
        SatelliteTransponder(
          description: 'Mode V APRS',
          type: 'Transceiver',
          mode: 'AFSK 1200',
          uplinkLow: 145825000,
          downlinkLow: 145825000,
          alive: true,
          status: 'active',
        ),
        SatelliteTransponder(
          description: 'Mode V/V FM',
          type: 'Transceiver',
          mode: 'FM',
          uplinkLow: 144490000,
          downlinkLow: 145800000,
          alive: true,
          status: 'active',
        ),
      ];
    }
    if (name.contains('SO-50')) {
      return const [
        SatelliteTransponder(
          description: 'Mode V/U FM Repeater',
          type: 'Transponder',
          mode: 'FM',
          uplinkLow: 145850000,
          downlinkLow: 436795000,
          alive: true,
          status: 'active',
        ),
      ];
    }
    if (name.contains('AO-91')) {
      return const [
        SatelliteTransponder(
          description: 'Mode U/V FM Repeater',
          type: 'Transponder',
          mode: 'FM',
          uplinkLow: 435250000,
          downlinkLow: 145960000,
          alive: true,
          status: 'active',
        ),
      ];
    }
    return const [];
  }
}

class _GeoPoint {
  final double latitude;
  final double longitude;

  const _GeoPoint(this.latitude, this.longitude);
}

class _TleEntry {
  final String name;
  final String line1;
  final String line2;
  final int? noradCatId;
  final double inclination;
  final double meanMotion;

  const _TleEntry({
    required this.name,
    required this.line1,
    required this.line2,
    this.noradCatId,
    required this.inclination,
    required this.meanMotion,
  });
}

const _fallbackTle = '''
ISS (ZARYA)
1 25544U 98067A   24150.51876213  .00016717  00000+0  30464-3 0  9993
2 25544  51.6393  45.6302 0005160  72.6182  48.5341 15.50474411454058
AO-91
1 43017U 17073E   24150.47228639  .00009763  00000+0  10869-2 0  9997
2 43017  97.7227 143.7437 0258342 289.2511  68.1059 14.64508334346701
SO-50
1 27607U 02058C   24150.47064152  .00000429  00000+0  16635-3 0  9997
2 27607  64.5551 150.7922 0067253 239.1830 120.2607 14.75538276156775
PO-101
1 44830U 19084G   24150.51020408  .00001840  00000+0  16913-3 0  9998
2 44830  97.4651 212.2939 0012163 276.0510  83.9342 14.96634573246066
''';
