import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/app_theme_settings.dart';
import '../../services/theme_controller.dart';

class ThemePage extends StatelessWidget {
  const ThemePage({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<ThemeController>();

    return Scaffold(
      appBar: AppBar(title: const Text('主题')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          _ThemePickerSection(
            settings: controller.settings,
            controller: controller,
          ),
        ],
      ),
    );
  }
}

class _ThemePickerSection extends StatelessWidget {
  final AppThemeSettings settings;
  final ThemeController controller;

  const _ThemePickerSection({
    required this.settings,
    required this.controller,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.settings_suggest, color: scheme.primary),
            const SizedBox(width: 10),
            Text(
              '主题模式',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            _ThemeModeButton(
              icon: Icons.sync,
              label: '自动',
              selected: settings.mode == ThemeMode.system,
              onTap: () => controller.updateThemeMode(ThemeMode.system),
            ),
            _ThemeModeButton(
              icon: Icons.light_mode,
              label: '浅色',
              selected: settings.mode == ThemeMode.light,
              onTap: () => controller.updateThemeMode(ThemeMode.light),
            ),
            _ThemeModeButton(
              icon: Icons.dark_mode,
              label: '深色',
              selected: settings.mode == ThemeMode.dark,
              onTap: () => controller.updateThemeMode(ThemeMode.dark),
            ),
          ],
        ),
        const SizedBox(height: 28),
        Row(
          children: [
            Icon(Icons.palette, color: scheme.primary),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                '主题色彩',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            FilledButton.tonal(
              onPressed: () => _showSchemeDialog(context),
              child: const Text('内容主题'),
            ),
          ],
        ),
        const SizedBox(height: 14),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            for (final colorScheme in beaconColorSchemes)
              _ThemeColorCard(
                scheme: colorScheme,
                selected: settings.customSeedColor == null &&
                    settings.colorSchemeKey == colorScheme.key,
                onTap: () => controller.updateColorScheme(colorScheme.key),
              ),
            _CustomThemeColorCard(
              color: settings.customSeedColor == null
                  ? scheme.primary
                  : Color(settings.customSeedColor!),
              selected: settings.customSeedColor != null,
              onTap: () => _showColorPicker(context),
            ),
          ],
        ),
      ],
    );
  }

  Future<void> _showSchemeDialog(BuildContext context) {
    final items = [
      const _SchemeOption('默认', Icons.expand_more),
      const _SchemeOption('高保真', Icons.radio_button_unchecked),
      const _SchemeOption('单色', Icons.radio_button_unchecked),
      const _SchemeOption('中性', Icons.radio_button_unchecked),
      const _SchemeOption('活力', Icons.radio_button_unchecked),
      const _SchemeOption('表现力', Icons.radio_button_unchecked),
      const _SchemeOption('内容主题', Icons.radio_button_unchecked),
      const _SchemeOption('彩虹', Icons.radio_button_checked),
      const _SchemeOption('果缤纷', Icons.radio_button_unchecked),
    ];

    return showDialog<void>(
      context: context,
      builder: (context) {
        final theme = Theme.of(context);
        return AlertDialog(
          title: const Text('配色方案'),
          contentPadding: const EdgeInsets.fromLTRB(0, 8, 0, 8),
          content: SizedBox(
            width: 320,
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: items.length,
              itemBuilder: (context, index) {
                final item = items[index];
                final selected = item.label == '彩虹' &&
                    settings.colorSchemeKey == 'rose' &&
                    settings.customSeedColor == null;
                return ListTile(
                  selected: selected,
                  leading: Icon(
                    selected ? Icons.radio_button_checked : item.icon,
                    color: selected ? theme.colorScheme.primary : null,
                  ),
                  title: Text(item.label),
                  onTap: () {
                    if (item.label == '彩虹') {
                      controller.updateColorScheme('rose');
                    }
                    Navigator.of(context).pop();
                  },
                );
              },
            ),
          ),
        );
      },
    );
  }

  Future<void> _showColorPicker(BuildContext context) async {
    final initialColor = settings.customSeedColor == null
        ? controller.seedColor
        : Color(settings.customSeedColor!);
    final color = await showDialog<Color>(
      context: context,
      builder: (context) => _ColorPickerDialog(initialColor: initialColor),
    );

    if (color != null) {
      await controller.updateCustomSeedColor(color);
    }
  }
}

class _ThemeModeButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _ThemeModeButton({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: selected ? scheme.primaryContainer : scheme.surfaceContainerHighest,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: selected ? scheme.primary : scheme.outlineVariant,
              width: selected ? 1.4 : 1,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 20),
              const SizedBox(width: 8),
              Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
            ],
          ),
        ),
      ),
    );
  }
}

class _ThemeColorCard extends StatelessWidget {
  final BeaconColorScheme scheme;
  final bool selected;
  final VoidCallback onTap;

  const _ThemeColorCard({
    required this.scheme,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return _ColorCardShell(
      selected: selected,
      onTap: onTap,
      child: Stack(
        children: [
          Positioned.fill(child: _PalettePreview(seedColor: scheme.seedColor)),
          if (selected)
            const Center(
              child: CircleAvatar(
                radius: 16,
                child: Icon(Icons.check, size: 18),
              ),
            ),
        ],
      ),
    );
  }
}

class _CustomThemeColorCard extends StatelessWidget {
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  const _CustomThemeColorCard({
    required this.color,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return _ColorCardShell(
      selected: selected,
      onTap: onTap,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Positioned.fill(child: _PalettePreview(seedColor: color)),
          if (selected)
            const CircleAvatar(
              radius: 16,
              child: Icon(Icons.check, size: 18),
            )
          else
            Icon(
              Icons.add,
              size: 34,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
        ],
      ),
    );
  }
}

class _ColorCardShell extends StatelessWidget {
  final bool selected;
  final VoidCallback onTap;
  final Widget child;

  const _ColorCardShell({
    required this.selected,
    required this.onTap,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: scheme.surfaceContainerHighest,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          width: 70,
          height: 70,
          padding: const EdgeInsets.all(9),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: selected ? scheme.primary : scheme.outlineVariant,
              width: selected ? 1.6 : 1,
            ),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: child,
          ),
        ),
      ),
    );
  }
}

class _PalettePreview extends StatelessWidget {
  final Color seedColor;

  const _PalettePreview({required this.seedColor});

  @override
  Widget build(BuildContext context) {
    final palette = ColorScheme.fromSeed(seedColor: seedColor);
    return GridView.count(
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      padding: EdgeInsets.zero,
      children: [
        ColoredBox(color: palette.primaryContainer),
        ColoredBox(color: palette.secondaryContainer),
        ColoredBox(color: palette.tertiaryContainer),
        ColoredBox(color: palette.surfaceContainerHighest),
      ],
    );
  }
}

class _ColorPickerDialog extends StatefulWidget {
  final Color initialColor;

  const _ColorPickerDialog({required this.initialColor});

  @override
  State<_ColorPickerDialog> createState() => _ColorPickerDialogState();
}

class _ColorPickerDialogState extends State<_ColorPickerDialog> {
  late HSVColor _hsvColor;

  @override
  void initState() {
    super.initState();
    _hsvColor = HSVColor.fromColor(widget.initialColor);
  }

  @override
  Widget build(BuildContext context) {
    final color = _hsvColor.toColor();
    return AlertDialog(
      title: const Text('调色板'),
      content: SizedBox(
        width: 320,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 260,
              height: 260,
              child: Stack(
                children: [
                  Positioned.fill(
                    child: _HueWheel(
                      selectedHue: _hsvColor.hue,
                      onChanged: (hue) {
                        setState(() {
                          _hsvColor = HSVColor.fromAHSV(
                            _hsvColor.alpha,
                            hue,
                            _hsvColor.saturation,
                            _hsvColor.value,
                          );
                        });
                      },
                    ),
                  ),
                  Center(
                    child: _SaturationValuePanel(
                      hsvColor: _hsvColor,
                      onChanged: (saturation, value) {
                        setState(() {
                          _hsvColor = HSVColor.fromAHSV(
                            _hsvColor.alpha,
                            _hsvColor.hue,
                            saturation,
                            value,
                          );
                        });
                      },
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.22),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                '#${color.value.toRadixString(16).substring(2).toUpperCase()}',
                style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.6,
                ),
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('取消'),
        ),
        TextButton(
          onPressed: () => Navigator.of(context).pop(color),
          child: const Text('确定'),
        ),
      ],
    );
  }
}

class _HueWheel extends StatelessWidget {
  final double selectedHue;
  final ValueChanged<double> onChanged;

  const _HueWheel({
    required this.selectedHue,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onPanDown: (details) => _updateHue(details.localPosition, context),
      onPanUpdate: (details) => _updateHue(details.localPosition, context),
      child: CustomPaint(
        painter: _HueWheelPainter(selectedHue: selectedHue),
      ),
    );
  }

  void _updateHue(Offset position, BuildContext context) {
    final box = context.findRenderObject() as RenderBox?;
    if (box == null) return;
    final center = Offset(box.size.width / 2, box.size.height / 2);
    final vector = position - center;
    final radians = vector.direction;
    final hue = (radians * 180 / math.pi + 360) % 360;
    onChanged(hue);
  }
}

class _HueWheelPainter extends CustomPainter {
  final double selectedHue;

  const _HueWheelPainter({required this.selectedHue});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.shortestSide / 2;
    final rect = Rect.fromCircle(center: center, radius: radius);
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 32
      ..shader = SweepGradient(
        colors: [
          for (var hue = 0; hue <= 360; hue += 30)
            HSVColor.fromAHSV(1, hue.toDouble(), 1, 1).toColor(),
        ],
      ).createShader(rect);

    canvas.drawCircle(center, radius - 16, paint);

    final angle = selectedHue * math.pi / 180;
    final handleCenter = Offset(
      center.dx + (radius - 16) * math.cos(angle),
      center.dy + (radius - 16) * math.sin(angle),
    );
    canvas.drawCircle(handleCenter, 13, Paint()..color = Colors.white);
    canvas.drawCircle(
      handleCenter,
      10,
      Paint()
        ..color = HSVColor.fromAHSV(1, selectedHue, 1, 1).toColor()
        ..style = PaintingStyle.fill,
    );
  }

  @override
  bool shouldRepaint(covariant _HueWheelPainter oldDelegate) {
    return oldDelegate.selectedHue != selectedHue;
  }
}

class _SaturationValuePanel extends StatelessWidget {
  final HSVColor hsvColor;
  final void Function(double saturation, double value) onChanged;

  const _SaturationValuePanel({
    required this.hsvColor,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onPanDown: (details) => _update(details.localPosition, context),
      onPanUpdate: (details) => _update(details.localPosition, context),
      child: CustomPaint(
        size: const Size(128, 128),
        painter: _SaturationValuePainter(hsvColor: hsvColor),
      ),
    );
  }

  void _update(Offset position, BuildContext context) {
    final box = context.findRenderObject() as RenderBox?;
    if (box == null) return;
    final saturation = (position.dx / box.size.width).clamp(0.0, 1.0);
    final value = (1 - position.dy / box.size.height).clamp(0.0, 1.0);
    onChanged(saturation, value);
  }
}

class _SaturationValuePainter extends CustomPainter {
  final HSVColor hsvColor;

  const _SaturationValuePainter({required this.hsvColor});

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final hueColor = HSVColor.fromAHSV(1, hsvColor.hue, 1, 1).toColor();
    canvas.drawRect(
      rect,
      Paint()
        ..shader = LinearGradient(
          colors: [Colors.white, hueColor],
        ).createShader(rect),
    );
    canvas.drawRect(
      rect,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Colors.transparent, Colors.black],
        ).createShader(rect),
    );

    final handle = Offset(
      hsvColor.saturation * size.width,
      (1 - hsvColor.value) * size.height,
    );
    canvas.drawCircle(handle, 8, Paint()..color = Colors.white);
    canvas.drawCircle(
      handle,
      6,
      Paint()..color = hsvColor.toColor(),
    );
  }

  @override
  bool shouldRepaint(covariant _SaturationValuePainter oldDelegate) {
    return oldDelegate.hsvColor != hsvColor;
  }
}

class _SchemeOption {
  final String label;
  final IconData icon;

  const _SchemeOption(this.label, this.icon);
}
