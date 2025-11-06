import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// 验证管理员权限
function isAdmin(email?: string | null): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean)
  return email ? adminEmails.includes(email) : false
}

const UpdateAiModelGroupSchema = z.object({
  name: z.string().min(1).optional(),
  provider: z.enum(['OPENAI', 'DIFY', 'AZURE_OPENAI']).optional(),
  modelName: z.string().min(1).optional(),
  modelType: z.enum(['CHAT', 'IMAGE', 'EMBEDDING']).optional(),
  usageScope: z.enum(['EXPLANATION', 'ASSISTANT', 'BOTH']).optional(),
  apiUrl: z.string().url().optional(),
  apiKey: z.string().min(1).optional(),
  difyAppId: z.string().optional(),
  difyUser: z.string().optional(),
  proxyUrl: z.string().url().optional().or(z.literal('')),
  enableVision: z.boolean().optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  systemPrompt: z.string().optional(),
  userPrompt: z.string().optional(),
  includeQuestion: z.boolean().optional(),
  includeOptions: z.boolean().optional(),
  isActive: z.boolean().optional(),
  priority: z.number().int().optional(),
})

/**
 * GET /api/admin/ai-models/[id]
 * 获取单个 AI 模型配置（包含完整 API Key）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json(
      { error: '需要管理员权限' },
      { status: 403 }
    )
  }

  const { id } = await params

  try {
    const model = await prisma.aiModelGroup.findUnique({
      where: { id },
    })

    if (!model) {
      return NextResponse.json(
        { error: 'AI 模型配置不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({ model })
  } catch (error: any) {
    console.error('Get AI model error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get AI model' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/ai-models/[id]
 * 更新 AI 模型配置
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json(
      { error: '需要管理员权限' },
      { status: 403 }
    )
  }

  const { id } = await params

  try {
    const body = await request.json()

    // 验证数据
    const validatedData = UpdateAiModelGroupSchema.parse(body)

    // 检查配置是否存在
    const existing = await prisma.aiModelGroup.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'AI 模型配置不存在' },
        { status: 404 }
      )
    }

    // 如果要修改名称，检查唯一性
    if (validatedData.name && validatedData.name !== existing.name) {
      const nameExists = await prisma.aiModelGroup.findUnique({
        where: { name: validatedData.name },
      })

      if (nameExists) {
        return NextResponse.json(
          { error: '配置名称已存在' },
          { status: 400 }
        )
      }
    }

    // 更新配置
    const updateData: Record<string, unknown> = { ...validatedData }
    if (Object.prototype.hasOwnProperty.call(validatedData, 'proxyUrl')) {
      updateData.proxyUrl = validatedData.proxyUrl ? validatedData.proxyUrl : null
    }

    const updatedModel = await prisma.aiModelGroup.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      model: {
        ...updatedModel,
        apiKey: `${updatedModel.apiKey.slice(0, 8)}...${updatedModel.apiKey.slice(-4)}`,
      },
    })
  } catch (error: any) {
    console.error('Update AI model error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: `验证失败: ${error.errors.map((e: any) => e.message).join(', ')}` },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update AI model' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/ai-models/[id]
 * 删除 AI 模型配置
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json(
      { error: '需要管理员权限' },
      { status: 403 }
    )
  }

  const { id } = await params

  try {
    // 检查配置是否存在
    const existing = await prisma.aiModelGroup.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'AI 模型配置不存在' },
        { status: 404 }
      )
    }

    // 删除配置
    await prisma.aiModelGroup.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: '配置已删除',
    })
  } catch (error: any) {
    console.error('Delete AI model error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete AI model' },
      { status: 500 }
    )
  }
}
