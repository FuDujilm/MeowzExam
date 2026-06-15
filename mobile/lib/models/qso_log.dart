import 'package:flutter/material.dart';

class QsoLog {
  final String id;
  final TimeOfDay time;
  final String callsign;
  final String country;
  final String band;
  final String mode;
  final String frequency;
  final String report;
  final String grid;
  final DateTime date;
  final DateTime createdAt;

  QsoLog({
    String? id,
    required this.time,
    required this.callsign,
    required this.country,
    required this.band,
    required this.mode,
    required this.frequency,
    required this.report,
    required this.grid,
    required this.date,
    DateTime? createdAt,
  })  : id = id ?? DateTime.now().microsecondsSinceEpoch.toString(),
        createdAt = createdAt ?? DateTime.now();

  DateTime get dateTime {
    return DateTime(date.year, date.month, date.day, time.hour, time.minute);
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'date_time': dateTime.toIso8601String(),
      'callsign': callsign,
      'country': country,
      'band': band,
      'mode': mode,
      'frequency': frequency,
      'report': report,
      'grid': grid,
      'created_at': createdAt.toIso8601String(),
    };
  }

  factory QsoLog.fromMap(Map<String, dynamic> map) {
    final dateTime = DateTime.parse(map['date_time'] as String).toLocal();
    return QsoLog(
      id: map['id'] as String?,
      time: TimeOfDay(hour: dateTime.hour, minute: dateTime.minute),
      callsign: map['callsign'] as String? ?? '',
      country: map['country'] as String? ?? '',
      band: map['band'] as String? ?? '',
      mode: map['mode'] as String? ?? '',
      frequency: map['frequency'] as String? ?? '',
      report: map['report'] as String? ?? '',
      grid: map['grid'] as String? ?? '',
      date: DateTime(dateTime.year, dateTime.month, dateTime.day),
      createdAt: DateTime.tryParse(map['created_at'] as String? ?? ''),
    );
  }

  Map<String, dynamic> toJson() => toMap();

  factory QsoLog.fromJson(Map<String, dynamic> json) => QsoLog.fromMap(json);
}
