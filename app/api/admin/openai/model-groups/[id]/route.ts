import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/db'
import { checkAdminPermission } from '@/lib/auth/admin-middleware'
import {
  normalizeModelType,
  normalizeOptionalString,
  normalizeUsageScope,
  parseExtraBody,
  toResponse,
  validateName,
  validateNumericRange,
  validateRequiredString,
} from '../utils'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await checkAdminPermission()
  if (!adminCheck.success) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status || 401 }
    )
  }

  const { id } = await params

  const existing = await prisma.aiModelGroup.findUnique({
    where: { id },
  })

  if (!existing) {
    return NextResponse.json({ error: '模型组不存在' }, { status: 404 })
  }

  try {
    const body = (await request.json()) as Record<string, unknown>
    const data: Prisma.AiModelGroupUpdateInput = {}

    if (body.name !== undefined) {
      data.name = validateName(body.name)
    }

    if (body.modelName !== undefined) {
      data.modelName = validateRequiredString(body.modelName, '模型名称')
    }

    if (body.modelType !== undefined) {
      data.modelType = normalizeModelType(body.modelType)
    }

    let nextUsageScope = existing.usageScope
    if (body.usageScope !== undefined) {
      nextUsageScope = normalizeUsageScope(body.usageScope)
      data.usageScope = nextUsageScope
    }

    if (body.proxyUrl !== undefined) {
      const proxyValue = body.proxyUrl
      if (typeof proxyValue === 'string' && proxyValue.trim()) {
        data.proxyUrl = proxyValue.trim()
      } else {
        data.proxyUrl = null
      }
    }

    if (body.apiUrl !== undefined) {
      data.apiUrl = validateRequiredString(body.apiUrl, 'API 地址')
    }

    if (body.apiKey !== undefined) {
      const apiKeyValue = body.apiKey
      if (typeof apiKeyValue === 'string' && apiKeyValue.trim()) {
        data.apiKey = apiKeyValue.trim()
      }
    }

    if (body.enableVision !== undefined) {
      data.enableVision = Boolean(body.enableVision)
    }

    if (body.temperature !== undefined) {
      const temperature = validateNumericRange(body.temperature, 0, 2, 'Temperature')
      data.temperature = temperature ?? undefined
    }

    if (body.topP !== undefined) {
      const topP = validateNumericRange(body.topP, 0, 1, 'Top P')
      data.topP = topP ?? undefined
    }

    if (body.presencePenalty !== undefined) {
      const presencePenalty = validateNumericRange(body.presencePenalty, -2, 2, 'Presence Penalty')
      data.presencePenalty = presencePenalty ?? undefined
    }

    if (body.frequencyPenalty !== undefined) {
      const frequencyPenalty = validateNumericRange(body.frequencyPenalty, -2, 2, 'Frequency Penalty')
      data.frequencyPenalty = frequencyPenalty ?? undefined
    }

    if (body.extraBody !== undefined) {
      const parsedExtraBody = parseExtraBody(body.extraBody)
      data.extraBody = parsedExtraBody === null ? Prisma.DbNull : parsedExtraBody
    }

    if (body.systemPrompt !== undefined) {
      data.systemPrompt = normalizeOptionalString(body.systemPrompt)
    }

    if (body.userPrompt !== undefined) {
      data.userPrompt = normalizeOptionalString(body.userPrompt)
    }

    if (body.includeQuestion !== undefined) {
      data.includeQuestion = Boolean(body.includeQuestion)
    }

    if (body.includeOptions !== undefined) {
      data.includeOptions = Boolean(body.includeOptions)
    }

    let finalIsActive = existing.isActive
    if (body.isActive !== undefined) {
      finalIsActive = Boolean(body.isActive)
      data.isActive = finalIsActive
    }

    if (body.priority !== undefined) {
      const priorityValue = Number(body.priority)
      if (Number.isNaN(priorityValue)) {
        throw new Error('优先级必须为数字')
      }
      data.priority = Math.round(priorityValue)
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: true, group: toResponse(existing) })
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (finalIsActive) {
        await tx.aiModelGroup.updateMany({
          where: {
            usageScope: nextUsageScope,
            isActive: true,
            NOT: { id },
          },
          data: { isActive: false },
        })
      }

      return tx.aiModelGroup.update({
        where: { id },
        data,
      })
    })

    return NextResponse.json({
      success: true,
      group: toResponse(updated),
    })
  } catch (error) {
    console.error('Update model group error:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: '组名已存在，请使用其他名称' }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新模型组失败' },
      { status: 400 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await checkAdminPermission()
  if (!adminCheck.success) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status || 401 }
    )
  }

  const { id } = await params

  try {
    await prisma.aiModelGroup.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: '模型组不存在' }, { status: 404 })
    }

    console.error('Delete model group error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除模型组失败' },
      { status: 400 }
    )
  }
}
