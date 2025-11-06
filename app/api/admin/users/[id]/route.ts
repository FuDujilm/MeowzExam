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

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const adminCheck = await checkAdminPermission()
  if (!adminCheck.success) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status || 401 },
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
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
  })

  if (!user) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 })
  }

  return NextResponse.json({
    user: serializeUser(user),
  })
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const adminCheck = await checkAdminPermission()
  if (!adminCheck.success) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status || 401 },
    )
  }

  const userId = params.id

  const existing = await prisma.user.findUnique({
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

  if (!existing) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 })
  }

  let payload: any
  try {
    payload = await request.json()
  } catch {
    payload = {}
  }

  const data: any = {}
  const changes: Record<string, { before: any; after: any }> = {}

  if ('callsign' in payload) {
    const raw = typeof payload.callsign === 'string' ? payload.callsign.trim() : ''
    const nextCallsign = raw.length > 0 ? raw : null
    if (nextCallsign !== existing.callsign) {
      data.callsign = nextCallsign
      changes.callsign = { before: existing.callsign, after: nextCallsign }
    }
  }

  if ('aiQuotaLimit' in payload) {
    const raw = payload.aiQuotaLimit
    let nextLimit: number | null = null
    if (raw === null) {
      nextLimit = null
    } else if (raw === '' || raw === undefined) {
      nextLimit = null
    } else if (typeof raw === 'number') {
      if (!Number.isFinite(raw) || raw < 0) {
        return NextResponse.json({ error: 'AI 配额需要是大于等于 0 的数字或留空' }, { status: 400 })
      }
      nextLimit = Math.floor(raw)
    } else if (typeof raw === 'string') {
      const trimmed = raw.trim().toLowerCase()
      if (trimmed.length === 0 || trimmed === 'null' || trimmed === 'none' || trimmed === 'unlimited') {
        nextLimit = null
      } else {
        const parsed = Number.parseInt(trimmed, 10)
        if (Number.isNaN(parsed) || parsed < 0) {
          return NextResponse.json({ error: 'AI 配额需要是大于等于 0 的数字或留空' }, { status: 400 })
        }
        nextLimit = parsed
      }
    } else {
      return NextResponse.json({ error: 'AI 配额字段格式不正确' }, { status: 400 })
    }

    if (nextLimit !== existing.aiQuotaLimit) {
      data.aiQuotaLimit = nextLimit
      changes.aiQuotaLimit = { before: existing.aiQuotaLimit, after: nextLimit }

      if (nextLimit !== null && existing.aiQuotaUsed > nextLimit && !('aiQuotaUsed' in data)) {
        data.aiQuotaUsed = nextLimit
        changes.aiQuotaUsed = { before: existing.aiQuotaUsed, after: nextLimit }
      }
    }
  }

  if ('aiQuotaUsed' in payload) {
    const raw = payload.aiQuotaUsed
    let nextUsed: number
    if (raw === null || raw === '') {
      nextUsed = 0
    } else if (typeof raw === 'number') {
      nextUsed = Math.floor(raw)
    } else if (typeof raw === 'string') {
      const trimmed = raw.trim().toLowerCase()
      if (trimmed.length === 0 || trimmed === 'null') {
        nextUsed = 0
      } else {
        const parsed = Number.parseInt(trimmed, 10)
        if (Number.isNaN(parsed)) {
          return NextResponse.json({ error: 'AI 已用配额需要是数字' }, { status: 400 })
        }
        nextUsed = parsed
      }
    } else {
      return NextResponse.json({ error: 'AI 已用配额需要是数字' }, { status: 400 })
    }

    if (nextUsed < 0) {
      return NextResponse.json({ error: 'AI 已用配额不能为负数' }, { status: 400 })
    }

    if (data.aiQuotaLimit !== undefined && data.aiQuotaLimit !== null && nextUsed > data.aiQuotaLimit) {
      nextUsed = data.aiQuotaLimit
    } else if (data.aiQuotaLimit === null && nextUsed < 0) {
      nextUsed = 0
    } else if (data.aiQuotaLimit === undefined && existing.aiQuotaLimit !== null && nextUsed > existing.aiQuotaLimit) {
      nextUsed = existing.aiQuotaLimit
    }

    if (nextUsed !== existing.aiQuotaUsed) {
      data.aiQuotaUsed = nextUsed
      changes.aiQuotaUsed = { before: existing.aiQuotaUsed, after: nextUsed }
    }
  }

  if ('loginDisabled' in payload) {
    const next = Boolean(payload.loginDisabled)
    if (next !== existing.loginDisabled) {
      data.loginDisabled = next
      changes.loginDisabled = { before: existing.loginDisabled, after: next }
    }
  }

  if ('manualExplanationDisabled' in payload) {
    const next = Boolean(payload.manualExplanationDisabled)
    if (next !== existing.manualExplanationDisabled) {
      data.manualExplanationDisabled = next
      changes.manualExplanationDisabled = {
        before: existing.manualExplanationDisabled,
        after: next,
      }
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: '没有检测到可更新的字段' }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
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
  })

  await createAuditLog({
    userId: adminCheck.user?.id,
    action: 'USER_ADMIN_UPDATED',
    entityType: 'User',
    entityId: userId,
    details: {
      email: existing.email,
      changes,
    },
  })

  return NextResponse.json({
    user: serializeUser(updated),
  })
}
