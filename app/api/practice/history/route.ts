import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { resolveRequestUser } from '@/lib/auth/api-auth'

// GET /api/practice/history - 获取已练习的题目列表
export async function GET(request: NextRequest) {
  try {
    const resolvedUser = await resolveRequestUser(request)
    if (!resolvedUser) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { email: resolvedUser.email },
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'A_CLASS'
    const filter = searchParams.get('filter') || 'all' // all, correct, wrong

    // 构建查询条件
    const whereConditions: any = {
      userId: user.id,
      question: {
        type: type as 'A_CLASS' | 'B_CLASS' | 'C_CLASS'
      }
    }

    // 根据筛选条件添加过滤
    if (filter === 'correct') {
      whereConditions.correctCount = { gt: 0 }
    } else if (filter === 'wrong') {
      whereConditions.incorrectCount = { gt: 0 }
    }

    // 获取已练习的题目
    const userQuestions = await prisma.userQuestion.findMany({
      where: whereConditions,
      include: {
        question: {
          select: {
            id: true,
            uuid: true,
            externalId: true,
            questionType: true,
            title: true,
            options: true,
            correctAnswers: true,
            category: true,
            categoryCode: true,
            difficulty: true,
            explanation: true,
            aiExplanation: true,
            hasImage: true,
            imagePath: true,
          }
        }
      },
      orderBy: {
        lastAnswered: 'desc'
      }
    })

    // 为每道题生成新的打乱选项
    const questionsWithShuffledOptions = userQuestions.map(uq => {
      const question = uq.question
      let shuffledOptions = question.options
      const answerMapping: Record<string, string> = {}

      if (Array.isArray(question.options)) {
        const originalOptions = [...(question.options as any[])]
        const shuffledContents = [...originalOptions].sort(() => Math.random() - 0.5)
        const optionIds = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

        shuffledOptions = shuffledContents.map((opt, index) => {
          const newId = optionIds[index]
          const originalId = opt.id
          answerMapping[newId] = originalId
          return {
            id: newId,
            text: opt.text,
          }
        })
      }

      return {
        question: {
          ...question,
          options: shuffledOptions,
          answerMapping,
        },
        userQuestion: {
          correctCount: uq.correctCount,
          incorrectCount: uq.incorrectCount,
          lastAnswered: uq.lastAnswered,
          lastCorrect: uq.lastCorrect,
        }
      }
    })

    return NextResponse.json({
      questions: questionsWithShuffledOptions,
      total: questionsWithShuffledOptions.length,
    })
  } catch (error) {
    console.error('获取练习历史失败:', error)
    return NextResponse.json(
      { error: '获取练习历史失败' },
      { status: 500 }
    )
  }
}
