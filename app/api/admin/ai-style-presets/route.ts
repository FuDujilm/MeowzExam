import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import { checkAdminPermission } from '@/lib/auth/admin-middleware'

function serializePreset(preset: Awaited<ReturnType<typeof fetchPresetById>>) {
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

export async function GET(_request: NextRequest) {
  const adminCheck = await checkAdminPermission()
  if (!adminCheck.success) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status || 401 }
    )
  }

  const presets = await prisma.aiStylePreset.findMany({
    orderBy: [
      { isDefault: 'desc' },
      { createdAt: 'desc' },
    ],
    include: {
      _count: {
        select: {
          userSettings: true,
        },
      },
    },
  })

  return NextResponse.json({
    presets: presets.map((preset) => serializePreset(preset)),
  })
}

export async function POST(request: NextRequest) {
  const adminCheck = await checkAdminPermission()
  if (!adminCheck.success) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status || 401 }
    )
  }

  try {
    const body = await request.json()

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : null
    const isDefault = Boolean(body.isDefault)
    const isActive = body.isActive === undefined ? true : Boolean(body.isActive)

    if (!name) {
      return NextResponse.json({ error: '请填写预设名称' }, { status: 400 })
    }

    if (!prompt) {
      return NextResponse.json({ error: '请填写风格提示内容' }, { status: 400 })
    }

    const created = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.aiStylePreset.updateMany({
          data: { isDefault: false },
        })
      }

      return tx.aiStylePreset.create({
        data: {
          name,
          description,
          prompt,
          isDefault,
          isActive,
        },
      })
    })

    const presetWithCount = await fetchPresetById(created.id)

    return NextResponse.json(
      { preset: serializePreset(presetWithCount) },
      { status: 201 },
    )
  } catch (error: any) {
    console.error('[admin][ai-style-presets][POST] failed:', error)

    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: '名称已存在，请使用其他名称' },
        { status: 400 },
      )
    }

    return NextResponse.json(
      { error: '创建风格预设失败' },
      { status: 500 },
    )
  }
}
