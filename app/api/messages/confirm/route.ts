import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { confirmSiteMessage } from '@/lib/site-messages'

export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: '需要登录后才能确认站内消息' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const messageId = typeof body?.messageId === 'string' ? body.messageId.trim() : ''

    if (!messageId) {
      return NextResponse.json({ error: '缺少站内消息 ID' }, { status: 400 })
    }

    const message = await prisma.siteMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        level: true,
        publishedAt: true,
        expiresAt: true,
      },
    })

    if (!message) {
      return NextResponse.json({ error: '站内消息不存在或已被删除' }, { status: 404 })
    }

    const now = new Date()
    if (message.publishedAt > now || (message.expiresAt && message.expiresAt <= now)) {
      return NextResponse.json({ error: '站内消息已失效' }, { status: 400 })
    }

    await confirmSiteMessage(session.user.id, messageId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[site-messages] 确认站内消息失败:', error)
    return NextResponse.json({ error: '无法确认站内消息' }, { status: 500 })
  }
}
