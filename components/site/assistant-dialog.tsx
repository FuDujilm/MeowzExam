'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Loader2, RotateCcw, SendHorizonal } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

import { useNotification } from '@/components/ui/notification-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { getUserDisplayName } from '@/lib/users/display-name'

type AssistantRole = 'user' | 'assistant'

interface AssistantMessage {
  id: string
  role: AssistantRole
  content: string
  pending?: boolean
}

const MAX_CHAT_HISTORY = 10
const MAX_MESSAGE_LENGTH = 1200

const WELCOME_MESSAGE =
  '你好！我是“小助手”，可以回答关于题库、考试准备和系统使用的相关问题。请问有什么可以帮到你？'

const AssistantIcon = ({ className, size = 32 }: { className?: string; size?: number }) => (
  <img
    src="/fox.webp"
    alt="小助手"
    width={size}
    height={size}
    loading="lazy"
    decoding="async"
    className={cn('rounded-full object-cover', className)}
  />
)

export function AssistantDialog({ className }: { className?: string }) {
  const { data: session, status } = useSession()
  const { notify } = useNotification()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)
  const identityLabel = session?.user
    ? getUserDisplayName({
        callsign: session.user.callsign,
        name: session.user.name,
        email: session.user.email,
      })
    : '当前账号'

  useEffect(() => {
    if (!open) return
    if (messages.length === 0) {
      setMessages([
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: WELCOME_MESSAGE,
        },
      ])
    }
  }, [open, messages.length])

  useEffect(() => {
    if (!listRef.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  const remaining = useMemo(() => MAX_MESSAGE_LENGTH - input.length, [input])

  const disabled = useMemo(() => {
    const trimmed = input.trim()
    return loading || trimmed.length === 0 || trimmed.length > MAX_MESSAGE_LENGTH
  }, [input, loading])

  const reset = () => {
    setInput('')
    setMessages([])
    setLoading(false)
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
  }

  const handleResetConversation = () => {
    reset()
  }

  const sendMessage = async () => {
    if (disabled) return

    const trimmed = input.trim()
    const userMessage: AssistantMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
    }

    const newMessages = [...messages.slice(-MAX_CHAT_HISTORY + 1), userMessage]
    const pendingId = crypto.randomUUID()
    const pendingMessage: AssistantMessage = {
      id: pendingId,
      role: 'assistant',
      content: '正在思考...',
      pending: true,
    }

    setMessages([...newMessages, pendingMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      })

      if (response.status === 429) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? '请求过于频繁，请稍后再试。')
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? '小助手暂时无法响应，请稍后再试。')
      }

      const payload = (await response.json()) as { reply: string }
      setMessages((prev) =>
        prev
          .filter((item) => item.id !== pendingId)
          .concat({
            id: crypto.randomUUID(),
            role: 'assistant',
            content: payload.reply.trim(),
          }),
      )
    } catch (error: any) {
      setMessages((prev) => prev.filter((item) => item.id !== pendingId))
      notify({
        variant: 'danger',
        title: '发送失败',
        description: error?.message ?? '请求失败，请稍后再试。',
      })
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || !session?.user) {
    return null
  }

  const renderMessageContent = (message: AssistantMessage) => {
    if (message.pending) {
      return (
        <span className="flex items-center gap-2 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在思考...
        </span>
      )
    }

    if (message.role === 'assistant') {
      return (
        <div className="markdown-body text-sm leading-relaxed text-slate-700 dark:text-slate-100">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      )
    }

    return message.content.split('\n').map((line, index) => (
      <span key={index} className={index > 0 ? 'mt-1 block' : undefined}>
        {line}
      </span>
    ))
  }

  return (
    <div className={cn('flex flex-col items-end gap-3', className)}>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            className="shadow-lg shadow-purple-500/20 transition hover:scale-105"
            size="lg"
            variant="secondary"
            aria-label="打开小助手"
          >
            <AssistantIcon className="h-5 w-5 sm:mr-2" />
            <span className="hidden sm:inline">小助手</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="flex max-h-[78vh] w-full max-w-2xl flex-col overflow-hidden">
          <DialogHeader className="border-b border-slate-200/80 pb-4 dark:border-slate-800/70">
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <AssistantIcon className="h-8 w-8" />
                  AI 小助手
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  关闭窗口不会清空对话，若需重新开始请点击「重置对话」。请避免输入隐私或敏感信息。
                </DialogDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetConversation}
                disabled={messages.length === 0 && input.length === 0}
                className="text-slate-600 hover:text-purple-600 dark:text-slate-300 dark:hover:text-purple-300"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                重置对话
              </Button>
            </div>
          </DialogHeader>

          <div
            ref={listRef}
            className="custom-scrollbar flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-900/60"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex w-full',
                  message.role === 'assistant' ? 'justify-start' : 'justify-end',
                )}
              >
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
                    message.role === 'assistant'
                      ? 'bg-white text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700'
                      : 'bg-gradient-to-tr from-indigo-500 to-purple-500 text-white',
                  )}
                >
                    {renderMessageContent(message)}
                  </div>
                </div>
            ))}
            {messages.length === 0 && (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                暂无对话，向小助手提一个问题吧。
              </div>
            )}
          </div>

          <div className="border-t border-slate-200/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/50">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>以 {identityLabel} 身份提问</span>
              <span>{remaining} / {MAX_MESSAGE_LENGTH}</span>
            </div>
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={4}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder="请输入您的问题，例如：A 类操作考试有哪些高频考点？"
              className="resize-none border-slate-200/70 bg-white/90 dark:border-slate-800/70 dark:bg-slate-900/40"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setInput('')}
                disabled={loading || input.length === 0}
              >
                清空输入
              </Button>
              <Button type="button" onClick={sendMessage} disabled={disabled}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    小助手思考中...
                  </>
                ) : (
                  <>
                    <SendHorizonal className="mr-2 h-4 w-4" />
                    发送
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
