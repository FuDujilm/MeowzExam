import { validateAdminPermission } from '@/lib/auth/admin'
import { prisma } from '@/lib/db'
import type { QuestionLibrary, QuestionLibraryVisibility } from '@/lib/generated/prisma'

const PLACEHOLDER_REGEX = /\{([^}]+)\}/g

function toDisplayValue(library: QuestionLibrary, key: string): string {
  switch (key) {
    case 'name':
      return library.name
    case 'shortName':
    case 'shortname':
    case '缩写':
      return library.shortName
    case 'code':
      return library.code
    case 'region':
    case '国家/地区':
      return library.region ?? '未指定地区'
    case 'totalQuestions':
    case '总题量':
      return library.totalQuestions?.toString() ?? '0'
    case 'version':
      return library.version ?? ''
    case 'author':
      return library.author ?? ''
    case 'type':
      return library.sourceType ?? ''
    case 'visibility':
      return library.visibility ?? ''
    case 'uuid':
      return library.uuid ?? ''
    default:
      return ''
  }
}

export function renderLibraryDisplay(library: QuestionLibrary, template?: string): string {
  const defaultTemplate = '{国家/地区}-{缩写}-{总题量}题'
  const text = template?.trim() || library.displayTemplate || defaultTemplate
  return text.replace(PLACEHOLDER_REGEX, (_, token: string) => {
    const value = toDisplayValue(library, token.trim())
    return value ?? ''
  }).replace(/\s{2,}/g, ' ').trim()
}

function buildVisibilityFilter(
  visibility: QuestionLibraryVisibility,
  userId?: string | null,
  isAdmin?: boolean
) {
  if (visibility === 'ADMIN_ONLY') {
    return isAdmin ? {} : null
  }
  if (visibility === 'PUBLIC') {
    return { visibility: 'PUBLIC' as const }
  }
  if (visibility === 'CUSTOM') {
    if (!userId) return null
    return {
      visibility: 'CUSTOM' as const,
      access: {
        some: { userId },
      },
    }
  }
  return null
}

type ListLibrariesOptions = {
  userId?: string | null
  userEmail?: string | null
}

export async function listAccessibleLibraries(options: ListLibrariesOptions = {}) {
  const isAdmin = options.userEmail ? validateAdminPermission(options.userEmail).isAdmin : false
  const filters: Array<Record<string, unknown>> = []

  if (isAdmin) {
    filters.push({})
  } else {
    const publicFilter = buildVisibilityFilter('PUBLIC', options.userId, isAdmin)
    if (publicFilter) filters.push(publicFilter)
    const customFilter = buildVisibilityFilter('CUSTOM', options.userId, isAdmin)
    if (customFilter) filters.push(customFilter)
  }

  if (!filters.length) {
    return []
  }

  const libraries = await prisma.questionLibrary.findMany({
    where: filters.length === 1 ? filters[0] : { OR: filters },
    orderBy: [{ updatedAt: 'desc' }],
    include: {
      examPresets: {
        orderBy: [{ createdAt: 'asc' }],
      },
    },
  })

  return libraries.map((library) => ({
    library,
    displayLabel: renderLibraryDisplay(library),
  }))
}

export async function getLibraryForUser(options: {
  code: string
  userId?: string | null
  userEmail?: string | null
}) {
  const { code, userId, userEmail } = options
  const library = await prisma.questionLibrary.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      examPresets: {
        orderBy: [{ createdAt: 'asc' }],
      },
      access: true,
    },
  })

  if (!library) {
    return null
  }

  const isAdmin = userEmail ? validateAdminPermission(userEmail).isAdmin : false

  if (library.visibility === 'PUBLIC') {
    return library
  }

  if (library.visibility === 'ADMIN_ONLY') {
    return isAdmin ? library : null
  }

  if (!userId) {
    return null
  }

  const matched = library.access.some((item) => item.userId === userId)
  return matched ? library : null
}
