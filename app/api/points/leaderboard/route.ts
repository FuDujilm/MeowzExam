import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserDisplayName } from '@/lib/users/display-name'

// GET /api/points/leaderboard - 获取积分排行榜
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 获取排行榜
    const users = await prisma.user.findMany({
      where: {
        totalPoints: {
          gt: 0,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        callsign: true,
        totalPoints: true,
        currentStreak: true,
        lastCheckIn: true,
      },
      orderBy: {
        totalPoints: 'desc',
      },
      take: limit,
      skip: offset,
    })

    // 获取总数
    const total = await prisma.user.count({
      where: {
        totalPoints: {
          gt: 0,
        },
      },
    })

    // 获取积分配置（用于显示积分名称）
    const config = await prisma.pointsConfig.findUnique({
      where: { key: 'default' },
    })

    const pointsName = config?.pointsName || '积分'

    return NextResponse.json({
      users: users.map((user, index) => ({
        rank: offset + index + 1,
        id: user.id,
        name: getUserDisplayName(user),
        callsign: user.callsign,
        points: user.totalPoints,
        streak: user.currentStreak,
        lastCheckIn: user.lastCheckIn,
      })),
      total,
      pointsName,
    })
  } catch (error) {
    console.error('获取排行榜失败:', error)
    return NextResponse.json(
      { error: '获取排行榜失败' },
      { status: 500 }
    )
  }
}
