import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'configure_dio.dart';
import 'constants.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();

  factory ApiClient() => _instance;

  late final Dio _dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  late final Future<void> _ready;
  static const _guestCookieStorageKey = 'meowz_guest_cookie';

  ApiClient._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: AppConstants.baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));
    configureDio(_dio);

    _ready = _initBaseUrl();

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        await _ready;
        final token = await _storage.read(key: AppConstants.tokenKey);
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        final guestCookie = await _storage.read(key: _guestCookieStorageKey);
        if (guestCookie != null && guestCookie.isNotEmpty) {
          options.headers['Cookie'] = guestCookie;
        }
        return handler.next(options);
      },
      onResponse: (response, handler) async {
        final setCookie = response.headers['set-cookie'];
        if (setCookie != null) {
          final guestCookie = _extractGuestCookie(setCookie);
          if (guestCookie != null) {
            await _storage.write(
              key: _guestCookieStorageKey,
              value: guestCookie,
            );
          }
        }
        return handler.next(response);
      },
      onError: (DioException e, handler) {
        if (e.response?.statusCode == 401) {
          // Handle token expiration
        }
        return handler.next(e);
      },
    ));
  }

  Future<void> _initBaseUrl() async {
    final customUrl = await _readStorageValue('custom_base_url');
    if (customUrl != null && customUrl.isNotEmpty) {
      final normalizedUrl = _normalizeBaseUrl(customUrl);
      _dio.options.baseUrl = normalizedUrl;
      if (normalizedUrl != customUrl) {
        await _storage.write(key: 'custom_base_url', value: normalizedUrl);
      }
    }
  }

  Future<void> updateBaseUrl(String url) async {
    final normalizedUrl = _normalizeBaseUrl(url);
    await _storage.write(key: 'custom_base_url', value: normalizedUrl);
    _dio.options.baseUrl = normalizedUrl;
  }

  Future<String?> _readStorageValue(String key) async {
    try {
      return await _storage.read(key: key);
    } catch (e) {
      debugPrint('Failed to read secure storage key "$key": $e');
      try {
        await _storage.delete(key: key);
      } catch (deleteError) {
        debugPrint('Failed to clear secure storage key "$key": $deleteError');
      }
      return null;
    }
  }

  Future<String> getBaseUrl() async {
    await _ready;
    return _dio.options.baseUrl;
  }

  Future<Map<String, dynamic>> testConnection() async {
    final stopwatch = Stopwatch()..start();
    try {
      final response = await _dio.get('question-libraries');
      stopwatch.stop();
      return {
        'success': true,
        'latency': stopwatch.elapsedMilliseconds,
        'message': 'Connected (Status: ${response.statusCode})',
        'server_time': response.data['timestamp'],
      };
    } catch (e) {
      stopwatch.stop();
      String message = e.toString();
      if (e is DioException) {
        message = e.message ?? e.toString();
        if (e.type == DioExceptionType.connectionTimeout) {
          message = 'Connection Timeout';
        }
        if (e.type == DioExceptionType.connectionError) {
          message = 'Connection Refused (Check IP/Port)';
        }
      }
      return {
        'success': false,
        'latency': stopwatch.elapsedMilliseconds,
        'message': message,
      };
    }
  }

  String _normalizeBaseUrl(String url) {
    final trimmed = url.trim();
    if (trimmed.isEmpty) {
      return AppConstants.baseUrl;
    }

    final withTrailingSlash = trimmed.endsWith('/') ? trimmed : '$trimmed/';
    final uri = Uri.tryParse(withTrailingSlash);
    if (uri == null || !uri.hasScheme || uri.host.isEmpty) {
      return withTrailingSlash;
    }

    final normalizedPath = uri.path.replaceAll(RegExp(r'/+$'), '');
    if (normalizedPath == '/api' || normalizedPath.startsWith('/api/')) {
      return withTrailingSlash;
    }

    return uri.replace(path: '$normalizedPath/api/').toString();
  }

  String? _extractGuestCookie(List<String> setCookieHeaders) {
    for (final header in setCookieHeaders) {
      final segments = header.split(';');
      if (segments.isEmpty) continue;
      final cookie = segments.first.trim();
      if (cookie.startsWith('meowz_guest_key=')) {
        return cookie;
      }
    }
    return null;
  }

  Dio get client => _dio;
}
