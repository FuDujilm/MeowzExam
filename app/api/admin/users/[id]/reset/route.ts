import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import { checkAdminPermission } from '@/lib/auth/admin-middleware'
import { createAuditLog } from '@/lib/audit'

type RouteParams = {
  params: {
    id: string
  }
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

export async function POST(request: NextRequest, { params }: RouteParams) {
  const adminCheck = await checkAdminPermission()
  if (!adminCheck.success) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status || 401 },
    )
  }

  const userId = params.id

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      aiQuotaLimit: true,
      aiQuotaUsed: true,
      loginDisabled: true,
      manualExplanationDisabled: true,
      callsign: true,
    },
  })

  if (!target) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 })
  }

  let payload: any
  try {
    payload = await request.json()
  } catch {
    payload = {}
  }

  const resetCallsign = Boolean(payload?.resetCallsign)
  const resetSettings = Boolean(payload?.resetSettings)
  const resetPoints = payload?.resetPoints === false ? false : true
  const resetQuota = payload?.resetQuota === false ? false : true
  const reactivate = payload?.reactivate === false ? false : true

  const userUpdateData: any = {}
  const applied: string[] = []

  if (resetPoints) {
    userUpdateData.totalPoints = 0
    userUpdateData.currentStreak = 0
    userUpdateData.lastCheckIn = null
    applied.push('points')
  }

  if (resetQuota) {
    userUpdateData.aiQuotaUsed = 0
    applied.push('aiQuota')
  }

  if (reactivate) {
    userUpdateData.loginDisabled = false
    userUpdateData.manualExplanationDisabled = false
    applied.push('restrictions')
  }

  if (resetCallsign) {
    userUpdateData.callsign = null
    applied.push('callsign')
  }

  const operations: any[] = []

  if (Object.keys(userUpdateData).length > 0) {
    operations.push(
      prisma.user.update({
        where: { id: userId },
        data: userUpdateData,
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
    )
  } else {
    operations.push(
      prisma.user.findUnique({
        where: { id: userId },
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
    )
  }

  if (resetSettings) {
    applied.push('settings')
    operations.push(
      prisma.userSettings.deleteMany({
        where: { userId },
      }),
    )
  }

  const [updatedUser] = await prisma.$transaction(operations)

  await createAuditLog({
    userId: adminCheck.user?.id,
    action: 'USER_ADMIN_RESET',
    entityType: 'User',
    entityId: userId,
    details: {
      email: target.email,
      applied,
    },
  })

  return NextResponse.json({
    user: serializeUser(updatedUser),
  })
}
