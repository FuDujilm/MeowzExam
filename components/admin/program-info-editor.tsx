'use client'

import { type ChangeEvent, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Loader2, RefreshCcw } from 'lucide-react'

import type { ProgramDocument, ProgramInfo, ProgramMetadata } from '@/lib/program-info'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useNotification } from '@/components/ui/notification-provider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type DocumentKey = 'termsOfService' | 'privacyPolicy' | 'changelog'

interface ProgramInfoFormState {
  metadata: Record<keyof ProgramMetadata, string>
  documents: Record<DocumentKey, { content: string; format: string }>
}

const DOCUMENT_LABELS: Record<DocumentKey, { title: string; description: string }> = {
  termsOfService: {
    title: '服务条款',
    description: '向用户说明使用系统时的责任与义务。',
  },
  privacyPolicy: {
    title: '隐私政策',
    description: '说明数据采集、使用及保护方式。',
  },
  changelog: {
    title: '更新记录',
    description: '记录项目重要更新，可选填。',
  },
}

const DOCUMENT_FORMAT_OPTIONS = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'html', label: 'HTML' },
  { value: 'text', label: '纯文本' },
] as const

const EMPTY_FORM: ProgramInfoFormState = {
  metadata: {
    name: '',
    author: '',
    contactEmail: '',
    homepage: '',
    supportLink: '',
    repository: '',
    lastUpdated: '',
  },
  documents: {
    termsOfService: { content: '', format: 'markdown' },
    privacyPolicy: { content: '', format: 'markdown' },
    changelog: { content: '', format: 'markdown' },
  },
}

function mapProgramInfoToForm(info: ProgramInfo | null): ProgramInfoFormState {
  if (!info) {
    return EMPTY_FORM
  }

  return {
    metadata: {
      name: info.metadata.name ?? '',
      author: info.metadata.author ?? '',
      contactEmail: info.metadata.contactEmail ?? '',
      homepage: info.metadata.homepage ?? '',
      supportLink: info.metadata.supportLink ?? '',
      repository: info.metadata.repository ?? '',
      lastUpdated: info.metadata.lastUpdated ?? '',
    },
    documents: {
      termsOfService: {
        content: info.documents.termsOfService?.content ?? '',
        format: info.documents.termsOfService?.format ?? 'markdown',
      },
      privacyPolicy: {
        content: info.documents.privacyPolicy?.content ?? '',
        format: info.documents.privacyPolicy?.format ?? 'markdown',
      },
      changelog: {
        content: info.documents.changelog?.content ?? '',
        format: info.documents.changelog?.format ?? 'markdown',
      },
    },
  }
}

function normaliseMetadataField(value: string | undefined) {
  return value ?? ''
}

function compareDocuments(formDoc: { content: string; format: string }, infoDoc?: ProgramDocument) {
  if (!infoDoc) {
    return formDoc.content.trim().length > 0
  }

  return infoDoc.content !== formDoc.content || infoDoc.format !== formDoc.format
}

export function ProgramInfoEditor() {
  const { notify } = useNotification()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<ProgramInfo | null>(null)
  const [form, setForm] = useState<ProgramInfoFormState>(EMPTY_FORM)

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dirty = useMemo(() => {
    if (!info) {
      return false
    }

    const metadataKeys = Object.keys(form.metadata) as Array<keyof ProgramMetadata>
    const metadataChanged = metadataKeys.some((key) => normaliseMetadataField(info.metadata[key]) !== form.metadata[key])

    const documentsChanged =
      compareDocuments(form.documents.termsOfService, info.documents.termsOfService) ||
      compareDocuments(form.documents.privacyPolicy, info.documents.privacyPolicy) ||
      compareDocuments(form.documents.changelog, info.documents.changelog)

    return metadataChanged || documentsChanged
  }, [form, info])

  const reload = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/program-info', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('加载程序信息失败')
      }
      const data = (await response.json()) as ProgramInfo
      setInfo(data)
      setForm(mapProgramInfoToForm(data))
      setError(null)
    } catch (err: any) {
      console.error(err)
      setError(err?.message ?? '无法加载程序信息')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (info) {
      setForm(mapProgramInfoToForm(info))
    }
  }, [info])

  const handleMetadataChange = (field: keyof ProgramMetadata) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setForm((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [field]: value,
      },
    }))
  }

  const handleDocumentContentChange = (key: DocumentKey) => (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value
    setForm((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [key]: {
          ...prev.documents[key],
          content: value,
        },
      },
    }))
  }

  const handleDocumentFormatChange = (key: DocumentKey) => (value: string) => {
    setForm((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [key]: {
          ...prev.documents[key],
          format: value,
        },
      },
    }))
  }

  const handleReset = () => {
    setForm(mapProgramInfoToForm(info))
  }

  const handleUseToday = () => {
    const today = new Date().toISOString().slice(0, 10)
    setForm((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        lastUpdated: today,
      },
    }))
  }

  const handleSubmit = async () => {
    try {
      setSaving(true)
      const payload = {
        metadata: form.metadata,
        documents: form.documents,
      }

      const response = await fetch('/api/program-info', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.status === 403) {
        const result = await response.json()
        notify({
          variant: 'warning',
          title: '保存失败',
          description: result?.error ?? '权限不足：需要管理员权限',
        })
        return
      }

      if (!response.ok) {
        throw new Error('保存程序信息失败')
      }

      const updated = (await response.json()) as ProgramInfo
      setInfo(updated)
      setForm(mapProgramInfoToForm(updated))
      notify({
        variant: 'success',
        title: '保存成功',
        description: '程序信息已更新。',
      })
    } catch (err: any) {
      console.error(err)
      notify({
        variant: 'danger',
        title: '保存失败',
        description: err?.message ?? '无法保存程序信息',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex min-h-[160px] items-center justify-center">
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>加载程序信息中...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-rose-200 bg-rose-50/60 dark:border-rose-500/40 dark:bg-rose-500/10">
        <CardContent className="space-y-4 py-8 text-center">
          <p className="text-sm text-rose-600 dark:text-rose-200">{error}</p>
          <Button variant="secondary" onClick={reload}>
            重新加载
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>关于本程序</CardTitle>
          <CardDescription>
            配置项目作者、版本信息展示以及对外链接。版本号会自动根据 package.json 和 Git Commit 生成。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">程序名称</label>
              <Input
                value={form.metadata.name}
                onChange={handleMetadataChange('name')}
                placeholder="中国业余无线电刷题系统"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">作者/维护者</label>
              <Input
                value={form.metadata.author}
                onChange={handleMetadataChange('author')}
                placeholder="示例：火腿呼号工作室"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">联系邮箱</label>
              <Input
                value={form.metadata.contactEmail}
                onChange={handleMetadataChange('contactEmail')}
                placeholder="support@example.com"
                type="email"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">官方网站</label>
              <Input
                value={form.metadata.homepage}
                onChange={handleMetadataChange('homepage')}
                placeholder="https://example.com"
                type="url"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">支持与帮助链接</label>
              <Input
                value={form.metadata.supportLink}
                onChange={handleMetadataChange('supportLink')}
                placeholder="https://example.com/support"
                type="url"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">代码仓库</label>
              <Input
                value={form.metadata.repository}
                onChange={handleMetadataChange('repository')}
                placeholder="https://github.com/your/repo"
                type="url"
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">最后更新日期</label>
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleUseToday}>
                  <RefreshCcw className="mr-1 h-3.5 w-3.5" />
                  今日
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={form.metadata.lastUpdated}
                  onChange={handleMetadataChange('lastUpdated')}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {info ? (
            <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/60 p-4 text-sm leading-relaxed dark:border-blue-500/40 dark:bg-blue-900/20">
              <div className="font-semibold text-blue-700 dark:text-blue-200">版本信息</div>
              <div className="mt-1 text-blue-700/90 dark:text-blue-100/80">
                当前版本：{info.version.combined}
              </div>
              <div className="mt-1 flex flex-wrap gap-4 text-xs text-blue-600/80 dark:text-blue-100/60">
                <span>package.json：{info.version.packageVersion}</span>
                <span>Git 提交：{info.version.gitCommit}</span>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>法律文档</CardTitle>
          <CardDescription>维护服务条款、隐私政策等内容，支持 Markdown / HTML / 纯文本格式。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(Object.keys(DOCUMENT_LABELS) as DocumentKey[]).map((key) => {
            const doc = DOCUMENT_LABELS[key]
            return (
              <div key={key} className="space-y-3 rounded-md border border-gray-200 p-4 shadow-sm dark:border-gray-800">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{doc.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{doc.description}</p>
                  </div>
                  <div className="w-full md:w-48">
                    <Select value={form.documents[key].format} onValueChange={handleDocumentFormatChange(key)}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择格式" />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_FORMAT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Textarea
                  className="min-h-[180px]"
                  value={form.documents[key].content}
                  onChange={handleDocumentContentChange(key)}
                  placeholder={`填写${doc.title}内容`}
                />
              </div>
            )
          })}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" disabled={!dirty || saving} onClick={handleReset}>
          重置
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={!dirty || saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            '保存程序信息'
          )}
        </Button>
      </div>
    </div>
  )
}
