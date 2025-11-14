import OpenAI from "openai"
import type { ChatCompletionCreateParamsNonStreaming, ChatCompletionMessageParam } from "openai/resources/chat/completions"
import type { AiModelGroup, AiModelUsageScope } from "@/lib/generated/prisma"
import { ZodError } from "zod"

import { prisma } from "@/lib/db"
import { applyStyleToPrompt } from "@/lib/ai/style"
import { AiExplainSchema, SYSTEM_PROMPT_XML, buildUserPrompt, type AiExplainOutput, type OptionAnalysis } from "./schema"

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4"
const DEFAULT_TEMPERATURE = 0.2

type ModelUsageScope = AiModelUsageScope

interface ResolvedOpenAI {
  client: OpenAI
  group: AiModelGroup | null
  model: string
}

type MemoryAidType = 'ACRONYM' | 'RHYMING' | 'RULE' | 'STORY' | 'MNEMONIC' | 'OTHER'

const ALLOWED_MEMORY_AID_TYPES: MemoryAidType[] = ['ACRONYM', 'RHYMING', 'RULE', 'STORY', 'MNEMONIC', 'OTHER']

function matchesUsageScope(groupScope: ModelUsageScope, requiredScope: ModelUsageScope): boolean {
  if (requiredScope === 'BOTH') {
    return true
  }
  if (groupScope === 'BOTH') {
    return true
  }
  return groupScope === requiredScope
}

function usageScopeFilter(requiredScope: ModelUsageScope) {
  if (requiredScope === 'BOTH') {
    return undefined
  }

  return {
    in: [requiredScope, 'BOTH'] as ModelUsageScope[],
  }
}

function normalizeMemoryAidType(rawType: string): MemoryAidType {
  const normalized = rawType.trim().toUpperCase()

  if (ALLOWED_MEMORY_AID_TYPES.includes(normalized as MemoryAidType)) {
    return normalized as MemoryAidType
  }

  if (normalized.includes('ACRONYM')) return 'ACRONYM'
  if (normalized.includes('RHYME')) return 'RHYMING'
  if (normalized.includes('RULE')) return 'RULE'
  if (normalized.includes('STORY')) return 'STORY'
  if (normalized.includes('MNEMONIC')) return 'MNEMONIC'

  return 'OTHER'
}

function isValidHttpUrl(value: string): boolean {
  if (!value) {
    return false
  }

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch (_error) {
    return false
  }
}

function debugLog(...args: unknown[]) {
  if (process.env.NODE_ENV !== "production") {
    console.debug("[AI][OpenAI]", ...args)
  }
}

function extractBaseUrl(client: OpenAI): string | null {
  const raw = (client as unknown as { baseURL?: string; clientOptions?: { baseURL?: string } })
  return raw?.baseURL ?? raw?.clientOptions?.baseURL ?? null
}

export interface AIExplanationRequest {
  questionTitle: string
  options: Array<{ id: string; text: string }>
  correctAnswers: string[]
  category?: string
  difficulty?: string
  syllabusPath?: string
  evidence?: Array<{ title: string; url: string; quote: string }>
}

export interface AIExplanationResult {
  explanation: AiExplainOutput
  modelName: string
  provider: "OPENAI"
  groupId: string | null
}

async function getActiveModelGroup(requiredScope: ModelUsageScope = 'EXPLANATION'): Promise<AiModelGroup | null> {
  const preferredName = process.env.AI_MODEL_GROUP_NAME?.trim()
  if (preferredName) {
    const preferred = await prisma.aiModelGroup.findUnique({ where: { name: preferredName } })
    if (preferred && preferred.isActive && matchesUsageScope(preferred.usageScope, requiredScope)) {
      return preferred
    }
  }

  const usageFilter = usageScopeFilter(requiredScope)

  const group = await prisma.aiModelGroup.findFirst({
    where: {
      isActive: true,
      ...(usageFilter ? { usageScope: usageFilter } : {}),
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'desc' },
    ],
  })

  if (group) {
    return group
  }

  return null
}

function resolveApiKey(group: AiModelGroup | null): string {
  const candidate = group?.apiKey?.trim() || process.env.OPENAI_API_KEY?.trim()
  if (!candidate) {
    throw new Error("AI 服务未配置，请在后台添加模型组或设置 OPENAI_API_KEY")
  }
  return candidate
}

function resolveBaseUrl(group: AiModelGroup | null): string | undefined {
  const url = group?.proxyUrl?.trim() || group?.apiUrl?.trim() || process.env.OPENAI_BASE_URL?.trim()
  return url || undefined
}

function createClient(group: AiModelGroup | null): OpenAI {
  return new OpenAI({
    apiKey: resolveApiKey(group),
    baseURL: resolveBaseUrl(group),
  })
}

type ChatPayload = ChatCompletionCreateParamsNonStreaming & Record<string, unknown>

function mergeExtraBody(target: Record<string, unknown>, extra: unknown) {
  if (!extra || typeof extra !== "object" || Array.isArray(extra)) {
    return
  }
  Object.assign(target, extra as Record<string, unknown>)
}

const OPENAI_STATUS_MESSAGES: Record<number, string> = {
  400: "请求格式或参数错误，请核对后再试。",
  401: "未提供有效的 API Key，请检查凭据配置。",
  403: "无权访问该资源，请确认权限。",
  404: "请求的资源不存在，请确认目标是否正确。",
  422: "请求格式正确但语义有误，请检查参数含义。",
  429: "请求频率超限，请稍后重试或降低调用频率。",
  500: "模型服务内部错误，请稍后重试。",
  502: "上游服务暂不可用，请稍后再试。",
  503: "模型过载或处于维护中，请稍后重试。",
}

function handleOpenAIError(error: unknown): never {
  if (error && typeof error === "object" && "status" in (error as Record<string, unknown>)) {
    const statusValue = (error as Record<string, unknown>).status
    const status = typeof statusValue === "number" ? statusValue : Number(statusValue)

    const baseMessage = error instanceof Error
      ? error.message
      : String((error as Record<string, unknown>).message ?? "")

    const mapped = Number.isFinite(status) ? OPENAI_STATUS_MESSAGES[status] : undefined
    const detail = mapped
      ? `${mapped}${baseMessage ? `（${baseMessage}）` : ""}`
      : (baseMessage || "未知错误")

    throw new Error(`AI 服务错误(${status}): ${detail}`)
  }

  if (error instanceof Error) {
    throw error
  }

  throw new Error(typeof error === "string" ? error : "未知错误")
}

function cleanXmlContent(content: string): string {
  let sanitized = content.trim()

  if (sanitized.startsWith('```')) {
    sanitized = sanitized.replace(/^```[a-zA-Z0-9_-]*\s*/g, '')
    sanitized = sanitized.replace(/```$/g, '')
  }

  sanitized = sanitized.replace(/^[`\s]+/, '')
  sanitized = sanitized.replace(/[`\s]+$/, '')

  return sanitized.trim()
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function getTagContent(source: string, tag: string): string | null {
  const pattern = new RegExp(`<${tag}[^>]*>([\s\S]*?)</${tag}>`, 'i')
  const match = source.match(pattern)
  return match ? decodeXmlEntities(match[1].trim()) : null
}

function matchAll(pattern: RegExp, source: string): Array<RegExpMatchArray> {
  const results: Array<RegExpMatchArray> = []
  let match: RegExpMatchArray | null = null
  const globalPattern = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g')

  while ((match = globalPattern.exec(source)) !== null) {
    results.push(match)
  }

  return results
}

function parseXmlExplanation(xml: string, request: AIExplanationRequest): Record<string, unknown> {
  const rootMatch = xml.match(/<explanation[^>]*>([\s\S]*?)<\/explanation>/i)
  if (!rootMatch) {
    throw new Error('缺少 <explanation> 根节点')
  }

  const body = rootMatch[1]

  const summary = getTagContent(body, 'summary') || ''

  const answers: string[] = []
  const answerMatches = matchAll(/<answer\s+option="([^"]+)"[^>]*>([\s\S]*?)<\/answer>/gi, body)

  answerMatches.forEach(match => {
    const optionId = match[1]?.trim()
    if (optionId) {
      answers.push(optionId)
    }
  })

  if (answers.length === 0) {
    answers.push(...request.correctAnswers)
  }

  const optionAnalysisMatches = matchAll(/<item\s+option="([^"]+)"\s+verdict="([^"]+)"[^>]*>([\s\S]*?)<\/item>/gi, body)
  const optionAnalysis = optionAnalysisMatches.map(match => {
    const optionId = match[1]?.trim() || ''
    const verdict = match[2]?.trim().toLowerCase() === 'correct' ? 'correct' : 'wrong'
    const reason = getTagContent(match[3], 'reason') || ''
    return {
      option: optionId || 'UNKNOWN',
      verdict,
      reason: reason || `缺少对选项 ${optionId || 'UNKNOWN'} 的具体说明。`,
    }
  })

  const keyPointMatches = matchAll(/<point[^>]*>([\s\S]*?)<\/point>/gi, body)
  const keyPoints = keyPointMatches.map(match => decodeXmlEntities(match[1].trim())).filter(Boolean)

  const memoryAidMatches = matchAll(/<aid\s+type="([^"]+)"[^>]*>([\s\S]*?)<\/aid>/gi, body)
  const memoryAids = memoryAidMatches.map(match => ({
    type: normalizeMemoryAidType(match[1] || 'OTHER'),
    text: decodeXmlEntities(match[2] || '').trim(),
  })).filter(item => item.text.length >= 5)

  const citationMatches = matchAll(/<citation[^>]*>([\s\S]*?)<\/citation>/gi, body)
  const citations = citationMatches.map(match => {
    const block = match[1]
    const title = getTagContent(block, 'title') || ''
    const url = getTagContent(block, 'url') || ''
    const quote = getTagContent(block, 'quote') || ''

    if (!title || !url || !quote) {
      return null
    }

    if (!isValidHttpUrl(url)) {
      return null
    }

    return { title, url, quote }
  }).filter((item): item is { title: string; url: string; quote: string } => Boolean(item))

  const difficultyRaw = getTagContent(body, 'difficulty')
  const difficulty = difficultyRaw ? Number(difficultyRaw) : undefined

  const insufficiencyRaw = (getTagContent(body, 'insufficiency') || '').toLowerCase()
  const insufficiency = insufficiencyRaw === 'true'

  return {
    summary,
    answer: answers,
    optionAnalysis,
    keyPoints,
    memoryAids,
    citations,
    difficulty,
    insufficiency,
  }
}

function repairJsonString(source: string): string {
  let repaired = ''
  let inString = false
  let escapeNext = false

  for (let i = 0; i < source.length; i++) {
    const char = source[i]

    if (escapeNext) {
      repaired += char
      escapeNext = false
      continue
    }

    if (char === '\\') {
      repaired += char
      escapeNext = true
      continue
    }

    if (char === '"') {
      inString = !inString
      repaired += char
      continue
    }

    if (inString) {
      if (char === '\n' || char === '\r') {
        repaired += '\\n'
        continue
      }

      if (char === '\t') {
        repaired += '\\t'
        continue
      }
    }

    repaired += char
  }

  return repaired
}
function normalizeStructuredResponse(data: unknown) {
  const normalized: Record<string, unknown> = typeof data === "object" && data !== null
    ? { ...(data as Record<string, unknown>) }
    : {}

  const summary = normalized.summary
  normalized.summary = typeof summary === "string"
    ? summary
    : summary != null
      ? String(summary)
      : ""

  const answer = normalized.answer
  if (Array.isArray(answer)) {
    normalized.answer = answer.map((item) => String(item).trim()).filter(Boolean)
  } else if (typeof answer === "string") {
    normalized.answer = answer
      .split(/[,，\s]+/)
      .map((part) => part.trim())
      .filter(Boolean)
  } else {
    normalized.answer = []
  }

  if (!Array.isArray(normalized.optionAnalysis)) {
    normalized.optionAnalysis = []
  }

  if (!Array.isArray(normalized.keyPoints)) {
    normalized.keyPoints = []
  }

  const rawMemoryAids = Array.isArray(normalized.memoryAids)
    ? (normalized.memoryAids as unknown[])
    : []

  normalized.memoryAids = rawMemoryAids
    .map((item) => {
      if (item == null) {
        return null
      }

      if (typeof item === 'string') {
        return {
          type: 'OTHER',
          text: item.trim(),
        }
      }

      if (typeof item === 'object') {
        const obj = item as Record<string, unknown>
        const rawType = typeof obj.type === 'string' ? obj.type : ''
        const normalizedType = normalizeMemoryAidType(rawType)
        const textValue = typeof obj.text === 'string'
          ? obj.text.trim()
          : typeof obj.content === 'string'
            ? obj.content.trim()
            : ''

        if (!textValue) {
          return null
        }

        return {
          type: normalizedType,
          text: textValue,
        }
      }

      return null
    })
    .filter((item): item is { type: string; text: string } => Boolean(item?.text))

  const rawCitations = Array.isArray(normalized.citations)
    ? (normalized.citations as unknown[])
    : []

  normalized.citations = rawCitations
    .map((item) => {
      if (typeof item !== 'object' || item === null) {
        return null
      }

      const obj = item as Record<string, unknown>
      const title = typeof obj.title === 'string' ? obj.title.trim() : ''
      const quote = typeof obj.quote === 'string' ? obj.quote.trim() : ''
      const urlValue = typeof obj.url === 'string' ? obj.url.trim() : ''

      if (!title || !quote) {
        return null
      }

      if (!isValidHttpUrl(urlValue)) {
        return null
      }

      return {
        title,
        url: urlValue,
        quote,
      }
    })
    .filter((item): item is { title: string; url: string; quote: string } => Boolean(item))

  const difficultyValue = Number((normalized as Record<string, unknown>).difficulty)
  normalized.difficulty = Number.isFinite(difficultyValue) ? difficultyValue : 3

  return normalized
}

function clampDifficulty(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.min(5, Math.max(1, Math.round(raw)))
  }

  if (typeof raw === "string") {
    const parsed = Number(raw)
    if (Number.isFinite(parsed)) {
      return Math.min(5, Math.max(1, Math.round(parsed)))
    }
  }

  return 3
}

function buildFallbackStructuredResponse(
  normalized: Record<string, unknown>,
  request: AIExplanationRequest
): AiExplainOutput {
  const explanationText = typeof normalized.explanation === "string"
    ? normalized.explanation.trim()
    : ""

  const explanationSentences = explanationText
    ? explanationText
        .split(/(?<=[。！？!?\.])\s*/)
        .map((item) => item.trim())
        .filter(Boolean)
    : []

  const summarySource = (() => {
    if (typeof normalized.summary === "string" && normalized.summary.trim().length >= 20) {
      return normalized.summary.trim()
    }

    if (explanationSentences[0]?.length) {
      return explanationSentences[0]
    }

    if (explanationText.length >= 20) {
      return explanationText.slice(0, 200)
    }

    const standardAnswer = request.correctAnswers.join("、") || ""
    return `AI 返回数据缺少结构化摘要，请结合标准答案 ${standardAnswer} 理解题目。`
  })()

  const summary = summarySource.slice(0, 300)

  const normalizedAnswer = Array.isArray(normalized.answer)
    ? (normalized.answer as unknown[]).map(item => String(item).trim()).filter(Boolean)
    : []

  const answer = normalizedAnswer.length > 0
    ? normalizedAnswer
    : request.correctAnswers.map(item => item.trim()).filter(Boolean)

  const answerSet = new Set(answer)

  if (answerSet.size === 0) {
    const fallbackAnswer = request.correctAnswers[0]
      || request.options[0]?.id
      || request.options[0]?.text
      || "A"
    answerSet.add(String(fallbackAnswer).trim())
  }

  const optionAnalysis: OptionAnalysis[] = request.options.map((option, index) => {
    const optionId = option.id || `选项${index + 1}`
    const isCorrect = answerSet.has(option.id) || answerSet.has(optionId) || answerSet.has(option.text)
    const baseReason = isCorrect
      ? (explanationSentences[0] || explanationText || `标准答案指出 ${optionId} 选项为正确。`)
      : `解析强调正确答案，题干未提供支持 ${optionId} 选项的依据。`

    return {
      option: optionId,
      verdict: isCorrect ? "correct" : "wrong",
      reason: baseReason,
    }
  })

  while (optionAnalysis.length < 2) {
    optionAnalysis.push({
      option: `补全${optionAnalysis.length + 1}`,
      verdict: "wrong",
      reason: "AI 原始响应仅返回部分字段，为满足结构化要求自动补全。",
    })
  }

  const keyPoints: string[] = Array.isArray(normalized.keyPoints)
    ? (normalized.keyPoints as unknown[])
        .map(item => String(item).trim())
        .filter(item => item.length > 5)
    : []

  if (keyPoints.length === 0) {
    if (explanationSentences.length > 0) {
      keyPoints.push(...explanationSentences.slice(0, 3).map((sentence) => sentence.slice(0, 120)))
    } else if (explanationText) {
      keyPoints.push(explanationText.slice(0, 120))
    } else {
      keyPoints.push("AI 原始响应缺少要点，已根据题干与标准答案生成概要。")
    }
  }

  const difficulty = clampDifficulty(normalized.difficulty ?? request.difficulty)

  const fallbackAnswers = Array.from(answerSet).map(item => item.trim()).filter(Boolean)

  return {
    summary,
    answer: fallbackAnswers,
    optionAnalysis,
    keyPoints,
    memoryAids: [],
    citations: [],
    difficulty,
    insufficiency: explanationSentences.length === 0,
  }
}

async function resolveOpenAIRuntime(scope: ModelUsageScope = 'EXPLANATION'): Promise<ResolvedOpenAI> {
  const group = await getActiveModelGroup(scope)
  if (!group && !process.env.OPENAI_API_KEY?.trim()) {
    throw new Error('未找到符合使用范围的 AI 模型组，请在后台配置。')
  }
  const client = createClient(group)
  const model = group?.modelName?.trim() || DEFAULT_MODEL
  return { client, group, model }
}

async function requestStructuredExplanation(
  client: OpenAI,
  group: AiModelGroup | null,
  model: string,
  request: AIExplanationRequest,
  options: { forceDefaultPrompt?: boolean; retryCount?: number; maxTokensOverride?: number }
): Promise<AiExplainOutput> {
  const {
    forceDefaultPrompt = false,
    retryCount = 0,
    maxTokensOverride,
  } = options

  const systemPrompt = group?.systemPrompt && group.systemPrompt.trim().length > 0
    ? group.systemPrompt
    : SYSTEM_PROMPT_XML

  const userPrompt = buildUserPrompt({
    questionTitle: request.questionTitle,
    options: request.options,
    standardAnswer: request.correctAnswers,
    syllabusPath: request.syllabusPath,
    evidence: request.evidence,
    includeQuestion: group?.includeQuestion ?? true,
    includeOptions: group?.includeOptions ?? true,
    template: forceDefaultPrompt ? null : group?.userPrompt,
  })

  const payload: ChatPayload = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: group?.temperature ?? DEFAULT_TEMPERATURE,
    max_tokens: maxTokensOverride ?? 1500,
  }

  const debugPayload = {
    model,
    includeQuestion: group?.includeQuestion ?? true,
    includeOptions: group?.includeOptions ?? true,
    temperature: payload.temperature,
    top_p: payload.top_p ?? null,
    presence_penalty: payload.presence_penalty ?? null,
    frequency_penalty: payload.frequency_penalty ?? null,
    forceDefaultPrompt,
    systemPrompt,
    userPrompt,
  }

  if (group?.topP !== null && group?.topP !== undefined) {
    payload.top_p = group.topP
  }

  if (group?.presencePenalty !== null && group?.presencePenalty !== undefined) {
    payload.presence_penalty = group.presencePenalty
  }

  if (group?.frequencyPenalty !== null && group?.frequencyPenalty !== undefined) {
    payload.frequency_penalty = group.frequencyPenalty
  }

  mergeExtraBody(payload, group?.extraBody)

  debugLog("request", {
    baseURL: extractBaseUrl(client),
    model,
    groupId: group?.id ?? null,
    includeQuestion: group?.includeQuestion ?? true,
    includeOptions: group?.includeOptions ?? true,
    forceDefaultPrompt,
    payload: debugPayload,
  })

  let completion: Awaited<ReturnType<typeof client.chat.completions.create>>
  try {
    completion = await client.chat.completions.create(payload)
  } catch (error) {
    handleOpenAIError(error)
  }
  const content = completion.choices[0]?.message?.content?.trim()

  debugLog("response", {
    model,
    groupId: group?.id ?? null,
    raw: content ?? null,
    finishReason: completion.choices[0]?.finish_reason ?? null,
    usage: completion.usage ?? null,
  })

  const finishReason = (completion.choices[0]?.finish_reason ?? null) as string | null

  if (finishReason === "length") {
    debugLog("response_truncated", {
      retryCount,
      forceDefaultPrompt,
      maxTokens: payload.max_tokens,
    })

    if (retryCount > 0) {
      const nextMaxTokens = typeof maxTokensOverride === "number"
        ? Math.min(maxTokensOverride + 512, 4000)
        : 2000

      return requestStructuredExplanation(client, group, model, request, {
        forceDefaultPrompt: true,
        retryCount: retryCount - 1,
        maxTokensOverride: nextMaxTokens,
      })
    }

    throw new Error("AI 响应被截断，未能生成完整解析，请稍后重试")
  }

  if (!content) {
    throw new Error("AI 返回为空")
  }

  const sanitized = cleanXmlContent(content)
  const trimmed = sanitized.trim()

  let normalizedData: Record<string, unknown>

  if (trimmed.startsWith('<')) {
    debugLog('parsed-xml', {
      length: trimmed.length,
      preview: trimmed.slice(0, 200),
    })

    try {
      const parsedXml = parseXmlExplanation(trimmed, request)
      normalizedData = normalizeStructuredResponse(parsedXml)
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : String(parseError)

      if (retryCount > 0 && finishReason === 'length') {
        const nextMaxTokens = typeof maxTokensOverride === "number"
          ? Math.min(maxTokensOverride + 512, 4000)
          : 2000

        debugLog('xml_parse_retry', { reason: message, nextMaxTokens })

        return requestStructuredExplanation(client, group, model, request, {
          forceDefaultPrompt: true,
          retryCount: retryCount - 1,
          maxTokensOverride: nextMaxTokens,
        })
      }

      throw parseError instanceof Error
        ? parseError
        : new Error(`无法解析 AI 返回的 XML：${message}`)
    }
  } else {
    debugLog('parsed-json', {
      length: trimmed.length,
      preview: trimmed.slice(0, 200),
    })

    let parsedJson: unknown

    try {
      parsedJson = JSON.parse(trimmed)
    } catch (parseError) {
      const isLikelyTruncated = finishReason === 'length' || !trimmed.endsWith('}')

      if (retryCount > 0 && isLikelyTruncated) {
        const nextMaxTokens = typeof maxTokensOverride === "number"
          ? Math.min(maxTokensOverride + 512, 4000)
          : 2000

        debugLog('json_parse_retry', { reason: parseError instanceof Error ? parseError.message : String(parseError), nextMaxTokens })

        return requestStructuredExplanation(client, group, model, request, {
          forceDefaultPrompt: true,
          retryCount: retryCount - 1,
          maxTokensOverride: nextMaxTokens,
        })
      }

      const repaired = repairJsonString(trimmed)

      if (repaired !== trimmed) {
        parsedJson = JSON.parse(repaired)
      } else {
        throw parseError instanceof Error
          ? parseError
          : new Error(`无法解析 AI 返回的 JSON：${String(parseError)}`)
      }
    }

    normalizedData = normalizeStructuredResponse(parsedJson)
  }

  try {
    return AiExplainSchema.parse(normalizedData)
  } catch (error) {
    if (error instanceof ZodError) {
      const fallback = buildFallbackStructuredResponse(normalizedData, request)

      debugLog("structured_zod_fallback", {
        issues: error.issues?.map((issue) => ({
          path: issue.path,
          code: issue.code,
          message: issue.message,
        })),
        fallbackPreview: {
          summary: fallback.summary,
          answer: fallback.answer,
          optionAnalysisLength: fallback.optionAnalysis.length,
          keyPoints: fallback.keyPoints,
        },
        original: normalizedData,
        sanitized,
      })

      return AiExplainSchema.parse(fallback)
    }

    throw error
  }
}

export async function generateAIExplanation(
  request: AIExplanationRequest
): Promise<AIExplanationResult> {
  try {
    const { client, group, model } = await resolveOpenAIRuntime('EXPLANATION')

    try {
      const structuredExplanation = await requestStructuredExplanation(client, group, model, request, {
        forceDefaultPrompt: false,
        retryCount: 1,
      })

      return {
        explanation: structuredExplanation,
        modelName: model,
        provider: "OPENAI",
        groupId: group?.id ?? null,
      }
    } catch (structuredError) {
      const shouldFallback = structuredError instanceof Error && structuredError.name === "ZodError"

      if (shouldFallback) {
        debugLog("structured_validation_failed", structuredError.message)

        const fallbackExplanation = await requestStructuredExplanation(client, group, model, request, {
          forceDefaultPrompt: true,
          retryCount: 1,
        })

        return {
          explanation: fallbackExplanation,
          modelName: model,
          provider: "OPENAI",
          groupId: group?.id ?? null,
        }
      }

      throw structuredError
    }
  } catch (error) {
    console.error("Generate AI explanation error:", error)

    if (error instanceof Error && error.name === "ZodError") {
      throw new Error(`AI 返回格式不符合要求: ${error.message}`)
    }

    throw error instanceof Error
      ? new Error(`AI 解析生成失败: ${error.message}`)
      : new Error("AI 解析生成失败: 未知错误")
  }
}

const SIMPLE_SYSTEM_PROMPT = "你是一位经验丰富的业余无线电考试辅导老师，擅长用简单易懂的方式讲解复杂的技术概念。"

const ASSISTANT_SYSTEM_PROMPT =
  "你是业余无线电刷题系统的小助手，能够用中文简洁、友好地回答与业余无线电考试、法规、操作技巧以及系统使用相关的问题。当不知道答案时要坦诚说明，并给出可能的查阅方向。"

export async function generateSimpleExplanation(
  request: AIExplanationRequest
): Promise<string> {
  const { client, group, model } = await resolveOpenAIRuntime('EXPLANATION')

  const optionsText = request.options
    .map(opt => `${opt.id}. ${opt.text}`)
    .join("\n")

  const correctAnswerText = request.correctAnswers.join("、")

  const questionSection = group?.includeQuestion === false
    ? ""
    : `题目：${request.questionTitle}\n\n`

  const optionsSection = group?.includeOptions === false
    ? ""
    : `选项：\n${optionsText}\n\n`

  const prompt = `你是一位专业的业余无线电考试辅导老师。请为以下题目提供详细的解析：\n\n` +
    questionSection +
    optionsSection +
    `正确答案：${correctAnswerText}\n\n` +
    (request.category ? `题目分类：${request.category}\n` : "") +
    (request.difficulty ? `难度级别：${request.difficulty}\n` : "") +
    "\n请在答案中覆盖以下要点：\n1. 正确答案的依据和推理。\n2. 涉及的核心知识点说明。\n3. 如有合适的记忆技巧或助记方法，请给出。\n4. 指出其他选项错误的原因。\n\n输出格式要求（必须严格遵守）：\n<Result>正确答案（例如 A 或 A、B）</Result>\n<Explaination>把上述要点组织成通顺的中文段落</Explaination>\n\n示例：\n<Result>A</Result>\n<Explaination>这道题我蒙的</Explaination>\n\n请仅输出上述两个 XML 标签及其内容，不要添加多余文字或标记。"

  const payload: ChatPayload = {
    model,
    messages: [
      { role: "system", content: group?.systemPrompt || SIMPLE_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: group?.temperature ?? 0.7,
    max_tokens: 1000,
  }

  if (group?.topP !== null && group?.topP !== undefined) {
    payload.top_p = group.topP
  }

  if (group?.presencePenalty !== null && group?.presencePenalty !== undefined) {
    payload.presence_penalty = group.presencePenalty
  }

  if (group?.frequencyPenalty !== null && group?.frequencyPenalty !== undefined) {
    payload.frequency_penalty = group.frequencyPenalty
  }

  mergeExtraBody(payload, group?.extraBody)

  debugLog("simple-request", {
    baseURL: extractBaseUrl(client),
    model,
    groupId: group?.id ?? null,
    systemPrompt: group?.systemPrompt || SIMPLE_SYSTEM_PROMPT,
    prompt,
  })

  let completion: Awaited<ReturnType<typeof client.chat.completions.create>>
  try {
    completion = await client.chat.completions.create(payload)
  } catch (error) {
    handleOpenAIError(error)
  }
  const explanation = completion.choices[0]?.message?.content?.trim()

  debugLog("simple-response", {
    model,
    groupId: group?.id ?? null,
    raw: explanation ?? null,
    finishReason: completion.choices[0]?.finish_reason ?? null,
    usage: completion.usage ?? null,
  })

  if (!explanation) {
    throw new Error("AI 返回为空")
  }

  return explanation
}

export interface AssistantChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

export async function generateAssistantChatReply({
  messages,
  systemPrompt,
  temperature,
  maxTokens = 600,
  stylePrompt,
}: {
  messages: AssistantChatMessage[]
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  stylePrompt?: string | null
}): Promise<{ reply: string; modelName: string }> {
  const { client, group, model } = await resolveOpenAIRuntime('ASSISTANT')

  const baseSystemPrompt =
    systemPrompt?.trim() ||
    (group?.systemPrompt && group.systemPrompt.trim().length > 0 ? group.systemPrompt : null) ||
    ASSISTANT_SYSTEM_PROMPT

  const effectiveSystemPrompt =
    applyStyleToPrompt(baseSystemPrompt, stylePrompt) ?? baseSystemPrompt ?? ASSISTANT_SYSTEM_PROMPT

  const sanitizedMessages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: effectiveSystemPrompt,
    },
    ...messages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .slice(-12)
      .map((message) => ({
        role: message.role,
        content: message.content.slice(0, 1500),
      })),
  ]

  const payload: ChatPayload = {
    model,
    messages: sanitizedMessages,
    temperature: temperature ?? group?.temperature ?? 0.6,
    max_tokens: maxTokens,
  }

  if (group?.topP !== null && group?.topP !== undefined) {
    payload.top_p = group.topP
  }

  if (group?.presencePenalty !== null && group?.presencePenalty !== undefined) {
    payload.presence_penalty = group.presencePenalty
  }

  if (group?.frequencyPenalty !== null && group?.frequencyPenalty !== undefined) {
    payload.frequency_penalty = group.frequencyPenalty
  }

  mergeExtraBody(payload, group?.extraBody)

  debugLog("assistant-chat-request", {
    model,
    groupId: group?.id ?? null,
    baseURL: extractBaseUrl(client),
    messageCount: sanitizedMessages.length,
  })

  let completion: Awaited<ReturnType<typeof client.chat.completions.create>>
  try {
    completion = await client.chat.completions.create(payload)
  } catch (error) {
    handleOpenAIError(error)
  }

  const reply = completion.choices[0]?.message?.content?.trim()

  debugLog("assistant-chat-response", {
    model,
    groupId: group?.id ?? null,
    finishReason: completion.choices[0]?.finish_reason ?? null,
    usage: completion.usage ?? null,
  })

  if (!reply) {
    throw new Error("小助手未返回任何内容，请稍后再试。")
  }

  return {
    reply,
    modelName: model,
  }
}

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.AI_MODEL_GROUP_NAME)
}

export async function hasOpenAIConfiguration(): Promise<boolean> {
  if (process.env.OPENAI_API_KEY) {
    return true
  }
  const count = await prisma.aiModelGroup.count()
  return count > 0
}
