import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { resolveRequestUser } from '@/lib/auth/api-auth'

// GET /api/practice/error-rate - 按错误率获取题目
export async function GET(request: NextRequest) {
  try {
    const resolvedUser = await resolveRequestUser(request)
    if (!resolvedUser) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'A_CLASS'
    const currentId = searchParams.get('currentId') // 当前题目ID

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { email: resolvedUser.email },
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 获取所有该类别的题目
    const allQuestions = await prisma.question.findMany({
      where: {
        type: type as 'A_CLASS' | 'B_CLASS' | 'C_CLASS',
      },
    })

    // 获取用户的答题记录
    const userQuestions = await prisma.userQuestion.findMany({
      where: {
        userId: user.id,
        question: {
          type: type as 'A_CLASS' | 'B_CLASS' | 'C_CLASS',
        },
      },
      include: {
        question: true,
      },
    })

    // 创建答题记录映射
    const userQuestionMap = new Map(
      userQuestions.map(uq => [uq.questionId, uq])
    )

    // 计算每道题的错误率
    const questionsWithErrorRate = allQuestions.map(q => {
      const userQuestion = userQuestionMap.get(q.id)

      let errorRate: number
      if (!userQuestion || (userQuestion.correctCount === 0 && userQuestion.incorrectCount === 0)) {
        // 未做过的题目，错误率为100%
        errorRate = 1.0
      } else {
        const totalAttempts = userQuestion.correctCount + userQuestion.incorrectCount
        errorRate = userQuestion.incorrectCount / totalAttempts
      }

      return {
        question: q,
        errorRate,
        userQuestion: userQuestion || null,
      }
    })

    // 按错误率降序排序（错误率高的优先）
    questionsWithErrorRate.sort((a, b) => b.errorRate - a.errorRate)

    // 如果有currentId，找到下一题
    let nextQuestion
    if (currentId) {
      const currentIndex = questionsWithErrorRate.findIndex(
        item => item.question.id === currentId
      )
      if (currentIndex >= 0 && currentIndex < questionsWithErrorRate.length - 1) {
        nextQuestion = questionsWithErrorRate[currentIndex + 1]
      } else {
        // 如果是最后一题或找不到，返回第一题
        nextQuestion = questionsWithErrorRate[0]
      }
    } else {
      // 没有currentId，返回第一题（错误率最高的）
      nextQuestion = questionsWithErrorRate[0]
    }

    if (!nextQuestion) {
      return NextResponse.json({ error: '没有可用题目' }, { status: 404 })
    }

    const question = nextQuestion.question

    // 随机打乱选项顺序
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

    // 检查是否收藏
    const favorite = await prisma.favoriteQuestion.findUnique({
      where: {
        userId_questionId: {
          userId: user.id,
          questionId: question.id,
        },
      },
    })

    return NextResponse.json({
      question: {
        ...question,
        options: shuffledOptions,
        answerMapping,
      },
      userQuestion: nextQuestion.userQuestion,
      isFavorite: !!favorite,
      errorRate: nextQuestion.errorRate,
    })
  } catch (error) {
    console.error('获取错误率题目失败:', error)
    return NextResponse.json(
      { error: '获取错误率题目失败' },
      { status: 500 }
    )
  }
}
