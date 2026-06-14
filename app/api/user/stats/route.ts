import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@/lib/generated/prisma'
import { resolveRequestUser } from '@/lib/auth/api-auth'
import { attachGuestCookieIfNeeded } from '@/lib/auth/guest-user'

// GET /api/user/stats - 获取用户统计信息
export async function GET(request: NextRequest) {
  try {
    const resolvedUser = await resolveRequestUser(request, { allowGuest: true })
    if (!resolvedUser) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: resolvedUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const todayEnd = new Date(todayStart)
    todayEnd.setHours(23, 59, 59, 999)

    const weekStart = new Date(todayStart)
    weekStart.setDate(todayStart.getDate() - ((todayStart.getDay() + 6) % 7))

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    const attemptWhere = {
      session: {
        userId: user.id,
      },
    }

    const todayAttemptWhere = {
      ...attemptWhere,
      answeredAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    }

    const weekAttemptWhere = {
      ...attemptWhere,
      answeredAt: {
        gte: weekStart,
        lte: weekEnd,
      },
    }

    const [
      todayAnswered,
      totalAnswered,
      totalCorrect,
      weekAnswered,
      weekCorrect,
      activeDaysRows,
      uniqueAnsweredQuestions,
      examCount,
    ] = await Promise.all([
      prisma.practiceSessionQuestion.count({ where: todayAttemptWhere }),
      prisma.practiceSessionQuestion.count({ where: attemptWhere }),
      prisma.practiceSessionQuestion.count({
        where: {
          ...attemptWhere,
          isCorrect: true,
        },
      }),
      prisma.practiceSessionQuestion.count({ where: weekAttemptWhere }),
      prisma.practiceSessionQuestion.count({
        where: {
          ...weekAttemptWhere,
          isCorrect: true,
        },
      }),
      prisma.$queryRaw<Array<{ activeDays: number }>>(Prisma.sql`
        select count(distinct date_trunc('day', psq."answeredAt"))::int as "activeDays"
        from "practice_session_questions" psq
        inner join "practice_sessions" ps on ps."id" = psq."sessionId"
        where ps."userId" = ${user.id}
          and psq."answeredAt" >= ${weekStart}
          and psq."answeredAt" <= ${weekEnd}
      `),
      prisma.userQuestion.count({
        where: {
          userId: user.id,
        },
      }),
      prisma.examResult.count({
        where: {
          userId: user.id,
        },
      }),
    ])

    const totalIncorrect = Math.max(totalAnswered - totalCorrect, 0)
    const totalAttempts = totalAnswered
    const accuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0
    const weekIncorrect = Math.max(weekAnswered - weekCorrect, 0)
    const weekAccuracy = weekAnswered > 0 ? (weekCorrect / weekAnswered) * 100 : 0
    const activeDaysThisWeek = activeDaysRows[0]?.activeDays ?? 0

    // 获取当前排名
    const higherRankedCount = await prisma.user.count({
      where: {
        totalPoints: {
          gt: user.totalPoints,
        },
      },
    })
    const currentRank = higherRankedCount + 1

    // 获取积分配置，拿到积分名称
    const config = await prisma.pointsConfig.findUnique({
      where: { key: 'default' },
    })

    const pointsName = config?.pointsName || '积分'

    return attachGuestCookieIfNeeded(NextResponse.json({
      todayAnswered,
      totalAnswered,
      totalAttempts,
      totalCorrect,
      totalIncorrect,
      uniqueAnsweredQuestions,
      weekAnswered,
      weekCorrect,
      weekIncorrect,
      weekAccuracy: Math.round(weekAccuracy),
      activeDaysThisWeek,
      examCount,
      accuracy: Math.round(accuracy),
      totalPoints: user.totalPoints,
      currentRank,
      pointsName,
      currentStreak: user.currentStreak,
    }), resolvedUser)
  } catch (error) {
    console.error('获取用户统计失败:', error)
    return NextResponse.json(
      { error: '获取用户统计失败' },
      { status: 500 },
    )
  }
}
