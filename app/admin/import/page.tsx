'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { AdminPageShell } from '@/components/admin/AdminPageShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useNotification } from '@/components/ui/notification-provider'
import type { QuestionLibraryFileInfo } from '@/types/question-library'
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileJson,
  FileText,
  Info,
  Loader2,
  PencilLine,
  Plus,
  Shield,
  Trash2,
  Upload,
} from 'lucide-react'

interface ExamPresetSummary {
  id?: string
  code: string
  name: string
  description?: string | null
  durationMinutes: number
  totalQuestions: number
  passScore: number
  singleChoiceCount: number
  multipleChoiceCount: number
  trueFalseCount: number
}

interface LibrarySummary {
  id: string
  uuid: string
  code: string
  name: string
  shortName: string
  description?: string | null
  author?: string | null
  region?: string | null
  totalQuestions: number
  singleChoiceCount: number
  multipleChoiceCount: number
  trueFalseCount: number
  sourceType?: string | null
  version?: string | null
  displayLabel: string
  presets: ExamPresetSummary[]
  displayTemplate: string
  visibility: string
  fileCount?: number
  totals?: {
    totalQuestions: number
    singleChoiceCount: number
    multipleChoiceCount: number
    trueFalseCount: number
  }
  updatedAt: string
}

interface ImportStats {
  total: number
  imported: number
  updated: number
  skipped: number
  errors: string[]
}

interface ImportOutcome {
  success: boolean
  message: string
  stats: ImportStats
  warnings?: string[]
  library?: LibrarySummary
}

const VISIBILITY_LABELS: Record<string, string> = {
  ADMIN_ONLY: '仅管理员可见',
  PUBLIC: '所有人可见',
  CUSTOM: '指定用户可见',
}

const visibilityBadgeClass: Record<string, string> = {
  ADMIN_ONLY: 'bg-amber-100 text-amber-700 ring-amber-300/60 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/40',
  PUBLIC: 'bg-emerald-100 text-emerald-700 ring-emerald-300/60 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/40',
  CUSTOM: 'bg-sky-100 text-sky-700 ring-sky-300/60 dark:bg-sky-500/15 dark:text-sky-200 dark:ring-sky-500/40',
}

const numberFormatter = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 })
const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

function formatNumber(value: number) {
  return numberFormatter.format(value ?? 0)
}

function formatDateTime(value?: string | null) {
  if (!value) return '尚无记录'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '尚无记录'
  return dateTimeFormatter.format(date)
}

const EMPTY_STATS: ImportStats = {
  total: 0,
  imported: 0,
  updated: 0,
  skipped: 0,
  errors: [],
}

const EMPTY_PRESET_ROW: PresetFormRow = {
  code: '',
  name: '',
  description: '',
  durationMinutes: '60',
  totalQuestions: '40',
  passScore: '30',
  singleChoiceCount: '32',
  multipleChoiceCount: '8',
  trueFalseCount: '0',
}

type PresetFormRow = {
  id?: string
  code: string
  name: string
  description: string
  durationMinutes: string
  totalQuestions: string
  passScore: string
  singleChoiceCount: string
  multipleChoiceCount: string
  trueFalseCount: string
}

function formatBytes(size: number) {
  if (!Number.isFinite(size) || size <= 0) return '0 B'
  const units = ['KB', 'MB', 'GB']
  let value = size
  let unitIndex = -1
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  if (unitIndex === -1) {
    return `${size} B`
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`
}

export default function AdminQuestionLibraryPage() {
  const { status } = useSession()
  const { notify } = useNotification()
  const [libraries, setLibraries] = useState<LibrarySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [fetchWarning, setFetchWarning] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportOutcome | null>(null)
  const [presetDialogOpen, setPresetDialogOpen] = useState(false)
  const [presetDialogLibrary, setPresetDialogLibrary] = useState<LibrarySummary | null>(null)
  const [presetFormRows, setPresetFormRows] = useState<PresetFormRow[]>([])
  const [presetSaving, setPresetSaving] = useState(false)
  const [presetError, setPresetError] = useState<string | null>(null)
  const [fileDialogOpen, setFileDialogOpen] = useState(false)
  const [fileDialogLibrary, setFileDialogLibrary] = useState<LibrarySummary | null>(null)
  const [libraryFiles, setLibraryFiles] = useState<QuestionLibraryFileInfo[]>([])
  const [fileListLoading, setFileListLoading] = useState(false)
  const [fileListError, setFileListError] = useState<string | null>(null)

  const isSessionLoading = status === 'loading'

  const loadLibraries = async () => {
    try {
      setLoading(true)
      setFetchError(null)
      const response = await fetch('/api/admin/import-questions', { cache: 'no-store' })
      const data = await response.json()

      if (!response.ok) {
        const message =
          data?.error ??
          (response.status === 401 || response.status === 403
            ? '权限不足：请使用具有管理员权限的账号登录。'
            : '获取题库信息失败。')
        throw new Error(message)
      }

      setLibraries(Array.isArray(data?.libraries) ? data.libraries : [])
      setFetchWarning(data?.warning ?? null)
    } catch (error: any) {
      setLibraries([])
      setFetchError(error?.message ?? '获取题库信息失败。')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      loadLibraries()
    }
  }, [status])

  useEffect(() => {
    if (status === 'unauthenticated') {
      setLoading(false)
      setFetchWarning(null)
      setFetchError('权限不足：请使用具有管理员权限的账号登录。')
    }
  }, [status])

  const summary = useMemo(() => {
    if (!libraries.length) {
      return {
        totalLibraries: 0,
        totalQuestions: 0,
        lastUpdated: null as string | null,
        visibility: {
          ADMIN_ONLY: 0,
          PUBLIC: 0,
          CUSTOM: 0,
        },
      }
    }

    const visibilityTotals = libraries.reduce(
      (acc, library) => {
        const key = library.visibility
        if (acc[key] == null) acc[key] = 0
        acc[key]! += 1
        return acc
      },
      {
        ADMIN_ONLY: 0,
        PUBLIC: 0,
        CUSTOM: 0,
      } as Record<string, number>,
    )

    return {
      totalLibraries: libraries.length,
      totalQuestions: libraries.reduce(
        (acc, lib) => acc + (lib.totalQuestions ?? lib.totals?.totalQuestions ?? 0),
        0,
      ),
      lastUpdated: libraries[0]?.updatedAt ?? null,
      visibility: visibilityTotals,
    }
  }, [libraries])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0])
      setResult(null)
    }
  }

  const handleImport = async () => {
    if (!file) return

    setImporting(true)
    setResult(null)

    try {
      const text = await file.text()
      let payload: unknown

      try {
        payload = JSON.parse(text)
      } catch (error) {
        setResult({
          success: false,
          message: 'JSON 解析失败，请确认文件格式是否正确（UTF-8 编码）。',
          stats: EMPTY_STATS,
        })
        return
      }

      const response = await fetch('/api/admin/import-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file?.name,
          fileSize: file?.size,
          fileContent: text,
          payload,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setResult({
          success: false,
          message: data?.error ?? '题库导入失败。',
          stats: data?.stats ?? EMPTY_STATS,
          warnings: data?.warnings ?? [],
        })
        return
      }

      setResult({
        success: Boolean(data?.success),
        message: data?.message ?? '题库导入完成。',
        stats: data?.stats ?? EMPTY_STATS,
        warnings: data?.warnings ?? [],
        library: data?.library,
      })

      await loadLibraries()
    } catch (error: any) {
      setResult({
        success: false,
        message: error?.message ?? '读取文件时发生错误。',
        stats: EMPTY_STATS,
      })
    } finally {
      setImporting(false)
    }
  }

  const buildPresetRows = (library: LibrarySummary): PresetFormRow[] => {
    if (library.presets.length === 0) {
      return [{ ...EMPTY_PRESET_ROW }]
    }
    return library.presets.map((preset) => ({
      id: preset.id,
      code: preset.code,
      name: preset.name,
      description: preset.description ?? '',
      durationMinutes: String(preset.durationMinutes),
      totalQuestions: String(preset.totalQuestions),
      passScore: String(preset.passScore),
      singleChoiceCount: String(preset.singleChoiceCount),
      multipleChoiceCount: String(preset.multipleChoiceCount),
      trueFalseCount: String(preset.trueFalseCount ?? 0),
    }))
  }

  const openPresetDialog = (library: LibrarySummary) => {
    setPresetDialogLibrary(library)
    setPresetFormRows(buildPresetRows(library))
    setPresetError(null)
    setPresetDialogOpen(true)
  }

  const closePresetDialog = () => {
    if (presetSaving) return
    setPresetDialogOpen(false)
    setPresetDialogLibrary(null)
    setPresetFormRows([])
    setPresetError(null)
  }

  const handlePresetRowChange = (index: number, key: keyof PresetFormRow, value: string) => {
    setPresetFormRows((rows) =>
      rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)),
    )
  }

  const addPresetRow = () => {
    setPresetFormRows((rows) => [...rows, { ...EMPTY_PRESET_ROW }])
  }

  const removePresetRow = (index: number) => {
    setPresetFormRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index))
  }

  const handleSavePresets = async () => {
    if (!presetDialogLibrary) return
    setPresetSaving(true)
    setPresetError(null)
    try {
      if (!presetFormRows.length) {
        throw new Error('至少需要一个考试预设。')
      }

      const normalizeNumber = (
        value: string,
        field: string,
        options: { allowZero?: boolean } = {},
      ) => {
        const parsed = Number.parseInt(value, 10)
        if (!Number.isFinite(parsed) || parsed < 0) {
          throw new Error(`${field} 必须为非负整数。`)
        }
        if (!options.allowZero && parsed === 0) {
          throw new Error(`${field} 必须大于 0。`)
        }
        return parsed
      }

      const normalized = presetFormRows.map((row, index) => {
        const code = row.code.trim().toUpperCase()
        const name = row.name.trim()
        if (!code) {
          throw new Error(`第 ${index + 1} 个预设缺少 code。`)
        }
        if (!name) {
          throw new Error(`第 ${index + 1} 个预设缺少名称。`)
        }
        return {
          id: row.id,
          code,
          name,
          description: row.description.trim() || null,
          durationMinutes: normalizeNumber(row.durationMinutes, '考试时长'),
          totalQuestions: normalizeNumber(row.totalQuestions, '题目数量'),
          passScore: normalizeNumber(row.passScore, '及格分'),
          singleChoiceCount: normalizeNumber(row.singleChoiceCount, '单选题数量'),
          multipleChoiceCount: normalizeNumber(row.multipleChoiceCount, '多选题数量'),
          trueFalseCount: normalizeNumber(row.trueFalseCount, '判断题数量', { allowZero: true }),
        }
      })

      const response = await fetch(
        `/api/admin/question-libraries/${presetDialogLibrary.id}/presets`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ presets: normalized }),
        },
      )

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || '保存考试预设失败。')
      }
      const updatedPresets: ExamPresetSummary[] = data?.presets ?? normalized
      setLibraries((prev) =>
        prev.map((library) =>
          library.id === presetDialogLibrary.id ? { ...library, presets: updatedPresets } : library,
        ),
      )
      notify({
        variant: 'success',
        title: '已更新考试预设',
        description: `题库「${presetDialogLibrary.name}」的考试预设已保存。`,
      })
      setPresetDialogOpen(false)
      setPresetDialogLibrary(null)
    } catch (error: any) {
      setPresetError(error?.message ?? '保存考试预设失败。')
      notify({
        variant: 'danger',
        title: '保存失败',
        description: error?.message ?? '无法保存考试预设，请稍后再试。',
      })
    } finally {
      setPresetSaving(false)
    }
  }

  const fetchLibraryFiles = async (libraryId: string) => {
    try {
      setFileListLoading(true)
      setFileListError(null)
      const response = await fetch(`/api/admin/question-library-files?libraryId=${libraryId}`, {
        cache: 'no-store',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || '无法获取题库文件。')
      }
      const files = Array.isArray(data?.files) ? data.files : []
      setLibraryFiles(files)
      setLibraries((prev) =>
        prev.map((library) =>
          library.id === libraryId ? { ...library, fileCount: files.length } : library,
        ),
      )
    } catch (error: any) {
      setLibraryFiles([])
      const message = error?.message || '无法加载题库文件列表。'
      setFileListError(message)
      notify({
        variant: 'danger',
        title: '加载文件失败',
        description: message,
      })
    } finally {
      setFileListLoading(false)
    }
  }

  const openFileDialog = async (library: LibrarySummary) => {
    setFileDialogLibrary(library)
    setFileDialogOpen(true)
    await fetchLibraryFiles(library.id)
  }

  const closeFileDialog = () => {
    if (fileListLoading) return
    setFileDialogOpen(false)
    setFileDialogLibrary(null)
    setLibraryFiles([])
    setFileListError(null)
  }

  const handleDeleteFile = async (fileId: string) => {
    if (!fileDialogLibrary) return
    const confirmed = window.confirm('确定要删除该文件吗？删除后将无法恢复。')
    if (!confirmed) return
    try {
      const response = await fetch(`/api/admin/question-library-files/${fileId}`, {
        method: 'DELETE',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || '无法删除题库文件。')
      }
      setLibraryFiles((prev) => prev.filter((file) => file.id !== fileId))
      setLibraries((prev) =>
        prev.map((library) =>
          library.id === fileDialogLibrary.id
            ? {
                ...library,
                fileCount: Math.max(0, (library.fileCount ?? 1) - 1),
              }
            : library,
        ),
      )
      notify({
        variant: 'success',
        title: '文件已删除',
        description: '题库文件已成功删除。',
      })
    } catch (error: any) {
      notify({
        variant: 'danger',
        title: '删除失败',
        description: error?.message ?? '无法删除题库文件，请稍后再试。',
      })
    }
  }

  const renderVisibilityBadge = (value: string) => {
    const label = VISIBILITY_LABELS[value] ?? value
    const cls =
      visibilityBadgeClass[value] ??
      'bg-slate-100 text-slate-600 ring-slate-300/60 dark:bg-slate-700/40 dark:text-slate-200 dark:ring-slate-600/50'
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}>
        {label}
      </span>
    )
  }

  const renderPresetSummary = (presets: ExamPresetSummary[]) => {
    if (!presets.length) return <span className="text-xs text-slate-500">未配置预设</span>
    return (
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <span
            key={preset.code}
            className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
          >
            {preset.name} · {preset.totalQuestions}题/{preset.durationMinutes}分钟
          </span>
        ))}
      </div>
    )
  }

  return (
    <>
      <AdminPageShell maxWidthClassName="max-w-6xl" contentClassName="space-y-8 pb-16 pt-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">题库管理</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            导入、维护和审核用于训练与模拟考试的题库，支持多种 JSON 模板与可见性策略。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div>
            <Link
              href="/docs/question-library-management"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <Info className="h-4 w-4" />
              查看导入说明
            </Link>
          </div>
        </div>
      </header>

      {isSessionLoading && (
        <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-6 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
          正在验证权限…
        </div>
      )}

      {!isSessionLoading && fetchWarning && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <div>
            <strong className="block font-medium">需要执行数据库迁移</strong>
            <span className="mt-1 block leading-relaxed">{fetchWarning}</span>
          </div>
        </div>
      )}

      {!isSessionLoading && fetchError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <div>
            <strong className="block font-medium">无法加载题库数据</strong>
                <span className="mt-1 block leading-relaxed">{fetchError}</span>
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,3fr)_minmax(0,1.3fr)]">
            <section className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">题库数量</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {formatNumber(summary.totalLibraries)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    管理中：管理员 {formatNumber(summary.visibility.ADMIN_ONLY)} / 全员 {formatNumber(summary.visibility.PUBLIC)} / 指定 {formatNumber(summary.visibility.CUSTOM)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">题目总数</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {formatNumber(summary.totalQuestions)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">自动统计导入题目数量及类型分布</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">最近更新</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {summary.lastUpdated ? formatDateTime(summary.lastUpdated) : '尚无记录'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">基于题库最近一次导入或编辑时间</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">已导入题库</h2>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      展示题库基础信息、可见范围以及预设考试配置。
                    </p>
                  </div>
                </div>
                <div className="overflow-hidden">
                  {loading ? (
                    <div className="flex items-center justify-center gap-2 px-5 py-14 text-sm text-slate-500 dark:text-slate-300">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      正在加载题库数据…
                    </div>
                  ) : libraries.length === 0 ? (
                    <div className="px-5 py-14 text-center text-sm text-slate-500 dark:text-slate-300">
                      当前没有已导入的题库，请使用右侧“导入题库”功能上传 JSON 文件。
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                        <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-900/80 dark:text-slate-300">
                          <tr>
                            <th className="px-5 py-3">题库信息</th>
                            <th className="px-5 py-3">地区 / 缩写</th>
                            <th className="px-5 py-3">题量统计</th>
                            <th className="px-5 py-3">可见范围</th>
                            <th className="px-5 py-3">考试预设</th>
                            <th className="px-5 py-3">更新时间</th>
                            <th className="px-5 py-3">文件 / 操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm text-slate-700 dark:divide-slate-800 dark:text-slate-200">
                          {libraries.map((library) => (
                            <tr key={library.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60">
                              <td className="px-5 py-4 align-top">
                                <div className="font-medium text-slate-900 dark:text-slate-100">{library.name}</div>
                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{library.displayLabel}</div>
                                {library.description && (
                                  <p className="mt-2 text-xs text-slate-500 line-clamp-2 dark:text-slate-400">{library.description}</p>
                                )}
                                <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400 dark:text-slate-500">
                                  {library.version && <div>版本：{library.version}</div>}
                                  {library.sourceType && <div>类型：{library.sourceType}</div>}
                                  <div>UUID：{library.uuid}</div>
                                </dl>
                              </td>
                              <td className="px-5 py-4 align-top">
                                <div className="font-medium text-slate-900 dark:text-slate-100">{library.region ?? '未指定'}</div>
                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">缩写：{library.shortName}</div>
                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">代码：{library.code}</div>
                              </td>
                              <td className="px-5 py-4 align-top">
                                <div className="font-medium text-slate-900 dark:text-slate-100">{formatNumber(library.totalQuestions)}</div>
                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  单选 {formatNumber(library.singleChoiceCount)} · 多选 {formatNumber(library.multipleChoiceCount)}
                                  {library.trueFalseCount ? ` · 判断 ${formatNumber(library.trueFalseCount)}` : null}
                                </div>
                              </td>
                              <td className="px-5 py-4 align-top">
                                {renderVisibilityBadge(library.visibility)}
                              </td>
                              <td className="px-5 py-4 align-top">
                                {renderPresetSummary(library.presets)}
                              </td>
                              <td className="px-5 py-4 align-top text-xs text-slate-500 dark:text-slate-400">
                                {formatDateTime(library.updatedAt)}
                              </td>
                              <td className="px-5 py-4 align-top">
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  已保存文件：{formatNumber(library.fileCount ?? 0)} 个
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openPresetDialog(library)}
                                    className="inline-flex items-center gap-1"
                                  >
                                    <PencilLine className="h-3.5 w-3.5" />
                                    管理预设
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => openFileDialog(library)}
                                    className="inline-flex items-center gap-1"
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    文件
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {result && (
                <div
                  className={`rounded-2xl border px-5 py-5 shadow-sm ${
                    result.success
                      ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100'
                      : 'border-red-200 bg-red-50/80 text-red-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {result.success ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-5 w-5 flex-none" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold">
                          {result.success ? '题库导入成功' : '题库导入失败'}
                        </h3>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          总计 {formatNumber(result.stats.total)} · 新增 {formatNumber(result.stats.imported)} · 更新 {formatNumber(result.stats.updated)} · 跳过 {formatNumber(result.stats.skipped)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{result.message}</p>

                      {result.library && (
                        <div className="mt-3 rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-xs text-slate-600 shadow-inner dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {result.library.name}（{result.library.displayLabel}）
                          </div>
                          <div className="mt-1 text-slate-500">
                            可见范围：{VISIBILITY_LABELS[result.library.visibility] ?? result.library.visibility}
                          </div>
                        </div>
                      )}

                      {result.warnings && result.warnings.length > 0 && (
                        <div className="mt-3 rounded-xl border border-yellow-200 bg-yellow-50/70 px-3 py-2 text-xs text-yellow-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
                          <div className="font-medium">导入警告</div>
                          <ul className="mt-1 list-disc space-y-1 pl-5">
                            {result.warnings.map((warning, index) => (
                              <li key={index}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.stats.errors && result.stats.errors.length > 0 && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-xs font-medium">
                            查看错误详情（{result.stats.errors.length}）
                          </summary>
                          <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-md bg-black/5 p-3 text-xs leading-relaxed text-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
                            {result.stats.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>

            <aside className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex items-center gap-2">
                  <FileJson className="h-5 w-5 text-slate-500 dark:text-slate-300" />
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">导入题库 JSON</h2>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  支持符合题库头文件标准的 JSON 文档，每次导入将根据 UUID 对题目进行去重更新。
                </p>

                <div className="mt-6 space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
                      选择题库 JSON 文件（UTF-8 编码）
                    </label>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleFileChange}
                      disabled={importing}
                      className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-200 dark:focus:border-slate-500 dark:focus:ring-slate-600 dark:disabled:bg-slate-800/60"
                    />
                    {file && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        已选文件：{file.name}（{(file.size / 1024).toFixed(1)} KB）
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={!file || importing}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 dark:focus:ring-slate-200"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        正在导入…
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        上传并导入题库
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-slate-500 dark:text-slate-300" />
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">导入须知</h2>
                </div>
                <ul className="mt-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
                  <li>
                    JSON 顶层需包含 <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] dark:bg-slate-800/60 dark:text-slate-100">library</code> 与{' '}
                    <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] dark:bg-slate-800/60 dark:text-slate-100">questions</code> 字段。
                    题库头文件包含 <code>uuid</code>、<code>name</code>、<code>shortName</code>、<code>type</code>、<code>region</code> 等元数据。
                  </li>
                  <li>
                    可见范围支持 <strong>管理员可见</strong>、<strong>所有人可见</strong>、<strong>指定用户可见</strong> 三种模式。
                    若选择指定用户，请提供邮箱列表，未注册的邮箱将以占位形式保留。
                  </li>
                  <li>
                    系统将自动统计题目数量、题型分布，并同步更新考试预设（默认包含 A/B/C 三类标准配置，可在 JSON 中自定义）。
                  </li>
                  <li>
                    每道题必须包含稳定的 <code>uuid</code> 与 <code>options</code>（含正确项标记）。
                    导入同一 UUID 的题目会执行覆盖更新，缺失的题目不会自动删除。
                  </li>
                  <li>
                    默认展示模板可通过 <code>displayTemplate</code> 自定义（支持 {`{国家/地区}`}/{`{缩写}`}/{`{总题量}`} 占位符）。
                  </li>
                </ul>
              </div>
            </aside>
          </div>
      </AdminPageShell>

      <Dialog open={presetDialogOpen} onOpenChange={(open) => (!open ? closePresetDialog() : null)}>
      <DialogContent className="max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>管理考试预设</DialogTitle>
          <DialogDescription>
            为题库 {presetDialogLibrary?.name ?? ''} 配置考试时长、题量与及格线。保存后立即生效。
          </DialogDescription>
        </DialogHeader>

        {presetError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
            {presetError}
          </div>
        )}

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {presetFormRows.map((row, index) => (
            <div
              key={row.id ?? `${row.code}-${index}`}
              className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-900/40"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  考试预设 #{index + 1}
                </p>
                {presetFormRows.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removePresetRow(index)}
                    className="text-red-600 hover:text-red-500"
                  >
                    删除
                  </Button>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>预设代码</Label>
                  <Input
                    value={row.code}
                    placeholder="例如：A_STANDARD"
                    onChange={(event) => handlePresetRowChange(index, 'code', event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>预设名称</Label>
                  <Input
                    value={row.name}
                    placeholder="例如：A类标准考试"
                    onChange={(event) => handlePresetRowChange(index, 'name', event.target.value)}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>简介</Label>
                  <Input
                    value={row.description}
                    placeholder="可选，说明考试结构或说明"
                    onChange={(event) =>
                      handlePresetRowChange(index, 'description', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>考试时长（分钟）</Label>
                  <Input
                    type="number"
                    min={1}
                    value={row.durationMinutes}
                    onChange={(event) =>
                      handlePresetRowChange(index, 'durationMinutes', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>题目数量</Label>
                  <Input
                    type="number"
                    min={1}
                    value={row.totalQuestions}
                    onChange={(event) =>
                      handlePresetRowChange(index, 'totalQuestions', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>及格分数</Label>
                  <Input
                    type="number"
                    min={1}
                    value={row.passScore}
                    onChange={(event) =>
                      handlePresetRowChange(index, 'passScore', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>单选题数量</Label>
                  <Input
                    type="number"
                    min={0}
                    value={row.singleChoiceCount}
                    onChange={(event) =>
                      handlePresetRowChange(index, 'singleChoiceCount', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>多选题数量</Label>
                  <Input
                    type="number"
                    min={0}
                    value={row.multipleChoiceCount}
                    onChange={(event) =>
                      handlePresetRowChange(index, 'multipleChoiceCount', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>判断题数量</Label>
                  <Input
                    type="number"
                    min={0}
                    value={row.trueFalseCount}
                    onChange={(event) =>
                      handlePresetRowChange(index, 'trueFalseCount', event.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          ))}
          <Button variant="ghost" onClick={addPresetRow} className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            新增考试预设
          </Button>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={closePresetDialog}>
            取消
          </Button>
          <Button onClick={handleSavePresets} disabled={presetSaving}>
            {presetSaving ? '保存中…' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>

      <Dialog open={fileDialogOpen} onOpenChange={(open) => (!open ? closeFileDialog() : null)}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>题库文件管理</DialogTitle>
          <DialogDescription>
            查看和下载题库 {fileDialogLibrary?.name ?? ''} 的历史导入文件，或删除不再需要的文件。
          </DialogDescription>
        </DialogHeader>

        {fileListError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
            {fileListError}
          </div>
        )}

        {fileListLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500 dark:text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            正在加载文件…
          </div>
        ) : libraryFiles.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-300">
            暂无文件记录，上传题库后会自动保存备份。
          </p>
        ) : (
          <div className="max-h-[50vh] overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/70 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-2">文件名</th>
                  <th className="px-4 py-2">大小</th>
                  <th className="px-4 py-2">上传时间</th>
                  <th className="px-4 py-2">上传者</th>
                  <th className="px-4 py-2">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {libraryFiles.map((file) => (
                  <tr key={file.id}>
                    <td className="px-4 py-2">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {file.originalName ?? file.filename}
                      </div>
                      <div className="text-xs text-slate-500">{file.filename}</div>
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                      {formatBytes(file.fileSize)}
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                      {formatDateTime(file.uploadedAt)}
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                      {file.uploadedByEmail ?? file.uploadedBy ?? '系统'}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="inline-flex items-center gap-1"
                          asChild
                        >
                          <a
                            href={`/api/admin/question-library-files/${file.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={file.originalName ?? file.filename}
                          >
                            <Download className="h-3.5 w-3.5" />
                            下载
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-500"
                          onClick={() => handleDeleteFile(file.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          删除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={closeFileDialog}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>
    </>
  )
}
