import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@/lib/generated/prisma'
import { prisma } from '@/lib/db'
import { checkAdminPermission } from '@/lib/auth/admin-middleware'
import { createAuditLog } from '@/lib/audit'
import { renderLibraryDisplay } from '@/lib/question-library-service'
import { saveLibraryFile } from '@/lib/server/library-file-store'
import { normaliseExamPresetMetadata } from '@/lib/question-library-metadata'
import type {
  ExamPresetDefinition,
  QuestionItem,
  QuestionLibraryImportPayload,
} from '@/types/question-library'

const DISPLAY_TEMPLATE_DEFAULT = '{国家/地区}-{缩写}-{总题量}题'
const SUPPORTED_QUESTION_TYPES = new Set(['single_choice', 'multiple_choice', 'true_false'] as const)
const VISIBILITY_VALUES = new Set(['ADMIN_ONLY', 'PUBLIC', 'CUSTOM'] as const)
const MIGRATION_ERROR_CODES = new Set(['P2021', 'P2022'])

type Visibility = 'ADMIN_ONLY' | 'PUBLIC' | 'CUSTOM'

type NormalisedQuestion = {
  uuid: string
  externalId: string
  questionType: 'single_choice' | 'multiple_choice' | 'true_false'
  difficulty: string
  category: string
  categoryCode: string
  subSection: string | null
  title: string
  options: Prisma.InputJsonValue
  correctAnswers: string[]
  explanation: string | null
  tags: string[]
  hasImage: boolean
  imagePath: string | null
  imageAlt: string | null
  sourceId: string | null
  pageSection: string | null
  originalAnswer: string | null
}

type LibraryWithRelations = Prisma.QuestionLibraryGetPayload<{
  include: {
    examPresets: true
    access: {
      include: {
        user: {
          select: {
            id: true
            email: true
            name: true
          }
        }
      }
    }
    _count: {
      select: {
        files: true
      }
    }
  }
}>

const DEFAULT_PRESETS: ExamPresetDefinition[] = [
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
  {
    code: 'B_CLASS_STANDARD',
    name: 'B类操作技术能力考试',
    description: '考试60题、60分钟、45分合格，其中单选45题，多选15题。',
    durationMinutes: 60,
    totalQuestions: 60,
    passScore: 45,
    singleChoiceCount: 45,
    multipleChoiceCount: 15,
    trueFalseCount: 0,
  },
  {
    code: 'C_CLASS_STANDARD',
    name: 'C类操作技术能力考试',
    description: '考试90题、90分钟、70分合格，其中单选60题，多选30题。',
    durationMinutes: 90,
    totalQuestions: 90,
    passScore: 70,
    singleChoiceCount: 60,
    multipleChoiceCount: 30,
    trueFalseCount: 0,
  },
]

function isMigrationError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError &&
    MIGRATION_ERROR_CODES.has(error.code)
}

function normaliseCode(code: string | undefined, shortName: string): string {
  const fallback = shortName
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/-{2,}/g, '-')
    .replace(/^[_-]+|[_-]+$/g, '')
  const base = (code ?? fallback).trim()
  if (!base) {
    throw new Error('题库缺少可用的 code 或 shortName，用于生成唯一标识。')
  }
  return base.toUpperCase()
}

function parseDate(input?: string): Date | null {
  if (!input) return null
  const value = input.trim()
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`无法解析题库头文件中的日期：${value}`)
  }
  return parsed
}

function normaliseVisibility(primary?: string | null, fallback?: string | null): Visibility {
  const raw = (primary ?? fallback ?? 'ADMIN_ONLY').toString().trim().toUpperCase()
  if (!VISIBILITY_VALUES.has(raw as Visibility)) {
    throw new Error(`题库可见范围不合法：${primary ?? fallback}`)
  }
  return raw as Visibility
}

function ensureDisplayTemplate(template?: string | null): string {
  const value = template?.trim()
  if (!value) return DISPLAY_TEMPLATE_DEFAULT
  return value
}

function normalisePreset(input: ExamPresetDefinition, index: number): ExamPresetDefinition {
  const code = (input.code ?? '').toString().trim()
  const name = (input.name ?? '').toString().trim()
  if (!code || !name) {
    throw new Error(`第 ${index + 1} 个考试预设缺少 code 或 name。`)
  }

  const asInt = (value: unknown, field: string) => {
    const num = Number(value)
    if (!Number.isFinite(num) || num <= 0) {
      throw new Error(`考试预设 ${code} 的 ${field} 必须为正整数。`)
    }
    return Math.round(num)
  }

  const durationMinutes = asInt(input.durationMinutes, 'durationMinutes')
  const totalQuestions = asInt(input.totalQuestions, 'totalQuestions')
  const passScore = asInt(input.passScore, 'passScore')
  const singleChoiceCount = asInt(input.singleChoiceCount, 'singleChoiceCount')
  const multipleChoiceCount = asInt(input.multipleChoiceCount, 'multipleChoiceCount')
  const trueFalseCount = Math.max(
    0,
    Math.round(Number.isFinite(Number(input.trueFalseCount)) ? Number(input.trueFalseCount) : 0),
  )

  return {
    code: code.toUpperCase(),
    name,
    description: input.description,
    durationMinutes,
    totalQuestions,
    passScore,
    singleChoiceCount,
    multipleChoiceCount,
    trueFalseCount,
    metadata: normaliseExamPresetMetadata(input.metadata),
  }
}

function normaliseLibraryHeader(header: QuestionLibraryImportPayload['library']) {
  if (!header) {
    throw new Error('题库文件缺少 library 头文件。')
  }

  const warnings: string[] = []
  const uuid = (header.uuid ?? '').toString().trim()
  if (!uuid) {
    throw new Error('题库头文件缺少必填字段 uuid。')
  }

  const name = (header.name ?? '').toString().trim()
  if (!name) {
    throw new Error('题库头文件缺少必填字段 name。')
  }

  const shortName = (header.shortName ?? '').toString().trim()
  if (!shortName) {
    throw new Error('题库头文件缺少必填字段 shortName。')
  }

  const code = normaliseCode(
    typeof header.code === 'string' ? header.code : undefined,
    shortName,
  )
  if (!header.code) {
    warnings.push(`题库未提供 code，已根据 shortName 自动生成：${code}`)
  }

  const visibility = normaliseVisibility(
    typeof header.visibility === 'string' ? header.visibility : undefined,
    typeof header.access?.mode === 'string' ? header.access?.mode : undefined,
  )

  const rawAccessUsers = Array.isArray(header.access?.users) ? header.access?.users : []
  const emailCandidates = rawAccessUsers
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)

  const seenEmails = new Set<string>()
  const accessUsers: string[] = []
  for (const email of emailCandidates) {
    const lower = email.toLowerCase()
    if (seenEmails.has(lower)) continue
    seenEmails.add(lower)
    accessUsers.push(email)
  }

  if (visibility === 'CUSTOM' && accessUsers.length === 0) {
    warnings.push('题库可见范围为指定用户，但未提供任何用户邮箱。导入后仅管理员可见。')
  }

  const presetsInput = Array.isArray(header.presets) ? header.presets : []
  const presets = presetsInput.length
    ? presetsInput.map((preset, index) => normalisePreset(preset, index))
    : DEFAULT_PRESETS

  if (presetsInput.length === 0) {
    warnings.push('题库未提供考试预设，已自动应用默认 A/B/C 预设。')
  }

  return {
    library: {
      uuid,
      code,
      name,
      shortName,
      description: header.description?.toString().trim() || undefined,
      author: header.author?.toString().trim() || undefined,
      date: parseDate(header.date),
      sourceType: header.type != null ? header.type.toString() : undefined,
      region: header.region?.toString().trim() || undefined,
      version: header.version?.toString().trim() || undefined,
      displayTemplate: ensureDisplayTemplate(header.displayTemplate),
      metadata: typeof header.metadata === 'object' && header.metadata !== null ? header.metadata : null,
      visibility,
      accessUsers,
      presets,
    },
    warnings,
  }
}

function normaliseQuestion(
  raw: QuestionItem,
  libraryCode: string,
  index: number,
): NormalisedQuestion {
  const uuid = (raw.uuid ?? '').toString().trim()
  if (!uuid) {
    throw new Error(`题目缺少 uuid（第 ${index + 1} 题）。`)
  }

  const title = (raw.title ?? '').toString().trim()
  if (!title) {
    throw new Error(`题目缺少题干（第 ${index + 1} 题）。`)
  }

  const questionTypeRaw = (raw.questionType ?? (raw as any).type ?? '').toString().trim().toLowerCase()
  if (!SUPPORTED_QUESTION_TYPES.has(questionTypeRaw as any)) {
    throw new Error(`题目 ${uuid} 使用了不支持的题型：${raw.questionType ?? (raw as any).type}`)
  }

  if (!Array.isArray(raw.options) || raw.options.length === 0) {
    throw new Error(`题目 ${uuid} 缺少选项。`)
  }

  const optionLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  const normalisedOptions = raw.options.map((option, optionIndex) => {
    const text = (option.text ?? '').toString().trim()
    if (!text) {
      throw new Error(`题目 ${uuid} 的第 ${optionIndex + 1} 个选项缺少文本内容。`)
    }
    const id = (option.id ?? optionLetters[optionIndex] ?? `OPT_${optionIndex + 1}`).toString().trim()
    const isCorrect = Boolean(
      option.is_correct ??
        (option as any).isCorrect ??
        (Array.isArray(raw.correctAnswers) && raw.correctAnswers.includes(id)),
    )

    const normalised: Record<string, unknown> = {
      id,
      text,
      is_correct: isCorrect,
      isCorrect,
    }

    if (option.media && typeof option.media === 'object') {
      normalised.media = option.media
    }

    return normalised
  })

  const correctAnswers = Array.isArray(raw.correctAnswers) && raw.correctAnswers.length
    ? raw.correctAnswers.map((item) => item.toString())
    : normalisedOptions
        .filter((item) => Boolean(item.is_correct))
        .map((item) => item.id?.toString() ?? '')
        .filter(Boolean)

  if (correctAnswers.length === 0) {
    throw new Error(`题目 ${uuid} 未提供正确答案。`)
  }

  const categoryMain = (raw.category as any)?.main ?? {}
  const category = (categoryMain.name ?? (raw.category as any)?.name ?? '未分类').toString().trim() || '未分类'
  const categoryCode = (categoryMain.code ?? (raw.category as any)?.code ?? libraryCode).toString().trim() || libraryCode
  const subSection =
    (raw.category as any)?.subSection ??
    (raw.category as any)?.sub_section ??
    null

  const difficulty = (raw.difficulty ?? 'medium').toString().trim().toLowerCase()
  const difficultyValue = ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium'

  const tags = Array.isArray(raw.tags)
    ? raw.tags.map((tag) => tag.toString().trim()).filter(Boolean)
    : []

  const rawImage = (raw as any).image
  const rawPicture = typeof (raw as any).picture === 'string' ? (raw as any).picture.trim() : null
  const rawPictureAlt = typeof (raw as any).pictureAlt === 'string' ? (raw as any).pictureAlt.trim() : null
  const rawImagePath = typeof (raw as any).imagePath === 'string' ? (raw as any).imagePath.trim() : null
  const rawImageUrl = typeof (raw as any).imageUrl === 'string' ? (raw as any).imageUrl.trim() : null
  const nestedImageUrl = typeof rawImage?.url === 'string' ? rawImage.url.trim() : null
  const nestedImageFilename = typeof rawImage?.filename === 'string' ? rawImage.filename.trim() : null

  const imagePath =
    rawPicture ||
    rawImagePath ||
    rawImageUrl ||
    nestedImageUrl ||
    nestedImageFilename ||
    null

  const explicitHasImage = typeof (raw as any).hasImage === 'boolean' ? (raw as any).hasImage : undefined
  const nestedHasImage = typeof rawImage?.has_image === 'boolean' ? rawImage.has_image : undefined
  const hasImage = explicitHasImage ?? nestedHasImage ?? Boolean(imagePath)

  const imageAltCandidate =
    (raw as any).imageAlt ??
    rawPictureAlt ??
    rawImage?.alt_text ??
    rawImage?.alt ??
    null
  const imageAlt =
    imageAltCandidate != null
      ? imageAltCandidate.toString().trim() || null
      : null

  const sourceId = (raw.metadata as any)?.sourceId ?? (raw.metadata as any)?.source_id ?? raw.sourceId ?? null
  const pageSection = (raw.metadata as any)?.pageSection ?? (raw.metadata as any)?.page_section ?? raw.pageSection ?? null
  const originalAnswer = (raw.metadata as any)?.originalAnswer ?? (raw.metadata as any)?.original_answer ?? raw.originalAnswer ?? null

  const externalId = (raw.externalId ?? raw.id ?? uuid).toString()

  return {
    uuid,
    externalId,
    questionType: questionTypeRaw as NormalisedQuestion['questionType'],
    difficulty: difficultyValue,
    category,
    categoryCode: categoryCode || libraryCode,
    subSection: subSection ? subSection.toString() : null,
    title,
    options: normalisedOptions as unknown as Prisma.InputJsonValue,
    correctAnswers,
    explanation: typeof raw.explanation === 'string' ? raw.explanation : null,
    tags,
    hasImage,
    imagePath: imagePath ? imagePath.toString() : null,
    imageAlt: imageAlt ? imageAlt.toString() : null,
    sourceId: sourceId ? sourceId.toString() : null,
    pageSection: pageSection ? pageSection.toString() : null,
    originalAnswer: originalAnswer ? originalAnswer.toString() : null,
  }
}

function serialiseLibrary(
  library: LibraryWithRelations,
  options: { fileCount?: number } = {},
) {
  return {
    id: library.id,
    uuid: library.uuid,
    code: library.code,
    name: library.name,
    shortName: library.shortName,
    description: library.description,
    author: library.author,
    date: library.date?.toISOString() ?? null,
    sourceType: library.sourceType,
    region: library.region,
    version: library.version,
    displayTemplate: library.displayTemplate ?? DISPLAY_TEMPLATE_DEFAULT,
    metadata: library.metadata,
    visibility: library.visibility,
    totalQuestions: library.totalQuestions,
    singleChoiceCount: library.singleChoiceCount,
    multipleChoiceCount: library.multipleChoiceCount,
    trueFalseCount: library.trueFalseCount,
    totals: {
      totalQuestions: library.totalQuestions,
      singleChoiceCount: library.singleChoiceCount,
      multipleChoiceCount: library.multipleChoiceCount,
      trueFalseCount: library.trueFalseCount,
    },
    createdAt: library.createdAt.toISOString(),
    updatedAt: library.updatedAt.toISOString(),
    fileCount: options.fileCount ?? 0,
    displayLabel: renderLibraryDisplay(library),
    presets: library.examPresets.map((preset) => ({
      id: preset.id,
      code: preset.code,
      name: preset.name,
      description: preset.description,
      durationMinutes: preset.durationMinutes,
      totalQuestions: preset.totalQuestions,
      passScore: preset.passScore,
      singleChoiceCount: preset.singleChoiceCount,
      multipleChoiceCount: preset.multipleChoiceCount,
      trueFalseCount: preset.trueFalseCount,
      metadata: preset.metadata,
    })),
    access: library.access.map((item) => ({
      id: item.id,
      userId: item.userId,
      userEmail: item.userEmail,
      userName: item.user?.name ?? null,
    })),
  }
}

export async function GET() {
  try {
    const adminCheck = await checkAdminPermission()
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status ?? 401 },
      )
    }

    const libraries = await prisma.questionLibrary.findMany({
      orderBy: [{ updatedAt: 'desc' }],
      include: {
        examPresets: { orderBy: [{ createdAt: 'asc' }] },
        access: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            files: true,
          },
        },
      },
    })

    const fileCounts = await prisma.questionLibraryFile.groupBy({
      by: ['libraryId'],
      _count: { _all: true },
    })
    const countMap = new Map(fileCounts.map((item) => [item.libraryId, item._count._all]))

    return NextResponse.json({
      libraries: libraries.map((library) =>
        serialiseLibrary(library, { fileCount: countMap.get(library.id) ?? 0 }),
      ),
    })
  } catch (error: any) {
    if (isMigrationError(error)) {
      return NextResponse.json(
        {
          warning: '题库数据表尚未初始化，请先执行数据库迁移。',
          libraries: [],
        },
        { status: 200 },
      )
    }

    console.error('List question libraries error:', error)
    return NextResponse.json(
      { error: error?.message ?? '获取题库信息失败' },
      { status: 500 },
    )
  }
}

async function persistUploadedLibraryFile(options: {
  libraryId: string
  libraryCode: string
  fileContent: string
  originalName?: string
  uploadedBy?: string
  uploadedByEmail?: string
}) {
  try {
    const stored = await saveLibraryFile({
      libraryCode: options.libraryCode,
      fileContent: options.fileContent,
      originalName: options.originalName,
    })

    await prisma.questionLibraryFile.create({
      data: {
        libraryId: options.libraryId,
        filename: stored.filename,
        originalName: options.originalName ?? stored.filename,
        filepath: stored.filepath,
        fileSize: stored.fileSize,
        checksum: stored.checksum,
        uploadedBy: options.uploadedBy ?? null,
        uploadedByEmail: options.uploadedByEmail ?? null,
      },
    })
  } catch (error) {
    console.error('Failed to persist question library file:', error)
  }
}

export async function POST(request: NextRequest) {
  let adminUserId: string | undefined
  let adminEmail: string | undefined

  try {
    const adminCheck = await checkAdminPermission()
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status ?? 401 },
      )
    }
    adminUserId = adminCheck.user?.id ?? undefined
    adminEmail = adminCheck.user?.email ?? undefined

    const body = await request.json()
    const payload: QuestionLibraryImportPayload | undefined =
      body && typeof body === 'object' && 'payload' in body
        ? (body.payload as QuestionLibraryImportPayload)
        : body

    if (!payload || typeof payload !== 'object') {
      return NextResponse.json(
        { error: 'JSON 格式无效，导入失败。' },
        { status: 400 },
      )
    }

    const originalFileName =
      typeof body?.fileName === 'string' ? body.fileName : undefined
    const fileContent =
      typeof body?.fileContent === 'string'
        ? body.fileContent
        : JSON.stringify(payload, null, 2)

    const { library: header, warnings: headerWarnings } = normaliseLibraryHeader(payload.library)

    if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
      return NextResponse.json(
        { error: '题库文件缺少 questions 数组或题目数量为 0。' },
        { status: 400 },
      )
    }

    const stats = {
      total: payload.questions.length,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    }
    const warnings = [...headerWarnings]
    const libraryStats = {
      total: 0,
      singleChoice: 0,
      multipleChoice: 0,
      trueFalse: 0,
    }

    const normalisedQuestions: NormalisedQuestion[] = []
    const seenUuids = new Set<string>()

    payload.questions.forEach((question, index) => {
      try {
        const normalised = normaliseQuestion(question as QuestionItem, header.code, index)
        if (seenUuids.has(normalised.uuid)) {
          throw new Error(`题目 UUID 重复：${normalised.uuid}`)
        }
        seenUuids.add(normalised.uuid)
        normalisedQuestions.push(normalised)
      } catch (error: any) {
        stats.skipped += 1
        const message = error?.message ?? '未知错误'
        stats.errors.push(`第 ${index + 1} 题解析失败：${message}`)
      }
    })

    if (normalisedQuestions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: '题目解析失败，导入已取消。',
          stats,
          warnings,
        },
        { status: 400 },
      )
    }

    const accessEmails = header.visibility === 'CUSTOM' ? header.accessUsers : []
    const accessUsers = accessEmails.length
      ? await prisma.user.findMany({
          where: { email: { in: accessEmails } },
          select: { id: true, email: true, name: true },
        })
      : []

    const foundEmailSet = new Set(accessUsers.map((user) => user.email))
    const missingEmails = accessEmails.filter((email) => !foundEmailSet.has(email))
    if (missingEmails.length) {
      warnings.push(`以下指定用户未找到，将以邮箱占位：${missingEmails.join(', ')}`)
    }

    const existingQuestions = await prisma.question.findMany({
      where: {
        uuid: {
          in: normalisedQuestions.map((item) => item.uuid),
        },
      },
      select: {
        uuid: true,
      },
    })
    const existingUuids = new Set(existingQuestions.map((item) => item.uuid))

    const transactionResult = await prisma.$transaction(async (tx) => {
      const existingLibrary =
        await tx.questionLibrary.findUnique({
          where: { uuid: header.uuid },
          include: {
            examPresets: true,
            access: true,
          },
        }) ??
        await tx.questionLibrary.findUnique({
          where: { code: header.code },
          include: {
            examPresets: true,
            access: true,
          },
        })

      if (existingLibrary && existingLibrary.uuid !== header.uuid) {
        throw new Error(`题库代码 ${header.code} 已被其他题库占用，请修改 code 或 uuid。`)
      }

      const libraryRecord = existingLibrary
        ? await tx.questionLibrary.update({
            where: { id: existingLibrary.id },
            data: {
              uuid: header.uuid,
              code: header.code,
              name: header.name,
              shortName: header.shortName,
              description: header.description ?? null,
              author: header.author ?? null,
              date: header.date,
              sourceType: header.sourceType ?? null,
              region: header.region ?? null,
              version: header.version ?? null,
              displayTemplate: header.displayTemplate,
              metadata: header.metadata
                ? (header.metadata as Prisma.InputJsonValue)
                : Prisma.JsonNull,
              visibility: header.visibility,
            },
          })
        : await tx.questionLibrary.create({
            data: {
              uuid: header.uuid,
              code: header.code,
              name: header.name,
              shortName: header.shortName,
              description: header.description ?? null,
              author: header.author ?? null,
              date: header.date,
              sourceType: header.sourceType ?? null,
              region: header.region ?? null,
              version: header.version ?? null,
              displayTemplate: header.displayTemplate,
              metadata: header.metadata
                ? (header.metadata as Prisma.InputJsonValue)
                : Prisma.JsonNull,
              visibility: header.visibility,
            },
          })

      await tx.questionLibraryExamPreset.deleteMany({
        where: { libraryId: libraryRecord.id },
      })

      if (header.presets.length) {
        await tx.questionLibraryExamPreset.createMany({
          data: header.presets.map((preset) => ({
            id: randomUUID(),
            libraryId: libraryRecord.id,
            code: preset.code,
            name: preset.name,
            description: preset.description ?? null,
            durationMinutes: preset.durationMinutes,
            totalQuestions: preset.totalQuestions,
            passScore: preset.passScore,
            singleChoiceCount: preset.singleChoiceCount,
            multipleChoiceCount: preset.multipleChoiceCount,
            trueFalseCount: preset.trueFalseCount ?? 0,
            metadata: preset.metadata
              ? (preset.metadata as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          })),
        })
      }

      await tx.questionLibraryAccess.deleteMany({
        where: { libraryId: libraryRecord.id },
      })

      if (header.visibility === 'CUSTOM' && (accessUsers.length || missingEmails.length)) {
        const accessRecords = [
          ...accessUsers.map((user) => ({
            id: randomUUID(),
            libraryId: libraryRecord.id,
            userId: user.id,
            userEmail: user.email,
          })),
          ...missingEmails.map((email) => ({
            id: randomUUID(),
            libraryId: libraryRecord.id,
            userId: null,
            userEmail: email,
          })),
        ]

        await tx.questionLibraryAccess.createMany({
          data: accessRecords,
        })
      }

      for (const question of normalisedQuestions) {
        try {
          const data = {
            externalId: question.externalId,
            type: 'GENERIC' as const,
            questionType: question.questionType,
            difficulty: question.difficulty,
            category: question.category,
            categoryCode: question.categoryCode,
            subSection: question.subSection,
            title: question.title,
            options: question.options,
            correctAnswers: question.correctAnswers,
            explanation: question.explanation,
            tags: question.tags as unknown as Prisma.InputJsonValue,
            hasImage: question.hasImage,
            imagePath: question.imagePath,
            imageAlt: question.imageAlt,
            sourceId: question.sourceId,
            pageSection: question.pageSection,
            originalAnswer: question.originalAnswer,
            libraryId: libraryRecord.id,
            libraryUuid: libraryRecord.uuid,
            libraryCode: libraryRecord.code,
          }

          if (existingUuids.has(question.uuid)) {
            await tx.question.update({
              where: { uuid: question.uuid },
              data,
            })
            stats.updated += 1
          } else {
            await tx.question.create({
              data: {
                uuid: question.uuid,
                ...data,
              },
            })
            stats.imported += 1
            existingUuids.add(question.uuid)
          }

          libraryStats.total += 1
          if (question.questionType === 'single_choice') libraryStats.singleChoice += 1
          if (question.questionType === 'multiple_choice') libraryStats.multipleChoice += 1
          if (question.questionType === 'true_false') libraryStats.trueFalse += 1
        } catch (error: any) {
          stats.skipped += 1
          const message = error?.message ?? '未知错误'
          stats.errors.push(`题目 ${question.uuid} 导入失败：${message}`)
        }
      }

      await tx.questionLibrary.update({
        where: { id: libraryRecord.id },
        data: {
          totalQuestions: libraryStats.total,
          singleChoiceCount: libraryStats.singleChoice,
          multipleChoiceCount: libraryStats.multipleChoice,
          trueFalseCount: libraryStats.trueFalse,
        },
      })

      const refreshed = await tx.questionLibrary.findUnique({
        where: { id: libraryRecord.id },
        include: {
          examPresets: { orderBy: [{ createdAt: 'asc' }] },
          access: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              files: true,
            },
          },
        },
      })

      return refreshed!
    })
    const fileCount = await prisma.questionLibraryFile.count({
      where: { libraryId: transactionResult.id },
    })

    await createAuditLog({
      userId: adminUserId,
      action: 'QUESTION_LIBRARY_IMPORTED',
      entityType: 'QuestionLibrary',
      entityId: transactionResult.id,
      details: {
        code: transactionResult.code,
        uuid: transactionResult.uuid,
        name: transactionResult.name,
        totals: {
          total: libraryStats.total,
          singleChoice: libraryStats.singleChoice,
          multipleChoice: libraryStats.multipleChoice,
          trueFalse: libraryStats.trueFalse,
        },
        imported: stats.imported,
        updated: stats.updated,
        skipped: stats.skipped,
        warnings,
      },
    })

    const responseBody = {
      success: stats.errors.length === 0,
      message: `题库「${transactionResult.name}」导入完成。`,
      stats,
      warnings,
      library: serialiseLibrary(transactionResult, { fileCount }),
    }

    await persistUploadedLibraryFile({
      libraryId: transactionResult.id,
      libraryCode: transactionResult.code,
      fileContent,
      originalName: originalFileName,
      uploadedBy: adminUserId,
      uploadedByEmail: adminEmail,
    })

    return NextResponse.json(responseBody)
  } catch (error: any) {
    if (isMigrationError(error)) {
      return NextResponse.json(
        { error: '题库数据表尚未初始化，请先执行数据库迁移。' },
        { status: 503 },
      )
    }

    console.error('Import question library error:', error)

    try {
      if (adminUserId) {
        await createAuditLog({
          userId: adminUserId,
          action: 'QUESTION_LIBRARY_IMPORT_ERROR',
          details: {
            adminEmail,
            error: error?.message ?? 'Unknown error',
          },
        })
      }
    } catch (logError) {
      console.error('Failed to log question library import error:', logError)
    }

    return NextResponse.json(
      { error: error?.message ?? '题库导入失败。' },
      { status: 500 },
    )
  }
}
