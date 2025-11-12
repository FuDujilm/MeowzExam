import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

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
          theme: user.settings.theme,
          examType: user.settings.examType ?? 'A_CLASS',
          aiStylePresetId: user.settings.aiStylePresetId,
          aiStyleCustom: user.settings.aiStyleCustom ?? '',
        }
      : {
          enableWrongQuestionWeight: false,
          theme: 'light',
          examType: 'A_CLASS',
          aiStylePresetId: null,
          aiStyleCustom: '',
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
      theme,
      examType,
      aiStylePresetId,
      aiStyleCustom,
    } = body

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 更新用户基本信息
    await prisma.user.update({
      where: { id: user.id },
      data: { callsign: callsign || null }
    })

    // 更新或创建设置
    const normalizedExamType =
      typeof examType === 'string' && ['A_CLASS', 'B_CLASS', 'C_CLASS'].includes(examType)
        ? examType
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

    await prisma.userSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        enableWrongQuestionWeight: enableWrongQuestionWeight || false,
        theme: theme || 'light',
        examType: normalizedExamType,
        aiStylePresetId: resolvedPresetId,
        aiStyleCustom: customPrompt,
      },
      update: {
        enableWrongQuestionWeight: enableWrongQuestionWeight || false,
        theme: theme || 'light',
        examType: normalizedExamType,
        aiStylePresetId: resolvedPresetId,
        aiStyleCustom: customPrompt,
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
