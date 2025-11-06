'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Bell, CheckCircle2, Loader2, Mail, RefreshCw } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type SiteMessageLevel = 'NORMAL' | 'GENERAL' | 'URGENT'

interface SiteMessagePayload {
  id: string
  title: string
  content: string
  level: SiteMessageLevel
  publishedAt: string
  expiresAt: string | null
  emailSentAt: string | null
  createdAt: string
  updatedAt: string
  readAt: string | null
  confirmedAt: string | null
  isRead: boolean
  isConfirmed: boolean
  requiresConfirmation: boolean
}

type LevelMeta = {
  label: string
  badgeClass: string
  accentClass: string
}

const LEVEL_META: Record<SiteMessageLevel, LevelMeta> = {
  NORMAL: {
    label: '普通',
    badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200',
    accentClass: 'border-slate-200 dark:border-slate-700',
  },
  GENERAL: {
    label: '通知',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200',
    accentClass: 'border-blue-200 dark:border-blue-600/60',
  },
  URGENT: {
    label: '紧急',
    badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200',
    accentClass: 'border-rose-200 dark:border-rose-600/60',
  },
}

function renderContent(content: string) {
  return content
    .trim()
    .split(/\n{2,}/)
    .map((block, index) => {
      const lines = block.split('\n')
      return (
        <p key={index} className="text-sm leading-relaxed text-slate-600 dark:text-slate-200">
          {lines.map((line, lineIndex) => (
            <span key={lineIndex}>
              {line}
              {lineIndex < lines.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>
      )
    })
}

function formatDateTime(value: string | null) {
  if (!value) {
    return null
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return date.toLocaleString('zh-CN')
}

interface SiteMessageCenterProps {
  className?: string
}

export function SiteMessageCenter({ className }: SiteMessageCenterProps) {
  const [messages, setMessages] = useState<SiteMessagePayload[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [urgentMessage, setUrgentMessage] = useState<SiteMessagePayload | null>(null)
  const [urgentOpen, setUrgentOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [confirming, setConfirming] = useState(false)

  const hasMessages = messages.length > 0
  const unreadLabel = useMemo(() => {
    if (unreadCount === 0) return '全部已读'
    if (unreadCount > 99) return '99+ 未读'
    return `${unreadCount} 条未读`
  }, [unreadCount])

  const fetchMessages = async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') {
      setLoading(true)
    } else {
      setRefreshing(true)
    }
    setError(null)
    try {
      const response = await fetch('/api/messages', { cache: 'no-store' })
      if (response.status === 401 || response.status === 403) {
        setMessages([])
        setUnreadCount(0)
        setUrgentMessage(null)
        setUrgentOpen(false)
        return
      }

      if (!response.ok) {
        const fallback = await response.json().catch(() => ({}))
        throw new Error(
          typeof fallback?.error === 'string' && fallback.error.trim().length > 0
            ? fallback.error
            : '无法获取站内消息'
        )
      }
      const data = (await response.json()) as {
        messages: SiteMessagePayload[]
        unreadCount: number
        urgentMessage: SiteMessagePayload | null
      }
      setMessages(data.messages)
      setUnreadCount(data.unreadCount)
      if (data.urgentMessage) {
        setUrgentMessage(data.urgentMessage)
        setUrgentOpen(true)
      } else if (mode === 'refresh') {
        setUrgentMessage(null)
        setUrgentOpen(false)
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('站内消息加载失败')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void fetchMessages('initial')
  }, [])

  useEffect(() => {
    if (open) {
      void fetchMessages('refresh')
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }
    const unreadIds = messages.filter((item) => !item.isRead).map((item) => item.id)
    if (unreadIds.length === 0) {
      return
    }
    let cancelled = false
    const markRead = async () => {
      try {
        await fetch('/api/messages/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageIds: unreadIds }),
        })
        if (!cancelled) {
          setMessages((prev) =>
            prev.map((item) =>
              unreadIds.includes(item.id)
                ? { ...item, isRead: true, readAt: new Date().toISOString() }
                : item
            )
          )
          setUnreadCount((prev) => Math.max(0, prev - unreadIds.length))
        }
      } catch (err) {
        console.error('[site-messages] 标记已读失败:', err)
      }
    }
    markRead().catch((error) => console.error(error))
    return () => {
      cancelled = true
    }
  }, [open, messages])

  const confirmUrgentMessage = async () => {
    if (!urgentMessage) {
      setUrgentOpen(false)
      return
    }
    try {
      setConfirming(true)
      const response = await fetch('/api/messages/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: urgentMessage.id }),
      })
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || '确认失败，请稍后重试')
      }
      setMessages((prev) =>
        prev.map((item) =>
          item.id === urgentMessage.id
            ? {
                ...item,
                isRead: true,
                readAt: item.readAt ?? new Date().toISOString(),
                isConfirmed: true,
                confirmedAt: new Date().toISOString(),
              }
            : item
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - (urgentMessage.isRead ? 0 : 1)))
      setUrgentOpen(false)
      setUrgentMessage(null)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : '确认紧急消息失败，请稍后重试。')
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <button
        type="button"
        className={`relative flex items-center gap-2 rounded-md border border-transparent px-3 py-1.5 text-sm text-gray-500 transition hover:text-blue-600 dark:text-gray-300 ${className ?? ''}`}
        disabled
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        正在加载
      </button>
    )
  }

  if (error && !hasMessages) {
    return (
      <button
        type="button"
        className={`relative flex items-center gap-2 rounded-md border border-transparent px-3 py-1.5 text-sm text-red-600 transition hover:text-red-500 dark:text-red-400 ${className ?? ''}`}
        onClick={() => fetchMessages('refresh')}
      >
        <AlertTriangle className="h-4 w-4" />
        站内消息异常
      </button>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`relative flex items-center gap-2 rounded-md border border-transparent px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-blue-50 hover:text-blue-600 dark:text-gray-200 dark:hover:bg-blue-500/10 dark:hover:text-blue-200 ${className ?? ''}`}
      >
        <Bell className="h-4 w-4" />
        站内消息
        {unreadCount > 0 ? (
          <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-red-500" />
        ) : null}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-lg">
              <span>站内消息</span>
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">{unreadLabel}</span>
            </DialogTitle>
            <DialogDescription className="flex items-center justify-between">
              <span>查看所有系统通知与提醒，紧急通知会要求单独确认。</span>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 text-sm"
                onClick={() => fetchMessages('refresh')}
                disabled={refreshing}
              >
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                刷新
              </Button>
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/70 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          ) : null}

          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
                暂无站内消息。完成练习、查看活动或系统维护时会在此提示。
              </div>
            ) : (
              messages.map((message) => {
                const meta = LEVEL_META[message.level]
                const published = formatDateTime(message.publishedAt)
                const expires = formatDateTime(message.expiresAt)
                return (
                  <div
                    key={message.id}
                    className={`rounded-xl border p-4 shadow-sm transition ${meta.accentClass} ${
                      message.level === 'URGENT'
                        ? 'bg-rose-50/70 dark:bg-rose-500/10'
                        : 'bg-white dark:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Badge className={meta.badgeClass}>{meta.label}</Badge>
                          {!message.isRead ? (
                            <Badge variant="outline" className="border-red-300 text-red-600 dark:border-red-500/60 dark:text-red-200">
                              未读
                            </Badge>
                          ) : null}
                          {message.requiresConfirmation ? (
                            <Badge variant="outline" className="border-amber-300 text-amber-600 dark:border-amber-500/60 dark:text-amber-200">
                              需确认
                            </Badge>
                          ) : null}
                        </div>
                        <h4 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                          {message.title}
                        </h4>
                      </div>
                      {message.isConfirmed ? (
                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-300">
                          <CheckCircle2 className="h-4 w-4" />
                          已确认
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 space-y-3">{renderContent(message.content)}</div>
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      {published ? <span>发布时间：{published}</span> : null}
                      {expires ? <span>有效期至：{expires}</span> : null}
                      {message.emailSentAt ? <span>邮件通知：{formatDateTime(message.emailSentAt)}</span> : null}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={urgentOpen} onOpenChange={setUrgentOpen}>
        <DialogContent className="max-w-lg border-rose-200/60 bg-rose-50/95 dark:border-rose-500/40 dark:bg-rose-500/10">
          <DialogHeader>
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-200">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle>紧急通知</DialogTitle>
            </div>
            <DialogDescription className="text-sm text-rose-700 dark:text-rose-100">
              请仔细阅读以下内容并点击确认，继续使用系统。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {urgentMessage?.title}
            </h3>
            <div className="space-y-3">{urgentMessage ? renderContent(urgentMessage.content) : null}</div>
            <div className="flex flex-col gap-1 text-xs text-rose-600/90 dark:text-rose-200/80">
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                已同步发送邮件通知，请及时查收。
              </span>
              {urgentMessage?.publishedAt ? (
                <span>发布时间：{formatDateTime(urgentMessage.publishedAt)}</span>
              ) : null}
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              onClick={confirmUrgentMessage}
              variant="destructive"
              className="min-w-[140px]"
              disabled={confirming}
            >
              {confirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  确认中...
                </>
              ) : (
                '我已知晓'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
