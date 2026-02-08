'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { 
  Loader2, 
  RotateCcw, 
  SendHorizonal, 
  X, 
  Bot, 
  User as UserIcon,
  Sparkles
} from 'lucide-react'
import 'katex/dist/katex.min.css'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

import { useNotification } from '@/components/ui/notification-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
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
  '你好！我是小助手，可以回答关于题库、考试准备和系统使用的相关问题。请问有什么可以帮到你？'

const AssistantIcon = ({ className, size = 32 }: { className?: string; size?: number }) => (
  <div className={cn("relative flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm", className)} style={{ width: size, height: size }}>
    <Bot className="text-white" size={size * 0.6} />
  </div>
)

export function AssistantDialog({ className }: { className?: string }) {
  const { data: session, status } = useSession()
  const { notify } = useNotification()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [assistantName, setAssistantName] = useState('无线电助手')
  const listRef = useRef<HTMLDivElement | null>(null)
  
  const identityLabel = session?.user
    ? getUserDisplayName({
        callsign: session.user.callsign,
        name: session.user.name,
        email: session.user.email,
      })
    : '访客'

  useEffect(() => {
    if (status === 'authenticated') {
      const fetchConfig = async () => {
        try {
          const [settingsRes, presetsRes] = await Promise.all([
            fetch('/api/user/settings'),
            fetch('/api/ai/style-presets')
          ])

          if (settingsRes.ok && presetsRes.ok) {
            const settingsData = await settingsRes.json()
            const presetsData = await presetsRes.json()

            const presetId = settingsData.settings?.aiStylePresetId
            
            if (presetId) {
              const presets = Array.isArray(presetsData.presets) ? presetsData.presets : []
              const preset = presets.find((p: any) => p.id === presetId)
              if (preset) {
                setAssistantName(preset.name)
              }
            }
          }
        } catch (error) {
          console.error('Failed to fetch assistant config:', error)
        }
      }
      fetchConfig()
    }
  }, [status])

  useEffect(() => {
    if (!open) return
    if (messages.length === 0) {
      setMessages([
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: WELCOME_MESSAGE.replace('小助手', assistantName),
        },
      ])
    }
  }, [open, messages.length, assistantName])

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
    } catch (error: unknown) {
      setMessages((prev) => prev.filter((item) => item.id !== pendingId))
      notify({
        variant: 'danger',
        title: '发送失败',
        description: error instanceof Error ? error.message : '请求失败，请稍后再试。',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (status === 'loading' || !session?.user) {
    return null
  }

  const renderMessageContent = (message: AssistantMessage) => {
    if (message.pending) {
      return (
        <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="animate-pulse">正在思考...</span>
        </span>
      )
    }

    if (message.role === 'assistant') {
      return (
        <div className="markdown-body text-sm leading-relaxed text-slate-700 dark:text-slate-200">
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      )
    }

    return (
      <div className="whitespace-pre-wrap text-sm leading-relaxed">
        {message.content}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col items-end gap-3', className)}>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            className="h-12 w-12 rounded-full shadow-lg shadow-purple-500/20 transition-all hover:scale-110 hover:shadow-purple-500/30 sm:h-auto sm:w-auto sm:rounded-md sm:px-4 sm:py-2"
            size="default"
            variant="default" // Changed to primary/default for better visibility
            aria-label="打开小助手"
          >
            <Sparkles className="h-5 w-5 sm:mr-2" />
            <span className="hidden sm:inline">{assistantName}</span>
          </Button>
        </DialogTrigger>
        
        {/* Responsive Dialog Content: Fullscreen on mobile, Modal on desktop */}
        <DialogContent 
          showCloseButton={false}
          className="flex h-[100dvh] w-full max-w-none flex-col gap-0 p-0 sm:h-[85vh] sm:max-w-[480px] sm:rounded-2xl border-none sm:border"
        >
          {/* Header */}
          <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
            <div className="flex items-center gap-3">
              <AssistantIcon size={36} />
              <div className="flex flex-col">
                <DialogTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {assistantName}
                </DialogTitle>
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Online
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleResetConversation}
                disabled={messages.length <= 1 && input.length === 0}
                title="重置对话"
                className="h-8 w-8 text-slate-500 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-400"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <DialogClose asChild>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                >
                  <X className="h-5 w-5" />
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>

          {/* Message List */}
          <div
            ref={listRef}
            className="flex-1 space-y-6 overflow-y-auto bg-slate-50/50 p-4 custom-scrollbar dark:bg-slate-950/50"
          >
            {messages.map((message) => {
              const isAi = message.role === 'assistant';
              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex w-full gap-3',
                    isAi ? 'justify-start' : 'justify-end'
                  )}
                >
                  {isAi && (
                    <div className="mt-1 flex-shrink-0">
                       <AssistantIcon size={28} className="shadow-none" />
                    </div>
                  )}
                  
                  <div
                    className={cn(
                      'relative max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm',
                      isAi
                        ? 'rounded-tl-none bg-white text-slate-800 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800'
                        : 'rounded-tr-none bg-purple-600 text-white dark:bg-purple-600'
                    )}
                  >
                    {renderMessageContent(message)}
                  </div>

                  {!isAi && (
                    <div className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800">
                      <UserIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    </div>
                  )}
                </div>
              )
            })}
            
            {/* Empty State Hint */}
            {messages.length === 1 && (
               <div className="mt-8 flex flex-col items-center gap-2 text-center text-xs text-slate-400 dark:text-slate-500 px-8">
                  <p>尝试问我：</p>
                  <div className="flex flex-wrap justify-center gap-2 mt-2">
                    {['A类考试需要准备什么？', '什么是“操作证书”？', '如何使用这个系统？'].map(q => (
                      <button 
                        key={q}
                        onClick={() => setInput(q)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
               </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="relative rounded-xl border border-slate-200 bg-slate-50 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500 dark:border-slate-800 dark:bg-slate-900/50 dark:focus-within:border-purple-500">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder="输入问题 (Cmd + Enter 发送)"
                className="min-h-[48px] max-h-[120px] w-full resize-none border-none bg-transparent px-4 py-3 text-sm focus-visible:ring-0 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                }}
              />
              <div className="flex items-center justify-between px-2 pb-2">
                <span className="px-2 text-[10px] text-slate-400 dark:text-slate-500">
                  {remaining > 0 ? identityLabel : '字数超限'}
                </span>
                <Button 
                  type="button" 
                  onClick={sendMessage} 
                  disabled={disabled}
                  size="sm"
                  className={cn(
                    "h-8 w-8 rounded-lg p-0 transition-all",
                    input.trim().length > 0 
                      ? "bg-purple-600 hover:bg-purple-700 text-white" 
                      : "bg-slate-200 text-slate-400 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-500"
                  )}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <SendHorizonal className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
