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

function normaliseTagRule(raw: any, index: number): ExamPresetTagRule {
  const id = typeof raw?.id === 'string' && raw.id.trim() ? raw.id.trim() : `RULE_${index + 1}`
  const label = typeof raw?.label === 'string' ? raw.label.trim() : null

  const count = Number.parseInt(raw?.count, 10)
  if (!Number.isFinite(count) || count <= 0) {
    throw new Error(`标签抽题规则「${label || id}」的题量必须为正整数。`)
  }

  const tagsInput = Array.isArray(raw?.tags)
    ? raw.tags
    : typeof raw?.tag === 'string'
      ? [raw.tag]
      : []

  const tags = tagsInput
    .map((item: unknown) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)

  const questionTypeRaw = typeof raw?.questionType === 'string' ? raw.questionType : 'any'
  const questionType = ['single_choice', 'multiple_choice', 'true_false'].includes(questionTypeRaw)
    ? (questionTypeRaw as ExamPresetTagRule['questionType'])
    : 'any'

  return {
    id,
    label,
    tags: tags.length ? tags : undefined,
    count,
    questionType,
    requireImage: Boolean(raw?.requireImage),
  }
}

function normaliseQuestionStrategy(raw: RawQuestionStrategy | null): ExamPresetQuestionStrategy | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const modeRaw = typeof raw.mode === 'string' ? raw.mode.toUpperCase() : 'TAG_RULES'
  const mode: ExamPresetQuestionStrategy['mode'] = modeRaw === 'RANDOM' ? 'RANDOM' : 'TAG_RULES'

  const orderRaw = typeof raw.order === 'string' ? raw.order.toUpperCase() : 'FIXED'
  const order: ExamPresetQuestionStrategy['order'] = orderRaw === 'SHUFFLE' ? 'SHUFFLE' : 'FIXED'

  const rulesInput = Array.isArray(raw.rules) ? raw.rules : []
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
  const rawStrategy =
    (input as any).questionStrategy ??
    (input as any).question_strategy ??
    null

  const strategy = normaliseQuestionStrategy(rawStrategy as RawQuestionStrategy | null)
  if (strategy) {
    metadata.questionStrategy = strategy
  }

  return Object.keys(metadata).length ? metadata : null
}
