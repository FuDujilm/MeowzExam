import 'dart:convert';

import '../models/discovery.dart';
import 'local_database_service.dart';

class DiscoveryPreferencesService {
  static const _settingsKey = 'discovery_preferences';
  final _databaseService = LocalDatabaseService();

  Future<DiscoveryPreferences> getPreferences() async {
    final value = await _databaseService.getSetting(_settingsKey);
    if (value == null || value.isEmpty) {
      return const DiscoveryPreferences();
    }
    try {
      return DiscoveryPreferences.fromJson(
          jsonDecode(value) as Map<String, dynamic>);
    } catch (_) {
      return const DiscoveryPreferences();
    }
  }

  Future<void> savePreferences(DiscoveryPreferences preferences) async {
    await _databaseService.saveSetting(
        _settingsKey, jsonEncode(preferences.toJson()));
  }
}
