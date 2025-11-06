import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'

// GET /api/questions/[id] - 获取题目详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id: questionId } = await params

    // 查询题目详情
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    })

    if (!question) {
      return NextResponse.json({ error: '题目不存在' }, { status: 404 })
    }

    // 查询用户对该题的答题记录
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    let userQuestion = null
    let isFavorite = false

    if (user) {
      userQuestion = await prisma.userQuestion.findUnique({
        where: {
          userId_questionId: {
            userId: user.id,
            questionId: questionId,
          },
        },
      })

      // 检查是否收藏
      const favorite = await prisma.favoriteQuestion.findUnique({
        where: {
          userId_questionId: {
            userId: user.id,
            questionId: questionId,
          },
        },
      })
      isFavorite = !!favorite
    }

    return NextResponse.json({
      question,
      userQuestion,
      isFavorite,
    })
  } catch (error) {
    console.error('获取题目详情失败:', error)
    return NextResponse.json(
      { error: '获取题目详情失败' },
      { status: 500 }
    )
  }
}

