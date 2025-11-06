'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { MessageCircle, SendHorizonal } from 'lucide-react'

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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const MAX_MESSAGE_LENGTH = 2000

const CATEGORY_OPTIONS = [
  { value: '题库问题', label: '题库问题 / 题目错误' },
  { value: '功能建议', label: '功能建议 / 优化需求' },
  { value: '账号问题', label: '账号与登录问题' },
  { value: '系统Bug', label: '系统故障 / Bug 上报' },
  { value: '其他', label: '其他反馈' },
] as const

export function FeedbackDialog({ className }: { className?: string }) {
  const { data: session } = useSession()
  const { notify } = useNotification()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState<(typeof CATEGORY_OPTIONS)[number]['value']>('题库问题')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    if (session?.user?.email) {
      setEmail(session.user.email)
    }
  }, [session?.user?.email])

  const remaining = useMemo(() => MAX_MESSAGE_LENGTH - message.length, [message])
  const disabled = submitting || message.trim().length < 10 || remaining < 0

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      resetForm()
    }
  }

  const resetForm = () => {
    setSubject('')
    setCategory('题库问题')
    setMessage('')
    setSubmitting(false)
    setEmail(session?.user?.email ?? '')
  }

  const handleSubmit = async () => {
    if (disabled) {
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject,
          category,
          message,
          email,
        }),
      })

      if (response.status === 429) {
        const data = await response.json()
        notify({
          variant: 'warning',
          title: '发送受限',
          description: data?.error ?? '反馈提交过于频繁，请稍后再试。',
        })
        return
      }

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error ?? '反馈发送失败，请稍后再试。')
      }

      notify({
        variant: 'success',
        title: '反馈已发送',
        description: '感谢您的反馈，我们会尽快处理。',
      })
      setOpen(false)
      resetForm()
    } catch (error: any) {
      notify({
        variant: 'danger',
        title: '发送失败',
        description: error?.message ?? '反馈发送失败，请稍后再试。',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cn('flex flex-col items-end gap-3', className)}>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            className="shadow-lg shadow-indigo-500/20 transition hover:scale-105"
            size="lg"
            variant="default"
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            问题反馈
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>提交问题反馈</DialogTitle>
            <DialogDescription>
              如果在使用过程中遇到问题或有任何建议，可在此填写并发送给管理员团队。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">问题分类</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="选择反馈分类" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">主题（可选）</label>
              <Input
                maxLength={120}
                placeholder="简要描述问题主题，例如：A类题库第12题答案疑似错误"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <label className="font-medium text-gray-700 dark:text-gray-200">详细描述</label>
                <span className={remaining < 0 ? 'text-rose-500' : 'text-gray-400'}>
                  {remaining} 字可用
                </span>
              </div>
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                minLength={10}
                maxLength={MAX_MESSAGE_LENGTH}
                rows={6}
                placeholder="请描述您遇到的问题、出现的步骤、期望的行为或其他建议。"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                联系邮箱（可选）
              </label>
              <Input
                type="email"
                placeholder="方便我们与您联系的邮箱，默认使用登录邮箱"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
              取消
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={disabled}>
              {submitting ? (
                <>
                  <SendHorizonal className="mr-2 h-4 w-4 animate-bounce" />
                  发送中...
                </>
              ) : (
                <>
                  <SendHorizonal className="mr-2 h-4 w-4" />
                  发送反馈
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
