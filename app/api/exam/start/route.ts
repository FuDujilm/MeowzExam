'use server'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { Prisma } from '@/lib/generated/prisma'
import type { QuestionType as PrismaQuestionType } from '@/lib/generated/prisma'
import { prisma } from '@/lib/db'
import { getLibraryForUser } from '@/lib/question-library-service'
import type { ExamPresetQuestionStrategy } from '@/types/question-library'

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

const LEGACY_TYPE_CODES = new Set<PrismaQuestionType>([
  'A_CLASS',
  'B_CLASS',
  'C_CLASS',
] as PrismaQuestionType[])

function isLegacyLibraryType(value: string): value is PrismaQuestionType {
  return LEGACY_TYPE_CODES.has(value as PrismaQuestionType)
}

type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false'

type QuestionFilterOptions = {
  questionType?: QuestionType
  tags?: string[]
  requireImage?: boolean
  excludeIds?: string[]
}

function normalizeCode(input: string | null | undefined) {
  return input ? input.trim().toUpperCase() : null
}

function buildQuestionFilter(libraryCode: string, options: QuestionFilterOptions = {}) {
  const { questionType, tags, requireImage, excludeIds } = options
  const additionalConditions: Prisma.QuestionWhereInput[] = []

  if (tags?.length) {
    additionalConditions.push({
      OR: tags.map((tag) => ({
        tags: {
          array_contains: [tag] as Prisma.JsonArray,
        },
      })),
    })
  }

  if (requireImage) {
    additionalConditions.push({ hasImage: true })
  }

  if (excludeIds?.length) {
    additionalConditions.push({ id: { notIn: excludeIds } })
  }

  const baseCondition: Prisma.QuestionWhereInput = questionType ? { questionType } : {}

  let filter: Prisma.QuestionWhereInput
  if (!libraryCode) {
    filter = baseCondition
  } else if (isLegacyLibraryType(libraryCode)) {
    filter = {
      OR: [
        { libraryCode, ...baseCondition },
        {
          libraryCode: null,
          type: libraryCode,
          ...baseCondition,
        },
      ],
    }
  } else {
    filter = {
      ...baseCondition,
      libraryCode,
    }
  }

  if (additionalConditions.length) {
    filter = { ...filter, AND: additionalConditions }
  }

  return filter
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

type SelectedQuestion = {
  id: string
  questionType: QuestionType
}

async function selectQuestionsWithTagRules(options: {
  libraryCode: string
  preset: {
    totalQuestions: number
    singleChoiceCount: number
    multipleChoiceCount: number
    trueFalseCount?: number | null
  }
  strategy: ExamPresetQuestionStrategy
}) {
  const { libraryCode, preset, strategy } = options
  const ruleSelections: SelectedQuestion[][] = []
  const selectedIds = new Set<string>()

  for (const rule of strategy.rules) {
    const typeFilter =
      rule.questionType && rule.questionType !== 'any'
        ? (rule.questionType as QuestionType)
        : undefined
    const filter = buildQuestionFilter(libraryCode, {
      questionType: typeFilter,
      tags: rule.tags,
      requireImage: rule.requireImage,
      excludeIds: Array.from(selectedIds),
    })
    const candidates = await prisma.question.findMany({
      where: filter,
      select: { id: true, questionType: true },
    })
    if (candidates.length < rule.count) {
      const label = rule.label || (rule.tags?.join(' / ') ?? '指定标签')
      throw new Error(`标签组「${label}」匹配的题目仅有 ${candidates.length} 题，无法抽取 ${rule.count} 题。`)
    }
    const sampled = sampleIds(candidates, rule.count) as SelectedQuestion[]
    ruleSelections.push(sampled)
    sampled.forEach((question) => selectedIds.add(question.id))
  }

  const selectedByRules = ruleSelections.flat()
  const typeCounts = {
    single_choice: 0,
    multiple_choice: 0,
    true_false: 0,
  }
  selectedByRules.forEach((question) => {
    if (question.questionType === 'single_choice') typeCounts.single_choice += 1
    else if (question.questionType === 'multiple_choice') typeCounts.multiple_choice += 1
    else if (question.questionType === 'true_false') typeCounts.true_false += 1
  })

  const ensureNotExceeded = (type: keyof typeof typeCounts, limit: number) => {
    if (typeCounts[type] > limit) {
      const label =
        type === 'single_choice'
          ? '单选题'
          : type === 'multiple_choice'
            ? '多选题'
            : '判断题'
      throw new Error(`标签规则抽取的${label}数量 (${typeCounts[type]}) 已超过预设数量 ${limit}。`)
    }
  }

  ensureNotExceeded('single_choice', preset.singleChoiceCount)
  ensureNotExceeded('multiple_choice', preset.multipleChoiceCount)
  ensureNotExceeded('true_false', preset.trueFalseCount ?? 0)

  const extraSelections: SelectedQuestion[] = []

  const addRemaining = async (
    questionType: QuestionType,
    required: number,
    label: string,
  ) => {
    if (required <= 0) return
    const filter = buildQuestionFilter(libraryCode, {
      questionType,
      excludeIds: Array.from(selectedIds),
    })
    const candidates = await prisma.question.findMany({
      where: filter,
      select: { id: true },
    })
    if (candidates.length < required) {
      throw new Error(`${label}数量不足，仍需 ${required} 题。`)
    }
    const sampled = sampleIds(candidates.map((candidate) => candidate.id), required)
    sampled.forEach((id) => {
      selectedIds.add(id)
      extraSelections.push({ id, questionType })
    })
  }

  await addRemaining('single_choice', preset.singleChoiceCount - typeCounts.single_choice, '单选题')
  await addRemaining('multiple_choice', preset.multipleChoiceCount - typeCounts.multiple_choice, '多选题')
  await addRemaining('true_false', (preset.trueFalseCount ?? 0) - typeCounts.true_false, '判断题')

  const totalSelected = selectedByRules.length + extraSelections.length
  const remainingForTotal = preset.totalQuestions - totalSelected
  if (remainingForTotal > 0) {
    const extraFilter = buildQuestionFilter(libraryCode, {
      excludeIds: Array.from(selectedIds),
    })
    const candidates = await prisma.question.findMany({
      where: extraFilter,
      select: { id: true, questionType: true },
    })
    if (candidates.length < remainingForTotal) {
      throw new Error(`题库题量不足，无法补全剩余 ${remainingForTotal} 题。`)
    }
    const sampled = sampleIds(candidates, remainingForTotal) as SelectedQuestion[]
    sampled.forEach((question) => {
      selectedIds.add(question.id)
      extraSelections.push(question)
    })
  }

  const combined = [...selectedByRules, ...extraSelections]
  if (combined.length !== preset.totalQuestions) {
    throw new Error('题型配置与总题量不一致，请检查考试预设。')
  }

  let orderedSelections: SelectedQuestion[] = combined
  let preserveOrder = false
  if (strategy.order === 'FIXED') {
    const extrasShuffled = extraSelections.length
      ? (sampleIds(extraSelections, extraSelections.length) as SelectedQuestion[])
      : []
    orderedSelections = [...selectedByRules, ...extrasShuffled]
    preserveOrder = true
  }

  return {
    ids: orderedSelections.map((item) => item.id),
    preserveOrder,
  }
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

    const userSettingsRecord = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
      select: { examQuestionPreference: true },
    })
    const userPreference =
      userSettingsRecord?.examQuestionPreference === 'FULL_RANDOM'
        ? 'FULL_RANDOM'
        : 'SYSTEM_PRESET'

    const strategy = (resolvedPreset as any)?.metadata?.questionStrategy as
      | ExamPresetQuestionStrategy
      | undefined
    const shouldUseTagStrategy =
      userPreference !== 'FULL_RANDOM' &&
      strategy?.mode === 'TAG_RULES' &&
      Array.isArray(strategy.rules) &&
      strategy.rules.length > 0

    let allQuestionIds: string[] = []
    let preserveOrder = false

    if (shouldUseTagStrategy) {
      try {
        const selection = await selectQuestionsWithTagRules({
          libraryCode: library.code,
          preset: resolvedPreset,
          strategy,
        })
        allQuestionIds = selection.ids
        preserveOrder = selection.preserveOrder
      } catch (error: any) {
        console.error('Tag strategy selection error:', error)
        return NextResponse.json(
          { error: error?.message ?? '无法根据标签抽题，请稍后再试。' },
          { status: 400 },
        )
      }
    } else {
      const singleChoiceIds = await prisma.question.findMany({
        where: buildQuestionFilter(library.code, { questionType: 'single_choice' }),
        select: { id: true },
      })
      const multipleChoiceIds = await prisma.question.findMany({
        where: buildQuestionFilter(library.code, { questionType: 'multiple_choice' }),
        select: { id: true },
      })
      const trueFalseIds = await prisma.question.findMany({
        where: buildQuestionFilter(library.code, { questionType: 'true_false' }),
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

      allQuestionIds = [
        ...selectedSingleIds,
        ...selectedMultipleIds,
        ...selectedTrueFalseIds,
      ]
    }

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

    const shuffledQuestions = preserveOrder
      ? orderedQuestions
      : [...orderedQuestions].sort(() => Math.random() - 0.5)

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
      const originalCorrectAnswers = Array.isArray(question.correctAnswers)
        ? (question.correctAnswers as string[])
        : []
      const reverseMapping = Object.fromEntries(
        Object.entries(answerMapping).map(([newId, originalId]) => [originalId, newId]),
      )
      const shuffledCorrectAnswers = originalCorrectAnswers.map(
        (ans) => reverseMapping[ans] || ans,
      )
      return {
        ...question,
        options: shuffledOptions,
        correctAnswers: shuffledCorrectAnswers,
        originalCorrectAnswers,
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
