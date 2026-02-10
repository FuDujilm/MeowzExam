class QuestionLibrary {
  final String id;
  final String code;
  final String name;
  final String? shortName;
  final String? displayLabel;
  final String? description;
  final String? region;
  final String? version;
  final String? sourceType;
  final String? visibility;
  final int totalQuestions;
  final int singleChoiceCount;
  final int multipleChoiceCount;
  final int trueFalseCount;
  final List<QuestionLibraryPreset> presets;

  QuestionLibrary({
    required this.id,
    required this.code,
    required this.name,
    this.shortName,
    this.displayLabel,
    this.description,
    this.region,
    this.version,
    this.sourceType,
    this.visibility,
    this.totalQuestions = 0,
    this.singleChoiceCount = 0,
    this.multipleChoiceCount = 0,
    this.trueFalseCount = 0,
    this.presets = const [],
  });

  factory QuestionLibrary.fromJson(Map<String, dynamic> json) {
    return QuestionLibrary(
      id: json['id'] as String,
      code: json['code'] as String,
      name: json['name'] as String,
      shortName: json['shortName'] as String?,
      displayLabel: json['displayLabel'] as String?,
      description: json['description'] as String?,
      region: json['region'] as String?,
      version: json['version'] as String?,
      sourceType: json['sourceType'] as String?,
      visibility: json['visibility'] as String?,
      totalQuestions: json['totalQuestions'] as int? ?? 0,
      singleChoiceCount: json['singleChoiceCount'] as int? ?? 0,
      multipleChoiceCount: json['multipleChoiceCount'] as int? ?? 0,
      trueFalseCount: json['trueFalseCount'] as int? ?? 0,
      presets: (json['presets'] as List<dynamic>?)
              ?.map((preset) => QuestionLibraryPreset.fromJson(preset as Map<String, dynamic>))
              .toList() ??
          const [],
    );
  }
}

class QuestionLibraryPreset {
  final String id;
  final String code;
  final String name;
  final String? description;
  final int? durationMinutes;
  final int? totalQuestions;
  final int? passScore;
  final int? singleChoiceCount;
  final int? multipleChoiceCount;
  final int? trueFalseCount;

  const QuestionLibraryPreset({
    required this.id,
    required this.code,
    required this.name,
    this.description,
    this.durationMinutes,
    this.totalQuestions,
    this.passScore,
    this.singleChoiceCount,
    this.multipleChoiceCount,
    this.trueFalseCount,
  });

  factory QuestionLibraryPreset.fromJson(Map<String, dynamic> json) {
    return QuestionLibraryPreset(
      id: json['id'] as String,
      code: json['code'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      durationMinutes: json['durationMinutes'] as int?,
      totalQuestions: json['totalQuestions'] as int?,
      passScore: json['passScore'] as int?,
      singleChoiceCount: json['singleChoiceCount'] as int?,
      multipleChoiceCount: json['multipleChoiceCount'] as int?,
      trueFalseCount: json['trueFalseCount'] as int?,
    );
  }
}
