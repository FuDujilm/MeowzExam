import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@/lib/generated/prisma'
import { prisma } from '@/lib/db'
import { resolveRequestUser } from '@/lib/auth/api-auth'
import { getLibraryForUser } from '@/lib/question-library-service'

const LEGACY_TYPE_CODES = new Set(['A_CLASS', 'B_CLASS', 'C_CLASS'])
const CASE_INSENSITIVE = Prisma.QueryMode.insensitive

function normalizeLibraryCode(value: string | null): string | null {
  return value ? value.trim().toUpperCase() : null
}

function buildLibraryFilter(libraryCode: string): Prisma.QuestionWhereInput {
  if (!libraryCode) return {}
  if (LEGACY_TYPE_CODES.has(libraryCode)) {
    return {
      OR: [
        { libraryCode },
        {
          AND: [{ libraryCode: null }, { type: libraryCode as any }],
        },
      ],
    }
  }
  return { libraryCode }
}

function combineWhereConditions(
  ...conditions: Array<Prisma.QuestionWhereInput | undefined>
): Prisma.QuestionWhereInput {
  const filtered = conditions.filter(Boolean) as Prisma.QuestionWhereInput[]
  if (filtered.length === 0) return {}
  if (filtered.length === 1) return filtered[0]
  return { AND: filtered }
}

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback
  }
  return parsed
}

function buildSearchFilter(rawInput: string | null): Prisma.QuestionWhereInput | undefined {
  const trimmed = rawInput?.trim()
  if (!trimmed) return undefined

  const tokens = trimmed.split(/\s+/).map((token) => token.trim()).filter(Boolean)
  if (tokens.length === 0) return undefined

  const tokenToCondition = (token: string): Prisma.QuestionWhereInput => ({
    OR: [
      { title: { contains: token, mode: CASE_INSENSITIVE } },
      { externalId: { contains: token, mode: CASE_INSENSITIVE } },
      { category: { contains: token, mode: CASE_INSENSITIVE } },
      { categoryCode: { contains: token, mode: CASE_INSENSITIVE } },
    ],
  })

  if (tokens.length === 1) {
    return tokenToCondition(tokens[0])
  }

  return {
    AND: tokens.map(tokenToCondition),
  }
}

function extractTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())
}

// GET /api/questions - 获取题目列表(支持分页和筛选)
export async function GET(request: NextRequest) {
  try {
    const resolvedUser = await resolveRequestUser(request)
    if (!resolvedUser) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const requestedPage = Math.max(parsePositiveInt(searchParams.get('page'), 1), 1)
    const rawPageSize = parsePositiveInt(searchParams.get('pageSize'), 20)
    const pageSize = Math.min(Math.max(rawPageSize, 1), 50)
    const category = searchParams.get('category')?.trim() || null
    const search = searchParams.get('search')?.trim() || null
    const libraryCodeParam = normalizeLibraryCode(
      searchParams.get('library') ?? searchParams.get('type'),
    )

    if (!libraryCodeParam) {
      return NextResponse.json(
        { error: '缺少题库标识，请提供 library 参数。' },
        { status: 400 },
      )
    }

    let targetLibraryCode = libraryCodeParam
    if (!LEGACY_TYPE_CODES.has(libraryCodeParam)) {
      const library = await getLibraryForUser({
        code: libraryCodeParam,
        userId: resolvedUser.id,
        userEmail: resolvedUser.email,
      })

      if (!library) {
        return NextResponse.json(
          { error: '未找到对应题库或您没有访问权限。' },
          { status: 404 },
        )
      }
      targetLibraryCode = library.code
    }

    const libraryFilter = buildLibraryFilter(targetLibraryCode)
    const categoryFilter = category
      ? {
          OR: [
            { categoryCode: { contains: category, mode: CASE_INSENSITIVE } },
            { category: { contains: category, mode: CASE_INSENSITIVE } },
          ],
        }
      : undefined
    const searchFilter = buildSearchFilter(search)

    const where = combineWhereConditions(libraryFilter, categoryFilter, searchFilter)
    const total = await prisma.question.count({ where })

    const rawTotalPages = Math.ceil(total / pageSize)
    const totalPages = rawTotalPages === 0 ? 0 : rawTotalPages
    const page = totalPages === 0 ? 0 : Math.min(requestedPage, totalPages)
    const skip = page > 0 ? (page - 1) * pageSize : 0

    const rawQuestions = await prisma.question.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { externalId: 'asc' },
      select: {
        id: true,
        uuid: true,
        externalId: true,
        type: true,
        questionType: true,
        difficulty: true,
        category: true,
        categoryCode: true,
        subSection: true,
        title: true,
        hasImage: true,
        imagePath: true,
        tags: true,
        createdAt: true,
        libraryCode: true,
        options: true,
        library: {
          select: {
            name: true,
            shortName: true,
          },
        },
      },
    })

    const questions = rawQuestions.map(({ library, tags, options, ...rest }) => ({
      ...rest,
      tags: extractTags(tags),
      options: Array.isArray(options)
        ? options
            .filter(
              (option: any): option is { id: string; text: string } =>
                option &&
                typeof option.id === 'string' &&
                option.id.trim().length > 0 &&
                typeof option.text === 'string',
            )
            .map((option) => ({
              id: option.id.trim(),
              text: option.text,
            }))
        : [],
      libraryName: library?.name ?? null,
      libraryShortName: library?.shortName ?? null,
    }))

    return NextResponse.json({
      questions,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error('获取题目列表失败:', error)
    return NextResponse.json(
      { error: '获取题目列表失败' },
      { status: 500 }
    )
  }
}
