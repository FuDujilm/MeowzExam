import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

const CALLSIGN_PATTERN = /^[A-Z0-9-]{3,12}$/

function normalizeCallsign(input: unknown): string | null {
  if (typeof input !== 'string') {
    return null
  }
  const compact = input.replace(/\s+/g, '').toUpperCase()
  if (!compact) {
    return null
  }
  return compact
}

/**
 * GET /api/user/settings - 获取用户设置
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { settings: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const settings = user.settings
      ? {
          enableWrongQuestionWeight: user.settings.enableWrongQuestionWeight,
          examType: user.settings.examType ?? 'A_CLASS',
          aiStylePresetId: user.settings.aiStylePresetId,
          aiStyleCustom: user.settings.aiStyleCustom ?? '',
          examQuestionPreference: user.settings.examQuestionPreference ?? 'SYSTEM_PRESET',
          dailyPracticeTarget: user.settings.dailyPracticeTarget ?? 10,
        }
      : {
          enableWrongQuestionWeight: false,
          examType: 'A_CLASS',
          aiStylePresetId: null,
          aiStyleCustom: '',
          examQuestionPreference: 'SYSTEM_PRESET' as const,
          dailyPracticeTarget: 10,
        }

    return NextResponse.json({
      user: {
        email: user.email,
        name: user.name,
        callsign: user.callsign,
      },
      settings,
    })
  } catch (error) {
    console.error('Get settings error:', error)
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/user/settings - 更新用户设置
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      callsign,
      enableWrongQuestionWeight,
      examType,
      aiStylePresetId,
      aiStyleCustom,
      examQuestionPreference,
      dailyPracticeTarget,
    } = body

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const normalizedCallsign = normalizeCallsign(callsign)
    let nextCallsign: string | null = null

    if (normalizedCallsign) {
      if (!CALLSIGN_PATTERN.test(normalizedCallsign)) {
        return NextResponse.json(
          { error: '呼号格式不正确，请使用 3-12 位字母、数字或短横线' },
          { status: 400 }
        )
      }

      const existingCallsign = await prisma.user.findFirst({
        where: {
          callsign: normalizedCallsign,
          NOT: { id: user.id },
        },
        select: { id: true },
      })

      if (existingCallsign) {
        return NextResponse.json(
          { error: '该呼号已被其他用户使用' },
          { status: 400 }
        )
      }

      nextCallsign = normalizedCallsign
    }

    // 更新用户基本信息
    await prisma.user.update({
      where: { id: user.id },
      data: { callsign: nextCallsign }
    })

    // Allow any non-empty string for examType (Library Code)
    // The previous validation restricted it to A/B/C_CLASS, which blocks custom libraries
    const normalizedExamType =
      typeof examType === 'string' && examType.trim().length > 0
        ? examType.trim()
        : 'A_CLASS'

    let resolvedPresetId: string | null = null
    const trimmedPresetId =
      typeof aiStylePresetId === 'string' && aiStylePresetId.trim().length > 0
        ? aiStylePresetId.trim()
        : null

    if (trimmedPresetId) {
      const preset = await prisma.aiStylePreset.findFirst({
        where: { id: trimmedPresetId, isActive: true },
        select: { id: true },
      })

      if (!preset) {
        return NextResponse.json(
          { error: '选择的提示词风格已失效或不存在' },
          { status: 400 }
        )
      }

      resolvedPresetId = preset.id
    }

    const customPrompt =
      typeof aiStyleCustom === 'string'
        ? aiStyleCustom.trim().slice(0, 1500) || null
        : null

    const normalizedPreference =
      typeof examQuestionPreference === 'string' && examQuestionPreference === 'FULL_RANDOM'
        ? 'FULL_RANDOM'
        : 'SYSTEM_PRESET'

    const normalizedDailyTargetCandidate = Number(dailyPracticeTarget)
    const normalizedDailyTarget = Number.isFinite(normalizedDailyTargetCandidate)
      ? Math.min(Math.max(Math.round(normalizedDailyTargetCandidate), 5), 50)
      : 10

    await prisma.userSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        enableWrongQuestionWeight: enableWrongQuestionWeight || false,
        examType: normalizedExamType,
        aiStylePresetId: resolvedPresetId,
        aiStyleCustom: customPrompt,
        examQuestionPreference: normalizedPreference,
        dailyPracticeTarget: normalizedDailyTarget,
      },
      update: {
        enableWrongQuestionWeight: enableWrongQuestionWeight || false,
        examType: normalizedExamType,
        aiStylePresetId: resolvedPresetId,
        aiStyleCustom: customPrompt,
        examQuestionPreference: normalizedPreference,
        dailyPracticeTarget: normalizedDailyTarget,
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
