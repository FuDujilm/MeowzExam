'use client'

import { useEffect, useMemo, useState } from 'react'

import { AdminPageShell } from '@/components/admin/AdminPageShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AuditLog {
  id: string
  action: string
  entityType?: string | null
  entityId?: string | null
  details?: Record<string, any> | null
  createdAt: string
  user?: {
    id: string
    email: string
  } | null
}

const ACTION_LABELS: Record<string, string> = {
  AI_EXPLANATION_GENERATED: 'AI解析生成',
  AI_EXPLANATION_SKIPPED: 'AI解析缓存',
  AI_EXPLANATION_ERROR: 'AI解析异常',
  MANUAL_EXPLANATION_UPDATED: '人工解析更新',
  QUESTIONS_IMPORTED: '题库导入',
  QUESTIONS_IMPORT_ERROR: '题库导入异常',
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState<string>('all')

  const loadLogs = async (signal?: AbortSignal) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.set('limit', '100')

      if (actionFilter !== 'all') {
        params.set('action', actionFilter)
      }

      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '获取审计日志失败')
      }

      const data = await response.json()
      setLogs(data.logs || [])
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return
      }
      console.error('Failed to load audit logs:', err)
      setError(err.message || '获取审计日志失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    loadLogs(controller.signal)
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter])

  const actionOptions = useMemo(() => {
    return [
      { value: 'all', label: '全部操作' },
      ...Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label })),
    ]
  }, [])

  return (
    <AdminPageShell maxWidthClassName="max-w-5xl" contentClassName="space-y-6">
      <Card className="border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/60">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-2xl font-semibold text-slate-900 dark:text-slate-50">审计日志</CardTitle>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              记录AI解析与人工解析相关操作，便于追踪和排查问题。
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="筛选操作类型" />
              </SelectTrigger>
              <SelectContent>
                {actionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" disabled={loading} onClick={() => loadLogs()}>
              {loading ? '刷新中...' : '刷新'}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50/80 p-4 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-100/70 dark:bg-slate-900/40">
                <tr>
                  <th className="whitespace-nowrap px-4 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">
                    时间
                  </th>
                  <th className="whitespace-nowrap px-4 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">
                    操作
                  </th>
                  <th className="whitespace-nowrap px-4 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">
                    目标
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">
                    详情
                  </th>
                  <th className="whitespace-nowrap px-4 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">
                    操作者
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white/90 dark:divide-slate-800 dark:bg-slate-900/40">
                {logs.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      暂无审计数据。
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const actionLabel = ACTION_LABELS[log.action] || log.action
                    const createdAt = new Date(log.createdAt)
                    return (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                          {createdAt.toLocaleString('zh-CN', { hour12: false })}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          <Badge variant="secondary">{actionLabel}</Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                          {log.entityType ? `${log.entityType}${log.entityId ? ` #${log.entityId}` : ''}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                          {log.details ? (
                            <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded bg-slate-100 p-2 text-xs text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                          {log.user?.email || '系统'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {loading && (
            <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">正在加载审计日志...</p>
          )}
        </CardContent>
      </Card>
    </AdminPageShell>
  )
}
