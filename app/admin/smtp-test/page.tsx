'use client'

import type { ChangeEvent, FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

import { AdminPageShell } from '@/components/admin/AdminPageShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useNotification } from '@/components/ui/notification-provider'

type SmtpMode = 'development' | 'production'

type SmtpStatus = {
  mode: SmtpMode
  host: string | null
  port: number | null
  secure: boolean
  user: string | null
  from: string | null
  missingEnv: string[]
  connectionVerified: boolean
  timestamp: string
}

type TestResult = {
  requestedAt: string
  recipient: string
  subject: string
  mode: SmtpMode
  preview: { to: string; subject: string; content: string } | null
  forced: boolean
}

const DEFAULT_MESSAGE =
  '这是一封来自业余无线电刷题系统后台的 SMTP 测试邮件，用于验证 SMTP 配置是否正确。收到此邮件代表当前环境可以正常发送邮件。'

export default function AdminSmtpTestPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { notify } = useNotification()

  const [statusData, setStatusData] = useState<SmtpStatus | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)

  const [form, setForm] = useState({
    recipient: '',
    subject: 'SMTP 测试邮件',
    message: DEFAULT_MESSAGE,
    forceRealSend: false,
  })
  const [sending, setSending] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)

  const refreshStatus = useCallback(async () => {
    try {
      setStatusLoading(true)
      const response = await fetch('/api/admin/smtp-test')
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error ?? '无法获取 SMTP 状态')
      }
      setStatusData(payload.data)
      setStatusError(null)
    } catch (error: unknown) {
      console.error('[smtp-test] load failed:', error)
      const message = error instanceof Error ? error.message : '无法获取 SMTP 状态'
      setStatusError(message)
      setStatusData(null)
    } finally {
      setStatusLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      refreshStatus().catch(() => null)
    }
  }, [status, router, refreshStatus])

  useEffect(() => {
    if (session?.user?.email) {
      setForm((prev) => (prev.recipient ? prev : { ...prev, recipient: session.user?.email ?? '' }))
    }
  }, [session?.user?.email])

  useEffect(() => {
    if (statusData?.mode !== 'development' && form.forceRealSend) {
      setForm((prev) => ({ ...prev, forceRealSend: false }))
    }
  }, [statusData?.mode, form.forceRealSend])

  const missingEnvBadges = useMemo(() => {
    if (!statusData?.missingEnv?.length) {
      return null
    }
    return (
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-rose-600 dark:text-rose-300">
        {statusData.missingEnv.map((key) => (
          <span key={key} className="rounded-full bg-rose-50 px-2 py-0.5 dark:bg-rose-500/10">
            缺少 {key}
          </span>
        ))}
      </div>
    )
  }, [statusData?.missingEnv])

  const connectionBadge = useMemo(() => {
    if (!statusData) return null
    const variant = statusData.connectionVerified ? 'success' : 'danger'
    const label = statusData.connectionVerified ? 'SMTP 连接正常' : '连接失败'
    const className =
      variant === 'success'
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100'
        : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-100'
    return <Badge className={className}>{label}</Badge>
  }, [statusData])

  const handleInput =
    (field: 'recipient' | 'subject' | 'message') =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSendTest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.recipient.trim()) {
      notify({ variant: 'warning', title: '请输入收件人邮箱' })
      return
    }
    setSending(true)
    setTestResult(null)
    try {
      const response = await fetch('/api/admin/smtp-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: form.recipient,
          subject: form.subject,
          message: form.message,
          forceRealSend: form.forceRealSend,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error ?? '发送测试邮件失败')
      }
      setTestResult(payload.data)
      notify({ variant: 'success', title: '测试邮件已发送', description: '请查收收件箱或查看日志。' })
    } catch (error: unknown) {
      console.error('[smtp-test] send failed:', error)
      const message = error instanceof Error ? error.message : '无法发送邮件，请检查配置。'
      notify({ variant: 'danger', title: '测试失败', description: message })
    } finally {
      setSending(false)
    }
  }

  if (status === 'loading' || statusLoading) {
    return (
      <AdminPageShell maxWidthClassName="max-w-4xl">
        <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">正在加载 SMTP 状态...</div>
      </AdminPageShell>
    )
  }

  if (!session) {
    return (
      <AdminPageShell maxWidthClassName="max-w-4xl">
        <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">正在跳转到登录...</div>
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell maxWidthClassName="max-w-4xl" contentClassName="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">SMTP 测试</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">检测当前 SMTP 配置并发送测试邮件。</p>
        </div>
        <Button variant="outline" onClick={() => refreshStatus()} disabled={statusLoading}>
          {statusLoading ? '检测中...' : '重新检测'}
        </Button>
      </div>

      {statusError ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
          {statusError}
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">SMTP 环境概览</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">检查必填环境变量与连接状态。</p>
          </div>
          {connectionBadge}
        </div>

        {statusData ? (
          <div className="mt-6 space-y-4 text-sm text-slate-700 dark:text-slate-200">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-slate-400">运行模式</p>
                <p className="mt-1 font-medium">{statusData.mode === 'development' ? 'Development（仅打印日志）' : 'Production（真实发送）'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">SMTP Host</p>
                <p className="mt-1 font-medium">{statusData.host || '未配置'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">端口 / 加密</p>
                <p className="mt-1 font-medium">
                  {statusData.port ?? '未配置'} {statusData.secure ? '(SSL)' : '(STARTTLS/明文)'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">发件人/认证邮箱</p>
                <p className="mt-1 font-medium">{statusData.from || statusData.user || '未配置'}</p>
              </div>
            </div>
            {missingEnvBadges}
            <p className="text-xs text-slate-400 dark:text-slate-500">最近检测：{new Date(statusData.timestamp).toLocaleString()}</p>
            {statusData.mode === 'development' ? (
              <div className="rounded-md border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                当前为 development 模式，默认只输出日志，但可以通过下方开关强制真实发送。
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-6 text-sm text-slate-500 dark:text-slate-300">尚未获取到 SMTP 配置信息。</p>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">发送测试邮件</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">填写收件人邮箱，将发送一封简单的 SMTP 测试邮件。</p>

        <form className="mt-6 space-y-5" onSubmit={handleSendTest}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">收件人邮箱</label>
            <Input
              type="email"
              placeholder="admin@example.com"
              value={form.recipient}
              onChange={handleInput('recipient')}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">邮件主题</label>
            <Input value={form.subject} onChange={handleInput('subject')} maxLength={120} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">邮件内容</label>
            <Textarea value={form.message} onChange={handleInput('message')} rows={6} />
          </div>
          {statusData?.mode === 'development' ? (
            <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">强制真实发送</p>
                <p className="mt-1 text-[13px] text-slate-600 dark:text-slate-300">
                  开启后即使在 development 模式也会调用真实 SMTP 通道，请确保配置正确。
                </p>
              </div>
              <Switch
                checked={form.forceRealSend}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, forceRealSend: checked }))}
              />
            </div>
          ) : null}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={sending}>
              {sending ? '发送中...' : '发送测试邮件'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setForm((prev) => ({ ...prev, message: DEFAULT_MESSAGE }))}>
              恢复默认内容
            </Button>
          </div>
        </form>

        {testResult ? (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100">
            <p className="font-semibold">最近一次测试</p>
            <ul className="mt-2 space-y-1">
              <li>收件人：{testResult.recipient}</li>
              <li>主题：{testResult.subject}</li>
              <li>
                模式：
                {testResult.mode === 'development'
                  ? 'development（仅日志）'
                  : testResult.forced
                    ? 'development（强制真实发送）'
                    : 'production（真实发送）'}
              </li>
              <li>时间：{new Date(testResult.requestedAt).toLocaleString()}</li>
            </ul>
            {testResult.preview ? (
              <div className="mt-3 rounded-md border border-emerald-200/60 bg-white/80 p-3 text-xs text-slate-600 dark:bg-slate-950/60 dark:text-slate-300">
                <p className="font-semibold text-slate-800 dark:text-slate-100">开发模式邮件预览</p>
                <pre className="mt-2 whitespace-pre-wrap break-words">{testResult.preview.content}</pre>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </AdminPageShell>
  )
}
