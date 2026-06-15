class DiscoveryPreferences {
  final String? province;
  final String? city;
  final String? examLevel;
  final List<String> contentTypes;
  final List<String> keywords;
  final List<DiscoveryApiSource> apiSources;
  final List<String> tleSourceUrls;
  final List<String> satelliteNames;

  const DiscoveryPreferences({
    this.province,
    this.city,
    this.examLevel,
    this.contentTypes = const [
      'exam_info',
      'license_renewal',
      'policy',
      'activity'
    ],
    this.keywords = const [],
    this.apiSources = const [],
    this.tleSourceUrls = const [
      'https://celestrak.org/NORAD/elements/gp.php?GROUP=amateur&FORMAT=tle',
    ],
    this.satelliteNames = const ['ISS (ZARYA)', 'AO-91', 'SO-50', 'PO-101'],
  });

  factory DiscoveryPreferences.fromJson(Map<String, dynamic> json) {
    return DiscoveryPreferences(
      province: json['province'] as String?,
      city: json['city'] as String?,
      examLevel: json['examLevel'] as String?,
      contentTypes: (json['contentTypes'] as List<dynamic>?)
              ?.map((item) => item.toString())
              .where((item) => item.isNotEmpty)
              .toList() ??
          const ['exam_info', 'license_renewal', 'policy', 'activity'],
      keywords: (json['keywords'] as List<dynamic>?)
              ?.map((item) => item.toString())
              .where((item) => item.isNotEmpty)
              .toList() ??
          const [],
      apiSources: (json['apiSources'] as List<dynamic>?)
              ?.map((item) =>
                  DiscoveryApiSource.fromJson(item as Map<String, dynamic>))
              .toList() ??
          (json['sourceDrafts'] as List<dynamic>?)
              ?.map((item) => DiscoveryApiSource.fromLegacyJson(
                  item as Map<String, dynamic>))
              .toList() ??
          const [],
      tleSourceUrls: (json['tleSourceUrls'] as List<dynamic>?)
              ?.map((item) => item.toString())
              .where((item) => item.isNotEmpty)
              .toList() ??
          const [
            'https://celestrak.org/NORAD/elements/gp.php?GROUP=amateur&FORMAT=tle',
          ],
      satelliteNames: (json['satelliteNames'] as List<dynamic>?)
              ?.map((item) => item.toString())
              .where((item) => item.isNotEmpty)
              .toList() ??
          const ['ISS (ZARYA)', 'AO-91', 'SO-50', 'PO-101'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'province': province,
      'city': city,
      'examLevel': examLevel,
      'contentTypes': contentTypes,
      'keywords': keywords,
      'apiSources': apiSources.map((item) => item.toJson()).toList(),
      'tleSourceUrls': tleSourceUrls,
      'satelliteNames': satelliteNames,
    };
  }

  DiscoveryPreferences copyWith({
    String? province,
    String? city,
    String? examLevel,
    List<String>? contentTypes,
    List<String>? keywords,
    List<DiscoveryApiSource>? apiSources,
    List<String>? tleSourceUrls,
    List<String>? satelliteNames,
    bool clearProvince = false,
    bool clearCity = false,
    bool clearExamLevel = false,
  }) {
    return DiscoveryPreferences(
      province: clearProvince ? null : province ?? this.province,
      city: clearCity ? null : city ?? this.city,
      examLevel: clearExamLevel ? null : examLevel ?? this.examLevel,
      contentTypes: contentTypes ?? this.contentTypes,
      keywords: keywords ?? this.keywords,
      apiSources: apiSources ?? this.apiSources,
      tleSourceUrls: tleSourceUrls ?? this.tleSourceUrls,
      satelliteNames: satelliteNames ?? this.satelliteNames,
    );
  }
}

class DiscoveryApiSource {
  final String name;
  final String baseUrl;
  final bool enabled;
  final DateTime createdAt;

  const DiscoveryApiSource({
    required this.name,
    required this.baseUrl,
    this.enabled = true,
    required this.createdAt,
  });

  factory DiscoveryApiSource.fromJson(Map<String, dynamic> json) {
    return DiscoveryApiSource(
      name: json['name'] as String? ?? '',
      baseUrl: json['baseUrl'] as String? ?? json['url'] as String? ?? '',
      enabled: json['enabled'] as bool? ?? true,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
    );
  }

  factory DiscoveryApiSource.fromLegacyJson(Map<String, dynamic> json) {
    return DiscoveryApiSource.fromJson(json);
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'baseUrl': baseUrl,
      'enabled': enabled,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  DiscoveryApiSource copyWith({
    String? name,
    String? baseUrl,
    bool? enabled,
    DateTime? createdAt,
  }) {
    return DiscoveryApiSource(
      name: name ?? this.name,
      baseUrl: baseUrl ?? this.baseUrl,
      enabled: enabled ?? this.enabled,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

class DiscoveryFeedItem {
  final String id;
  final String contentType;
  final String title;
  final String? province;
  final String? city;
  final String? summary;
  final String? sourceId;
  final String sourceName;
  final String sourceUrl;
  final String? examLevel;
  final bool isExpired;
  final List<String> tags;
  final DateTime? publishedAt;
  final DateTime? fetchedAt;
  final String? apiBaseUrl;

  const DiscoveryFeedItem({
    required this.id,
    required this.contentType,
    required this.title,
    this.province,
    this.city,
    this.summary,
    this.sourceId,
    required this.sourceName,
    required this.sourceUrl,
    this.examLevel,
    this.isExpired = false,
    this.tags = const [],
    this.publishedAt,
    this.fetchedAt,
    this.apiBaseUrl,
  });

  factory DiscoveryFeedItem.fromJson(
    Map<String, dynamic> json, {
    String? apiBaseUrl,
  }) {
    return DiscoveryFeedItem(
      id: json['id'] as String,
      contentType: json['content_type'] as String? ??
          json['contentType'] as String? ??
          'other',
      title: json['title'] as String? ?? '',
      province: json['province'] as String?,
      city: json['city'] as String?,
      summary: json['summary'] as String?,
      sourceId: json['source_id'] as String? ?? json['sourceId'] as String?,
      sourceName: json['source_name'] as String? ??
          json['sourceName'] as String? ??
          '未知来源',
      sourceUrl:
          json['source_url'] as String? ?? json['sourceUrl'] as String? ?? '',
      examLevel: json['exam_level'] as String? ?? json['examLevel'] as String?,
      isExpired:
          json['is_expired'] as bool? ?? json['isExpired'] as bool? ?? false,
      tags: (json['tags'] as List<dynamic>?)
              ?.map((item) => item.toString())
              .toList() ??
          const [],
      publishedAt: DateTime.tryParse(json['published_at'] as String? ??
          json['publishedAt'] as String? ??
          ''),
      fetchedAt: DateTime.tryParse(
          json['fetched_at'] as String? ?? json['fetchedAt'] as String? ?? ''),
      apiBaseUrl: apiBaseUrl,
    );
  }
}

class DiscoveryDetail extends DiscoveryFeedItem {
  final String status;
  final DateTime? registrationStart;
  final DateTime? registrationEnd;
  final DateTime? examTime;
  final String? venue;
  final String? signupUrl;
  final double confidence;
  final String disclaimer;

  const DiscoveryDetail({
    required super.id,
    required super.contentType,
    required super.title,
    super.province,
    super.city,
    super.summary,
    super.sourceId,
    required super.sourceName,
    required super.sourceUrl,
    super.examLevel,
    super.isExpired,
    super.tags,
    super.publishedAt,
    super.fetchedAt,
    super.apiBaseUrl,
    this.status = 'unknown',
    this.registrationStart,
    this.registrationEnd,
    this.examTime,
    this.venue,
    this.signupUrl,
    this.confidence = 0,
    this.disclaimer = '资讯由系统聚合整理，具体安排以官方原文为准。',
  });

  factory DiscoveryDetail.fromJson(
    Map<String, dynamic> json, {
    String? apiBaseUrl,
  }) {
    return DiscoveryDetail(
      id: json['id'] as String,
      contentType: json['content_type'] as String? ?? 'other',
      title: json['title'] as String? ?? '',
      province: json['province'] as String?,
      city: json['city'] as String?,
      summary: json['summary'] as String?,
      sourceName: json['source_name'] as String? ?? '未知来源',
      sourceUrl: json['source_url'] as String? ?? '',
      examLevel: json['exam_level'] as String?,
      isExpired: json['is_expired'] as bool? ?? false,
      tags: (json['tags'] as List<dynamic>?)
              ?.map((item) => item.toString())
              .toList() ??
          const [],
      publishedAt: DateTime.tryParse(json['published_at'] as String? ?? ''),
      fetchedAt: DateTime.tryParse(json['fetched_at'] as String? ?? ''),
      apiBaseUrl: apiBaseUrl,
      status: json['status'] as String? ?? 'unknown',
      registrationStart:
          DateTime.tryParse(json['registration_start'] as String? ?? ''),
      registrationEnd:
          DateTime.tryParse(json['registration_end'] as String? ?? ''),
      examTime: DateTime.tryParse(json['exam_time'] as String? ?? ''),
      venue: json['venue'] as String?,
      signupUrl: json['signup_url'] as String?,
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0,
      disclaimer: json['disclaimer'] as String? ?? '资讯由系统聚合整理，具体安排以官方原文为准。',
    );
  }
}

class DiscoveryPageResult {
  final List<DiscoveryFeedItem> items;
  final int total;
  final int page;
  final int pageSize;

  const DiscoveryPageResult({
    required this.items,
    required this.total,
    required this.page,
    required this.pageSize,
  });

  bool get hasMore => page * pageSize < total;
}

class SatellitePass {
  final String satelliteName;
  final int? noradCatId;
  final DateTime aos;
  final DateTime los;
  final double maxElevation;
  final double aosAzimuth;
  final double losAzimuth;
  final String source;

  const SatellitePass({
    required this.satelliteName,
    this.noradCatId,
    required this.aos,
    required this.los,
    required this.maxElevation,
    required this.aosAzimuth,
    required this.losAzimuth,
    required this.source,
  });

  Duration get duration => los.difference(aos);
}

class SatelliteSummary {
  final String name;
  final int? noradCatId;
  final SatellitePass? nextPass;
  final int upcomingPassCount;
  final String tleSource;

  const SatelliteSummary({
    required this.name,
    this.noradCatId,
    this.nextPass,
    required this.upcomingPassCount,
    required this.tleSource,
  });
}

class SatelliteDetail {
  final String name;
  final int? noradCatId;
  final List<SatellitePass> passes;
  final List<SatelliteTransponder> transponders;
  final String tleSource;
  final DateTime? tleUpdatedAt;

  const SatelliteDetail({
    required this.name,
    this.noradCatId,
    required this.passes,
    required this.transponders,
    required this.tleSource,
    this.tleUpdatedAt,
  });

  SatellitePass? get nextPass => passes.isEmpty ? null : passes.first;
}

class SatelliteTransponder {
  final String description;
  final String type;
  final String mode;
  final int? uplinkLow;
  final int? downlinkLow;
  final bool alive;
  final String status;
  final DateTime? updatedAt;

  const SatelliteTransponder({
    required this.description,
    required this.type,
    required this.mode,
    this.uplinkLow,
    this.downlinkLow,
    required this.alive,
    required this.status,
    this.updatedAt,
  });

  factory SatelliteTransponder.fromJson(Map<String, dynamic> json) {
    return SatelliteTransponder(
      description: json['description'] as String? ?? '未命名转发器',
      type: json['type'] as String? ?? 'Transponder',
      mode: json['mode'] as String? ?? json['uplink_mode'] as String? ?? '',
      uplinkLow: (json['uplink_low'] as num?)?.toInt(),
      downlinkLow: (json['downlink_low'] as num?)?.toInt(),
      alive: json['alive'] as bool? ?? false,
      status: json['status'] as String? ?? 'unknown',
      updatedAt: DateTime.tryParse(json['updated'] as String? ?? ''),
    );
  }
}
