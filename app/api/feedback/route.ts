import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/auth'
import { emailService } from '@/lib/email'
import { prisma } from '@/lib/db'
import { hitRateLimit } from '@/lib/rate-limit'

const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_MAX_PER_IP = 10

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const ip = forwarded.split(',')[0]?.trim()
    if (ip) {
      return ip
    }
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }
  return 'unknown'
}

export async function POST(request: NextRequest) {
  const session = await auth()
  const ip = getClientIp(request)
  const userKey = session?.user?.email ? `feedback:user:${session.user.email}` : null
  const ipKey = `feedback:ip:${ip}`

  const ipLimit = hitRateLimit(ipKey, { limit: RATE_LIMIT_MAX_PER_IP, windowMs: RATE_LIMIT_WINDOW })
  if (!ipLimit.success) {
    return NextResponse.json(
      {
        error: '提交过于频繁，请稍后再试。',
        resetAt: ipLimit.resetAt,
      },
      { status: 429 }
    )
  }

  let userRemaining = RATE_LIMIT_MAX
  if (userKey) {
    const userLimit = hitRateLimit(userKey, { limit: RATE_LIMIT_MAX, windowMs: RATE_LIMIT_WINDOW })
    if (!userLimit.success) {
      return NextResponse.json(
        {
          error: '您的反馈次数已达上限，请稍后再试。',
          resetAt: userLimit.resetAt,
        },
        { status: 429 }
      )
    }
    userRemaining = userLimit.remaining
  }

  let payload: any
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
  }

  const message = typeof payload?.message === 'string' ? payload.message.trim() : ''
  const subject = typeof payload?.subject === 'string' ? payload.subject.trim() : ''
  const contactEmail =
    typeof payload?.email === 'string' && payload.email.includes('@') ? payload.email.trim() : undefined
  const category = typeof payload?.category === 'string' ? payload.category.trim() : undefined

  if (!message || message.length < 10) {
    return NextResponse.json({ error: '请详细描述问题（至少 10 个字符）。' }, { status: 400 })
  }

  if (message.length > 2000) {
    return NextResponse.json({ error: '反馈内容过长，请控制在 2000 字符以内。' }, { status: 400 })
  }

  if (subject.length > 120) {
    return NextResponse.json({ error: '主题长度不能超过 120 个字符。' }, { status: 400 })
  }

  const meta = {
    category,
    contactEmail: contactEmail ?? session?.user?.email ?? undefined,
    ip,
    userAgent: request.headers.get('user-agent') ?? undefined,
    referer: request.headers.get('referer') ?? undefined,
  }

  const success = await emailService.sendFeedbackEmail({
    subject,
    message,
    fromEmail: contactEmail ?? session?.user?.email ?? undefined,
    userId: session?.user?.id,
    meta,
  })

  if (!success) {
    return NextResponse.json({ error: '反馈发送失败，请稍后再试。' }, { status: 500 })
  }

  try {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const feedbackTitle = subject ? `新的意见反馈：${subject}` : '新的意见反馈'
    const reporter = session?.user?.email ?? contactEmail ?? '匿名用户'
    const bodyLines = [
      `提交人：${reporter}`,
      `分类：${category || '未指定'}`,
      `联系邮箱：${meta.contactEmail ?? '未提供'}`,
      `IP：${meta.ip}`,
      meta.referer ? `来源页面：${meta.referer}` : null,
      meta.userAgent ? `User-Agent：${meta.userAgent}` : null,
      session?.user?.id ? `用户ID：${session.user.id}` : null,
    ].filter(Boolean)
    const content = `${bodyLines.join('\n')}

反馈内容：
${message}`

    await prisma.siteMessage.create({
      data: {
        title: feedbackTitle,
        content,
        level: 'GENERAL',
        audience: 'ADMIN_ONLY',
        publishedAt: now,
        expiresAt,
      },
    })
  } catch (error) {
    console.error('[feedback] 创建管理员站内消息失败:', error)
  }

  return NextResponse.json({
    success: true,
    remaining: userKey ? userRemaining : ipLimit.remaining,
  })
}
