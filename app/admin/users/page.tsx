'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Users, RefreshCw, Edit, RotateCcw } from 'lucide-react'

import { AdminPageShell } from '@/components/admin/AdminPageShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useNotification } from '@/components/ui/notification-provider'

interface AdminUser {
  id: string
  email: string
  name?: string | null
  callsign?: string | null
  aiQuotaLimit?: number | null
  aiQuotaUsed: number
  loginDisabled: boolean
  manualExplanationDisabled: boolean
  totalPoints: number
  currentStreak: number
  lastCheckIn?: string | null
  createdAt: string
  updatedAt: string
}

interface UsersResponse {
  users: AdminUser[]
  meta: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
}

interface FormState {
  callsign: string
  aiQuotaLimit: string
  aiQuotaUsed: string
  loginDisabled: boolean
  manualExplanationDisabled: boolean
}

const DEFAULT_FORM: FormState = {
  callsign: '',
  aiQuotaLimit: '',
  aiQuotaUsed: '',
  loginDisabled: false,
  manualExplanationDisabled: false,
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { notify } = useNotification()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [usersErrorType, setUsersErrorType] = useState<'permission' | 'auth' | 'generic' | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [resettingUserId, setResettingUserId] = useState<string | null>(null)

  const [adminEmails, setAdminEmails] = useState<string[]>([])
  const [currentAdminEmail, setCurrentAdminEmail] = useState<string | null>(null)
  const [adminConfigLoaded, setAdminConfigLoaded] = useState(false)

  const adminEmailSet = useMemo(() => new Set(adminEmails), [adminEmails])

  const buildQuery = useCallback(
    (pageNumber: number, keyword?: string) => {
      const params = new URLSearchParams()
      params.set('page', String(pageNumber))
      params.set('limit', '20')
      const value = keyword !== undefined ? keyword : query
      if (value.trim().length > 0) {
        params.set('q', value.trim())
      }
      return params
    },
    [query]
  )

  const loadUsers = useCallback(
    async (pageNumber: number, append = false, keyword?: string) => {
      try {
        if (!append) {
          setLoading(true)
          setUsersError(null)
          setUsersErrorType(null)
        }

        const params = buildQuery(pageNumber, keyword)
        const response = await fetch(`/api/admin/users?${params.toString()}`, {
          cache: 'no-store',
          credentials: 'include',
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          let message = errorData?.error || '获取用户列表失败'
          let type: typeof usersErrorType = 'generic'

          if (response.status === 401) {
            message = '登录状态已失效，请重新登录后再试。'
            type = 'auth'
            router.push('/login')
          } else if (response.status === 403) {
            message = '权限不足：当前账号不在管理员名单中，无法查看用户列表。'
            type = 'permission'
          }

          setUsersError(message)
          setUsersErrorType(type)

          if (response.status !== 403) {
            notify({
              variant: 'danger',
              title: '加载失败',
              description: message,
            })
          }
          return
        }

        const data: UsersResponse = await response.json()
        const list = data.users ?? []

        setUsers((prev) => (append ? [...prev, ...list] : list))
        setPage(data.meta?.page ?? pageNumber)
        setHasMore(Boolean(data.meta?.hasMore))
      } catch (error: any) {
        console.error('[admin][users] load failed:', error)
        const fallback = error?.message || '无法获取用户列表，请稍后再试。'
        setUsersError(fallback)
        setUsersErrorType('generic')
        notify({
          variant: 'danger',
          title: '加载失败',
          description: fallback,
        })
      } finally {
        if (!append) {
          setLoading(false)
        }
      }
    },
    [buildQuery, notify, router]
  )

  const loadAdminConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/config', {
        cache: 'no-store',
        credentials: 'include',
      })
      if (!response.ok) {
        if (response.status === 403) {
          setAdminEmails([])
          setCurrentAdminEmail(null)
          return
        }

        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '获取管理员配置失败')
      }

      const payload = await response.json()
      const summary = payload?.data ?? {}
      setAdminEmails(Array.isArray(summary.adminEmails) ? summary.adminEmails : [])
      setCurrentAdminEmail(summary.currentUser ?? null)
    } catch (error: any) {
      console.error('[admin][users] load admin config failed:', error)
      notify({
        variant: 'warning',
        title: '获取管理员信息失败',
        description: (error as Error)?.message || '无法获取管理员邮箱配置，请稍后再试。',
      })
    } finally {
      setAdminConfigLoaded(true)
    }
  }, [notify])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      loadUsers(1)
      loadAdminConfig()
    }
  }, [status, router, loadUsers, loadAdminConfig])

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const keyword = searchInput.trim()
    setQuery(keyword)
    await loadUsers(1, false, keyword)
  }

  const handleManualRefresh = async () => {
    setRefreshing(true)
    await loadUsers(1, false, query)
    setRefreshing(false)
  }

  const openEditDialog = (user: AdminUser) => {
    setEditingUser(user)
    setFormState({
      callsign: user.callsign ?? '',
      aiQuotaLimit:
        user.aiQuotaLimit === null || user.aiQuotaLimit === undefined
          ? ''
          : String(user.aiQuotaLimit),
      aiQuotaUsed: String(user.aiQuotaUsed ?? 0),
      loginDisabled: user.loginDisabled,
      manualExplanationDisabled: user.manualExplanationDisabled,
    })
  }

  const closeDialog = () => {
    setEditingUser(null)
    setFormState(DEFAULT_FORM)
  }

  const handleFormChange = (field: keyof FormState, value: string | boolean) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!editingUser) return

    setSubmitting(true)
    try {
      const body = {
        callsign: formState.callsign.trim() || null,
        aiQuotaLimit:
          formState.aiQuotaLimit.trim().length === 0
            ? null
            : Number(formState.aiQuotaLimit.trim()),
        aiQuotaUsed:
          formState.aiQuotaUsed.trim().length === 0
            ? 0
            : Number(formState.aiQuotaUsed.trim()),
        loginDisabled: formState.loginDisabled,
        manualExplanationDisabled: formState.manualExplanationDisabled,
      }

      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '保存用户信息失败')
      }

      const data = await response.json()
      const updatedUser: AdminUser | undefined = data.user
      if (updatedUser) {
        setUsers((prev) => prev.map((item) => (item.id === updatedUser.id ? updatedUser : item)))
      }

      notify({ variant: 'success', title: '保存成功', description: '用户信息已更新。' })
      closeDialog()
    } catch (error: any) {
      console.error('[admin][users] update failed:', error)
      notify({
        variant: 'danger',
        title: '保存失败',
        description: error?.message || '无法保存用户信息，请稍后重试。',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = async (user: AdminUser) => {
    const confirmed = window.confirm(`确定要重置用户 ${user.email} 的积分和配额信息吗？`)
    if (!confirmed) return

    setResettingUserId(user.id)
    try {
      const response = await fetch(`/api/admin/users/${user.id}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({ resetPoints: true, resetQuota: true, reactivate: true }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '重置用户信息失败')
      }

      const data = await response.json()
      const updatedUser: AdminUser | undefined = data.user
      if (updatedUser) {
        setUsers((prev) => prev.map((item) => (item.id === updatedUser.id ? updatedUser : item)))
      }

      notify({ variant: 'success', title: '重置成功', description: '用户信息已重置。' })
    } catch (error: any) {
      console.error('[admin][users] reset failed:', error)
      notify({
        variant: 'danger',
        title: '重置失败',
        description: error?.message || '无法重置用户信息，请稍后重试。',
      })
    } finally {
      setResettingUserId(null)
    }
  }

  const quotaLabel = useMemo(() => {
    if (!editingUser) return ''
    const limit = editingUser.aiQuotaLimit
    if (limit === null || limit === undefined) {
      return `当前限制：不限次数，已用 ${editingUser.aiQuotaUsed} 次`
    }
    const remaining = Math.max(limit - editingUser.aiQuotaUsed, 0)
    return `当前限制 ${limit} 次，已用 ${editingUser.aiQuotaUsed} 次，剩余 ${remaining} 次`
  }, [editingUser])

  if (status === 'loading') {
    return (
      <AdminPageShell maxWidthClassName="max-w-6xl">
        <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">加载中…</div>
      </AdminPageShell>
    )
  }

  if (status === 'unauthenticated' || !session) {
    return (
      <AdminPageShell maxWidthClassName="max-w-6xl">
        <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">正在跳转到登录页面…</div>
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell maxWidthClassName="max-w-6xl" contentClassName="space-y-6 pb-16">
      <>
        <Card className="border-slate-200/70 bg-white/80 shadow-sm ring-1 ring-slate-900/5 dark:border-slate-800/60 dark:bg-slate-900/60 dark:ring-white/5">
            <CardHeader className="flex flex-col gap-6 border-b border-slate-200/70 pb-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800/60">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-500/15 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300">
                  <Users className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-semibold text-slate-900 dark:text-slate-100">用户管理</CardTitle>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    配置管理员权限、调整 AI 配额和登录状态，必要时重置用户的使用数据。
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <form onSubmit={handleSearch} className="flex items-center gap-2">
                  <Input
                    placeholder="搜索邮箱、姓名或呼号"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    className="w-64"
                  />
                  <Button type="submit" disabled={loading}>
                    搜索
                  </Button>
                </form>
                <Button
                  variant="outline"
                  onClick={handleManualRefresh}
                  disabled={refreshing || loading}
                  className="border-slate-200/70 text-slate-600 hover:border-sky-300 hover:text-sky-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-300"
                >
                  {refreshing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      刷新中…
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      刷新
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {usersError ? (
                <div
                  className="mb-6 rounded-lg border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
                >
                  <p>{usersError}</p>
                  {usersErrorType === 'permission' ? (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-200">
                      请确认当前登录邮箱已配置在环境变量 <code className="rounded bg-amber-100/80 px-1 text-[11px] text-amber-800 dark:bg-amber-500/20 dark:text-amber-100">ADMIN_EMAILS</code> 中，或联系站点管理员授权。
                    </p>
                  ) : null}
                </div>
              ) : null}
              {adminConfigLoaded ? (
                adminEmails.length > 0 ? (
                  <div className="mb-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">管理员概览</h3>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">当前共 {adminEmails.length} 位管理员账号。</p>
                        </div>
                        <Badge variant="secondary">共 {adminEmails.length} 人</Badge>
                      </div>
                      {currentAdminEmail && (
                        <div className="mt-3 rounded-md border border-sky-200/70 bg-sky-50/80 p-3 text-xs text-sky-700 dark:border-sky-500/50 dark:bg-sky-500/10 dark:text-sky-200">
                          当前登录账号 {currentAdminEmail} 拥有管理员权限。
                        </div>
                      )}
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                        如需调整管理员名单，请更新环境变量 <code className="rounded bg-slate-100 px-1 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-200">ADMIN_EMAILS</code> 并重启服务。
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">管理员邮箱列表</h3>
                      <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                        {adminEmails.map((email) => (
                          <li key={email} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-800/80">
                            <span>{email}</span>
                            {email === currentAdminEmail && (
                              <Badge variant="outline" className="border-green-200 text-green-600 dark:border-green-500/60 dark:text-green-300">
                                当前登录
                              </Badge>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
                    尚未读取到管理员配置，请检查环境变量 <code className="rounded bg-slate-100 px-1 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-200">ADMIN_EMAILS</code>。
                  </div>
                )
              ) : (
                <div className="mb-6 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
                  正在加载管理员配置…
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                  <thead className="bg-slate-100/80 dark:bg-slate-900/60">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">用户</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">AI 配额</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">状态</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">积分</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">最近签到</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white/80 dark:divide-slate-800 dark:bg-slate-900/40">
                    {users.length === 0 && !loading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                          暂无用户数据
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => {
                        const quotaLimit = user.aiQuotaLimit
                        const quotaUsed = user.aiQuotaUsed ?? 0
                        const quotaRemaining =
                          quotaLimit === null || quotaLimit === undefined
                            ? '不限'
                            : `${Math.max(quotaLimit - quotaUsed, 0)} 次`

                        return (
                          <tr key={user.id} className="transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-800/60">
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-slate-900 dark:text-slate-100">{user.email}</span>
                                  {adminEmailSet.has(user.email) && (
                                    <Badge variant="outline" className="border-amber-300 text-amber-600 dark:border-amber-500/60 dark:text-amber-300">
                                      管理员
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {user.callsign ? `呼号：${user.callsign}` : '未设置呼号'}
                                </span>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                              <div className="flex flex-col gap-1">
                                <span>
                                  已用 {quotaUsed} 次
                                  {quotaLimit !== null && quotaLimit !== undefined ? ` / 限额 ${quotaLimit}` : ' / 不限'}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">剩余：{quotaRemaining}</span>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={user.loginDisabled ? 'destructive' : 'secondary'}>
                                  {user.loginDisabled ? '登录已禁用' : '可登录'}
                                </Badge>
                                <Badge variant={user.manualExplanationDisabled ? 'destructive' : 'secondary'}>
                                  {user.manualExplanationDisabled ? '人工解析禁用' : '人工解析启用'}
                                </Badge>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                              <div className="flex flex-col">
                                <span>积分：{user.totalPoints}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">连续签到：{user.currentStreak} 天</span>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                              {user.lastCheckIn ? (
                                new Date(user.lastCheckIn).toLocaleString()
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500">暂未签到</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => openEditDialog(user)}>
                                  <Edit className="mr-1 h-4 w-4" />
                                  编辑
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReset(user)}
                                  disabled={resettingUserId === user.id}
                                >
                                  <RotateCcw className="mr-1 h-4 w-4" />
                                  {resettingUserId === user.id ? '重置中…' : '重置'}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {loading && (
                <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">正在加载用户数据…</p>
              )}

              {hasMore && !loading && (
                <div className="mt-6 text-center">
                  <Button variant="outline" onClick={() => loadUsers(page + 1, true, query)}>
                    加载更多
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

        <Dialog open={Boolean(editingUser)} onOpenChange={(open) => (!open ? closeDialog() : undefined)}>
          <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingUser ? `编辑用户：${editingUser.email}` : '编辑用户'}</DialogTitle>
            <DialogDescription>{editingUser ? quotaLabel : ''}</DialogDescription>
          </DialogHeader>

          {editingUser && adminEmailSet.has(editingUser.email) && (
            <div className="mx-6 -mb-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-500/60 dark:bg-amber-500/10 dark:text-amber-200">
              该账号属于管理员，权限由环境变量 <code className="rounded bg-amber-100 px-1 text-[11px] text-amber-700 dark:bg-amber-500/20 dark:text-amber-100">ADMIN_EMAILS</code> 控制，无法在此页面移除。
            </div>
          )}

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">呼号</label>
                <Input
                  value={formState.callsign}
                  onChange={(event) => handleFormChange('callsign', event.target.value)}
                  placeholder="可填写无线电呼号，留空表示移除"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">AI 配额上限</label>
                <Input
                  value={formState.aiQuotaLimit}
                  onChange={(event) => handleFormChange('aiQuotaLimit', event.target.value)}
                  type="number"
                  min={0}
                  placeholder="空值表示不限次数"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">AI 已使用次数</label>
              <Input
                value={formState.aiQuotaUsed}
                onChange={(event) => handleFormChange('aiQuotaUsed', event.target.value)}
                type="number"
                min={0}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border border-slate-200/80 p-3 dark:border-slate-700/80">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">禁用登录</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">禁止该用户登录网站。</p>
                </div>
                <Switch
                  checked={formState.loginDisabled}
                  onCheckedChange={(checked) => handleFormChange('loginDisabled', checked)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200/80 p-3 dark:border-slate-700/80">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">禁用人工解析</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">禁止用户发布人工解析内容。</p>
                </div>
                <Switch
                  checked={formState.manualExplanationDisabled}
                  onCheckedChange={(checked) => handleFormChange('manualExplanationDisabled', checked)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={submitting}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={submitting}>
              {submitting ? '保存中…' : '保存修改'}
            </Button>
          </DialogFooter>
        </DialogContent>
        </Dialog>
      </>
    </AdminPageShell>
  )
}
