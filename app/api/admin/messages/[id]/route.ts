import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/auth'
import { isAdminEmail } from '@/lib/auth/admin'
import { prisma } from '@/lib/db'
import { emailService } from '@/lib/email'
import { listNotificationRecipients, serializeAdminSiteMessage } from '@/lib/site-messages'

function ensureAdmin(session: Awaited<ReturnType<typeof auth>>) {
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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  const denied = ensureAdmin(session)
  if (denied) {
    return denied
  }

  const id = params?.id
  if (!id) {
    return NextResponse.json({ error: '缺少站内消息 ID' }, { status: 400 })
  }

  try {
    const existing = await prisma.siteMessage.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: '站内消息不存在' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const title = typeof body?.title === 'string' ? body.title.trim() : existing.title
    const content = typeof body?.content === 'string' ? body.content.trim() : existing.content
    const level = parseLevel(body?.level ?? existing.level)
    const publishedAt = parseDate(body?.publishedAt) ?? existing.publishedAt
    const expiresAt = body?.expiresAt === null ? null : parseDate(body?.expiresAt) ?? existing.expiresAt
    const resendEmail = Boolean(body?.resendEmail) && level !== 'NORMAL'

    if (!title) {
      return NextResponse.json({ error: '消息标题不能为空' }, { status: 400 })
    }

    if (!content) {
      return NextResponse.json({ error: '消息内容不能为空' }, { status: 400 })
    }

    if (expiresAt && expiresAt <= publishedAt) {
      return NextResponse.json({ error: '结束时间需要晚于发布时间' }, { status: 400 })
    }

    await prisma.siteMessage.update({
      where: { id },
      data: {
        title,
        content,
        level,
        publishedAt,
        expiresAt,
      },
    })

    if (resendEmail) {
      try {
        const recipients = await listNotificationRecipients()
        const successCount = await emailService.sendSiteMessageNotification({
          recipients,
          title,
          content,
          level,
        })

        if (successCount > 0) {
          await prisma.siteMessage.update({
            where: { id },
            data: { emailSentAt: new Date() },
          })
        }
      } catch (error) {
        console.error('[site-messages] 重新发送站内消息邮件失败:', error)
      }
    }

    const finalRecord = await prisma.siteMessage.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { email: true },
        },
      },
    })

    if (!finalRecord) {
      throw new Error('站内消息更新后未找到记录')
    }

    return NextResponse.json({ message: serializeAdminSiteMessage(finalRecord) })
  } catch (error) {
    console.error('[site-messages] 更新站内消息失败:', error)
    return NextResponse.json({ error: '更新站内消息失败' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  const denied = ensureAdmin(session)
  if (denied) {
    return denied
  }

  const id = params?.id
  if (!id) {
    return NextResponse.json({ error: '缺少站内消息 ID' }, { status: 400 })
  }

  try {
    await prisma.siteMessage.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[site-messages] 删除站内消息失败:', error)
    return NextResponse.json({ error: '删除站内消息失败' }, { status: 500 })
  }
}
