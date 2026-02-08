import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import { checkAdminPermission } from '@/lib/auth/admin-middleware'
import { Prisma } from '@/lib/generated/prisma'

export const dynamic = 'force-dynamic'

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback
  }
  return parsed
}

function serializeUser(user: any) {
  const quotaLimit = user.aiQuotaLimit
  const quotaUsed = user.aiQuotaUsed ?? 0

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    callsign: user.callsign,
    aiQuotaLimit: quotaLimit,
    aiQuotaUsed: quotaUsed,
    aiQuotaRemaining: quotaLimit == null ? null : Math.max(quotaLimit - quotaUsed, 0),
    loginDisabled: Boolean(user.loginDisabled),
    manualExplanationDisabled: Boolean(user.manualExplanationDisabled),
    totalPoints: user.totalPoints ?? 0,
    currentStreak: user.currentStreak ?? 0,
    lastCheckIn: user.lastCheckIn,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

export async function GET(request: NextRequest) {
  const adminCheck = await checkAdminPermission()
  if (!adminCheck.success) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status || 401 },
    )
  }

  const searchParams = request.nextUrl.searchParams
  const page = Math.max(1, parsePositiveInt(searchParams.get('page'), 1))
  const limit = Math.min(parsePositiveInt(searchParams.get('limit'), 20), 50)
  const query = (searchParams.get('q') || '').trim()

  const where = query.length > 0
    ? {
        OR: [
          { email: { contains: query, mode: Prisma.QueryMode.insensitive } },
          { name: { contains: query, mode: Prisma.QueryMode.insensitive } },
          { callsign: { contains: query, mode: Prisma.QueryMode.insensitive } },
        ],
      }
    : undefined

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        callsign: true,
        aiQuotaLimit: true,
        aiQuotaUsed: true,
        loginDisabled: true,
        manualExplanationDisabled: true,
        totalPoints: true,
        currentStreak: true,
        lastCheckIn: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({
    users: users.map(serializeUser),
    meta: {
      page,
      limit,
      total,
      hasMore: page * limit < total,
      query: query || null,
    },
  })
}
