import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@/lib/generated/prisma'
import { prisma } from '@/lib/db'
import { resolveRequestUser } from '@/lib/auth/api-auth'
import { getLibraryForUser } from '@/lib/question-library-service'
import { getDateKey } from '@/lib/daily-practice'

const LEGACY_TYPE_CODES = new Set(['A_CLASS', 'B_CLASS', 'C_CLASS'])

type QuestionWithOptions = Prisma.QuestionGetPayload<Prisma.QuestionDefaultArgs>

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
          libraryCode: null,
          type: libraryCode as any,
        },
      ],
    }
  }
  return { libraryCode }
}

function combineWhereConditions(
  ...conditions: Array<Prisma.QuestionWhereInput | undefined>
): Prisma.QuestionWhereInput {
  const filtered = conditions.filter(Boolean) as Prisma.QuestionWhereInput[]
  if (filtered.length === 0) return {}
  if (filtered.length === 1) return filtered[0]
  return { AND: filtered }
}

function shuffleOptions(question: QuestionWithOptions) {
  let shuffledOptions = question.options
  const answerMapping: Record<string, string> = {}

  if (Array.isArray(question.options)) {
    const originalOptions = [...question.options] as Array<any>
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

  return { shuffledOptions, answerMapping }
}

export async function GET(request: NextRequest) {
  try {
    const resolvedUser = await resolveRequestUser(request)
    if (!resolvedUser) {
      return NextResponse.json({ error: '未登录，无法获取练习题目。' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const mode = searchParams.get('mode') || 'sequential'
    const libraryCodeParam = normalizeLibraryCode(
      searchParams.get('library') ?? searchParams.get('type'),
    )
    const currentId = searchParams.get('currentId')
    const targetQuestionId = searchParams.get('questionId')

    if (!libraryCodeParam) {
      return NextResponse.json(
        { error: '缺少题库标识，请在请求参数中提供 library。' },
        { status: 400 },
      )
    }

    const library = await getLibraryForUser({
      code: libraryCodeParam,
      userId: resolvedUser.id,
      userEmail: resolvedUser.email ?? null,
    })

    if (!library) {
      return NextResponse.json(
        { error: '未找到对应题库或您没有访问权限。' },
        { status: 404 },
      )
    }

    const libraryFilter = buildLibraryFilter(library.code)

    const user = await prisma.user.findUnique({
      where: { id: resolvedUser.id },
      include: { settings: true },
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在。' }, { status: 404 })
    }

    let question: QuestionWithOptions | null = null
    const isDailyMode = mode === 'daily'
    const dailyPracticeTarget = user.settings?.dailyPracticeTarget ?? 10
    const todayKey = isDailyMode ? getDateKey() : null
    const dailyPracticeRecord = isDailyMode
      ? await prisma.dailyPracticeRecord.findUnique({
          where: {
            userId_date: {
              userId: user.id,
              date: todayKey!,
            },
          },
        })
      : null
    const dailyPracticeCount = dailyPracticeRecord?.questionCount ?? 0
    const dailyPracticeCompleted =
      isDailyMode && dailyPracticeCount >= dailyPracticeTarget

    if (isDailyMode && dailyPracticeCompleted) {
      return NextResponse.json(
        {
          error: '今日每日练习已完成，明天继续加油！',
          dailyPractice: {
            target: dailyPracticeTarget,
            count: dailyPracticeCount,
            completed: true,
            remaining: 0,
            rewardPoints: dailyPracticeRecord?.rewardPoints ?? 0,
          },
        },
        { status: 409 },
      )
    }

    if (targetQuestionId) {
      question = await prisma.question.findFirst({
        where: combineWhereConditions(libraryFilter, { id: targetQuestionId }),
      })
      if (!question) {
        return NextResponse.json(
          { error: '未找到指定题目，请刷新后重试。' },
          { status: 404 },
        )
      }
    } else {
      const effectiveMode = mode === 'daily' ? 'sequential' : mode

      switch (effectiveMode) {
      case 'sequential': {
        const correctQuestions = await prisma.userQuestion.findMany({
          where: {
            userId: user.id,
            correctCount: { gt: 0 },
            incorrectCount: 0,
            question: libraryFilter,
          },
          select: { questionId: true },
        })

        const correctIds = correctQuestions.map((item) => item.questionId)
        const exclusion =
          correctIds.length > 0
            ? { id: { notIn: correctIds } }
            : undefined

        const baseWhere = combineWhereConditions(libraryFilter, exclusion)

        if (currentId) {
          const currentQuestion = await prisma.question.findUnique({
            where: { id: currentId },
            select: { externalId: true },
          })

          if (currentQuestion?.externalId) {
            question = await prisma.question.findFirst({
              where: combineWhereConditions(baseWhere, {
                externalId: { gt: currentQuestion.externalId },
              }),
              orderBy: { externalId: 'asc' },
            })
          }
        }

        if (!question) {
          question = await prisma.question.findFirst({
            where: baseWhere,
            orderBy: { externalId: 'asc' },
          })
        }
        break
      }

      case 'random': {
        const correctQuestions = await prisma.userQuestion.findMany({
          where: {
            userId: user.id,
            correctCount: { gt: 0 },
            incorrectCount: 0,
            question: libraryFilter,
          },
          select: { questionId: true },
        })
        const exclusion =
          correctQuestions.length > 0
            ? {
                id: {
                  notIn: correctQuestions.map((item) => item.questionId),
                },
              }
            : undefined

        const baseWhere = combineWhereConditions(libraryFilter, exclusion)

        const total = await prisma.question.count({ where: baseWhere })
        if (total === 0) {
          return NextResponse.json(
            { error: '该题库暂无可用题目，请稍后再试。' },
            { status: 404 },
          )
        }

        const skip = Math.floor(Math.random() * total)
        question = await prisma.question.findFirst({
          where: baseWhere,
          skip,
        })
        break
      }

      case 'wrong': {
        const userQuestions = await prisma.userQuestion.findMany({
          where: {
            userId: user.id,
            incorrectCount: { gt: 0 },
            question: libraryFilter,
          },
          include: {
            question: true,
          },
          orderBy: {
            lastAnswered: 'desc',
          },
        })

        if (userQuestions.length === 0) {
          return NextResponse.json(
            { error: '暂无错题记录。' },
            { status: 404 },
          )
        }

        if (currentId) {
          const currentIndex = userQuestions.findIndex(
            (item) => item.questionId === currentId,
          )
          if (currentIndex >= 0 && currentIndex < userQuestions.length - 1) {
            question = userQuestions[currentIndex + 1].question
          } else {
            question = userQuestions[0].question
          }
        } else {
          question = userQuestions[0].question
        }
        break
      }

      case 'favorite': {
        const favorites = await prisma.favoriteQuestion.findMany({
          where: {
            userId: user.id,
            question: libraryFilter,
          },
          include: { question: true },
          orderBy: {
            createdAt: 'desc',
          },
        })

        if (favorites.length === 0) {
          return NextResponse.json(
            { error: '暂无收藏的题目。' },
            { status: 404 },
          )
        }

        if (currentId) {
          const currentIndex = favorites.findIndex(
            (item) => item.questionId === currentId,
          )
          if (currentIndex >= 0 && currentIndex < favorites.length - 1) {
            question = favorites[currentIndex + 1].question
          } else {
            question = favorites[0].question
          }
        } else {
          question = favorites[0].question
        }
        break
      }

      default:
        return NextResponse.json(
          { error: '不支持的练习模式。' },
          { status: 400 },
        )
    }
    }

    if (!question) {
      return NextResponse.json(
        { error: '暂无更多题目，试试其他模式吧。' },
        { status: 404 },
      )
    }

    const { shuffledOptions, answerMapping } = shuffleOptions(question)
    const userQuestion = await prisma.userQuestion.findUnique({
      where: {
        userId_questionId: {
          userId: user.id,
          questionId: question.id,
        },
      },
    })

    const favorite = await prisma.favoriteQuestion.findUnique({
      where: {
        userId_questionId: {
          userId: user.id,
          questionId: question.id,
        },
      },
    })

    const payload: Record<string, unknown> = {
      question: {
        ...question,
        options: shuffledOptions,
        answerMapping,
      },
      userQuestion,
      isFavorite: Boolean(favorite),
      library: {
        code: library.code,
        name: library.name,
        shortName: library.shortName,
      },
    }

    if (isDailyMode) {
      const count = dailyPracticeCount
      payload.dailyPractice = {
        target: dailyPracticeTarget,
        count,
        remaining: Math.max(dailyPracticeTarget - count, 0),
        completed: dailyPracticeCompleted,
        rewardPoints: dailyPracticeRecord?.rewardPoints ?? 0,
      }
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('获取练习题目失败:', error)
    return NextResponse.json(
      { error: '获取题目时发生错误，请稍后再试。' },
      { status: 500 },
    )
  }
}
