import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminPermission } from '@/lib/auth/admin-middleware'
import { createAuditLog } from '@/lib/audit'

/**
 * PATCH /api/admin/questions/[id]/explanation
 * 更新题目的人工解析
 */
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

  const question = await prisma.question.findUnique({
    where: { id },
  })

  if (!question) {
    return NextResponse.json(
      { error: 'Question not found' },
      { status: 404 }
    )
  }

  const body = await request.json()
  const explanationRaw = body?.explanation

  if (explanationRaw !== undefined && typeof explanationRaw !== 'string') {
    return NextResponse.json(
      { error: 'explanation must be a string' },
      { status: 400 }
    )
  }

  const explanation = explanationRaw?.trim?.() ?? null

  const updatedQuestion = await prisma.question.update({
    where: { id },
    data: {
      explanation: explanation && explanation.length > 0 ? explanation : null,
    },
    select: {
      id: true,
      uuid: true,
      externalId: true,
      explanation: true,
      aiExplanation: true,
      updatedAt: true,
    },
  })

  await createAuditLog({
    userId: adminCheck.user?.id,
    action: 'MANUAL_EXPLANATION_UPDATED',
    entityType: 'Question',
    entityId: id,
    details: {
      previousExplanationLength: question.explanation?.length ?? 0,
      newExplanationLength: updatedQuestion.explanation?.length ?? 0,
    },
  })

  return NextResponse.json({
    success: true,
    question: updatedQuestion,
  })
}
