import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { resolveRequestUser } from '@/lib/auth/api-auth'
import { attachGuestCookieIfNeeded } from '@/lib/auth/guest-user'

function normalizeLibraryCode(value: string | null): string | null {
  return value ? value.trim().toUpperCase() : null
}

function formatMode(mode: string): string {
  switch (mode) {
  case 'sequential':
    return '顺序练习'
  case 'random':
    return '随机练习'
  case 'wrong':
    return '错题练习'
  case 'favorite':
    return '收藏练习'
  case 'daily':
    return '每日练习'
  default:
    return '练习'
  }
}

export async function GET(request: NextRequest) {
  try {
    const resolvedUser = await resolveRequestUser(request, { allowGuest: true })
    if (!resolvedUser) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const libraryCode = normalizeLibraryCode(searchParams.get('library') ?? searchParams.get('type'))
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? 20), 1), 100)

    const sessions = await prisma.practiceSession.findMany({
      where: {
        userId: resolvedUser.id,
        totalQuestions: { gt: 0 },
        ...(libraryCode ? { libraryCode } : {}),
      },
      orderBy: { lastAnsweredAt: 'desc' },
      take: limit,
      select: {
        id: true,
        mode: true,
        libraryCode: true,
        libraryName: true,
        totalQuestions: true,
        correctCount: true,
        incorrectCount: true,
        startedAt: true,
        lastAnsweredAt: true,
      },
    })

    const payload = sessions.map((session) => ({
      ...session,
      modeName: formatMode(session.mode),
      accuracy:
        session.totalQuestions > 0
          ? Math.round((session.correctCount / session.totalQuestions) * 1000) / 10
          : 0,
    }))

    return attachGuestCookieIfNeeded(NextResponse.json({
      sessions: payload,
      total: payload.length,
    }), resolvedUser)
  } catch (error) {
    console.error('获取练习会话历史失败:', error)
    return NextResponse.json({ error: '获取练习会话历史失败' }, { status: 500 })
  }
}
