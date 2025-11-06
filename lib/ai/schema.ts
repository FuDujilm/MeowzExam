import { z } from "zod"

export const MemoryAidTypeSchema = z.enum(["ACRONYM", "RHYMING", "RULE", "STORY", "MNEMONIC", "OTHER"])

export const MemoryAidSchema = z.object({
  type: MemoryAidTypeSchema,
  text: z.string().min(5).max(120).describe("Short mnemonic content"),
})

export const CitationSchema = z.object({
  title: z.string().describe("Source title"),
  url: z.string().url().describe("Source link"),
  quote: z.string().min(10).describe("Quoted sentence or summary"),
})

export const OptionAnalysisSchema = z.object({
  option: z.string().describe("Option key such as A/B/C/D"),
  verdict: z.enum(["correct", "wrong"]).describe("Whether the option is correct"),
  reason: z.string().min(10).describe("Explanation for the verdict"),
})

export const AiExplainSchema = z.object({
  summary: z.string().min(20).max(300).describe("One sentence conclusion"),
  answer: z.array(z.string()).min(1).describe("Correct answer options"),
  optionAnalysis: z.array(OptionAnalysisSchema).min(2).describe("Per option analysis"),
  keyPoints: z.array(z.string()).min(1).max(5).describe("Key knowledge points"),
  memoryAids: z.array(MemoryAidSchema).max(3).describe("Optional memory aids"),
  citations: z.array(CitationSchema).min(0).max(5).describe("Optional references"),
  difficulty: z.number().int().min(1).max(5).describe("Difficulty rating 1-5"),
  insufficiency: z.boolean().default(false).describe("True when evidence is insufficient"),
})

export type AiExplainOutput = z.infer<typeof AiExplainSchema>
export type MemoryAid = z.infer<typeof MemoryAidSchema>
export type Citation = z.infer<typeof CitationSchema>
export type OptionAnalysis = z.infer<typeof OptionAnalysisSchema>

export const SYSTEM_PROMPT_XML = `你是一名专业的业余无线电考试讲师，负责生成结构化解析。所有输出必须严格符合以下 XML 模板。

<explanation>
  <summary>概括题意与结论，长度不少于 20 字。</summary>
  <answers>
    <answer option="A">抄写题目中 A 选项的原文</answer>
    <!-- 若有多个正确答案，请分别列出 -->
  </answers>
  <optionAnalysis>
    <item option="A" verdict="correct|wrong">
      <reason>针对该选项的判定依据，至少 20 字，说明法规/事实/推理。</reason>
    </item>
    <!-- 按题面顺序覆盖全部选项 -->
  </optionAnalysis>
  <keyPoints>
    <point>总结该题的考点或注意事项，10~80 字。</point>
  </keyPoints>
  <memoryAids>
    <aid type="MNEMONIC">若无合适记忆法，可删除 aid 节点或输出简洁技巧。</aid>
  </memoryAids>
  <citations>
    <citation>
      <title>引用资料标题</title>
      <url>https://示例链接（若无可靠来源，可删除 citations 段）</url>
      <quote>引用的关键语句，10~120 字。</quote>
    </citation>
  </citations>
  <difficulty>1</difficulty>
  <insufficiency>false</insufficiency>
</explanation>

要求：
1. 严禁输出 JSON、Markdown 或额外说明；
2. answers 中的 option 属性必须与题目选项编号一致，文本写选项原文；
3. optionAnalysis 中 verdict 只能是 correct 或 wrong，reason ≥20 字并写明依据；
4. 若证据不足或无法确定，请将 insufficiency 设为 true 并说明原因；
5. 若无记忆法或引用，可省略对应子节点，但必须保留 XML 合法结构。`

export function buildUserPrompt(params: {
  questionTitle: string
  options: Array<{ id: string; text: string }>
  standardAnswer: string[]
  syllabusPath?: string
  evidence?: Array<{ title: string; url: string; quote: string }>
  includeQuestion?: boolean
  includeOptions?: boolean
  template?: string | null
}): string {
  const {
    questionTitle,
    options,
    standardAnswer,
    syllabusPath,
    evidence,
    includeQuestion = true,
    includeOptions = true,
    template,
  } = params

  const optionsText = options.map(opt => `${opt.id}. ${opt.text}`).join("\n")
  const answerText = standardAnswer.join(", ")

  if (template && template.trim().length > 0) {
    const replacements: Record<string, string> = {
      question: includeQuestion ? questionTitle : "",
      options: includeOptions ? optionsText : "",
      standard_answer: answerText,
      syllabus_path: syllabusPath ?? "",
    }

    let result = template
    Object.entries(replacements).forEach(([key, value]) => {
      const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
      result = result.replace(pattern, value)
    })

    const instruction = "请严格按 System 说明输出 XML。"
    return `${result.trim()}\n\n${instruction}`
  }

  const sections: string[] = []

  if (includeQuestion) {
    sections.push(`【题目】${questionTitle}`)
  }

  if (includeOptions) {
    sections.push(`【选项】\n${optionsText}`)
  }

  sections.push(`【标准答案】${answerText}`)

  if (syllabusPath) {
    sections.push(`【知识点】${syllabusPath}`)
  }

  if (evidence && evidence.length > 0) {
    const evidenceLines = evidence
      .slice(0, 5)
      .map(e => `- 证据：${e.title}\n  URL：${e.url}\n  摘要/引语：${e.quote}`)
      .join('\n')
    sections.push(`【证据素材】至多 5 条\n${evidenceLines}`)
  } else {
    sections.push('【证据素材】无，可结合教材或法规常识撰写。')
  }

  const xmlTemplate = `<explanation>\n  <summary></summary>\n  <answers>\n    <answer option=\"A\"></answer>\n  </answers>\n  <optionAnalysis>\n    <item option=\"A\" verdict=\"correct\">\n      <reason></reason>\n    </item>\n  </optionAnalysis>\n  <keyPoints>\n    <point></point>\n  </keyPoints>\n  <memoryAids>\n    <aid type=\"MNEMONIC\"></aid>\n  </memoryAids>\n  <citations>\n    <citation>\n      <title></title>\n      <url></url>\n      <quote></quote>\n    </citation>\n  </citations>\n  <difficulty></difficulty>\n  <insufficiency>false</insufficiency>\n</explanation>`

  sections.push(`【输出模板】请参考以下结构：\n${xmlTemplate}`)
  sections.push('请直接输出符合模板的 XML，勿添加额外说明。')

  return sections.join('\n\n')
}

export function calculateWilsonScore(upvotes: number, downvotes: number): number {
  const n = upvotes + downvotes
  if (n === 0) return 0

  const z = 1.96
  const phat = upvotes / n

  const numerator =
    phat + (z * z) / (2 * n) - z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * n)) / n)
  const denominator = 1 + (z * z) / n

  return Math.max(0, numerator / denominator)
}
