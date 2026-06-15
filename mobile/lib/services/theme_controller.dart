import 'package:flutter/material.dart';

import '../models/app_theme_settings.dart';
import 'local_database_service.dart';

class ThemeController extends ChangeNotifier {
  final LocalDatabaseService _databaseService = LocalDatabaseService();

  AppThemeSettings _settings = AppThemeSettings.defaultSettings;
  bool _isLoaded = false;

  AppThemeSettings get settings => _settings;
  ThemeMode get themeMode => _settings.mode;
  bool get isLoaded => _isLoaded;

  BeaconColorScheme get colorScheme {
    return colorSchemeByKey(_settings.colorSchemeKey);
  }

  Color get seedColor {
    final customColor = _settings.customSeedColor;
    return customColor == null ? colorScheme.seedColor : Color(customColor);
  }

  Future<void> load() async {
    _settings = await _databaseService.getThemeSettings();
    _isLoaded = true;
    notifyListeners();
  }

  Future<void> updateThemeMode(ThemeMode mode) async {
    _settings = _settings.copyWith(mode: mode);
    notifyListeners();
    await _databaseService.saveThemeSettings(_settings);
  }

  Future<void> updateColorScheme(String colorSchemeKey) async {
    _settings = _settings.copyWith(
      colorSchemeKey: colorSchemeKey,
      clearCustomSeedColor: true,
    );
    notifyListeners();
    await _databaseService.saveThemeSettings(_settings);
  }

  Future<void> updateCustomSeedColor(Color color) async {
    _settings = _settings.copyWith(
      colorSchemeKey: 'custom',
      customSeedColor: color.value,
    );
    notifyListeners();
    await _databaseService.saveThemeSettings(_settings);
  }
}
