import { NextRequest, NextResponse } from 'next/server'
import type { Prisma, QuestionType } from '@/lib/generated/prisma'
import { prisma } from '@/lib/db'
import { resolveRequestUser } from '@/lib/auth/api-auth'
import { attachGuestCookieIfNeeded } from '@/lib/auth/guest-user'
import { getLibraryForUser } from '@/lib/question-library-service'

const LEGACY_TYPE_CODES = new Set(['A_CLASS', 'B_CLASS', 'C_CLASS'])

type QuestionOptionPayload = {
  id: string
  text: string
}

function normalizeLibraryCode(value: string | null): string | null {
  return value ? value.trim().toUpperCase() : null
}

function buildLibraryFilter(libraryCode: string): Prisma.QuestionWhereInput {
  if (!libraryCode) return {}
  if (LEGACY_TYPE_CODES.has(libraryCode)) {
    return {
      OR: [
        { libraryCode },
        {
          AND: [{ libraryCode: null }, { type: libraryCode as QuestionType }],
        },
      ],
    }
  }
  return { libraryCode }
}

// GET /api/practice/error-rate - 按错误率获取题目
export async function GET(request: NextRequest) {
  try {
    const resolvedUser = await resolveRequestUser(request, { allowGuest: true })
    if (!resolvedUser) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const libraryParam = normalizeLibraryCode(
      searchParams.get('library') ?? searchParams.get('type'),
    )
    const currentId = searchParams.get('currentId') // 当前题目ID

    if (!libraryParam) {
      return NextResponse.json({ error: '缺少题库标识' }, { status: 400 })
    }

    let targetLibraryCode = libraryParam
    if (!LEGACY_TYPE_CODES.has(libraryParam)) {
      const library = await getLibraryForUser({
        code: libraryParam,
        userId: resolvedUser.id,
        userEmail: resolvedUser.email,
      })

      if (!library) {
        return NextResponse.json(
          { error: '未找到题库或没有访问权限' },
          { status: 404 },
        )
      }
      targetLibraryCode = library.code
    }

    const libraryFilter = buildLibraryFilter(targetLibraryCode)

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: resolvedUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 获取用户的答题记录
    const userQuestions = await prisma.userQuestion.findMany({
      where: {
        userId: user.id,
        incorrectCount: { gt: 0 },
        question: libraryFilter,
      },
      include: {
        question: true,
      },
    })

    // 计算每道题的错误率
    const questionsWithErrorRate = userQuestions.map(userQuestion => {
      const totalAttempts = userQuestion.correctCount + userQuestion.incorrectCount
      const errorRate = totalAttempts > 0
        ? userQuestion.incorrectCount / totalAttempts
        : 0
      return {
        question: userQuestion.question,
        errorRate,
        userQuestion,
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
      const originalOptions = [...(question.options as QuestionOptionPayload[])]
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

    return attachGuestCookieIfNeeded(NextResponse.json({
      question: {
        ...question,
        options: shuffledOptions,
        answerMapping,
      },
      userQuestion: nextQuestion.userQuestion,
      isFavorite: !!favorite,
      errorRate: nextQuestion.errorRate,
    }), resolvedUser)
  } catch (error) {
    console.error('获取错误率题目失败:', error)
    return NextResponse.json(
      { error: '获取错误率题目失败' },
      { status: 500 }
    )
  }
}
