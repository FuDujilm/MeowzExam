import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { resolveRequestUser } from '@/lib/auth/api-auth'

// POST /api/favorites - 添加收藏
export async function POST(request: NextRequest) {
  try {
    const resolvedUser = await resolveRequestUser(request)
    if (!resolvedUser) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { questionId } = body

    if (!questionId) {
      return NextResponse.json({ error: '缺少题目ID' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: resolvedUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
    })

    if (!question) {
      return NextResponse.json({ error: '题目不存在' }, { status: 404 })
    }

    const favorite = await prisma.favoriteQuestion.upsert({
      where: {
        userId_questionId: {
          userId: user.id,
          questionId,
        },
      },
      create: {
        userId: user.id,
        questionId,
      },
      update: {},
    })

    return NextResponse.json({ success: true, favorite })
  } catch (error) {
    console.error('添加收藏失败:', error)
    return NextResponse.json(
      { error: '添加收藏失败' },
      { status: 500 }
    )
  }
}

// DELETE /api/favorites - 取消收藏
export async function DELETE(request: NextRequest) {
  try {
    const resolvedUser = await resolveRequestUser(request)
    if (!resolvedUser) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const questionId = searchParams.get('questionId')

    if (!questionId) {
      return NextResponse.json({ error: '缺少题目ID' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: resolvedUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    await prisma.favoriteQuestion.deleteMany({
      where: {
        userId: user.id,
        questionId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('取消收藏失败:', error)
    return NextResponse.json(
      { error: '取消收藏失败' },
      { status: 500 }
    )
  }
}

// GET /api/favorites - 获取收藏列表
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

    const favorites = await prisma.favoriteQuestion.findMany({
      where: {
        userId: user.id,
      },
      include: {
        question: {
          select: {
            id: true,
            uuid: true,
            externalId: true,
            type: true,
            questionType: true,
            difficulty: true,
            category: true,
            categoryCode: true,
            title: true,
            hasImage: true,
            tags: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ favorites })
  } catch (error) {
    console.error('获取收藏列表失败:', error)
    return NextResponse.json(
      { error: '获取收藏列表失败' },
      { status: 500 }
    )
  }
}
