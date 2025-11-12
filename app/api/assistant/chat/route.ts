import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/auth'
import { generateAssistantChatReply } from '@/lib/ai/openai'
import { resolveUserAiStylePrompt } from '@/lib/ai/style'
import { hitRateLimit } from '@/lib/rate-limit'

const USER_RATE_LIMIT = {
  limit: Number(process.env.ASSISTANT_RATE_LIMIT_PER_USER ?? 20),
  windowMs: Number(process.env.ASSISTANT_RATE_LIMIT_WINDOW_MS ?? 60 * 60 * 1000),
}

const IP_RATE_LIMIT = {
  limit: Number(process.env.ASSISTANT_RATE_LIMIT_PER_IP ?? 60),
  windowMs: Number(process.env.ASSISTANT_RATE_LIMIT_WINDOW_MS ?? 60 * 60 * 1000),
}

const MAX_HISTORY = 12

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

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
  if (!session?.user) {
    return NextResponse.json(
      { error: '请登录后再使用小助手。' },
      { status: 401 }
    )
  }
  const ip = getClientIp(request)
  const ipKey = `assistant:ip:${ip}`
  const userKey = session.user.email ? `assistant:user:${session.user.email}` : null

  const ipLimit = hitRateLimit(ipKey, IP_RATE_LIMIT)
  if (!ipLimit.success) {
    return NextResponse.json(
      {
        error: '请求过于频繁，请稍后再试。',
        resetAt: ipLimit.resetAt,
      },
      { status: 429 }
    )
  }

  let userRemaining = USER_RATE_LIMIT.limit
  if (userKey) {
    const userLimit = hitRateLimit(userKey, USER_RATE_LIMIT)
    if (!userLimit.success) {
      return NextResponse.json(
        {
          error: '您与小助手的对话过于频繁，请稍后再试。',
          resetAt: userLimit.resetAt,
        },
        { status: 429 }
      )
    }
    userRemaining = userLimit.remaining
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
  }

  const messages = Array.isArray((body as any)?.messages)
    ? ((body as any).messages as ChatMessage[])
    : null

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: '请提供有效的对话历史。' }, { status: 400 })
  }

  if (messages.length > MAX_HISTORY) {
    messages.splice(0, messages.length - MAX_HISTORY)
  }

  const sanitised = messages.map((message, index) => {
    if (!message || typeof message !== 'object') {
      throw new Error(`第 ${index + 1} 条消息格式不正确。`)
    }

    if (message.role !== 'user' && message.role !== 'assistant') {
      throw new Error(`第 ${index + 1} 条消息角色无效。`)
    }

    if (typeof message.content !== 'string' || message.content.trim().length === 0) {
      throw new Error(`第 ${index + 1} 条消息内容不能为空。`)
    }

    return {
      role: message.role,
      content: message.content.slice(0, 1500),
    } as ChatMessage
  })

  try {
    const stylePrompt = await resolveUserAiStylePrompt(session.user.id)
    const { reply, modelName } = await generateAssistantChatReply({
      messages: sanitised,
      stylePrompt,
    })

    return NextResponse.json({
      reply,
      modelName,
      remaining: userKey ? userRemaining : ipLimit.remaining,
    })
  } catch (error: any) {
    console.error('[assistant] chat failed:', error)
    return NextResponse.json(
      {
        error: error?.message ?? '小助手暂时不可用，请稍后再试。',
      },
      { status: 500 }
    )
  }
}
