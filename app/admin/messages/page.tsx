'use client'

import { type ChangeEvent, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, BellRing, Loader2, MailCheck, MessageCircle, Trash } from 'lucide-react'

import AdminNav from '@/components/admin/AdminNav'
import type { AdminSiteMessagePayload, SiteMessageLevel } from '@/lib/site-messages'
import { useNotification } from '@/components/ui/notification-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'

interface SiteMessageFormState {
  id?: string
  title: string
  content: string
  level: SiteMessageLevel
  publishedAt: string
  expiresAt: string
  resendEmail: boolean
}

const LEVEL_META: Record<
  SiteMessageLevel,
  {
    label: string
    description: string
    badgeVariant: 'default' | 'secondary' | 'destructive'
    icon: typeof MessageCircle
  }
> = {
  NORMAL: {
    label: '普通提醒',
    description: '仅在站内消息盒子展示，并提示未读徽标。',
    badgeVariant: 'secondary',
    icon: MessageCircle,
  },
  GENERAL: {
    label: '一般通知',
    description: '站内消息 + 邮件推送，适合重要更新或版本通知。',
    badgeVariant: 'default',
    icon: BellRing,
  },
  URGENT: {
    label: '紧急公告',
    description: '站内消息 + 邮件 + 强制弹窗确认，用于紧急停机、重大异常等场景。',
    badgeVariant: 'destructive',
    icon: AlertTriangle,
  },
}

function toInputDate(value: string | null) {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

function nowInputValue() {
  return toInputDate(new Date().toISOString())
}

function formatDisplayDate(value: string | null) {
  if (!value) {
    return '未设置'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '未知'
  }
  return date.toLocaleString('zh-CN')
}

function mapToForm(message: AdminSiteMessagePayload): SiteMessageFormState {
  return {
    id: message.id,
    title: message.title,
    content: message.content,
    level: message.level,
    publishedAt: toInputDate(message.publishedAt),
    expiresAt: toInputDate(message.expiresAt),
    resendEmail: false,
  }
}

const EMPTY_FORM: SiteMessageFormState = {
  title: '',
  content: '',
  level: 'NORMAL',
  publishedAt: nowInputValue(),
  expiresAt: '',
  resendEmail: false,
}

function hasContent(value: string) {
  return value.trim().length > 0
}

export default function AdminMessagesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { notify } = useNotification()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [messages, setMessages] = useState<AdminSiteMessagePayload[]>([])
  const [form, setForm] = useState<SiteMessageFormState>(EMPTY_FORM)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status === 'authenticated') {
      loadMessages()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const selectedMessage = useMemo(
    () => messages.find((item) => item.id === selectedId) ?? null,
    [messages, selectedId]
  )

  const dirty = useMemo(() => {
    if (!selectedId) {
      return (
        hasContent(form.title) ||
        hasContent(form.content) ||
        form.level !== 'NORMAL' ||
        hasContent(form.expiresAt)
      )
    }
    if (!selectedMessage) {
      return true
    }
    const reference = mapToForm(selectedMessage)
    return (
      reference.title !== form.title ||
      reference.content !== form.content ||
      reference.level !== form.level ||
      reference.publishedAt !== form.publishedAt ||
      reference.expiresAt !== form.expiresAt ||
      form.resendEmail
    )
  }, [form, selectedId, selectedMessage])

  const loadMessages = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/admin/messages', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('加载失败')
      }
      const data = (await response.json()) as { messages: AdminSiteMessagePayload[] }
      setMessages(data.messages)
      if (selectedId) {
        const current = data.messages.find((item) => item.id === selectedId)
        if (current) {
          setForm(mapToForm(current))
        } else {
          resetForm()
        }
      }
    } catch (err) {
      console.error(err)
      setError('无法加载站内消息列表，请稍后重试。')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedId(null)
    setForm({ ...EMPTY_FORM, publishedAt: nowInputValue() })
  }

  const handleChange =
    (field: keyof SiteMessageFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value
      setForm((prev) => ({
        ...prev,
        [field]: value,
      }))
    }

  const handleLevelChange = (value: SiteMessageLevel) => {
    setForm((prev) => ({
      ...prev,
      level: value,
    }))
  }

  const handleSubmit = async () => {
    if (!hasContent(form.title) || !hasContent(form.content)) {
      notify({
        variant: 'danger',
        title: '内容不完整',
        description: '请填写消息标题和内容后再保存。',
      })
      return
    }

    try {
      setSaving(true)
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        content: form.content.trim(),
        level: form.level,
        publishedAt: form.publishedAt || null,
        expiresAt: form.expiresAt || null,
      }

      if (selectedId && form.resendEmail) {
        payload.resendEmail = true
      }

      const endpoint = selectedId ? `/api/admin/messages/${selectedId}` : '/api/admin/messages'
      const method = selectedId ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || '保存失败')
      }

      const data = (await response.json()) as { message: AdminSiteMessagePayload }

      setMessages((prev) => {
        const withoutCurrent = prev.filter((item) => item.id !== data.message.id)
        return [data.message, ...withoutCurrent].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
      })

      setSelectedId(data.message.id)
      setForm(mapToForm(data.message))

      notify({
        variant: 'success',
        title: selectedId ? '站内消息已更新' : '站内消息已发布',
        description:
          data.message.level === 'NORMAL'
            ? '用户可在站内消息盒子中查看。'
            : '已向用户邮箱发送通知，同时更新站内消息。',
      })
    } catch (err) {
      console.error(err)
      notify({
        variant: 'danger',
        title: '保存失败',
        description: err instanceof Error ? err.message : '请稍后重试。',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这条站内消息吗？该操作无法撤销。')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/messages/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || '删除失败')
      }
      setMessages((prev) => prev.filter((item) => item.id !== id))
      if (selectedId === id) {
        resetForm()
      }
      notify({
        variant: 'success',
        title: '删除成功',
        description: '站内消息已移除。',
      })
    } catch (err) {
      console.error(err)
      notify({
        variant: 'danger',
        title: '删除失败',
        description: err instanceof Error ? err.message : '请稍后重试。',
      })
    }
  }

  const handleSelectMessage = (message: AdminSiteMessagePayload) => {
    setSelectedId(message.id)
    setForm(mapToForm(message))
  }

  if (status === 'loading') {
    return (
      <div className="flex h-[60vh] items-center justify-center text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        正在验证权限...
      </div>
    )
  }

  return (
    <div className="pb-10">
      <AdminNav />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4">
        <Card>
          <CardHeader className="border-b border-gray-100 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-900/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold">站内消息管理</CardTitle>
                <CardDescription>
                  统一管理用户看到的站内通知。不同等级会触发不同的提醒渠道，请根据内容影响范围谨慎选择。
                </CardDescription>
              </div>
              <Button variant="outline" onClick={resetForm} disabled={saving}>
                新建站内消息
              </Button>
            </div>
          </CardHeader>

          <CardContent className="grid gap-8 pt-6 lg:grid-cols-[2fr,1fr]">
            <div className="space-y-6">
              {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                  {error}
                </div>
              ) : null}

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">消息标题</label>
                  <Input
                    placeholder="请输入标题，例如“题库更新公告”"
                    value={form.title}
                    onChange={handleChange('title')}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">消息内容</label>
                  <Textarea
                    placeholder="支持换行。简要说明通知背景、影响范围和处理建议。"
                    rows={8}
                    value={form.content}
                    onChange={handleChange('content')}
                  />
                  <p className="text-xs text-gray-500">
                    建议控制在 4 段以内，重点信息可以使用换行+空行分段以提升可读性。
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">消息等级</label>
                  <RadioGroup value={form.level} onValueChange={(value) => handleLevelChange(value as SiteMessageLevel)}>
                    {Object.entries(LEVEL_META).map(([key, meta]) => {
                      const Icon = meta.icon
                      return (
                        <label
                          key={key}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                            form.level === key
                              ? 'border-blue-500 bg-blue-50/60 dark:border-blue-400/80 dark:bg-blue-500/10'
                              : 'border-gray-200 hover:border-blue-400 dark:border-gray-700 dark:hover:border-blue-400/80'
                          }`}
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-200">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex flex-1 flex-col">
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value={key} id={`level-${key}`} className="mt-0.5" />
                              <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{meta.label}</span>
                              <Badge variant={meta.badgeVariant}>触达：{meta.label}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{meta.description}</p>
                          </div>
                        </label>
                      )
                    })}
                  </RadioGroup>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">生效时间</label>
                    <Input
                      type="datetime-local"
                      value={form.publishedAt}
                      onChange={handleChange('publishedAt')}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      截止时间 <span className="text-xs text-gray-400">(可选)</span>
                    </label>
                    <Input
                      type="datetime-local"
                      value={form.expiresAt}
                      onChange={handleChange('expiresAt')}
                    />
                  </div>
                </div>

                {selectedId ? (
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
                    <div className="flex flex-col">
                      <span>
                        创建人：{selectedMessage?.creatorEmail || session?.user?.email || '未知'}
                      </span>
                      <span>
                        最后更新：{formatDisplayDate(selectedMessage?.updatedAt ?? null)}
                      </span>
                      <span>
                        邮件通知：
                        {selectedMessage?.emailSentAt
                          ? `已发送（${formatDisplayDate(selectedMessage.emailSentAt)}）`
                          : '未发送'}
                      </span>
                    </div>
                    {selectedMessage?.level !== 'NORMAL' ? (
                      <div className="flex items-center gap-2">
                        <Switch
                          id="resend-email"
                          checked={form.resendEmail}
                          onCheckedChange={(checked) =>
                            setForm((prev) => ({
                              ...prev,
                              resendEmail: checked,
                            }))
                          }
                        />
                        <label htmlFor="resend-email" className="text-xs text-gray-600 dark:text-gray-300">
                          保存时重新发送邮件
                        </label>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <MailCheck className="h-4 w-4" />
                  <span>
                    一般通知和紧急公告会自动向已验证邮箱发送提醒；紧急公告还会在用户登录时弹窗并要求确认。
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {selectedId ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(selectedId)}
                      disabled={saving}
                    >
                      <Trash className="mr-1.5 h-4 w-4" />
                      删除
                    </Button>
                  ) : null}
                  <Button onClick={handleSubmit} disabled={saving || !dirty}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        保存中...
                      </>
                    ) : selectedId ? (
                      '保存更新'
                    ) : (
                      '发布站内消息'
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">最近消息</h3>
                <Badge variant="outline">{messages.length}</Badge>
              </div>

              <div className="space-y-3">
                {loading ? (
                  <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 py-12 text-gray-500 dark:border-gray-700">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    正在加载站内消息...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
                    还没有站内消息。填写左侧内容并点击“发布站内消息”即可创建第一条通知。
                  </div>
                ) : (
                  messages.map((message) => {
                    const meta = LEVEL_META[message.level]
                    const isActive = message.id === selectedId
                    return (
                      <button
                        key={message.id}
                        type="button"
                        onClick={() => handleSelectMessage(message)}
                        className={`w-full rounded-lg border p-4 text-left transition ${
                          isActive
                            ? 'border-blue-500 bg-blue-50/70 dark:border-blue-400/80 dark:bg-blue-500/10'
                            : 'border-gray-200 hover:border-blue-400 dark:border-gray-700 dark:hover:border-blue-400/80'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                              {message.title}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDisplayDate(message.publishedAt)}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-3 text-xs text-gray-500 dark:text-gray-400">
                          {message.content}
                        </p>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
