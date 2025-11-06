'use server'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { getLibraryForUser } from '@/lib/question-library-service'

const DEFAULT_PRESETS = [
  {
    code: 'A_CLASS_STANDARD',
    name: 'A类操作技术能力考试',
    description: '考试40题、40分钟、30分合格，其中单选32题，多选8题。',
    durationMinutes: 40,
    totalQuestions: 40,
    passScore: 30,
    singleChoiceCount: 32,
    multipleChoiceCount: 8,
    trueFalseCount: 0,
  },
]

const LEGACY_TYPE_CODES = new Set(['A_CLASS', 'B_CLASS', 'C_CLASS'])

function normalizeCode(input: string | null | undefined) {
  return input ? input.trim().toUpperCase() : null
}

function buildQuestionFilter(libraryCode: string, questionType?: 'single_choice' | 'multiple_choice' | 'true_false') {
  const base: any = questionType ? { questionType } : {}

  if (!libraryCode) {
    return base
  }

  if (LEGACY_TYPE_CODES.has(libraryCode)) {
    return {
      ...base,
      OR: [
        { libraryCode, ...(questionType ? { questionType } : {}) },
        {
          libraryCode: null,
          type: libraryCode,
          ...(questionType ? { questionType } : {}),
        },
      ],
    }
  }

  return {
    ...base,
    libraryCode,
  }
}

function sampleIds<T>(items: T[], count: number) {
  if (count <= 0) return []
  const copied = [...items]
  for (let i = copied.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copied[i], copied[j]] = [copied[j], copied[i]]
  }
  return copied.slice(0, count)
}

function shuffleOptions(question: any) {
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

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录，无法开始模拟考试。' }, { status: 401 })
    }

    const body = await request.json()
    const libraryCodeParam = normalizeCode(body?.library ?? body?.type)
    const presetCodeParam = normalizeCode(body?.presetCode)

    if (!libraryCodeParam) {
      return NextResponse.json(
        { error: '缺少题库标识，请提供 library 字段。' },
        { status: 400 },
      )
    }

    const library = await getLibraryForUser({
      code: libraryCodeParam,
      userId: session.user.id,
      userEmail: session.user.email ?? null,
    })

    if (!library) {
      return NextResponse.json(
        { error: '未找到题库或您没有访问权限。' },
        { status: 404 },
      )
    }

    const presets = library.examPresets.length ? library.examPresets : DEFAULT_PRESETS
    const resolvedPreset =
      (presetCodeParam
        ? presets.find((preset) => preset.code.toUpperCase() === presetCodeParam)
        : null) ?? presets[0]

    if (!resolvedPreset) {
      return NextResponse.json(
        { error: '题库未配置考试预设，请联系管理员。' },
        { status: 400 },
      )
    }

    const singleChoiceIds = await prisma.question.findMany({
      where: buildQuestionFilter(library.code, 'single_choice'),
      select: { id: true },
    })
    const multipleChoiceIds = await prisma.question.findMany({
      where: buildQuestionFilter(library.code, 'multiple_choice'),
      select: { id: true },
    })
    const trueFalseIds = await prisma.question.findMany({
      where: buildQuestionFilter(library.code, 'true_false'),
      select: { id: true },
    })

    if (singleChoiceIds.length < resolvedPreset.singleChoiceCount) {
      return NextResponse.json(
        { error: `单选题数量不足，需要 ${resolvedPreset.singleChoiceCount} 题。` },
        { status: 400 },
      )
    }
    if (multipleChoiceIds.length < resolvedPreset.multipleChoiceCount) {
      return NextResponse.json(
        { error: `多选题数量不足，需要 ${resolvedPreset.multipleChoiceCount} 题。` },
        { status: 400 },
      )
    }
    if (
      (resolvedPreset.trueFalseCount ?? 0) > 0 &&
      trueFalseIds.length < (resolvedPreset.trueFalseCount ?? 0)
    ) {
      return NextResponse.json(
        { error: `判断题数量不足，需要 ${resolvedPreset.trueFalseCount} 题。` },
        { status: 400 },
      )
    }

    const selectedSingleIds = sampleIds(
      singleChoiceIds.map((item) => item.id),
      resolvedPreset.singleChoiceCount,
    )
    const selectedMultipleIds = sampleIds(
      multipleChoiceIds.map((item) => item.id),
      resolvedPreset.multipleChoiceCount,
    )
    const selectedTrueFalseIds = sampleIds(
      trueFalseIds.map((item) => item.id),
      resolvedPreset.trueFalseCount ?? 0,
    )

    const allQuestionIds = [
      ...selectedSingleIds,
      ...selectedMultipleIds,
      ...selectedTrueFalseIds,
    ]

    const questions = await prisma.question.findMany({
      where: {
        id: { in: allQuestionIds },
      },
      select: {
        id: true,
        uuid: true,
        externalId: true,
        questionType: true,
        difficulty: true,
        category: true,
        categoryCode: true,
        title: true,
        options: true,
        correctAnswers: true,
        hasImage: true,
        imagePath: true,
        imageAlt: true,
      },
    })

    const questionsMap = new Map(questions.map((question) => [question.id, question]))
    const orderedQuestions = allQuestionIds
      .map((id) => questionsMap.get(id))
      .filter(Boolean) as typeof questions

    const shuffledQuestions = [...orderedQuestions].sort(() => Math.random() - 0.5)

    const exam = await prisma.exam.create({
      data: {
        type: 'GENERIC',
        duration: resolvedPreset.durationMinutes,
        libraryId: library.id,
        libraryCode: library.code,
        presetCode: resolvedPreset.code,
      },
    })

    await prisma.examQuestion.createMany({
      data: shuffledQuestions.map((question, index) => ({
        examId: exam.id,
        questionId: question.id,
        orderIndex: index + 1,
      })),
    })

    const examResult = await prisma.examResult.create({
      data: {
        userId: session.user.id,
        examId: exam.id,
        score: 0,
        totalQuestions: shuffledQuestions.length,
        correctCount: 0,
        passed: false,
        answers: {},
        libraryCode: library.code,
        libraryName: library.name,
        presetCode: resolvedPreset.code,
      },
    })

    const questionsForClient = shuffledQuestions.map((question) => {
      const { shuffledOptions, answerMapping } = shuffleOptions(question)
      return {
        ...question,
        options: shuffledOptions,
        answerMapping,
      }
    })

    return NextResponse.json({
      examId: exam.id,
      examResultId: examResult.id,
      questions: questionsForClient,
      config: {
        duration: resolvedPreset.durationMinutes,
        totalQuestions: questionsForClient.length,
        passScore: resolvedPreset.passScore,
        singleChoice: resolvedPreset.singleChoiceCount,
        multipleChoice: resolvedPreset.multipleChoiceCount,
        trueFalse: resolvedPreset.trueFalseCount ?? 0,
      },
      preset: {
        code: resolvedPreset.code,
        name: resolvedPreset.name,
      },
      library: {
        code: library.code,
        name: library.name,
        shortName: library.shortName,
      },
      startTime: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Start exam error:', error)
    return NextResponse.json(
      { error: '启动模拟考试失败，请稍后再试。' },
      { status: 500 },
    )
  }
}
