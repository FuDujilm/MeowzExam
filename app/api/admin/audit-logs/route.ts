import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminPermission } from '@/lib/auth/admin-middleware'

/**
 * GET /api/admin/audit-logs
 * 获取审计日志列表
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
  const limitParam = searchParams.get('limit')
  const actionParam = searchParams.get('action')

  const limit = Math.min(
    Math.max(Number(limitParam) || 50, 1),
    200
  )

  const where = actionParam
    ? {
        action: actionParam,
      }
    : undefined

  const logs = await prisma.auditLog.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  })

  return NextResponse.json({
    logs,
    meta: {
      limit,
      action: actionParam,
    },
  })
}
