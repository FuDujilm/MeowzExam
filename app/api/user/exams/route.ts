
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { resolveRequestUser } from '@/lib/auth/api-auth'
import { attachGuestCookieIfNeeded } from '@/lib/auth/guest-user'

function buildExamAdvice(recentFivePassed: number, recentFiveTotal: number): string {
  if (recentFiveTotal === 0) {
    return '完成几次模拟考试后，系统会根据最近五次成绩给出考试建议。'
  }
  if (recentFivePassed >= 1) {
    return '最近五次内已经及格，参加正式考试更容易通过考试。'
  }
  return '建议先练到最近五次模拟考试内至少一次及格，再参加正式考试会更稳。'
}

// GET /api/user/exams
// Get user's exam history
export async function GET(request: NextRequest) {
  try {
    const resolvedUser = await resolveRequestUser(request, { allowGuest: true })
    if (!resolvedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const exams = await prisma.examResult.findMany({
      where: {
        userId: resolvedUser.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to last 50 exams
    })

    const grouped = new Map<string, typeof exams>()
    for (const exam of exams) {
      const key = exam.libraryCode || exam.presetCode || 'UNKNOWN'
      grouped.set(key, [...(grouped.get(key) ?? []), exam])
    }

    const summaries = Array.from(grouped.entries()).map(([key, items]) => {
      const recentFive = items.slice(0, 5)
      const recentFivePassed = recentFive.filter((item) => item.passed).length
      return {
        key,
        libraryCode: items[0]?.libraryCode ?? null,
        libraryName: items[0]?.libraryName ?? null,
        presetCode: items[0]?.presetCode ?? null,
        totalAttempts: items.length,
        recentFiveTotal: recentFive.length,
        recentFivePassed,
        latest: items[0] ?? null,
        advice: buildExamAdvice(recentFivePassed, recentFive.length),
      }
    })

    return attachGuestCookieIfNeeded(NextResponse.json({
      exams,
      summaries,
      items: exams,
    }), resolvedUser)
  } catch (error) {
    console.error('Get exam history error:', error)
    return NextResponse.json({ error: 'Failed to get exam history' }, { status: 500 })
  }
}
