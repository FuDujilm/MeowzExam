import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { resolveRequestUser } from '@/lib/auth/api-auth'

// GET /api/user/points-history - 获取用户积分历史
export async function GET(request: NextRequest) {
  try {
    const resolvedUser = await resolveRequestUser(request)
    if (!resolvedUser) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const user = await prisma.user.findUnique({
      where: { id: resolvedUser.id },
      select: {
        id: true,
        email: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const history = await prisma.pointsHistory.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    })

    const config = await prisma.pointsConfig.findUnique({
      where: { key: 'default' },
    })

    const pointsName = config?.pointsName || '积分'

    return NextResponse.json({
      history,
      items: history,
      total: history.length,
      pointsName,
    })
  } catch (error) {
    console.error('获取积分历史失败:', error)
    return NextResponse.json(
      { error: '获取积分历史失败' },
      { status: 500 },
    )
  }
}
