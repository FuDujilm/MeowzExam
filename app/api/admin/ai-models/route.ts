import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// 验证管理员权限（临时实现，后续可从数据库读取角色）
function isAdmin(email?: string | null): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean)
  return email ? adminEmails.includes(email) : false
}

const AiModelGroupSchema = z.object({
  name: z.string().min(1, '名称不能为空'),
  provider: z.enum(['OPENAI', 'DIFY', 'AZURE_OPENAI']),
  modelName: z.string().min(1, '模型名称不能为空'),
  modelType: z.enum(['CHAT', 'IMAGE', 'EMBEDDING']),
  usageScope: z.enum(['EXPLANATION', 'ASSISTANT', 'BOTH']).default('EXPLANATION'),
  apiUrl: z.string().url('请输入有效的 API URL'),
  apiKey: z.string().min(1, 'API Key 不能为空'),
  difyAppId: z.string().optional(),
  difyUser: z.string().optional(),
  proxyUrl: z.string().url().optional().or(z.literal('')),
  enableVision: z.boolean().default(false),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  systemPrompt: z.string().optional(),
  userPrompt: z.string().optional(),
  includeQuestion: z.boolean().default(true),
  includeOptions: z.boolean().default(true),
  isActive: z.boolean().default(true),
  priority: z.number().int().default(0),
})

/**
 * GET /api/admin/ai-models
 * 获取所有 AI 模型配置
 */
export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json(
      { error: '需要管理员权限' },
      { status: 403 }
    )
  }

  try {
    const models = await prisma.aiModelGroup.findMany({
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    // 脱敏处理（隐藏完整的 API Key）
    const sanitizedModels = models.map(model => ({
      ...model,
      apiKey:
        model.apiKey.length > 12
          ? `${model.apiKey.slice(0, 8)}...${model.apiKey.slice(-4)}`
          : `${model.apiKey.slice(0, 3)}***${model.apiKey.slice(-2)}`,
    }))

    return NextResponse.json({ models: sanitizedModels })
  } catch (error: any) {
    console.error('Get AI models error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get AI models' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/ai-models
 * 创建新的 AI 模型配置
 */
export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json(
      { error: '需要管理员权限' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()

    // 验证数据
    const validatedData = AiModelGroupSchema.parse(body)

    // 检查名称唯一性
    const existing = await prisma.aiModelGroup.findUnique({
      where: { name: validatedData.name },
    })

    if (existing) {
      return NextResponse.json(
        { error: '配置名称已存在' },
        { status: 400 }
      )
    }

    // 创建配置
    const newModel = await prisma.aiModelGroup.create({
      data: {
        ...validatedData,
        proxyUrl: validatedData.proxyUrl ? validatedData.proxyUrl : null,
      },
    })

    return NextResponse.json({
      success: true,
      model: {
        ...newModel,
        apiKey: `${newModel.apiKey.slice(0, 8)}...${newModel.apiKey.slice(-4)}`,
      },
    })
  } catch (error: any) {
    console.error('Create AI model error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: `验证失败: ${error.errors.map((e: any) => e.message).join(', ')}` },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create AI model' },
      { status: 500 }
    )
  }
}
