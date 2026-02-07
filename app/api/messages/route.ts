import { NextResponse } from 'next/server'

import { auth } from '@/auth'
import { listSiteMessagesForUser } from '@/lib/site-messages'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: '需要登录后才能获取站内消息' }, { status: 401 })
  }

  try {
    const result = await listSiteMessagesForUser(session.user.id)

    const response = NextResponse.json({
      messages: result.messages,
      unreadCount: result.unreadCount,
      urgentMessage: result.urgentToConfirm,
    })

    // Explicitly disable caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response
  } catch (error) {
    console.error('[site-messages] 获取站内消息失败:', error)
    return NextResponse.json({ error: '无法获取站内消息' }, { status: 500 })
  }
}
