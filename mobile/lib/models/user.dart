class User {
  final String id;
  final String email;
  final String? callsign;
  final String? selectedExamType;

  User({
    required this.id,
    required this.email,
    this.callsign,
    this.selectedExamType,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      callsign: json['callsign'] as String?,
      selectedExamType: json['selectedExamType'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'callsign': callsign,
      'selectedExamType': selectedExamType,
    };
  }
}
