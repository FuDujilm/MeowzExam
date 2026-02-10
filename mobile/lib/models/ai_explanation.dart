class AiExplanation {
  final String summary;
  final List<String> answer;
  final List<OptionAnalysis> optionAnalysis;
  final List<String> keyPoints;
  final List<MemoryAid> memoryAids;
  final List<Citation> citations;
  final int difficulty;
  final bool insufficiency;

  AiExplanation({
    required this.summary,
    required this.answer,
    required this.optionAnalysis,
    required this.keyPoints,
    required this.memoryAids,
    required this.citations,
    required this.difficulty,
    required this.insufficiency,
  });

  factory AiExplanation.fromJson(Map<String, dynamic> json) {
    return AiExplanation(
      summary: json['summary'] as String? ?? '',
      answer: (json['answer'] as List<dynamic>?)?.map((e) => e as String).toList() ?? [],
      optionAnalysis: (json['optionAnalysis'] as List<dynamic>?)
              ?.map((e) => OptionAnalysis.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      keyPoints: (json['keyPoints'] as List<dynamic>?)?.map((e) => e as String).toList() ?? [],
      memoryAids: (json['memoryAids'] as List<dynamic>?)
              ?.map((e) => MemoryAid.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      citations: (json['citations'] as List<dynamic>?)
              ?.map((e) => Citation.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      difficulty: json['difficulty'] as int? ?? 1,
      insufficiency: json['insufficiency'] == true,
    );
  }
}

class OptionAnalysis {
  final String option;
  final String verdict; // "correct" | "wrong"
  final String reason;

  OptionAnalysis({
    required this.option,
    required this.verdict,
    required this.reason,
  });

  factory OptionAnalysis.fromJson(Map<String, dynamic> json) {
    return OptionAnalysis(
      option: json['option'] as String? ?? '',
      verdict: json['verdict'] as String? ?? 'wrong',
      reason: json['reason'] as String? ?? '',
    );
  }

  bool get isCorrect => verdict.toLowerCase() == 'correct';
}

class MemoryAid {
  final String type;
  final String text;

  MemoryAid({required this.type, required this.text});

  factory MemoryAid.fromJson(Map<String, dynamic> json) {
    return MemoryAid(
      type: json['type'] as String? ?? 'OTHER',
      text: json['text'] as String? ?? '',
    );
  }
}

class Citation {
  final String title;
  final String url;
  final String quote;

  Citation({required this.title, required this.url, required this.quote});

  factory Citation.fromJson(Map<String, dynamic> json) {
    return Citation(
      title: json['title'] as String? ?? '',
      url: json['url'] as String? ?? '',
      quote: json['quote'] as String? ?? '',
    );
  }
}
