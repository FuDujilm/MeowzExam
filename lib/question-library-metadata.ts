import type {
  ExamPresetMetadata,
  ExamPresetQuestionStrategy,
  ExamPresetTagRule,
} from '@/types/question-library'

type RawQuestionStrategy = {
  mode?: unknown
  order?: unknown
  rules?: unknown
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>
  }
  return {}
}

function normaliseTagRule(raw: unknown, index: number): ExamPresetTagRule {
  const source = toRecord(raw)
  const id = typeof source.id === 'string' && source.id.trim() ? source.id.trim() : `RULE_${index + 1}`
  const label = typeof source.label === 'string' ? source.label.trim() : null

  const parsedCount = typeof source.count === 'number'
    ? source.count
    : typeof source.count === 'string'
      ? Number.parseInt(source.count, 10)
      : Number.NaN
  const count = Number.isFinite(parsedCount) ? Math.trunc(parsedCount) : Number.NaN

  if (!Number.isFinite(count) || count <= 0) {
    throw new Error(`标签抽题规则「${label || id}」的题量必须为正整数。`)
  }

  const tagsInput = Array.isArray(source.tags)
    ? source.tags
    : typeof source.tag === 'string'
      ? [source.tag]
      : []

  const tags = tagsInput
    .map((item: unknown) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)

  const questionTypeRaw = typeof source.questionType === 'string' ? source.questionType : 'any'
  const questionType = ['single_choice', 'multiple_choice', 'true_false'].includes(questionTypeRaw)
    ? (questionTypeRaw as ExamPresetTagRule['questionType'])
    : 'any'

  return {
    id,
    label,
    tags: tags.length ? tags : undefined,
    count,
    questionType,
    requireImage: Boolean(source.requireImage),
  }
}

function normaliseQuestionStrategy(raw: unknown): ExamPresetQuestionStrategy | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const source = raw as RawQuestionStrategy

  const modeRaw = typeof source.mode === 'string' ? source.mode.toUpperCase() : 'TAG_RULES'
  const mode: ExamPresetQuestionStrategy['mode'] = modeRaw === 'RANDOM' ? 'RANDOM' : 'TAG_RULES'

  const orderRaw = typeof source.order === 'string' ? source.order.toUpperCase() : 'FIXED'
  const order: ExamPresetQuestionStrategy['order'] = orderRaw === 'SHUFFLE' ? 'SHUFFLE' : 'FIXED'

  const rulesInput = Array.isArray(source.rules) ? source.rules : []
  const rules = rulesInput.map((rule, index) => normaliseTagRule(rule, index))

  if (mode === 'TAG_RULES' && rules.length === 0) {
    throw new Error('启用了标签抽题，但未配置任何标签规则。')
  }

  if (mode === 'RANDOM') {
    return { mode, order, rules: [] }
  }

  return { mode, order, rules }
}

export function normaliseExamPresetMetadata(input: unknown): ExamPresetMetadata | null {
  if (!input || typeof input !== 'object') {
    return null
  }

  const metadata: ExamPresetMetadata = {}
  const source = input as { questionStrategy?: unknown; question_strategy?: unknown }
  const rawStrategy = source.questionStrategy ?? source.question_strategy ?? null

  const strategy = normaliseQuestionStrategy(rawStrategy)
  if (strategy) {
    metadata.questionStrategy = strategy
  }

  return Object.keys(metadata).length ? metadata : null
}
