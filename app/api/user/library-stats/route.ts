import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type { Prisma, QuestionType } from '@/lib/generated/prisma'
import { resolveRequestUser } from '@/lib/auth/api-auth'
import { attachGuestCookieIfNeeded } from '@/lib/auth/guest-user'

const LEGACY_TYPE_CODES = new Set(['A_CLASS', 'B_CLASS', 'C_CLASS'])

function buildLibraryFilter(code: string): Prisma.QuestionWhereInput {
  if (LEGACY_TYPE_CODES.has(code)) {
    return {
      OR: [
        { libraryCode: code },
        {
          libraryCode: null,
          type: code as QuestionType,
        },
      ],
    }
  }

  return { libraryCode: code }
}

export async function GET(request: NextRequest) {
  const resolvedUser = await resolveRequestUser(request, { allowGuest: true })
  if (!resolvedUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.json({ error: 'Library code is required' }, { status: 400 })
  }

  try {
    const libraryFilter = buildLibraryFilter(code)

    const [browsedCount, totalQuestions] = await Promise.all([
      prisma.userQuestion.count({
        where: {
          userId: resolvedUser.id,
          question: libraryFilter,
        },
      }),
      prisma.question.count({ where: libraryFilter }),
    ])

    return attachGuestCookieIfNeeded(
      NextResponse.json({
        browsedCount,
        totalQuestions,
        isCompleted: totalQuestions > 0 && browsedCount >= totalQuestions,
      }),
      resolvedUser,
    )
  } catch (error) {
    console.error('Failed to fetch library stats:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
