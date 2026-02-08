import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { resolveRequestUser } from '@/lib/auth/api-auth'

// GET /api/user/stats - 获取用户统计信息
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

    // 获取今日答题量
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayAnswered = await prisma.userQuestion.count({
      where: {
        userId: user.id,
        lastAnswered: {
          gte: today,
        },
      },
    })

    // 获取累计答题量
    const totalAnswered = await prisma.userQuestion.count({
      where: {
        userId: user.id,
      },
    })

    // 获取模拟考试次数
    const examCount = await prisma.examResult.count({
      where: {
        userId: user.id,
      },
    })

    // 计算正确率
    const userQuestions = await prisma.userQuestion.findMany({
      where: {
        userId: user.id,
      },
      select: {
        correctCount: true,
        incorrectCount: true,
      },
    })

    let totalCorrect = 0
    let totalIncorrect = 0

    userQuestions.forEach(uq => {
      totalCorrect += uq.correctCount
      totalIncorrect += uq.incorrectCount
    })

    const totalAttempts = totalCorrect + totalIncorrect
    const accuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0

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

    return NextResponse.json({
      todayAnswered,
      totalAnswered,
      totalAttempts,
      totalCorrect,
      totalIncorrect,
      examCount,
      accuracy: Math.round(accuracy),
      totalPoints: user.totalPoints,
      currentRank,
      pointsName,
      currentStreak: user.currentStreak,
    })
  } catch (error) {
    console.error('获取用户统计失败:', error)
    return NextResponse.json(
      { error: '获取用户统计失败' },
      { status: 500 },
    )
  }
}
