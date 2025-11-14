import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'

// GET /api/admin/points-config - 获取积分配置
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // TODO: 添加管理员权限检查

    let config = await prisma.pointsConfig.findUnique({
      where: { key: 'default' },
    })

    if (!config) {
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

    return NextResponse.json(config)
  } catch (error) {
    console.error('获取积分配置失败:', error)
    return NextResponse.json(
      { error: '获取积分配置失败' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/points-config - 更新积分配置
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // TODO: 添加管理员权限检查

    const body = await request.json()
    const {
      pointsName,
      answerCorrect,
      dailyCheckIn,
      streak3Days,
      streak7Days,
      aiRegenerateDailyFree,
      aiRegenerateCost,
    } = body

    const config = await prisma.pointsConfig.upsert({
      where: { key: 'default' },
      create: {
        key: 'default',
        pointsName: pointsName || '积分',
        answerCorrect: answerCorrect || 10,
        dailyCheckIn: dailyCheckIn || 50,
        streak3Days: streak3Days || 100,
        streak7Days: streak7Days || 150,
        aiRegenerateDailyFree: aiRegenerateDailyFree || 5,
        aiRegenerateCost: aiRegenerateCost || 100,
      },
      update: {
        pointsName,
        answerCorrect,
        dailyCheckIn,
        streak3Days,
        streak7Days,
        aiRegenerateDailyFree,
        aiRegenerateCost,
      },
    })

    return NextResponse.json(config)
  } catch (error) {
    console.error('更新积分配置失败:', error)
    return NextResponse.json(
      { error: '更新积分配置失败' },
      { status: 500 }
    )
  }
}
