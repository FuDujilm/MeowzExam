import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';
import '../core/api_client.dart';
import '../core/constants.dart';

class AuthService {
  final ApiClient _apiClient = ApiClient();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  // Expose API URL configuration
  Future<void> updateApiUrl(String url) async {
    await _apiClient.updateBaseUrl(url);
  }
  
  Future<String> getApiUrl() async {
    return await _apiClient.getBaseUrl();
  }

  Future<Map<String, dynamic>> checkConnectivity() async {
    return await _apiClient.testConnection();
  }

  static const String _oauthBaseUrl = 'https://oauth.mzyd.work';
  // TODO: Replace with your actual Client ID (same as in .env)
  static const String _clientId = '1797f48877790486055d0be1ef70a3dd'; 
  static const String _redirectUriScheme = 'com.meowzexam';
  // Use the intermediate page on Next.js server as the redirect URI for OAuth provider
  static const String _redirectUri = 'http://192.168.31.187:3001/mobile-auth-callback';

  Future<void> sendCode(String email) async {
    try {
      final response = await _apiClient.client.post(
        'auth/send-code',
        data: {'email': email},
      );
      
      // Check success based on your API response structure
      // Usually { success: true }
      if (response.data['success'] != true) {
        throw Exception(response.data['message'] ?? 'Failed to send code');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> login(String email, String code) async {
    try {
      final response = await _apiClient.client.post(
        'auth/login',
        data: {
          'email': email,
          'code': code,
        },
      );

      final data = response.data;
      if (data['success'] == true) {
        final token = data['data']['token'];
        final user = data['data']['user'];
        
        await _storage.write(key: AppConstants.tokenKey, value: token);
        return user;
      } else {
        throw Exception(data['message'] ?? 'Login failed');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> loginWithOAuth() async {
    try {
      // 1. Initiate OAuth Flow
      final String source = kIsWeb ? 'web' : 'app';
      final url = Uri.parse('$_oauthBaseUrl/oauth/authorize').replace(queryParameters: {
        'response_type': 'code',
        'client_id': _clientId,
        'redirect_uri': _redirectUri,
        'scope': 'openid profile email',
        'state': 'source=$source', // Add platform-aware source identifier
      });

      final result = await FlutterWebAuth2.authenticate(
        url: url.toString(),
        callbackUrlScheme: _redirectUriScheme,
      );

      // 2. Extract code from callback URL
      final code = Uri.parse(result).queryParameters['code'];
      if (code == null) {
        throw Exception('No code received from OAuth');
      }

      // 3. Exchange code for token via backend
      final response = await _apiClient.client.post(
        '/auth/oauth/exchange',
        data: {
          'code': code,
          'redirectUri': _redirectUri,
        },
      );

      final data = response.data;
      if (data['success'] == true) {
        final token = data['data']['token'];
        final user = data['data']['user'];
        
        await _storage.write(key: AppConstants.tokenKey, value: token);
        return user;
      } else {
        throw Exception(data['message'] ?? 'OAuth login failed');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<void> logout() async {
    await _storage.delete(key: AppConstants.tokenKey);
  }

  Future<bool> isLoggedIn() async {
    final token = await _storage.read(key: AppConstants.tokenKey);
    return token != null;
  }
}
