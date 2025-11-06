import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@/lib/generated/prisma'
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
} from './utils'

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

    const name = validateName(body.name)
    const modelName = validateRequiredString(body.modelName, '模型名称')
    const modelType = normalizeModelType(body.modelType)
    const usageScope = normalizeUsageScope(body.usageScope)
    const apiUrl = validateRequiredString(body.apiUrl, 'API 地址')
    const apiKey = validateRequiredString(body.apiKey, 'API 密钥')
    const proxyUrl = typeof body.proxyUrl === 'string' && body.proxyUrl.trim()
      ? body.proxyUrl.trim()
      : null
    const enableVision = Boolean(body.enableVision)

    const temperature = validateNumericRange(body.temperature, 0, 2, 'Temperature')
    const topP = validateNumericRange(body.topP, 0, 1, 'Top P')
    const presencePenalty = validateNumericRange(body.presencePenalty, -2, 2, 'Presence Penalty')
    const frequencyPenalty = validateNumericRange(body.frequencyPenalty, -2, 2, 'Frequency Penalty')
    const parsedExtraBody = parseExtraBody(body.extraBody)
    const systemPrompt = normalizeOptionalString(body.systemPrompt)
    const userPrompt = normalizeOptionalString(body.userPrompt)
    const includeQuestion = body.includeQuestion === undefined ? true : Boolean(body.includeQuestion)
    const includeOptions = body.includeOptions === undefined ? true : Boolean(body.includeOptions)

    const priorityValue = body.priority === undefined || body.priority === null || body.priority === ''
      ? 0
      : Number(body.priority)
    if (Number.isNaN(priorityValue)) {
      throw new Error('优先级必须为数字')
    }
    const priority = Math.round(priorityValue)

    const isActive = Boolean(body.isActive)

    const created = await prisma.$transaction(async (tx) => {
      if (isActive) {
        await tx.aiModelGroup.updateMany({
          where: { usageScope, isActive: true },
          data: { isActive: false },
        })
      }

      return tx.aiModelGroup.create({
        data: {
          name,
          modelName,
          modelType,
          usageScope,
          proxyUrl,
          apiUrl,
          apiKey,
          enableVision,
          temperature: temperature ?? undefined,
          topP: topP ?? undefined,
          presencePenalty: presencePenalty ?? undefined,
          frequencyPenalty: frequencyPenalty ?? undefined,
          extraBody: parsedExtraBody === null ? Prisma.DbNull : parsedExtraBody,
          systemPrompt,
          userPrompt,
          includeQuestion,
          includeOptions,
          isActive,
          priority,
        },
      })
    })

    return NextResponse.json({
      success: true,
      group: toResponse(created),
    })
  } catch (error) {
    console.error('Create model group error:', error)

    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002') {
      return NextResponse.json(
        { error: '组名已存在，请使用其他名称' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建模型组失败' },
      { status: 400 }
    )
  }
}
