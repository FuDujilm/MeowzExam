'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Card>
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-2xl font-semibold">审计日志</CardTitle>
              <p className="mt-1 text-sm text-gray-500">
                记录AI解析与人工解析相关操作，便于追踪和排查问题。
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="筛选操作类型" />
                </SelectTrigger>
                <SelectContent>
                  {actionOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                disabled={loading}
                onClick={() => loadLogs()}
              >
                {loading ? '刷新中...' : '刷新'}
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-2 text-left text-xs font-semibold text-gray-500">
                      时间
                    </th>
                    <th className="whitespace-nowrap px-4 py-2 text-left text-xs font-semibold text-gray-500">
                      操作
                    </th>
                    <th className="whitespace-nowrap px-4 py-2 text-left text-xs font-semibold text-gray-500">
                      目标
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">
                      详情
                    </th>
                    <th className="whitespace-nowrap px-4 py-2 text-left text-xs font-semibold text-gray-500">
                      操作者
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {logs.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                        暂无审计数据。
                      </td>
                    </tr>
                  ) : (
                    logs.map(log => {
                      const actionLabel = ACTION_LABELS[log.action] || log.action
                      const createdAt = new Date(log.createdAt)
                      return (
                        <tr key={log.id} className="hover:bg-gray-50/70">
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                            {createdAt.toLocaleString('zh-CN', { hour12: false })}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm">
                            <Badge variant="secondary">{actionLabel}</Badge>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                            {log.entityType ? `${log.entityType}${log.entityId ? ` #${log.entityId}` : ''}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {log.details ? (
                              <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded bg-gray-100 p-2 text-xs text-gray-600">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
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
              <p className="mt-4 text-center text-sm text-gray-500">正在加载审计日志...</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
