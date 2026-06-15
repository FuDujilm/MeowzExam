class RadioProfile {
  final String callsign;
  final String qth;
  final String grid;
  final String licenseClass;
  final String licenseExpiry;

  const RadioProfile({
    required this.callsign,
    required this.qth,
    required this.grid,
    required this.licenseClass,
    required this.licenseExpiry,
  });

  static const defaults = RadioProfile(
    callsign: '未设置',
    qth: '未设置 QTH',
    grid: '未设置 Grid',
    licenseClass: 'A 级',
    licenseExpiry: '未设置到期日',
  );

  RadioProfile copyWith({
    String? callsign,
    String? qth,
    String? grid,
    String? licenseClass,
    String? licenseExpiry,
  }) {
    return RadioProfile(
      callsign: callsign ?? this.callsign,
      qth: qth ?? this.qth,
      grid: grid ?? this.grid,
      licenseClass: licenseClass ?? this.licenseClass,
      licenseExpiry: licenseExpiry ?? this.licenseExpiry,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'callsign': callsign,
      'qth': qth,
      'grid': grid,
      'licenseClass': licenseClass,
      'licenseExpiry': licenseExpiry,
    };
  }

  factory RadioProfile.fromJson(Map<String, dynamic> json) {
    return RadioProfile(
      callsign: json['callsign'] as String? ?? defaults.callsign,
      qth: json['qth'] as String? ?? defaults.qth,
      grid: json['grid'] as String? ?? defaults.grid,
      licenseClass: json['licenseClass'] as String? ?? defaults.licenseClass,
      licenseExpiry: json['licenseExpiry'] as String? ?? defaults.licenseExpiry,
    );
  }
}
