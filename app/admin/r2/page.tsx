'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useNotification } from '@/components/ui/notification-provider'
import { AdminPageShell } from '@/components/admin/AdminPageShell'
import { Cloud, Copy, Loader2, RefreshCcw, Trash2, UploadCloud } from 'lucide-react'

interface AdminR2Status {
  configured: boolean
  accountId?: string
  bucketName?: string
  endpoint?: string
  basePrefix?: string
  publicBaseUrl?: string | null
  samplePublicUrl?: string | null
  missing: string[]
}

interface AdminR2Object {
  key: string
  size: number
  lastModified: string | null
  etag: string | null
  publicUrl: string | null
}

const OBJECTS_LIMIT = 30

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B'
  }
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    hour12: false,
  })
}

export default function AdminR2Page() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { notify } = useNotification()

  const [statusInfo, setStatusInfo] = useState<AdminR2Status | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [statusError, setStatusError] = useState<string | null>(null)

  const [objects, setObjects] = useState<AdminR2Object[]>([])
  const [objectsLoading, setObjectsLoading] = useState(true)
  const [objectsError, setObjectsError] = useState<string | null>(null)
  const [objectsHasMore, setObjectsHasMore] = useState(false)
  const [listPrefix, setListPrefix] = useState('')
  const listPrefixRef = useRef('')

  const [fileInput, setFileInput] = useState<File | null>(null)
  const [folderInput, setFolderInput] = useState('')
  const [customFileName, setCustomFileName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ key: string; publicUrl: string | null } | null>(null)

  const configured = Boolean(statusInfo?.configured)

  const loadStatus = useCallback(async () => {
    try {
      setStatusLoading(true)
      const response = await fetch('/api/admin/r2/status', { cache: 'no-store' })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? '无法获取 R2 状态')
      }
      setStatusInfo(payload?.status ?? null)
      setStatusError(null)
    } catch (error) {
      console.error('[admin:r2] load status failed', error)
      setStatusInfo(null)
      setStatusError(error instanceof Error ? error.message : '无法获取 R2 状态')
    } finally {
      setStatusLoading(false)
    }
  }, [])

  const loadObjects = useCallback(async (overridePrefix?: string) => {
    if (!statusInfo?.configured) {
      setObjectsLoading(false)
      setObjects([])
      setObjectsHasMore(false)
      setObjectsError(statusInfo ? 'Cloudflare R2 尚未配置' : '正在检测配置…')
      return
    }
    try {
      setObjectsLoading(true)
      setObjectsError(null)
      const params = new URLSearchParams()
      const filter = typeof overridePrefix === 'string' ? overridePrefix : listPrefixRef.current
      if (filter.trim()) {
        params.set('prefix', filter.trim())
      }
      params.set('limit', OBJECTS_LIMIT.toString())
      const response = await fetch(`/api/admin/r2/objects?${params.toString()}`, { cache: 'no-store' })
      const payload = await response.json().catch(() => null)
      if (payload?.status?.configured === false) {
        setObjects([])
        setObjectsHasMore(false)
        setObjectsError(payload?.error ?? 'Cloudflare R2 尚未配置')
        return
      }

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? '无法获取对象列表')
      }
      setObjects(Array.isArray(payload.objects) ? payload.objects : [])
      setObjectsHasMore(Boolean(payload.hasMore))
    } catch (error) {
      console.error('[admin:r2] load objects failed', error)
      setObjects([])
      setObjectsHasMore(false)
      setObjectsError(error instanceof Error ? error.message : '无法获取对象列表')
    } finally {
      setObjectsLoading(false)
    }
  }, [statusInfo])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status === 'authenticated') {
      loadStatus()
    }
  }, [status, router, loadStatus])

  useEffect(() => {
    if (status !== 'authenticated') return
    if (statusInfo == null) return
    loadObjects()
  }, [status, statusInfo, loadObjects])

  const handleUpload = async () => {
    if (!fileInput) {
      notify({ variant: 'warning', title: '请选择文件', description: '请选择一张需要上传的图片。' })
      return
    }
    try {
      setUploading(true)
      const formData = new FormData()
      formData.set('file', fileInput)
      if (folderInput.trim()) {
        formData.set('folder', folderInput.trim())
      }
      if (customFileName.trim()) {
        formData.set('filename', customFileName.trim())
      }
      const response = await fetch('/api/admin/r2/objects', {
        method: 'POST',
        body: formData,
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? '上传失败，请稍后再试')
      }
      setUploadResult({ key: payload.key, publicUrl: payload.publicUrl ?? null })
      notify({ variant: 'success', title: '上传成功', description: '图片已写入 R2 存储。' })
      setFileInput(null)
      const input = document.getElementById('r2-file-input') as HTMLInputElement | null
      if (input) {
        input.value = ''
      }
      loadObjects()
    } catch (error) {
      console.error('[admin:r2] upload failed', error)
      notify({ variant: 'danger', title: '上传失败', description: error instanceof Error ? error.message : '请稍后再试。' })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (key: string) => {
    if (!key) return
    const confirmed = window.confirm(`确定要删除 ${key} 吗？此操作不可撤销。`)
    if (!confirmed) return
    try {
      const response = await fetch('/api/admin/r2/object', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? '删除失败，请稍后重试')
      }
      setObjects((prev) => prev.filter((item) => item.key !== key))
      notify({ variant: 'success', title: '删除成功', description: `${key} 已移除` })
    } catch (error) {
      console.error('[admin:r2] delete failed', error)
      notify({ variant: 'danger', title: '删除失败', description: error instanceof Error ? error.message : '请稍后再试。' })
    }
  }

  const handleCopy = async (text?: string | null) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      notify({ variant: 'success', title: '已复制', description: '链接已复制到剪贴板。' })
    } catch (error) {
      console.error('[admin:r2] copy failed', error)
      notify({ variant: 'warning', title: '复制失败', description: text })
    }
  }

  const statusBadge = useMemo(() => {
    if (statusLoading) {
      return (
        <Badge variant="outline" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          检测中
        </Badge>
      )
    }
    if (configured) {
      return <Badge className="bg-emerald-600/90 text-white">已配置</Badge>
    }
    return <Badge variant="outline" className="border-amber-500 text-amber-600">待配置</Badge>
  }, [statusLoading, configured])

  if (status === 'loading') {
    return (
      <div className="flex h-[60vh] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 权限验证中...
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <AdminPageShell maxWidthClassName="max-w-6xl" contentClassName="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Cloudflare R2 存储</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            上传题目配图或附件，生成可引用的公开 URL。所有对象都会存放在预设前缀下，便于题库引用。
          </p>
        </div>
        {statusBadge}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-col gap-2">
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-sky-500" />
              连接状态
            </CardTitle>
            <CardDescription>检查环境变量是否配置完整，并查看示例访问路径。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {statusError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
                {statusError}
              </div>
            ) : null}
            <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <span>Bucket</span>
                <span className="font-mono text-xs">{statusInfo?.bucketName ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Account ID</span>
                <span className="font-mono text-xs">{statusInfo?.accountId ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Endpoint</span>
                <span className="font-mono text-xs">{statusInfo?.endpoint ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>默认前缀</span>
                <span className="font-mono text-xs">{statusInfo?.basePrefix ?? '(根目录)'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>公共访问域名</span>
                <span className="font-mono text-xs">{statusInfo?.publicBaseUrl ?? '未设置'}</span>
              </div>
              {statusInfo?.samplePublicUrl ? (
                <div className="rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-700">
                  <div className="text-slate-500">示例 URL</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="flex-1 break-all font-mono text-[11px]">{statusInfo.samplePublicUrl}</span>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleCopy(statusInfo.samplePublicUrl)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
              {!configured && statusInfo?.missing?.length ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  待配置的环境变量：{statusInfo.missing.join(', ')}
                </div>
              ) : null}
            </div>
            <Button variant="outline" className="w-full" onClick={loadStatus} disabled={statusLoading}>
              {statusLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}重新检测
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>上传题库配图</CardTitle>
            <CardDescription>上传后即可在题库 JSON 中引用返回的 URL。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="r2-file-input">选择图片</Label>
              <Input
                id="r2-file-input"
                type="file"
                accept="image/*"
                disabled={!configured}
                onChange={(event) => {
                  const nextFile = event.target.files?.[0]
                  setFileInput(nextFile ?? null)
                }}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="r2-folder-input">子目录（可选）</Label>
                <Input
                  id="r2-folder-input"
                  placeholder="例如：2025/A类"
                  value={folderInput}
                  onChange={(event) => setFolderInput(event.target.value)}
                  disabled={!configured}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="r2-name-input">自定义文件名</Label>
                <Input
                  id="r2-name-input"
                  placeholder="默认使用原文件名"
                  value={customFileName}
                  onChange={(event) => setCustomFileName(event.target.value)}
                  disabled={!configured}
                />
              </div>
            </div>
            <Button className="w-full" onClick={handleUpload} disabled={!configured || uploading || !fileInput}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 正在上传...
                </>
              ) : (
                <>
                  <UploadCloud className="mr-2 h-4 w-4" /> 上传并生成 URL
                </>
              )}
            </Button>
            {uploadResult ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                <div className="font-medium">已上传：</div>
                <div className="mt-1 break-all font-mono">{uploadResult.key}</div>
                {uploadResult.publicUrl ? (
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 underline-offset-2 hover:underline"
                    onClick={() => handleCopy(uploadResult.publicUrl)}
                  >
                    <Copy className="h-3 w-3" /> 复制访问链接
                  </button>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>对象列表</CardTitle>
            <CardDescription>展示最近上传的对象，便于复制链接或删除。</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="按子目录过滤"
              value={listPrefix}
              onChange={(event) => {
                setListPrefix(event.target.value)
                listPrefixRef.current = event.target.value
              }}
              className="w-44"
            />
            <Button variant="outline" onClick={() => loadObjects()} disabled={objectsLoading || !configured}>
              {objectsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {objectsError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
              {objectsError}
            </div>
          ) : null}
          {objectsLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 正在加载对象列表...
            </div>
          ) : objects.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">尚无记录</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-2 text-left font-medium text-slate-600">对象键</th>
                    <th className="whitespace-nowrap px-4 py-2 text-left font-medium text-slate-600">大小</th>
                    <th className="whitespace-nowrap px-4 py-2 text-left font-medium text-slate-600">更新时间</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {objects.map((item) => (
                    <tr key={item.key}>
                      <td className="max-w-[320px] px-4 py-3 font-mono text-xs">{item.key}</td>
                      <td className="px-4 py-3 text-slate-600">{formatSize(item.size)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(item.lastModified)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!item.publicUrl}
                            onClick={() => handleCopy(item.publicUrl)}
                          >
                            <Copy className="mr-1 h-3.5 w-3.5" /> 复制链接
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(item.key)}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" /> 删除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {objectsHasMore ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              仅显示最近 {OBJECTS_LIMIT} 条对象，使用筛选可精确定位。
            </div>
          ) : null}
        </CardContent>
      </Card>
    </AdminPageShell>
  )
}
