import nodemailer from 'nodemailer'
import type { SiteMessageLevel } from '@/lib/generated/prisma'

interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
}

const SITE_MESSAGE_LEVEL_META: Record<SiteMessageLevel, { label: string; badgeColor: string }> = {
  NORMAL: { label: '提醒', badgeColor: '#2563eb' },
  GENERAL: { label: '通知', badgeColor: '#7c3aed' },
  URGENT: { label: '紧急', badgeColor: '#dc2626' },
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatSiteMessageContent(content: string): string {
  return content
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => {
      const escaped = escapeHtml(paragraph).replace(/\n/g, '<br />')
      return `<p style="margin: 0 0 16px;">${escaped}</p>`
    })
    .join('')
}

function resolveSiteMessageSubject(level: SiteMessageLevel, title: string): string {
  const meta = SITE_MESSAGE_LEVEL_META[level]
  const prefix = level === 'NORMAL' ? '【站内消息】' : `【站内消息｜${meta.label}】`
  const normalizedTitle = title.trim() || '最新通知'
  const rawSubject = `${prefix}${normalizedTitle}`
  return rawSubject.length > 120 ? `${rawSubject.slice(0, 117)}...` : rawSubject
}

function buildSiteMessageEmail(level: SiteMessageLevel, title: string, content: string): { subject: string; html: string } {
  const meta = SITE_MESSAGE_LEVEL_META[level]
  const subject = resolveSiteMessageSubject(level, title)
  const messageBody = formatSiteMessageContent(content)

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f3f4f6; padding: 24px;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 15px 45px rgba(30, 64, 175, 0.08);">
        <div style="padding: 24px 32px; background: ${meta.badgeColor}; color: #ffffff;">
          <div style="font-size: 12px; letter-spacing: 2px; text-transform: uppercase; opacity: 0.9;">
            站内消息 · ${meta.label}
          </div>
          <h1 style="margin: 12px 0 0; font-size: 24px; line-height: 1.3; font-weight: 700;">
            ${escapeHtml(title)}
          </h1>
        </div>
        <div style="padding: 24px 32px; font-size: 15px; line-height: 1.7; color: #1f2937;">
          ${messageBody}
        </div>
        <div style="padding: 16px 32px; font-size: 12px; color: #6b7280; background: #f9fafb;">
          <p style="margin: 0;">请登录网站查看完整详情。</p>
          <p style="margin: 8px 0 0;">此邮件由系统自动发送，请勿直接回复。</p>
        </div>
      </div>
    </div>
  `

  return { subject, html }
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null
  private isDevelopment: boolean

  constructor() {
    this.isDevelopment = process.env.SMTP_MODE === 'development' || process.env.NODE_ENV === 'development'

    if (!this.isDevelopment) {
      this.transporter = this.createTransporter()
    }
  }

  private createTransporter(): nodemailer.Transporter {
    const host = process.env.SMTP_HOST || 'smtp.exmail.qq.com'
    const port = Number.parseInt(process.env.SMTP_PORT || '465', 10)
    const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465
    const user = process.env.SMTP_USER || ''
    const pass = process.env.SMTP_PASS || ''

    if (!user || !pass) {
      throw new Error('SMTP 用户名或密码未配置，无法发送邮件。')
    }

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    } satisfies EmailConfig)
  }

  private ensureTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = this.createTransporter()
    }
    return this.transporter
  }

  async sendVerificationCode(email: string, code: string): Promise<boolean> {
    try {
      const emailContent = {
        from: process.env.SMTP_FROM || 'noreply@amateur-radio-exam.com',
        to: email,
        subject: '业余无线电刷题系统 - 邮箱验证码',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>验证码登录</h2>
            <p>您正在登录业余无线电刷题系统，验证码为：</p>
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
              ${code}
            </div>
            <p>验证码有效期为 <strong>5分钟</strong>，请及时使用。如果这不是您的操作，请忽略此邮件。</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
              此邮件由系统自动发送，请勿回复。<br>
              业余无线电刷题系统
            </p>
          </div>
        `,
      }

      if (this.isDevelopment) {
        // 开发模式：打印到控制台
        console.log('\n' + '='.repeat(80))
        console.log('📧 [EMAIL SERVICE - DEVELOPMENT MODE]')
        console.log('='.repeat(80))
        console.log(`收件人: ${email}`)
        console.log(`主题: ${emailContent.subject}`)
        console.log(`验证码: ${code}`)
        console.log(`发送时间: ${new Date().toLocaleString()}`)
        console.log('='.repeat(80))
        console.log('邮件内容预览:')
        console.log(`您正在登录业余无线电刷题系统，验证码为: ${code}`)
        console.log('验证码有效期为 5分钟，请及时使用。')
        console.log('='.repeat(80) + '\n')
        return true
      } else {
        // 生产模式：实际发送邮件
        if (!this.transporter) {
          throw new Error('Email transporter not initialized')
        }
        await this.transporter.sendMail(emailContent)
        return true
      }
    } catch (error) {
      console.error('Failed to send email:', error)
      return false
    }
  }

  async sendFeedbackEmail({
    subject,
    message,
    fromEmail,
    userId,
    meta = {},
  }: {
    subject?: string
    message: string
    fromEmail?: string
    userId?: string
    meta?: Record<string, string | undefined>
  }): Promise<boolean> {
    const adminEmail =
      process.env.FEEDBACK_RECEIVER_EMAIL ||
      process.env.ADMIN_EMAIL ||
      process.env.SMTP_USER ||
      process.env.SMTP_FROM

    if (!adminEmail) {
      console.warn('[email] Feedback receiver email is not configured')
      return false
    }

    const resolvedSubject = subject?.trim().slice(0, 120) || '业余无线电刷题系统 - 用户问题反馈'
    const rows = Object.entries(meta)
      .filter(([, value]) => typeof value === 'string' && value)
      .map(
        ([key, value]) =>
          `<tr><td style="padding:4px 8px;font-weight:bold;text-transform:capitalize;">${key}</td><td style="padding:4px 8px;">${value}</td></tr>`
      )
      .join('')

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb;">
        <div style="padding: 24px; border-bottom: 1px solid #f3f4f6;">
          <h2 style="margin: 0; color: #111827; font-size: 20px;">新的问题反馈</h2>
          <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px;">来自业余无线电刷题系统 Web 端</p>
        </div>
        <div style="padding: 24px;">
          <p style="margin: 0 0 12px; color: #374151; font-size: 15px; line-height: 1.6;">
            ${message.replace(/\n/g, '<br>')}
          </p>
          ${
            rows
              ? `<table style="margin-top: 20px; width: 100%; font-size: 14px; border-collapse: collapse; background: #f9fafb; border-radius: 8px; overflow: hidden;">${rows}</table>`
              : ''
          }
        </div>
        <div style="padding: 16px 24px; background: #f9fafb; color: #6b7280; font-size: 12px;">
          <div>反馈发送时间：${new Date().toLocaleString()}</div>
          ${fromEmail ? `<div>用户邮箱：${fromEmail}</div>` : ''}
          ${userId ? `<div>用户 ID：${userId}</div>` : ''}
        </div>
      </div>
    `

    if (this.isDevelopment) {
      console.log('\n' + '='.repeat(80))
      console.log('📮 [EMAIL SERVICE - FEEDBACK - DEVELOPMENT MODE]')
      console.log('='.repeat(80))
      console.log(`管理员收件箱: ${adminEmail}`)
      console.log(`主题: ${resolvedSubject}`)
      console.log(`反馈内容:\n${message}`)
      console.log('附加信息:', { fromEmail, userId, meta })
      console.log('='.repeat(80) + '\n')
      return true
    }

    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized')
      }

      await this.transporter.sendMail({
        from: fromEmail || process.env.SMTP_FROM || 'noreply@amateur-radio-exam.com',
        to: adminEmail,
        subject: resolvedSubject,
        html,
      })

      return true
    } catch (error) {
      console.error('[email] Failed to send feedback email:', error)
      return false
    }
  }

  async sendSiteMessageNotification({
    recipients,
    title,
    content,
    level,
  }: {
    recipients: string[]
    title: string
    content: string
    level: SiteMessageLevel
  }): Promise<number> {
    const deduplicated = new Map<string, string>()
    for (const raw of recipients) {
      if (typeof raw !== 'string') {
        continue
      }
      const trimmed = raw.trim()
      if (!trimmed) {
        continue
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        continue
      }
      const key = trimmed.toLowerCase()
      if (!deduplicated.has(key)) {
        deduplicated.set(key, trimmed)
      }
    }

    const uniqueRecipients = Array.from(deduplicated.values())
    if (uniqueRecipients.length === 0) {
      console.warn('[email] No valid recipients for site message notification')
      return 0
    }

    const { subject, html } = buildSiteMessageEmail(level, title, content)

    if (this.isDevelopment) {
      console.log('\n' + '='.repeat(80))
      console.log('[EMAIL SERVICE - DEVELOPMENT] Site message notification')
      console.log('等级:', level)
      console.log('收件人:', uniqueRecipients)
      console.log('主题:', subject)
      console.log('内容预览:', content.slice(0, 200))
      console.log('='.repeat(80) + '\n')
      return uniqueRecipients.length
    }

    if (!this.transporter) {
      throw new Error('Email transporter not initialized')
    }

    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@amateur-radio-exam.com'
    let successCount = 0

    for (const recipient of uniqueRecipients) {
      try {
        await this.transporter.sendMail({
          from: fromAddress,
          to: recipient,
          subject,
          html,
        })
        successCount += 1
      } catch (error) {
        console.error(`[email] Failed to send site message notification to ${recipient}:`, error)
      }
    }

    return successCount
  }

  async sendTestEmail({
    recipient,
    subject,
    content,
    forceRealSend = false,
  }: {
    recipient: string
    subject: string
    content: string
    forceRealSend?: boolean
  }): Promise<{
    success: true
    mode: 'development' | 'production'
    preview?: { to: string; subject: string; content: string }
    forced: boolean
  }> {
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@amateur-radio-exam.com'
    const modeLabel = this.isDevelopment
      ? forceRealSend
        ? 'development（强制真实发送）'
        : 'development（仅打印日志）'
      : 'production（真实发送）'
    const sanitizedContent = escapeHtml(content).replace(/\n/g, '<br />')
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f3f4f6; padding: 24px;">
        <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 15px 45px rgba(30, 64, 175, 0.08);">
          <div style="padding: 24px 32px; background: #111827; color: #ffffff;">
            <h1 style="margin: 0; font-size: 22px;">SMTP 测试邮件</h1>
            <p style="margin: 8px 0 0; font-size: 13px; opacity: 0.85;">来自业余无线电刷题系统后台</p>
          </div>
          <div style="padding: 24px 32px; font-size: 15px; line-height: 1.7; color: #1f2937;">
            ${sanitizedContent}
          </div>
          <div style="padding: 18px 32px; background: #f9fafb; color: #6b7280; font-size: 12px; line-height: 1.6;">
            <div>测试时间：${new Date().toLocaleString()}</div>
            <div>SMTP 模式：${modeLabel}</div>
            <div>发件地址：${escapeHtml(fromAddress)}</div>
          </div>
        </div>
      </div>
    `

    if (this.isDevelopment && !forceRealSend) {
      console.log('\n' + '='.repeat(80))
      console.log('📧 [EMAIL SERVICE] SMTP TEST (development mode)')
      console.log('Recipient:', recipient)
      console.log('Subject:', subject)
      console.log('Content:', content)
      console.log('='.repeat(80) + '\n')
      return {
        success: true,
        mode: 'development',
        preview: {
          to: recipient,
          subject,
          content,
        },
        forced: false,
      }
    }

    const transporter = this.ensureTransporter()

    await transporter.sendMail({
      from: fromAddress,
      to: recipient,
      subject,
      html,
    })

    return {
      success: true,
      mode: 'production',
      forced: this.isDevelopment && forceRealSend,
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      if (this.isDevelopment) {
        console.log('📧 [EMAIL SERVICE] Development mode - skipping connection verification')
        return true
      }

      if (!this.transporter) {
        throw new Error('Email transporter not initialized')
      }

      await this.transporter.verify()
      return true
    } catch (error) {
      console.error('Email service connection failed:', error)
      return false
    }
  }
}

export const emailService = new EmailService()

export function generateVerificationCode(): string {
  return Math.random().toString().slice(-6).padStart(6, '0')
}

// 验证码存储（开发阶段简单内存存储，生产环境应使用Redis）
const verificationCodes = new Map<string, { code: string; expiry: number }>()

export function storeVerificationCode(email: string, code: string): void {
  const expiry = Date.now() + 5 * 60 * 1000 // 5分钟后过期
  verificationCodes.set(email, { code, expiry })

  // 清理过期的验证码
  setTimeout(() => {
    const stored = verificationCodes.get(email)
    if (stored && stored.expiry <= Date.now()) {
      verificationCodes.delete(email)
    }
  }, 5 * 60 * 1000)
}

export function verifyCode(email: string, code: string): boolean {
  const stored = verificationCodes.get(email)
  if (!stored) {
    return false
  }

  if (stored.expiry <= Date.now()) {
    verificationCodes.delete(email)
    return false
  }

  if (stored.code === code) {
    verificationCodes.delete(email) // 使用后立即删除
    return true
  }

  return false
}
