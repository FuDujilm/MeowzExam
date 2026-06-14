'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useNotification } from '@/components/ui/notification-provider'

export function GuestMigrationPrompt() {
  const { status } = useSession()
  const { notify } = useNotification()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status !== 'authenticated') {
      setOpen(false)
      return
    }

    let cancelled = false
    fetch('/api/user/guest-migration', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data?.required) {
          setOpen(true)
        }
      })
      .catch((error) => {
        console.error('Load guest migration status failed:', error)
      })

    return () => {
      cancelled = true
    }
  }, [status])

  const submit = async () => {
    const trimmedCode = code.trim()
    if (!trimmedCode) {
      notify({
        variant: 'warning',
        title: '请输入迁移码',
        description: '迁移码来自你匿名使用时生成的本地数据迁移码。',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/user/guest-migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmedCode }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || '迁移失败')
      }
      notify({
        variant: 'success',
        title: '迁移完成',
        description: '匿名练习、错题、收藏和考试记录已合并到当前账号。',
      })
      setOpen(false)
    } catch (error: any) {
      notify({
        variant: 'danger',
        title: '迁移失败',
        description: error?.message || '请检查迁移码后重试。',
      })
    } finally {
      setLoading(false)
    }
  }

  const skip = async () => {
    setLoading(true)
    try {
      await fetch('/api/user/guest-migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'skip' }),
      })
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => setOpen(nextOpen)}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>迁移匿名数据</DialogTitle>
          <DialogDescription>
            如果你注册前使用过匿名练习，请输入当时生成的迁移码。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="guest-migration-code">迁移码</Label>
          <Input
            id="guest-migration-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="例如 ABCD1234"
            autoComplete="off"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={skip} disabled={loading}>
            暂不迁移
          </Button>
          <Button onClick={submit} disabled={loading}>
            {loading ? '处理中...' : '确认迁移'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
