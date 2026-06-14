import 'package:flutter/material.dart';

class RadioPlaceholderPage extends StatelessWidget {
  final String title;
  final IconData icon;
  final String subtitle;

  const RadioPlaceholderPage({
    super.key,
    required this.title,
    required this.icon,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xff061426),
      appBar: AppBar(
        backgroundColor: const Color(0xff071a31),
        foregroundColor: Colors.white,
        title: Text(title),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 88,
                height: 88,
                decoration: BoxDecoration(
                  color: const Color(0xff10243d),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: const Color(0xff214366)),
                ),
                child: Icon(icon, color: const Color(0xff58a6ff), size: 42),
              ),
              const SizedBox(height: 24),
              Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                subtitle,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Color(0xff91a2ba),
                  height: 1.5,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
