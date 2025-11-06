import { AiModelGroup, Prisma, AiModelUsageScope } from '@/lib/generated/prisma'

export const FORBIDDEN_NAME_CHARS = /[\/\?&#=%]/

export function maskApiKey(key: string | null): string | null {
  if (!key) return null
  if (key.length <= 4) return '*'.repeat(key.length)
  return `${key.slice(0, 3)}***${key.slice(-2)}`
}

export function toResponse(group: AiModelGroup) {
  return {
    id: group.id,
    name: group.name,
    modelName: group.modelName,
    modelType: group.modelType,
    usageScope: group.usageScope,
    proxyUrl: group.proxyUrl,
    apiUrl: group.apiUrl,
    enableVision: group.enableVision,
    temperature: group.temperature,
    topP: group.topP,
    presencePenalty: group.presencePenalty,
    frequencyPenalty: group.frequencyPenalty,
    extraBody: group.extraBody,
    systemPrompt: group.systemPrompt,
    includeQuestion: group.includeQuestion,
    includeOptions: group.includeOptions,
    userPrompt: group.userPrompt,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    hasApiKey: !!group.apiKey,
    apiKeyPreview: maskApiKey(group.apiKey),
    isActive: group.isActive,
    priority: group.priority,
  }
}

export function validateNumericRange(
  value: unknown,
  min: number,
  max: number,
  fieldName: string
): number | null {
  if (value === undefined || value === null || value === '') {
    return null
  }

  const num = Number(value)
  if (Number.isNaN(num)) {
    throw new Error(`${fieldName} 必须为数字`)
  }

  if (num < min || num > max) {
    throw new Error(`${fieldName} 必须在 ${min} 到 ${max} 之间`)
  }

  return num
}

export type ModelTypeValue = 'CHAT' | 'IMAGE' | 'EMBEDDING'

export function normalizeModelType(type: unknown): ModelTypeValue {
  if (typeof type !== 'string') {
    throw new Error('模型类型无效')
  }
  const normalized = type.trim().toUpperCase()
  if (!['CHAT', 'IMAGE', 'EMBEDDING'].includes(normalized)) {
    throw new Error('模型类型无效')
  }
  return normalized as ModelTypeValue
}

export function parseExtraBody(value: unknown): Prisma.JsonValue | null {
  if (value === undefined || value === null || value === '') {
    return null
  }

  if (typeof value === 'object') {
    return value as Prisma.JsonValue
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('extraBody 必须是 JSON 对象')
      }
      return parsed as Prisma.JsonValue
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误'
      throw new Error(`extraBody JSON 解析失败: ${message}`)
    }
  }

  throw new Error('extraBody 必须是字符串或对象')
}

export function validateName(name: unknown): string {
  if (typeof name !== 'string' || !name.trim()) {
    throw new Error('组名不能为空')
  }
  const trimmed = name.trim()
  if (FORBIDDEN_NAME_CHARS.test(trimmed)) {
    throw new Error('组名不能包含 / ? & # = % 等特殊字符')
  }
  if (trimmed.length > 60) {
    throw new Error('组名长度不能超过 60 个字符')
  }
  return trimmed
}

export function validateRequiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} 不能为空`)
  }
  return value.trim()
}

export function normalizeOptionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') {
    throw new Error('无效的字符串输入')
  }
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

export function normalizeUsageScope(value: unknown): AiModelUsageScope {
  if (typeof value !== 'string') {
    return 'EXPLANATION'
  }
  const normalized = value.trim().toUpperCase()
  if (normalized === 'ASSISTANT') return 'ASSISTANT'
  if (normalized === 'BOTH') return 'BOTH'
  return 'EXPLANATION'
}
