import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestUser } from '@/lib/auth/api-auth'
import { prisma } from '@/lib/db'
import { getDateKey, getRewardForStreak, getNextRewardPreview } from '@/lib/daily-practice'

export async function GET(request: NextRequest) {
  try {
    const resolvedUser = await resolveRequestUser(request)
    if (!resolvedUser) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: resolvedUser.id },
      include: { settings: true },
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const daysParam = Number(searchParams.get('days') ?? '30')
    const rangeDays = Math.min(Math.max(Number.isFinite(daysParam) ? Math.floor(daysParam) : 30, 7), 120)

    const today = new Date()
    const todayKey = getDateKey(today)
    const startDate = new Date(today.getTime() - (rangeDays - 1) * 24 * 60 * 60 * 1000)
    const startKey = getDateKey(startDate)

    const records = await prisma.dailyPracticeRecord.findMany({
      where: {
        userId: user.id,
        date: { gte: startKey },
      },
      orderBy: { date: 'asc' },
    })

    const todayRecord = records.find((record) => record.date === todayKey) ?? null
    const target = user.settings?.dailyPracticeTarget ?? 10
    const todayCount = todayRecord?.questionCount ?? 0
    const todayCompleted = todayCount >= target

    return NextResponse.json({
      target,
      today: {
        count: todayCount,
        completed: todayCompleted,
        remaining: Math.max(target - todayCount, 0),
        rewardPoints: todayCompleted ? todayRecord?.rewardPoints ?? 0 : 0,
        completedAt: todayRecord?.completedAt ?? null,
      },
      streak: user.dailyPracticeStreak ?? 0,
      nextReward: getNextRewardPreview(user.dailyPracticeStreak ?? 0),
      records,
    })
  } catch (error) {
    console.error('Daily practice status error:', error)
    return NextResponse.json({ error: '无法获取每日练习状态' }, { status: 500 })
  }
}
