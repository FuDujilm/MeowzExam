import { prisma } from '@/lib/db'

const STYLE_PLACEHOLDER_REGEX = /\{\{\s*AI_STYLE\s*\}\}/gi

export async function resolveUserAiStylePrompt(userId: string): Promise<string | null> {
  if (!userId) {
    return null
  }

  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    include: {
      aiStylePreset: true,
    },
  })

  if (!settings) {
    return null
  }

  const segments: string[] = []

  const presetPrompt = settings.aiStylePreset?.prompt?.trim()
  if (presetPrompt) {
    segments.push(presetPrompt)
  }

  const customPrompt = settings.aiStyleCustom?.trim()
  if (customPrompt) {
    segments.push(customPrompt)
  }

  if (segments.length === 0) {
    return null
  }

  return segments.join('\n\n')
}

export function applyStyleToPrompt(
  basePrompt: string | null | undefined,
  stylePrompt: string | null | undefined,
): string | null {
  const trimmedBase = basePrompt?.toString() ?? null
  const trimmedStyle = stylePrompt?.trim() ?? ''

  if (!trimmedBase) {
    return trimmedStyle || null
  }

  STYLE_PLACEHOLDER_REGEX.lastIndex = 0
  const hasPlaceholder = STYLE_PLACEHOLDER_REGEX.test(trimmedBase)
  STYLE_PLACEHOLDER_REGEX.lastIndex = 0

  if (hasPlaceholder) {
    const replacement = trimmedStyle || ''
    const replaced = trimmedBase.replace(STYLE_PLACEHOLDER_REGEX, replacement)
    return normalizePromptWhitespace(replaced)
  }

  if (!trimmedStyle) {
    return trimmedBase
  }

  const combined = `${trimmedBase.trim()}\n\n${trimmedStyle}`
  return normalizePromptWhitespace(combined)
}

function normalizePromptWhitespace(value: string): string {
  return value
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
