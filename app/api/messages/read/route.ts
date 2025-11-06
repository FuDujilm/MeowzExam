import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/auth'
import { markMessagesRead } from '@/lib/site-messages'

export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: '需要登录后才能标记站内消息已读' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const messageIds = Array.isArray(body?.messageIds) ? body.messageIds : []

    await markMessagesRead(session.user.id, messageIds)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[site-messages] 标记站内消息已读失败:', error)
    return NextResponse.json({ error: '无法更新消息状态' }, { status: 500 })
  }
}
