import { NextRequest, NextResponse } from 'next/server'
import type { Session } from 'next-auth'

import { auth } from '@/auth'
import { isAdminEmail } from '@/lib/auth/admin'
import { prisma } from '@/lib/db'
import { emailService } from '@/lib/email'
import { listNotificationRecipients, serializeAdminSiteMessage } from '@/lib/site-messages'

export const dynamic = 'force-dynamic'

function ensureAdmin(session: Session | null) {
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: '权限不足：需要管理员账号' }, { status: 403 })
  }
  return null
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed
}

function parseLevel(value: unknown): 'NORMAL' | 'GENERAL' | 'URGENT' {
  if (value === 'GENERAL' || value === 'URGENT') {
    return value
  }
  return 'NORMAL'
}

function parseAudience(value: unknown): 'ALL' | 'ADMIN_ONLY' {
  return value === 'ADMIN_ONLY' ? 'ADMIN_ONLY' : 'ALL'
}

export async function GET() {
  const session = await auth()
  const denied = ensureAdmin(session)
  if (denied) {
    return denied
  }

  try {
    const records = await prisma.siteMessage.findMany({
      orderBy: [
        { publishedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 50,
      include: {
        createdBy: {
          select: { email: true },
        },
      },
    })

    return NextResponse.json({
      messages: records.map((record) => serializeAdminSiteMessage(record)),
    })
  } catch (error) {
    console.error('[site-messages] 管理端获取站内消息失败:', error)
    return NextResponse.json({ error: '无法获取站内消息列表' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  const denied = ensureAdmin(session)
  if (denied) {
    return denied
  }

  try {
    const body = await request.json().catch(() => ({}))
    const title = typeof body?.title === 'string' ? body.title.trim() : ''
    const content = typeof body?.content === 'string' ? body.content.trim() : ''
    const level = parseLevel(body?.level)
    const audience = parseAudience(body?.audience)
    const publishedAt = parseDate(body?.publishedAt) ?? new Date()
    const expiresAt = parseDate(body?.expiresAt)

    if (!title) {
      return NextResponse.json({ error: '消息标题不能为空' }, { status: 400 })
    }

    if (!content) {
      return NextResponse.json({ error: '消息内容不能为空' }, { status: 400 })
    }

    if (expiresAt && expiresAt <= publishedAt) {
      return NextResponse.json({ error: '结束时间需要晚于发布时间' }, { status: 400 })
    }

    const created = await prisma.siteMessage.create({
      data: {
        title,
        content,
        level,
        audience,
        publishedAt,
        expiresAt,
        createdById: session?.user?.id ?? null,
      },
    })

    if (level !== 'NORMAL') {
      try {
        const recipients = await listNotificationRecipients(audience)
        const successCount = await emailService.sendSiteMessageNotification({
          recipients,
          title,
          content,
          level,
        })

        if (successCount > 0) {
          await prisma.siteMessage.update({
            where: { id: created.id },
            data: { emailSentAt: new Date() },
          })
        }
      } catch (error) {
        console.error('[site-messages] 站内消息邮件通知失败:', error)
      }
    }

    const finalRecord = await prisma.siteMessage.findUnique({
      where: { id: created.id },
      include: {
        createdBy: {
          select: { email: true },
        },
      },
    })

    if (!finalRecord) {
      throw new Error('站内消息创建后未找到记录')
    }

    return NextResponse.json(
      { message: serializeAdminSiteMessage(finalRecord) },
      { status: 201 }
    )
  } catch (error) {
    console.error('[site-messages] 创建站内消息失败:', error)
    return NextResponse.json({ error: '创建站内消息失败' }, { status: 500 })
  }
}
