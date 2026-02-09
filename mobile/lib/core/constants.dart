import 'package:flutter/foundation.dart';

class AppConstants {
  // Use relative path for Web (assumes served from same origin or proxied)
  // For Mobile, use specific IP or localhost for emulator
  static const String baseUrl = kIsWeb 
      ? '/api' 
      : 'http://192.168.31.187:3001/api'; 
  
  static const String tokenKey = 'auth_token';
}
