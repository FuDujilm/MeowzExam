import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminPermission } from '@/lib/auth/admin-middleware'

type PresetInput = {
  id?: string
  code: string
  name: string
  description?: string | null
  durationMinutes: number
  totalQuestions: number
  passScore: number
  singleChoiceCount: number
  multipleChoiceCount: number
  trueFalseCount?: number
}

function normalizePreset(input: PresetInput, index: number) {
  const code = (input.code ?? '').toString().trim().toUpperCase()
  const name = (input.name ?? '').toString().trim()
  if (!code) {
    throw new Error(`第 ${index + 1} 个预设缺少 code。`)
  }
  if (!name) {
    throw new Error(`第 ${index + 1} 个预设缺少名称。`)
  }

  const ensurePositive = (value: unknown, field: string, allowZero = false) => {
    const num = Number(value)
    if (!Number.isFinite(num) || num < 0) {
      throw new Error(`${field} 必须为非负整数。`)
    }
    if (!allowZero && num === 0) {
      throw new Error(`${field} 必须大于 0。`)
    }
    return Math.round(num)
  }

  return {
    id: input.id,
    code,
    name,
    description: input.description ?? null,
    durationMinutes: ensurePositive(input.durationMinutes, '考试时长'),
    totalQuestions: ensurePositive(input.totalQuestions, '题目数量'),
    passScore: ensurePositive(input.passScore, '及格分'),
    singleChoiceCount: ensurePositive(input.singleChoiceCount, '单选题数量', true),
    multipleChoiceCount: ensurePositive(input.multipleChoiceCount, '多选题数量', true),
    trueFalseCount: ensurePositive(input.trueFalseCount ?? 0, '判断题数量', true),
  }
}

function serializePreset(preset: PresetInput & { id: string }) {
  return {
    id: preset.id,
    code: preset.code,
    name: preset.name,
    description: preset.description ?? null,
    durationMinutes: preset.durationMinutes,
    totalQuestions: preset.totalQuestions,
    passScore: preset.passScore,
    singleChoiceCount: preset.singleChoiceCount,
    multipleChoiceCount: preset.multipleChoiceCount,
    trueFalseCount: preset.trueFalseCount ?? 0,
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ libraryId: string }> },
) {
  const { libraryId } = await params
  const adminCheck = await checkAdminPermission()
  if (!adminCheck.success) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status ?? 401 },
    )
  }

  try {
    const body = await request.json()
    const presetsInput = Array.isArray(body?.presets) ? body.presets : []
    if (!presetsInput.length) {
      return NextResponse.json(
        { error: '请至少提供一个考试预设。' },
        { status: 400 },
      )
    }

    const normalized = presetsInput.map((preset: PresetInput, index: number) =>
      normalizePreset(preset, index),
    )

    const seenCodes = new Set<string>()
    for (const preset of normalized) {
      if (seenCodes.has(preset.code)) {
        throw new Error(`考试预设 code ${preset.code} 重复。`)
      }
      seenCodes.add(preset.code)
    }

    const result = await prisma.$transaction(async (tx) => {
      const library = await tx.questionLibrary.findUnique({
        where: { id: libraryId },
        include: { examPresets: true },
      })
      if (!library) {
        return null
      }

      const existingById = new Map(
        library.examPresets.map((preset) => [preset.id, preset]),
      )

      const keepIds = new Set<string>()
      const updatedPresets = []
      for (const preset of normalized) {
        if (preset.id && existingById.has(preset.id)) {
          const updated = await tx.questionLibraryExamPreset.update({
            where: { id: preset.id },
            data: {
              code: preset.code,
              name: preset.name,
              description: preset.description,
              durationMinutes: preset.durationMinutes,
              totalQuestions: preset.totalQuestions,
              passScore: preset.passScore,
              singleChoiceCount: preset.singleChoiceCount,
              multipleChoiceCount: preset.multipleChoiceCount,
              trueFalseCount: preset.trueFalseCount ?? 0,
            },
          })
          keepIds.add(updated.id)
          updatedPresets.push(updated)
        } else {
          const created = await tx.questionLibraryExamPreset.create({
            data: {
              libraryId,
              code: preset.code,
              name: preset.name,
              description: preset.description,
              durationMinutes: preset.durationMinutes,
              totalQuestions: preset.totalQuestions,
              passScore: preset.passScore,
              singleChoiceCount: preset.singleChoiceCount,
              multipleChoiceCount: preset.multipleChoiceCount,
              trueFalseCount: preset.trueFalseCount ?? 0,
            },
          })
          keepIds.add(created.id)
          updatedPresets.push(created)
        }
      }

      const obsoleteIds = library.examPresets
        .filter((preset) => !keepIds.has(preset.id))
        .map((preset) => preset.id)

      if (obsoleteIds.length) {
        await tx.questionLibraryExamPreset.deleteMany({
          where: { id: { in: obsoleteIds } },
        })
      }

      return updatedPresets
    })

    if (!result) {
      return NextResponse.json(
        { error: '未找到题库。' },
        { status: 404 },
      )
    }

    const sorted = result.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    )

    return NextResponse.json({
      presets: sorted.map((preset) =>
        serializePreset({
          ...preset,
          trueFalseCount: preset.trueFalseCount ?? 0,
        }),
      ),
      success: true,
    })
  } catch (error: any) {
    console.error('Update exam presets error:', error)
    return NextResponse.json(
      { error: error?.message ?? '保存考试预设失败。' },
      { status: 500 },
    )
  }
}
