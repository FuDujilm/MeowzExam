import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { AiExplainSchema, calculateWilsonScore } from '@/lib/ai/schema'
import { createAuditLog } from '@/lib/audit'
import { resolveRequestUser } from '@/lib/auth/api-auth'

export const dynamic = 'force-dynamic'

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
} as const

/**
 * POST /api/questions/[id]/explanations
 * 用户提交解析
 *
 * Body:
 * - content: string | StructuredContent
 * - format: 'text' | 'structured'
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedUser = await resolveRequestUser(request)

  if (!resolvedUser?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { id } = await params
  const body = await request.json()
  const { content, format = 'text' } = body

  if (!content) {
    return NextResponse.json(
      { error: 'Missing content' },
      { status: 400 }
    )
  }

  try {
    // 检查题目是否存在
    const question = await prisma.question.findUnique({
      where: { id },
    })

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404, headers: noStoreHeaders }
      )
    }

    // 校验结构化内容
    let validatedContent = content
    if (format === 'structured') {
      try {
        validatedContent = AiExplainSchema.parse(content)
      } catch (error: any) {
        return NextResponse.json(
          { error: `解析格式不正确: ${error.message}` },
          { status: 400 }
        )
      }
    } else {
      // 文本格式：校验最小长度
      if (typeof content !== 'string' || content.trim().length < 20) {
        return NextResponse.json(
          { error: '解析内容至少需要20个字符' },
          { status: 400 }
        )
      }
      // 文本格式直接存储为字符串
      validatedContent = content.trim()
    }

    // 检查用户是否已提交过解析（每题每用户只能提交一次）
    const existingExplanation = await prisma.explanation.findFirst({
      where: {
        questionId: id,
        createdById: resolvedUser.id,
        type: 'USER',
      },
    })

    if (existingExplanation) {
      return NextResponse.json(
        { error: '您已经为这道题提交过解析，可以通过编辑功能修改' },
        { status: 400 }
      )
    }

    // 创建用户解析
    const newExplanation = await prisma.explanation.create({
      data: {
        questionId: id,
        type: 'USER',
        contentJson: validatedContent,
        lang: 'zh-CN',
        templateVer: '1.0.0',
        status: 'PUBLISHED', // 用户解析直接发布，但可被举报
        createdById: resolvedUser.id,
        wilsonScore: calculateWilsonScore(0, 0),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // 审计日志
    await createAuditLog({
      userId: resolvedUser.id,
      action: 'MANUAL_EXPLANATION_UPDATED',
      entityType: 'Question',
      entityId: id,
      details: {
        explanationId: newExplanation.id,
        format,
        type: 'USER',
      },
    })

    return NextResponse.json({
      success: true,
      explanation: {
        id: newExplanation.id,
        type: newExplanation.type,
        content: newExplanation.contentJson,
        format,
        upvotes: newExplanation.upvotes,
        downvotes: newExplanation.downvotes,
        wilsonScore: newExplanation.wilsonScore,
        createdBy: newExplanation.createdBy
          ? {
              id: newExplanation.createdBy.id,
              name: newExplanation.createdBy.name || newExplanation.createdBy.email,
            }
          : null,
        createdAt: newExplanation.createdAt,
      },
    })
  } catch (error: any) {
    console.error('Submit explanation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to submit explanation' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/questions/[id]/explanations
 * 更新用户已提交的解析（仅限本人、USER 类型）
 *
 * Body:
 * - explanationId: string
 * - content: string | StructuredContent
 * - format: 'text' | 'structured'
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedUser = await resolveRequestUser(request)

  if (!resolvedUser?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { id } = await params
  const body = await request.json()
  const { explanationId, content, format = 'text' } = body

  if (!explanationId) {
    return NextResponse.json(
      { error: 'Missing explanationId' },
      { status: 400 }
    )
  }

  if (!content) {
    return NextResponse.json(
      { error: 'Missing content' },
      { status: 400 }
    )
  }

  try {
    // 校验结构化内容
    let validatedContent = content
    if (format === 'structured') {
      try {
        validatedContent = AiExplainSchema.parse(content)
      } catch (error: any) {
        return NextResponse.json(
          { error: `解析格式不正确: ${error.message}` },
          { status: 400 }
        )
      }
    } else {
      if (typeof content !== 'string' || content.trim().length < 20) {
        return NextResponse.json(
          { error: '解析内容至少需要20个字符' },
          { status: 400 }
        )
      }
      validatedContent = content.trim()
    }

    const existing = await prisma.explanation.findFirst({
      where: {
        id: explanationId,
        questionId: id,
        createdById: resolvedUser.id,
        type: 'USER',
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: '解析不存在或无权限' },
        { status: 404 }
      )
    }

    const updated = await prisma.explanation.update({
      where: { id: existing.id },
      data: {
        contentJson: validatedContent,
        updatedAt: new Date(),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    await createAuditLog({
      userId: resolvedUser.id,
      action: 'MANUAL_EXPLANATION_UPDATED',
      entityType: 'Question',
      entityId: id,
      details: {
        explanationId: updated.id,
        format,
        type: 'USER',
      },
    })

    return NextResponse.json({
      success: true,
      explanation: {
        id: updated.id,
        type: updated.type,
        content: updated.contentJson,
        format,
        upvotes: updated.upvotes,
        downvotes: updated.downvotes,
        wilsonScore: updated.wilsonScore,
        createdBy: updated.createdBy
          ? {
              id: updated.createdBy.id,
              name: updated.createdBy.name || updated.createdBy.email,
            }
          : null,
        createdAt: updated.createdAt,
      },
    })
  } catch (error: any) {
    console.error('Update explanation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update explanation' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/questions/[id]/explanations
 * 获取题目的所有解析（官方+AI+用户，按优先级排序）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const resolvedUser = await resolveRequestUser(request)
  const { id } = await params

  try {
    // 获取题目基本信息
    const question = await prisma.question.findUnique({
      where: { id },
      select: {
        id: true,
        explanation: true, // 官方解析（旧格式）
        aiExplanation: true, // AI解析（旧格式，向后兼容）
      },
    })

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    // 获取结构化解析（新格式）
    const explanations = await prisma.explanation.findMany({
      where: {
        questionId: id,
        status: 'PUBLISHED',
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        votes: resolvedUser?.id
          ? {
              where: {
                userId: resolvedUser.id,
              },
              select: {
                vote: true,
              },
            }
          : false,
      },
      orderBy: [
        { type: 'asc' }, // OFFICIAL < USER < AI
        { wilsonScore: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    // 构造响应
    const response: any = {
      questionId: id,
      explanations: [],
    }

    // 1. 添加官方解析（优先级最高）
    if (question.explanation) {
      response.explanations.push({
        id: 'legacy-official',
        type: 'OFFICIAL',
        content: question.explanation,
        format: 'text',
        upvotes: 0,
        downvotes: 0,
        wilsonScore: 1,
        userVote: null,
        canEdit: false,
        createdAt: null,
      })
    }

    // 2. 添加结构化解析
    explanations.forEach((exp) => {
      // 判断是否为有效的结构化内容
      const isStructured = exp.contentJson &&
        typeof exp.contentJson === 'object' &&
        !Array.isArray(exp.contentJson) &&
        'summary' in exp.contentJson &&
        'answer' in exp.contentJson

      response.explanations.push({
        id: exp.id,
        type: exp.type,
        content: exp.contentJson,
        format: isStructured ? 'structured' : 'text',
        upvotes: exp.upvotes,
        downvotes: exp.downvotes,
        wilsonScore: exp.wilsonScore,
        userVote: Array.isArray(exp.votes) ? exp.votes[0]?.vote || null : null,
        createdBy: exp.createdBy
          ? {
              id: exp.createdBy.id,
              name: exp.createdBy.name || exp.createdBy.email,
            }
          : null,
        canEdit: exp.type === 'USER' && resolvedUser?.id ? exp.createdBy?.id === resolvedUser.id : false,
        createdAt: exp.createdAt,
      })
    })

    // 3. 添加旧格式 AI 解析（向后兼容）
    if (question.aiExplanation && !explanations.some(e => e.type === 'AI')) {
      response.explanations.push({
        id: 'legacy-ai',
        type: 'AI',
        content: question.aiExplanation,
        format: 'text',
        upvotes: 0,
        downvotes: 0,
        wilsonScore: 0.5,
        userVote: null,
        canEdit: false,
        createdAt: null,
      })
    }

    return NextResponse.json(response, { headers: noStoreHeaders })
  } catch (error: any) {
    console.error('Get explanations error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get explanations' },
      { status: 500, headers: noStoreHeaders }
    )
  }
}
