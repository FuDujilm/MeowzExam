import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { resolveRequestUser } from '@/lib/auth/api-auth'

function normalizeAnswerList(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === 'string') return item
        if (item == null) return null
        return String(item)
      })
      .filter((item): item is string => Boolean(item))
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return []

    try {
      const parsed = JSON.parse(trimmed)
      return normalizeAnswerList(parsed)
    } catch {
      return [trimmed]
    }
  }

  if (raw && typeof raw === 'object') {
    const container = raw as Record<string, unknown>
    const maybeArray =
      container.value ??
      container.set ??
      container.values ??
      container.items ??
      container.data

    if (Array.isArray(maybeArray)) {
      return normalizeAnswerList(maybeArray)
    }
  }

  return []
}

function deriveCorrectAnswersFromOptions(optionsRaw: unknown): string[] {
  const candidates: unknown[] = Array.isArray(optionsRaw)
    ? optionsRaw
    : (() => {
        if (typeof optionsRaw === 'string') {
          try {
            const parsed = JSON.parse(optionsRaw)
            return Array.isArray(parsed) ? parsed : []
          } catch {
            return []
          }
        }

        if (optionsRaw && typeof optionsRaw === 'object') {
          const container = optionsRaw as Record<string, unknown>
          const maybeArray =
            container.value ??
            container.values ??
            container.items ??
            container.options ??
            container.data
          if (Array.isArray(maybeArray)) {
            return maybeArray
          }
        }

        return []
      })()

  const answers: string[] = []

  for (const item of candidates) {
    if (!item || typeof item !== 'object') continue

    const option = item as Record<string, unknown>
    const isCorrect =
      option.is_correct === true ||
      option.isCorrect === true ||
      option.correct === true ||
      option.answer === true ||
      option.isRight === true

    const idCandidate = option.id ?? option.value ?? option.key ?? option.code

    if (isCorrect && typeof idCandidate === 'string') {
      answers.push(idCandidate)
    }
  }

  return answers
}

// POST /api/practice/submit - 提交答案
export async function POST(request: NextRequest) {
  try {
    const resolvedUser = await resolveRequestUser(request)
    if (!resolvedUser) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const { questionId, userAnswer, answerMapping } = body ?? {}

    if (!questionId || (!userAnswer && userAnswer !== '')) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    const normalizedUserAnswer = normalizeAnswerList(userAnswer)
    if (!normalizedUserAnswer.length) {
      return NextResponse.json(
        { error: '答案不能为空' },
        { status: 400 }
      )
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

    let correctAnswers = normalizeAnswerList(question.correctAnswers)

    if (!correctAnswers.length) {
      correctAnswers = deriveCorrectAnswersFromOptions(question.options)
    }

    if (!correctAnswers.length) {
      return NextResponse.json(
        { error: '题目缺少正确答案配置' },
        { status: 500 }
      )
    }

    const originalUserAnswer = normalizedUserAnswer.map((ans) =>
      answerMapping && typeof answerMapping === 'object'
        ? (answerMapping as Record<string, string | undefined>)[ans] || ans
        : ans
    )

    console.log('[练题Debug]', {
      questionId,
      normalizedUserAnswer,
      answerMapping,
      originalUserAnswer,
      correctAnswers,
    })

    const sortedCorrect = [...correctAnswers].sort()
    const sortedUser = [...originalUserAnswer].sort()

    const isCorrect =
      sortedCorrect.length === sortedUser.length &&
      sortedCorrect.every((val, index) => val === sortedUser[index])

    const pointsConfig = await prisma.pointsConfig.findUnique({
      where: { key: 'default' },
    })

    const result = await prisma.$transaction(async (tx) => {
      const userQuestion = await tx.userQuestion.upsert({
        where: {
          userId_questionId: {
            userId: user.id,
            questionId,
          },
        },
        create: {
          userId: user.id,
          questionId,
          correctCount: isCorrect ? 1 : 0,
          incorrectCount: isCorrect ? 0 : 1,
          lastAnswered: new Date(),
          lastCorrect: isCorrect,
        },
        update: {
          correctCount: isCorrect
            ? { increment: 1 }
            : undefined,
          incorrectCount: !isCorrect
            ? { increment: 1 }
            : undefined,
          lastAnswered: new Date(),
          lastCorrect: isCorrect,
        },
      })

      let pointsEarned = 0

      if (isCorrect && pointsConfig) {
        pointsEarned = pointsConfig.answerCorrect

        await tx.user.update({
          where: { id: user.id },
          data: {
            totalPoints: { increment: pointsEarned },
          },
        })

        await tx.pointsHistory.create({
          data: {
            userId: user.id,
            points: pointsEarned,
            reason: `正确回答题目: ${question.externalId}`,
            type: 'ANSWER_CORRECT',
          },
        })
      }

      return { userQuestion, pointsEarned }
    })

    return NextResponse.json({
      isCorrect,
      correctAnswers,
      explanation: question.explanation,
      aiExplanation: question.aiExplanation,
      userQuestion: result.userQuestion,
      pointsEarned: result.pointsEarned,
    })
  } catch (error) {
    console.error('提交答案失败:', error)
    return NextResponse.json(
      { error: '提交答案失败' },
      { status: 500 }
    )
  }
}
