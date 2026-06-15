import 'dart:io';

import 'package:path_provider/path_provider.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import '../models/app_theme_settings.dart';
import '../models/qso_log.dart';
import '../models/radio_profile.dart';

class LocalDatabaseService {
  static final LocalDatabaseService _instance =
      LocalDatabaseService._internal();

  factory LocalDatabaseService() => _instance;

  LocalDatabaseService._internal();

  Database? _database;

  Future<Database> get database async {
    final existing = _database;
    if (existing != null) return existing;

    if (Platform.isLinux || Platform.isWindows || Platform.isMacOS) {
      sqfliteFfiInit();
      databaseFactory = databaseFactoryFfi;
    }

    final directory = await getApplicationDocumentsDirectory();
    final path = '${directory.path}${Platform.pathSeparator}beacon_local.db';

    _database = await openDatabase(
      path,
      version: 2,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE qso_logs (
            id TEXT PRIMARY KEY,
            date_time TEXT NOT NULL,
            callsign TEXT NOT NULL,
            country TEXT NOT NULL,
            band TEXT NOT NULL,
            mode TEXT NOT NULL,
            frequency TEXT NOT NULL,
            report TEXT NOT NULL,
            grid TEXT NOT NULL,
            created_at TEXT NOT NULL
          )
        ''');
        await db.execute(
          'CREATE INDEX idx_qso_logs_date_time ON qso_logs(date_time)',
        );
        await _createAppSettingsTable(db);
      },
      onUpgrade: (db, oldVersion, newVersion) async {
        if (oldVersion < 2) {
          await _createAppSettingsTable(db);
        }
      },
    );

    return _database!;
  }

  Future<void> _createAppSettingsTable(Database db) {
    return db.execute('''
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    ''');
  }

  Future<String?> getSetting(String key) async {
    final db = await database;
    final rows = await db.query(
      'app_settings',
      columns: ['value'],
      where: 'key = ?',
      whereArgs: [key],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    return rows.first['value'] as String?;
  }

  Future<void> saveSetting(String key, String value) async {
    final db = await database;
    await db.insert(
      'app_settings',
      {'key': key, 'value': value},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<void> deleteSetting(String key) async {
    final db = await database;
    await db.delete('app_settings', where: 'key = ?', whereArgs: [key]);
  }

  Future<List<QsoLog>> getQsoLogs() async {
    final db = await database;
    final rows = await db.query('qso_logs', orderBy: 'date_time DESC');
    return rows.map(QsoLog.fromMap).toList();
  }

  Future<void> insertQsoLog(QsoLog log) async {
    final db = await database;
    await db.insert(
      'qso_logs',
      log.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<void> replaceQsoLogs(List<QsoLog> logs) async {
    final db = await database;
    await db.transaction((txn) async {
      await txn.delete('qso_logs');
      for (final log in logs) {
        await txn.insert(
          'qso_logs',
          log.toMap(),
          conflictAlgorithm: ConflictAlgorithm.replace,
        );
      }
    });
  }

  Future<Map<String, dynamic>> exportData() async {
    final qsoLogs = await getQsoLogs();
    final theme = await getThemeSettings();
    final radioProfile = await getRadioProfile();
    return {
      'version': 1,
      'exportedAt': DateTime.now().toIso8601String(),
      'theme': {
        'mode': theme.modeKey,
        'colorSchemeKey': theme.colorSchemeKey,
        'customSeedColor': theme.customSeedColor,
      },
      'radioProfile': radioProfile.toJson(),
      'qsoLogs': qsoLogs.map((log) => log.toJson()).toList(),
    };
  }

  Future<void> importData(Map<String, dynamic> data) async {
    final rawLogs = data['qsoLogs'];
    if (rawLogs is! List) {
      throw const FormatException('导入文件缺少 qsoLogs 数据');
    }

    final logs = rawLogs
        .map((item) => QsoLog.fromJson(item as Map<String, dynamic>))
        .toList();
    await replaceQsoLogs(logs);

    final theme = data['theme'];
    if (theme is Map<String, dynamic>) {
      await saveThemeSettings(
        AppThemeSettings(
          mode: AppThemeSettings.modeFromKey(theme['mode'] as String?),
          colorSchemeKey: theme['colorSchemeKey'] as String? ?? 'beacon',
          customSeedColor: theme['customSeedColor'] as int?,
        ),
      );
    }

    final radioProfile = data['radioProfile'];
    if (radioProfile is Map<String, dynamic>) {
      await saveRadioProfile(RadioProfile.fromJson(radioProfile));
    }
  }

  Future<RadioProfile> getRadioProfile() async {
    final db = await database;
    final rows = await db.query('app_settings');
    final map = {
      for (final row in rows) row['key'] as String: row['value'] as String,
    };

    return RadioProfile(
      callsign: map['radio_callsign'] ?? RadioProfile.defaults.callsign,
      qth: map['radio_qth'] ?? RadioProfile.defaults.qth,
      grid: map['radio_grid'] ?? RadioProfile.defaults.grid,
      licenseClass:
          map['radio_license_class'] ?? RadioProfile.defaults.licenseClass,
      licenseExpiry:
          map['radio_license_expiry'] ?? RadioProfile.defaults.licenseExpiry,
    );
  }

  Future<void> saveRadioProfile(RadioProfile profile) async {
    final db = await database;
    await db.transaction((txn) async {
      final entries = {
        'radio_callsign': profile.callsign,
        'radio_qth': profile.qth,
        'radio_grid': profile.grid,
        'radio_license_class': profile.licenseClass,
        'radio_license_expiry': profile.licenseExpiry,
      };

      for (final entry in entries.entries) {
        await txn.insert(
          'app_settings',
          {'key': entry.key, 'value': entry.value},
          conflictAlgorithm: ConflictAlgorithm.replace,
        );
      }
    });
  }

  Future<AppThemeSettings> getThemeSettings() async {
    final db = await database;
    final rows = await db.query('app_settings');
    final map = {
      for (final row in rows) row['key'] as String: row['value'] as String,
    };

    return AppThemeSettings(
      mode: AppThemeSettings.modeFromKey(map['theme_mode']),
      colorSchemeKey: map['theme_color_scheme'] ?? 'beacon',
      customSeedColor: int.tryParse(map['theme_custom_seed_color'] ?? ''),
    );
  }

  Future<void> saveThemeSettings(AppThemeSettings settings) async {
    final db = await database;
    await db.transaction((txn) async {
      await txn.insert(
        'app_settings',
        {'key': 'theme_mode', 'value': settings.modeKey},
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
      await txn.insert(
        'app_settings',
        {'key': 'theme_color_scheme', 'value': settings.colorSchemeKey},
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
      if (settings.customSeedColor == null) {
        await txn.delete(
          'app_settings',
          where: 'key = ?',
          whereArgs: ['theme_custom_seed_color'],
        );
      } else {
        await txn.insert(
          'app_settings',
          {
            'key': 'theme_custom_seed_color',
            'value': settings.customSeedColor.toString(),
          },
          conflictAlgorithm: ConflictAlgorithm.replace,
        );
      }
    });
  }
}
