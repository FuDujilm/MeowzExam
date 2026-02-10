import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'constants.dart';

class ApiClient {
  late final Dio _dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  ApiClient() {
    _dio = Dio(BaseOptions(
      baseUrl: AppConstants.baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    _initBaseUrl();

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: AppConstants.tokenKey);
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
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
    final customUrl = await _storage.read(key: 'custom_base_url');
    if (customUrl != null && customUrl.isNotEmpty) {
      _dio.options.baseUrl = customUrl;
    }
  }

  Future<void> updateBaseUrl(String url) async {
    await _storage.write(key: 'custom_base_url', value: url);
    _dio.options.baseUrl = url;
  }

  Future<String> getBaseUrl() async {
     return _dio.options.baseUrl;
  }

  Future<Map<String, dynamic>> testConnection() async {
    final stopwatch = Stopwatch()..start();
    try {
      final response = await _dio.get('health');
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
        if (e.type == DioExceptionType.connectionTimeout) message = 'Connection Timeout';
        if (e.type == DioExceptionType.connectionError) message = 'Connection Refused (Check IP/Port)';
      }
      return {
        'success': false,
        'latency': stopwatch.elapsedMilliseconds,
        'message': message,
      };
    }
  }

  Dio get client => _dio;
}
