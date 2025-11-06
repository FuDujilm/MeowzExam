import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { resolveRequestUser } from '@/lib/auth/api-auth'

// POST /api/points/checkin - 每日签到
export async function POST(request: NextRequest) {
  try {
    const resolvedUser = await resolveRequestUser(request)
    if (!resolvedUser) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: resolvedUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 读取积分配置
    let config = await prisma.pointsConfig.findUnique({
      where: { key: 'default' },
    })

    if (!config) {
      // 初始化默认配置
      config = await prisma.pointsConfig.create({
        data: {
          key: 'default',
          pointsName: '积分',
          answerCorrect: 10,
          dailyCheckIn: 50,
          streak3Days: 100,
          streak7Days: 150,
          aiRegenerateDailyFree: 5,
          aiRegenerateCost: 100,
        },
      })
    }

    // 判断今日是否已签到
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const existingCheckIn = await prisma.checkInHistory.findFirst({
      where: {
        userId: user.id,
        date: {
          gte: today,
        },
      },
    })

    if (existingCheckIn) {
      return NextResponse.json(
        { error: '今天已经签到过啦' },
        { status: 400 },
      )
    }

    // 计算新的连续签到天数
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const yesterdayCheckIn = await prisma.checkInHistory.findFirst({
      where: {
        userId: user.id,
        date: {
          gte: yesterday,
          lt: today,
        },
      },
    })

    let newStreak = 1
    if (yesterdayCheckIn) {
      newStreak = user.currentStreak + 1
    }

    // 计算本次积分与奖励
    let totalPoints = config.dailyCheckIn
    let bonusPoints = 0
    let bonusReason = ''

    if (newStreak === 3) {
      bonusPoints = config.streak3Days
      bonusReason = '连续签到 3 天奖励'
    } else if (newStreak === 7) {
      bonusPoints = config.streak7Days
      bonusReason = '连续签到 7 天奖励'
    } else if (newStreak > 7 && newStreak % 7 === 0) {
      bonusPoints = config.streak7Days
      bonusReason = `连续签到 ${newStreak} 天奖励`
    }

    totalPoints += bonusPoints

    // 使用事务更新数据
    const result = await prisma.$transaction(async (tx) => {
      // 更新用户总积分与连续天数
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          totalPoints: { increment: totalPoints },
          currentStreak: newStreak,
          lastCheckIn: new Date(),
        },
      })

      // 记录签到历史
      const checkIn = await tx.checkInHistory.create({
        data: {
          userId: user.id,
          date: new Date(),
          points: totalPoints,
          streak: newStreak,
        },
      })

      // 记录基础积分
      await tx.pointsHistory.create({
        data: {
          userId: user.id,
          points: config!.dailyCheckIn,
          reason: '每日签到',
          type: 'DAILY_CHECK_IN',
        },
      })

      // 如有奖励积分，额外记录
      if (bonusPoints > 0) {
        await tx.pointsHistory.create({
          data: {
            userId: user.id,
            points: bonusPoints,
            reason: bonusReason,
            type: 'STREAK_BONUS',
          },
        })
      }

      return { updatedUser, checkIn }
    })

    return NextResponse.json({
      success: true,
      points: totalPoints,
      basePoints: config.dailyCheckIn,
      bonusPoints,
      bonusReason,
      streak: newStreak,
      totalPoints: result.updatedUser.totalPoints,
    })
  } catch (error) {
    console.error('签到失败:', error)
    return NextResponse.json(
      { error: '签到失败' },
      { status: 500 },
    )
  }
}

// GET /api/points/checkin - 获取签到状态
export async function GET(request: NextRequest) {
  try {
    const resolvedUser = await resolveRequestUser(request)
    if (!resolvedUser) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: resolvedUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 判断今日是否已签到
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayCheckIn = await prisma.checkInHistory.findFirst({
      where: {
        userId: user.id,
        date: {
          gte: today,
        },
      },
    })

    return NextResponse.json({
      hasCheckedIn: !!todayCheckIn,
      currentStreak: user.currentStreak,
      lastCheckIn: user.lastCheckIn,
      totalPoints: user.totalPoints,
    })
  } catch (error) {
    console.error('获取签到状态失败:', error)
    return NextResponse.json(
      { error: '获取签到状态失败' },
      { status: 500 },
    )
  }
}
