import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import { checkAdminPermission } from '@/lib/auth/admin-middleware'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

async function fetchPresetById(id: string) {
  return prisma.aiStylePreset.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          userSettings: true,
        },
      },
    },
  })
}

function serializePreset(preset: Awaited<ReturnType<typeof fetchPresetById>> | null) {
  if (!preset) {
    return null
  }

  return {
    id: preset.id,
    name: preset.name,
    description: preset.description,
    prompt: preset.prompt,
    isDefault: preset.isDefault,
    isActive: preset.isActive,
    createdAt: preset.createdAt,
    updatedAt: preset.updatedAt,
    usageCount: preset._count.userSettings,
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const adminCheck = await checkAdminPermission()
  if (!adminCheck.success) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status || 401 }
    )
  }

  const { id: presetId } = await context.params
  if (!presetId) {
    return NextResponse.json({ error: '缺少预设 ID' }, { status: 400 })
  }

  const existing = await fetchPresetById(presetId)
  if (!existing) {
    return NextResponse.json({ error: '风格预设不存在' }, { status: 404 })
  }

  try {
    const body = await request.json()

    const name = typeof body.name === 'string' ? body.name.trim() : existing.name
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : existing.prompt
    const description = typeof body.description === 'string'
      ? body.description.trim()
      : existing.description
    const isDefault = body.isDefault === undefined ? existing.isDefault : Boolean(body.isDefault)
    const isActive = body.isActive === undefined ? existing.isActive : Boolean(body.isActive)

    if (!name) {
      return NextResponse.json({ error: '请填写预设名称' }, { status: 400 })
    }

    if (!prompt) {
      return NextResponse.json({ error: '请填写风格提示内容' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.aiStylePreset.updateMany({
          where: { id: { not: presetId } },
          data: { isDefault: false },
        })
      }

      await tx.aiStylePreset.update({
        where: { id: presetId },
        data: {
          name,
          description,
          prompt,
          isDefault,
          isActive,
        },
      })
    })

    const updated = await fetchPresetById(presetId)

    return NextResponse.json({
      preset: serializePreset(updated),
    })
  } catch (error: any) {
    console.error('[admin][ai-style-presets][PUT] failed:', error)

    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: '名称已存在，请使用其他名称' },
        { status: 400 },
      )
    }

    return NextResponse.json(
      { error: '更新风格预设失败' },
      { status: 500 },
    )
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const adminCheck = await checkAdminPermission()
  if (!adminCheck.success) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status || 401 }
    )
  }

  const { id: presetId } = await context.params
  if (!presetId) {
    return NextResponse.json({ error: '缺少预设 ID' }, { status: 400 })
  }

  try {
    await prisma.aiStylePreset.delete({
      where: { id: presetId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin][ai-style-presets][DELETE] failed:', error)
    return NextResponse.json(
      { error: '删除风格预设失败' },
      { status: 500 },
    )
  }
}
