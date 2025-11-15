import { NextRequest, NextResponse } from 'next/server'

import { checkAdminPermission } from '@/lib/auth/admin-middleware'
import { emailService } from '@/lib/email'

type SmtpMode = 'development' | 'production'

function resolveSmtpMode(): SmtpMode {
  return process.env.SMTP_MODE === 'development' || process.env.NODE_ENV === 'development'
    ? 'development'
    : 'production'
}

function getSmtpConfigSummary() {
  const mode = resolveSmtpMode()
  const portRaw = process.env.SMTP_PORT
  const port = portRaw ? Number(portRaw) || null : null
  const requiredEnv = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'] as const
  const missingEnv = requiredEnv.filter((key) => !process.env[key])

  return {
    mode,
    host: process.env.SMTP_HOST ?? null,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : true,
    user: process.env.SMTP_USER ?? null,
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? null,
    missingEnv,
  }
}

export async function GET() {
  const adminCheck = await checkAdminPermission()
  if (!adminCheck.success) {
    return NextResponse.json({ error: adminCheck.error ?? '权限不足' }, { status: adminCheck.status ?? 500 })
  }

  const summary = getSmtpConfigSummary()
  const verified = await emailService.verifyConnection()

  return NextResponse.json({
    success: true,
    data: {
      ...summary,
      connectionVerified: verified,
      timestamp: new Date().toISOString(),
    },
  })
}

export async function POST(request: NextRequest) {
  const adminCheck = await checkAdminPermission()
  if (!adminCheck.success) {
    return NextResponse.json({ error: adminCheck.error ?? '权限不足' }, { status: adminCheck.status ?? 500 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const recipientRaw = typeof body?.recipient === 'string' ? body.recipient.trim() : ''
    if (!recipientRaw) {
      return NextResponse.json({ error: '请填写收件人邮箱' }, { status: 400 })
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(recipientRaw)) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 })
    }

    const subject =
      (typeof body?.subject === 'string' && body.subject.trim()) || 'SMTP 测试邮件 - 业余无线电刷题系统后台'
    const message =
      (typeof body?.message === 'string' && body.message.trim()) ||
      '这是一封来自业余无线电刷题系统后台的 SMTP 测试邮件，用于验证邮件服务配置是否生效。'

    const summary = getSmtpConfigSummary()
    const forceRealSend = summary.mode === 'development' && Boolean(body?.forceRealSend)

    const result = await emailService.sendTestEmail({
      recipient: recipientRaw,
      subject,
      content: message,
      forceRealSend,
    })

    return NextResponse.json({
      success: true,
      data: {
        requestedAt: new Date().toISOString(),
        recipient: recipientRaw,
        subject,
        mode: result.mode,
        preview: result.preview ?? null,
        forced: result.forced,
        config: summary,
      },
    })
  } catch (error) {
    console.error('[smtp-test] failed to send test email:', error)
    return NextResponse.json({ error: '发送测试邮件失败，请检查 SMTP 配置或查看日志。' }, { status: 500 })
  }
}
