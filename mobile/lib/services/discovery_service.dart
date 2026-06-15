import 'package:dio/dio.dart';

import '../core/api_client.dart';
import '../models/discovery.dart';

class DiscoveryService {
  final ApiClient _apiClient = ApiClient();

  Future<DiscoveryPageResult> getFeed({
    List<DiscoveryApiSource> apiSources = const [],
    String? contentType,
    String? province,
    String? city,
    String? sourceId,
    String? source,
    String? examLevel,
    String? tag,
    String? query,
    int page = 1,
    int pageSize = 20,
  }) async {
    return _getMergedPage(
      apiSources: apiSources,
      path: 'discovery/feed',
      queryParameters: {
        'type': contentType,
        'province': province,
        'city': city,
        'source_id': sourceId,
        'source': source,
        'exam_level': examLevel,
        'tag': tag,
        'q': query,
        'page': page,
        'page_size': pageSize,
      },
    );
  }

  Future<DiscoveryPageResult> getExams({
    List<DiscoveryApiSource> apiSources = const [],
    String? province,
    String? city,
    String? sourceId,
    String? source,
    String? examLevel,
    String? tag,
    String? status,
    String? query,
    int page = 1,
    int pageSize = 20,
  }) async {
    return _getMergedPage(
      apiSources: apiSources,
      path: 'discovery/exams',
      queryParameters: {
        'province': province,
        'city': city,
        'source_id': sourceId,
        'source': source,
        'exam_level': examLevel,
        'tag': tag,
        'status': status,
        'q': query,
        'page': page,
        'page_size': pageSize,
      },
    );
  }

  Future<DiscoveryDetail> getDetail(
    String id, {
    bool exam = false,
    String? apiBaseUrl,
  }) async {
    final response = await _apiClient.client.get(
      apiBaseUrl == null
          ? (exam ? 'v1/discovery/exams/$id' : 'v1/discovery/feed/$id')
          : _joinUrl(
              apiBaseUrl, exam ? 'discovery/exams/$id' : 'discovery/feed/$id'),
    );
    final payload = _unwrap(response.data);
    return DiscoveryDetail.fromJson(
      payload as Map<String, dynamic>,
      apiBaseUrl: apiBaseUrl,
    );
  }

  Future<DiscoveryPageResult> _getMergedPage({
    required List<DiscoveryApiSource> apiSources,
    required String path,
    required Map<String, dynamic> queryParameters,
  }) async {
    final enabledSources =
        apiSources.where((source) => source.enabled).toList();
    if (enabledSources.isEmpty) {
      return const DiscoveryPageResult(
        items: [],
        total: 0,
        page: 1,
        pageSize: 0,
      );
    }

    final results = await Future.wait(
      enabledSources.map(
        (source) async {
          final response = await _apiClient.client.get(
            _joinUrl(source.baseUrl, path),
            queryParameters: _cleanParams(queryParameters),
          );
          return _parsePage(response, apiBaseUrl: source.baseUrl);
        },
      ),
      eagerError: false,
    );

    final items = results.expand((result) => result.items).toList()
      ..sort((a, b) {
        final left = a.publishedAt ??
            a.fetchedAt ??
            DateTime.fromMillisecondsSinceEpoch(0);
        final right = b.publishedAt ??
            b.fetchedAt ??
            DateTime.fromMillisecondsSinceEpoch(0);
        return right.compareTo(left);
      });

    return DiscoveryPageResult(
      items: items,
      total: results.fold<int>(0, (sum, result) => sum + result.total),
      page: 1,
      pageSize: items.length,
    );
  }

  DiscoveryPageResult _parsePage(
    Response<dynamic> response, {
    String? apiBaseUrl,
  }) {
    final payload = _unwrap(response.data);
    final pageData = payload as Map<String, dynamic>;
    final items = (pageData['items'] as List<dynamic>? ?? const [])
        .map((item) => DiscoveryFeedItem.fromJson(
              item as Map<String, dynamic>,
              apiBaseUrl: apiBaseUrl,
            ))
        .toList();
    return DiscoveryPageResult(
      items: items,
      total: (pageData['total'] as num?)?.toInt() ?? items.length,
      page: (pageData['page'] as num?)?.toInt() ?? 1,
      pageSize: (pageData['page_size'] as num?)?.toInt() ??
          (pageData['pageSize'] as num?)?.toInt() ??
          items.length,
    );
  }

  Object? _unwrap(Object? data) {
    if (data is Map<String, dynamic> && data.containsKey('data')) {
      return data['data'];
    }
    return data;
  }

  Map<String, dynamic> _cleanParams(Map<String, dynamic> params) {
    return {
      for (final entry in params.entries)
        if (entry.value != null && entry.value.toString().trim().isNotEmpty)
          entry.key: entry.value,
    };
  }

  String _joinUrl(String baseUrl, String path) {
    final normalizedBase = _normalizeApiBaseUrl(baseUrl);
    final cleanPath = path.replaceFirst(RegExp(r'^/+'), '');
    return '$normalizedBase/$cleanPath';
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
