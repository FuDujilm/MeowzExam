import 'package:flutter/material.dart';

class RadioThemeColors {
  final Color page;
  final Color appBar;
  final Color panel;
  final Color panelAlt;
  final Color border;
  final Color text;
  final Color muted;
  final Color accent;

  const RadioThemeColors({
    required this.page,
    required this.appBar,
    required this.panel,
    required this.panelAlt,
    required this.border,
    required this.text,
    required this.muted,
    required this.accent,
  });
}

RadioThemeColors radioThemeColors(BuildContext context) {
  final theme = Theme.of(context);
  final scheme = theme.colorScheme;
  final isDark = theme.brightness == Brightness.dark;

  if (isDark) {
    return RadioThemeColors(
      page: const Color(0xff061426),
      appBar: const Color(0xff071a31),
      panel: const Color(0xff0b1d34),
      panelAlt: const Color(0xff0d2139),
      border: const Color(0xff1d385d),
      text: Colors.white,
      muted: const Color(0xffa9bad3),
      accent: scheme.primary,
    );
  }

  return RadioThemeColors(
    page: theme.scaffoldBackgroundColor,
    appBar: scheme.surface,
    panel: scheme.surface,
    panelAlt: scheme.surfaceContainerHighest,
    border: scheme.outlineVariant,
    text: scheme.onSurface,
    muted: scheme.onSurfaceVariant,
    accent: scheme.primary,
  );
}
