class User {
  final String id;
  final String email;
  final String? name;
  final String? image;
  final String? callsign;
  final String? selectedExamType;
  final int totalPoints;
  final int currentStreak;
  final DateTime? lastCheckIn;

  User({
    required this.id,
    required this.email,
    this.name,
    this.image,
    this.callsign,
    this.selectedExamType,
    this.totalPoints = 0,
    this.currentStreak = 0,
    this.lastCheckIn,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String?,
      image: json['image'] as String?,
      callsign: json['callsign'] as String?,
      selectedExamType: json['selectedExamType'] as String?,
      totalPoints: json['totalPoints'] as int? ?? 0,
      currentStreak: json['currentStreak'] as int? ?? 0,
      lastCheckIn: json['lastCheckIn'] != null ? DateTime.tryParse(json['lastCheckIn']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'image': image,
      'callsign': callsign,
      'selectedExamType': selectedExamType,
      'totalPoints': totalPoints,
      'currentStreak': currentStreak,
      'lastCheckIn': lastCheckIn?.toIso8601String(),
    };
  }
}
