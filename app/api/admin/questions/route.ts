import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminPermission } from '@/lib/auth/admin-middleware'

/**
 * GET /api/admin/questions
 * 获取题目列表（用于管理员编辑解析）
 */
export async function GET(request: NextRequest) {
  const adminCheck = await checkAdminPermission()
  if (!adminCheck.success) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status || 401 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get('type') || 'A_CLASS'
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50)

  const skip = (page - 1) * limit

  const questions = await prisma.question.findMany({
    where: {
      type: type as 'A_CLASS' | 'B_CLASS' | 'C_CLASS',
    },
    select: {
      id: true,
      uuid: true,
      externalId: true,
      type: true,
      category: true,
      title: true,
      explanation: true,
      aiExplanation: true,
    },
    orderBy: {
      externalId: 'asc',
    },
    skip,
    take: limit,
  })

  return NextResponse.json({
    questions,
    meta: {
      page,
      limit,
      type,
    },
  })
}
