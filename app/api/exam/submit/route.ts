'use server'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

const DEFAULT_PASS_SCORE = 60

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未登录，无法提交模拟考试。' },
        { status: 401 },
      )
    }

    const { examId, examResultId, answers, answerMappings } = await request.json()

    if (!examId || !examResultId || !answers) {
      return NextResponse.json(
        { error: '缺少必要参数，无法提交考试。' },
        { status: 400 },
      )
    }

    const examResult = await prisma.examResult.findUnique({
      where: { id: examResultId },
      include: {
        exam: {
          include: {
            examQuestions: {
              include: {
                question: true,
              },
            },
            library: {
              include: {
                examPresets: true,
              },
            },
          },
        },
      },
    })

    if (!examResult) {
      return NextResponse.json(
        { error: '未找到考试记录。' },
        { status: 404 },
      )
    }

    if (examResult.userId !== session.user.id) {
      return NextResponse.json({ error: '无权操作该考试。' }, { status: 403 })
    }

    const answersObj = examResult.answers as Record<string, unknown>
    if (answersObj && Object.keys(answersObj).length > 0) {
      return NextResponse.json(
        { error: '考试已提交，请勿重复提交。' },
        { status: 400 },
      )
    }

    const sortedExamQuestions = [...examResult.exam.examQuestions].sort(
      (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
    )

    let correctCount = 0
    let wrongCount = 0
    const questionResults: any[] = []

    for (const examQuestion of sortedExamQuestions) {
      const question = examQuestion.question
      const userAnswer = answers[question.id] || []
      const correctAnswers = question.correctAnswers as string[]

      const mapping = (answerMappings?.[question.id] || {}) as Record<string, string>
      const reverseMapping: Record<string, string> = Object.fromEntries(
        Object.entries(mapping).map(([newId, originalId]) => [originalId, newId]),
      )
      const displayCorrectAnswers = correctAnswers.map(
        (ans) => reverseMapping[ans] || ans,
      )
      const userAnswerArray = Array.isArray(userAnswer) ? userAnswer : [userAnswer]
      const originalUserAnswer = userAnswerArray.map((ans) => mapping[ans] || ans)

      const originalOptions = Array.isArray(question.options) ? (question.options as any[]) : []
      const optionLookup = Object.fromEntries(
        originalOptions.map((opt: any) => [opt.id, { id: opt.id, text: opt.text }]),
      )
      const displayOptions =
        Object.keys(mapping).length > 0
          ? Object.entries(mapping)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([displayId, originalId]) => ({
                id: displayId,
                originalId,
                text: optionLookup[originalId]?.text ?? optionLookup[displayId]?.text ?? '',
              }))
          : originalOptions.map((opt: any) => ({
              id: opt.id,
              originalId: opt.id,
              text: opt.text,
            }))

      const isCorrect =
        correctAnswers.length === originalUserAnswer.length &&
        correctAnswers.every((ans) => originalUserAnswer.includes(ans))

      if (isCorrect) {
        correctCount += 1
      } else {
        wrongCount += 1
      }

      questionResults.push({
        questionId: question.id,
        questionNumber: examQuestion.orderIndex,
        externalId: question.externalId,
        title: question.title,
        questionType: question.questionType,
        difficulty: question.difficulty,
        category: question.category,
        categoryCode: question.categoryCode,
        hasImage: question.hasImage,
        imagePath: question.imagePath,
        imageAlt: question.imageAlt,
        userAnswer: userAnswerArray,
        originalUserAnswer,
        correctAnswers: displayCorrectAnswers,
        originalCorrectAnswers: correctAnswers,
        options: displayOptions,
        isCorrect,
        explanation: question.explanation,
        aiExplanation: question.aiExplanation,
      })
    }

    const presetCode = examResult.presetCode ?? examResult.exam.presetCode ?? null
    const availablePresets = examResult.exam.library?.examPresets ?? []
    const resolvedPreset =
      (presetCode
        ? availablePresets.find((preset) => preset.code === presetCode)
        : null) ?? availablePresets[0] ?? null

    const totalQuestions = examResult.exam.examQuestions.length
    const score = correctCount
    const passScore = resolvedPreset?.passScore ?? DEFAULT_PASS_SCORE
    const passed = score >= passScore

    await prisma.examResult.update({
      where: { id: examResultId },
      data: {
        score,
        correctCount,
        passed,
        answers,
        totalQuestions,
      },
    })

    for (const result of questionResults) {
      const questionId = result.questionId
      const isCorrectResult = result.isCorrect === true
      await prisma.userQuestion.upsert({
        where: {
          userId_questionId: {
            userId: session.user.id,
            questionId,
          },
        },
        create: {
          userId: session.user.id,
          questionId,
          correctCount: isCorrectResult ? 1 : 0,
          incorrectCount: isCorrectResult ? 0 : 1,
          lastAnswered: new Date(),
          lastCorrect: isCorrectResult,
        },
        update: {
          correctCount: isCorrectResult ? { increment: 1 } : undefined,
          incorrectCount: !isCorrectResult ? { increment: 1 } : undefined,
          lastAnswered: new Date(),
          lastCorrect: isCorrectResult,
        },
      })
    }

    return NextResponse.json({
      success: true,
      score,
      totalQuestions,
      correctCount,
      wrongCount,
      passed,
      passScore,
      questionResults,
      library: {
        code: examResult.libraryCode ?? examResult.exam.library?.code,
        name: examResult.libraryName ?? examResult.exam.library?.name,
      },
      preset: resolvedPreset
        ? {
            code: resolvedPreset.code,
            name: resolvedPreset.name,
          }
        : null,
    })
  } catch (error: any) {
    console.error('Submit exam error:', error)
    return NextResponse.json(
      { error: error.message || '提交模拟考试失败。' },
      { status: 500 },
    )
  }
}
