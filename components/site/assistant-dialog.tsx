'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Loader2, MessageSquare, SendHorizonal, Sparkles } from 'lucide-react'

import { useNotification } from '@/components/ui/notification-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

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

export function AssistantDialog({ className }: { className?: string }) {
  const { data: session } = useSession()
  const { notify } = useNotification()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

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
    if (!listRef.current) {
      return
    }
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

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
    if (!next) {
      reset()
    }
  }

  const sendMessage = async () => {
    if (disabled) {
      return
    }

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
        throw new Error(payload?.error ?? '请求过于频繁，请稍后重试。')
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
          })
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

  return (
    <div className={cn('flex flex-col items-end gap-3', className)}>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            className="shadow-lg shadow-purple-500/20 transition hover:scale-105"
            size="lg"
            variant="secondary"
          >
            <MessageSquare className="mr-2 h-5 w-5" />
            小助手
          </Button>
        </DialogTrigger>
        <DialogContent className="flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden">
          <DialogHeader className="border-b border-slate-200 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              小助手
            </DialogTitle>
            <DialogDescription>
              与 AI 小助手对话，了解题库、备考建议或系统使用方法。请避免提交隐私或敏感信息。
            </DialogDescription>
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
                  message.role === 'assistant' ? 'justify-start' : 'justify-end'
                )}
              >
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
                    message.role === 'assistant'
                      ? 'bg-white text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700'
                      : 'bg-gradient-to-tr from-indigo-500 to-purple-500 text-white'
                  )}
                >
                  {message.pending ? (
                    <span className="flex items-center gap-2 text-slate-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      正在思考...
                    </span>
                  ) : (
                    message.content.split('\n').map((line, index) => (
                      <span key={index} className={index > 0 ? 'block mt-1' : undefined}>
                        {line}
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                暂无对话，向小助手提一个问题吧。
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={3}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder="请输入您的问题，例如：A 类考试操作题有哪些高频考点？"
              className="resize-none"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>最多 {MAX_MESSAGE_LENGTH} 字</span>
              {session?.user?.email ? <span>以 {session.user.email} 身份提问</span> : <span>未登录用户</span>}
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <Button type="button" variant="outline" onClick={() => setInput('')} disabled={loading || input.length === 0}>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
