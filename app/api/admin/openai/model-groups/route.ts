import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminPermission } from '@/lib/auth/admin-middleware'
import { toResponse } from './utils'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  const adminCheck = await checkAdminPermission()
  if (!adminCheck.success) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status || 401 }
    )
  }

  const groups = await prisma.aiModelGroup.findMany({
    orderBy: [{ usageScope: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json({
    groups: groups.map(toResponse),
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
    // Simple validation
    if (!body.name || !body.modelName) {
      return NextResponse.json(
        { error: '名称和模型名称必填' },
        { status: 400 }
      )
    }

    // Check name uniqueness
    const existing = await prisma.aiModelGroup.findUnique({
      where: { name: body.name },
    })
    if (existing) {
      return NextResponse.json(
        { error: '该名称已被使用' },
        { status: 400 }
      )
    }

    const group = await prisma.aiModelGroup.create({
      data: {
        name: body.name,
        modelName: body.modelName,
        modelType: body.modelType || 'CHAT',
        usageScope: body.usageScope || 'EXPLANATION',
        proxyUrl: body.proxyUrl || null,
        apiUrl: body.apiUrl || '',
        apiKey: body.apiKey || '',
        enableVision: body.enableVision || false,
        temperature: body.temperature !== null ? Number(body.temperature) : null,
        topP: body.topP !== null ? Number(body.topP) : null,
        presencePenalty: body.presencePenalty !== null ? Number(body.presencePenalty) : null,
        frequencyPenalty: body.frequencyPenalty !== null ? Number(body.frequencyPenalty) : null,
        extraBody: body.extraBody || null,
        systemPrompt: body.systemPrompt || null,
        userPrompt: body.userPrompt || null,
        includeQuestion: body.includeQuestion ?? true,
        includeOptions: body.includeOptions ?? true,
        priority: Number(body.priority || 0),
        isActive: true,
      },
    })

    return NextResponse.json({ group: toResponse(group) })
  } catch (error) {
    console.error('Create model group error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建模型组失败' },
      { status: 400 }
    )
  }
}
