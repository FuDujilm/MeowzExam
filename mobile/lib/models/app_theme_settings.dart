import 'package:flutter/material.dart';

class AppThemeSettings {
  final ThemeMode mode;
  final String colorSchemeKey;
  final int? customSeedColor;

  const AppThemeSettings({
    required this.mode,
    required this.colorSchemeKey,
    this.customSeedColor,
  });

  static const defaultSettings = AppThemeSettings(
    mode: ThemeMode.system,
    colorSchemeKey: 'beacon',
  );

  String get modeKey {
    return switch (mode) {
      ThemeMode.system => 'system',
      ThemeMode.light => 'light',
      ThemeMode.dark => 'dark',
    };
  }

  AppThemeSettings copyWith({
    ThemeMode? mode,
    String? colorSchemeKey,
    int? customSeedColor,
    bool clearCustomSeedColor = false,
  }) {
    return AppThemeSettings(
      mode: mode ?? this.mode,
      colorSchemeKey: colorSchemeKey ?? this.colorSchemeKey,
      customSeedColor:
          clearCustomSeedColor ? null : customSeedColor ?? this.customSeedColor,
    );
  }

  static ThemeMode modeFromKey(String? key) {
    return switch (key) {
      'light' => ThemeMode.light,
      'dark' => ThemeMode.dark,
      _ => ThemeMode.system,
    };
  }
}

class BeaconColorScheme {
  final String key;
  final String label;
  final Color seedColor;
  final Color darkScaffold;
  final Color lightScaffold;

  const BeaconColorScheme({
    required this.key,
    required this.label,
    required this.seedColor,
    required this.darkScaffold,
    required this.lightScaffold,
  });
}

const beaconColorSchemes = [
  BeaconColorScheme(
    key: 'beacon',
    label: 'Beacon 蓝',
    seedColor: Color(0xff2f7cff),
    darkScaffold: Color(0xff061426),
    lightScaffold: Color(0xfff4f8ff),
  ),
  BeaconColorScheme(
    key: 'aurora',
    label: '极光绿',
    seedColor: Color(0xff20d174),
    darkScaffold: Color(0xff061b16),
    lightScaffold: Color(0xfff1fbf5),
  ),
  BeaconColorScheme(
    key: 'solar',
    label: '太阳橙',
    seedColor: Color(0xffff9f2f),
    darkScaffold: Color(0xff1d1307),
    lightScaffold: Color(0xfffff6ea),
  ),
  BeaconColorScheme(
    key: 'violet',
    label: '电波紫',
    seedColor: Color(0xff7c5cff),
    darkScaffold: Color(0xff120f24),
    lightScaffold: Color(0xfff7f3ff),
  ),
  BeaconColorScheme(
    key: 'rose',
    label: '彩虹',
    seedColor: Color(0xffbb258e),
    darkScaffold: Color(0xff1f111b),
    lightScaffold: Color(0xfffff2f9),
  ),
];

BeaconColorScheme colorSchemeByKey(String key) {
  return beaconColorSchemes.firstWhere(
    (scheme) => scheme.key == key,
    orElse: () => beaconColorSchemes.first,
  );
}
