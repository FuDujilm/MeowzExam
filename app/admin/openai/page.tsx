'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Edit3,
  Loader2,
  PlusCircle,
  Power,
  PowerOff,
  RefreshCw,
  Trash2,
} from 'lucide-react'

import { AdminPageShell } from '@/components/admin/AdminPageShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useNotification } from '@/components/ui/notification-provider'

type ModelType = 'CHAT' | 'IMAGE' | 'EMBEDDING'
type UsageScope = 'EXPLANATION' | 'ASSISTANT' | 'BOTH'

interface ModelGroup {
  id: string
  name: string
  modelName: string
  modelType: ModelType
  usageScope: UsageScope
  proxyUrl: string | null
  apiUrl: string
  enableVision: boolean
  temperature: number | null
  topP: number | null
  presencePenalty: number | null
  frequencyPenalty: number | null
  extraBody: unknown | null
  systemPrompt: string | null
  userPrompt: string | null
  includeQuestion: boolean
  includeOptions: boolean
  createdAt: string
  updatedAt: string
  hasApiKey: boolean
  apiKeyPreview: string | null
  isActive: boolean
  priority: number
}

interface ModelGroupListResponse {
  groups: ModelGroup[]
}

interface FormState {
  name: string
  modelName: string
  modelType: ModelType
  usageScope: UsageScope
  priority: string
  proxyUrl: string
  apiUrl: string
  apiKey: string
  enableVision: boolean
  temperature: string
  topP: string
  presencePenalty: string
  frequencyPenalty: string
  extraBody: string
  systemPrompt: string
  userPrompt: string
  includeQuestion: boolean
  includeOptions: boolean
  markAsPrimary: boolean
}

const MODEL_TYPE_OPTIONS: Array<{ label: string; value: ModelType }> = [
  { label: '对话模型 (chat)', value: 'CHAT' },
  { label: '图片模型 (image)', value: 'IMAGE' },
  { label: '向量模型 (embedding)', value: 'EMBEDDING' },
]

const USAGE_SCOPE_OPTIONS: Array<{ value: UsageScope; label: string }> = [
  { value: 'EXPLANATION', label: '题目解析' },
  { value: 'ASSISTANT', label: '小助手' },
  { value: 'BOTH', label: '通用' },
]

const USAGE_SCOPE_DESCRIPTIONS: Record<UsageScope, string> = {
  EXPLANATION: '用于题目解析、错题讲解等场景。',
  ASSISTANT: '用于小助手对话，不参与题目解析。',
  BOTH: '可同时服务题目解析和小助手。',
}

const usageScopeBadgeVariant: Record<UsageScope, 'default' | 'secondary' | 'outline'> = {
  EXPLANATION: 'outline',
  ASSISTANT: 'secondary',
  BOTH: 'default',
}

const NAME_FORBIDDEN = /[\/\?&#=%]/

const defaultFormState: FormState = {
  name: '',
  modelName: '',
  modelType: 'CHAT',
  usageScope: 'EXPLANATION',
  priority: '0',
  proxyUrl: '',
  apiUrl: '',
  apiKey: '',
  enableVision: false,
  temperature: '1',
  topP: '1',
  presencePenalty: '0',
  frequencyPenalty: '0',
  extraBody: '',
  systemPrompt: '',
  userPrompt: '',
  includeQuestion: true,
  includeOptions: true,
  markAsPrimary: false,
}

const SCOPE_ORDER: UsageScope[] = ['EXPLANATION', 'ASSISTANT', 'BOTH']

function formatJsonBody(value: unknown): string {
  if (value === null || value === undefined) return ''
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return ''
  }
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

export default function OpenAIConfigPage() {
  const { status } = useSession()
  const router = useRouter()
  const { notify } = useNotification()

  const [groups, setGroups] = useState<ModelGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formState, setFormState] = useState<FormState>(defaultFormState)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const groupedByScope = useMemo(() => {
    const result: Record<UsageScope, ModelGroup[]> = {
      EXPLANATION: [],
      ASSISTANT: [],
      BOTH: [],
    }
    groups
      .slice()
      .sort((a, b) => b.priority - a.priority || Number(b.isActive) - Number(a.isActive))
      .forEach((group) => {
        result[group.usageScope].push(group)
      })
    return result
  }, [groups])

  const loadGroups = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/openai/model-groups', { cache: 'no-store' })
      if (res.status === 401) {
        router.push('/login')
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? '加载模型组失败')
      }
      const data = (await res.json()) as ModelGroupListResponse
      setGroups(Array.isArray(data.groups) ? data.groups : [])
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : '加载模型组失败')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (status === 'authenticated') {
      void loadGroups()
    }
  }, [status, loadGroups])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const resetForm = () => {
    setFormState(defaultFormState)
    setFormMode('create')
    setEditingId(null)
    setFeedback(null)
    setShowAdvanced(false)
  }

  const handleEdit = (group: ModelGroup) => {
    setFormMode('edit')
    setEditingId(group.id)
    setFeedback(null)
    setShowAdvanced(true)
    setFormState({
      name: group.name,
      modelName: group.modelName,
      modelType: group.modelType,
      usageScope: group.usageScope,
      priority: formatNumber(group.priority),
      proxyUrl: group.proxyUrl ?? '',
      apiUrl: group.apiUrl,
      apiKey: '',
      enableVision: group.enableVision,
      temperature: formatNumber(group.temperature),
      topP: formatNumber(group.topP),
      presencePenalty: formatNumber(group.presencePenalty),
      frequencyPenalty: formatNumber(group.frequencyPenalty),
      extraBody: formatJsonBody(group.extraBody),
      systemPrompt: group.systemPrompt ?? '',
      userPrompt: group.userPrompt ?? '',
      includeQuestion: group.includeQuestion,
      includeOptions: group.includeOptions,
      markAsPrimary: group.isActive,
    })
  }

  const handleDelete = async (group: ModelGroup) => {
    setFeedback(null)
    if (!confirm(`确定删除模型组“${group.name}”吗？`)) {
      return
    }
    try {
      setSubmitting(true)
      const res = await fetch(`/api/admin/openai/model-groups/${group.id}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error ?? '删除失败')
      }
      notify({ variant: 'success', title: '删除成功', description: '模型组已删除。' })
      if (editingId === group.id) {
        resetForm()
      }
      await loadGroups()
    } catch (error) {
      notify({
        variant: 'danger',
        title: '删除失败',
        description: error instanceof Error ? error.message : '操作失败，请稍后再试。',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSetPrimary = async (group: ModelGroup) => {
    try {
      const res = await fetch(`/api/admin/openai/model-groups/${group.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error ?? '设置优先模型失败')
      }
      notify({
        variant: 'success',
        title: '已设为优先模型',
        description: '已自动关闭同使用范围的其他模型。',
      })
      await loadGroups()
    } catch (error) {
      notify({
        variant: 'danger',
        title: '操作失败',
        description: error instanceof Error ? error.message : '设置优先模型失败，请稍后再试。',
      })
    }
  }

  const handleDisable = async (group: ModelGroup) => {
    try {
      const res = await fetch(`/api/admin/openai/model-groups/${group.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error ?? '停用模型失败')
      }
      notify({
        variant: 'success',
        title: '模型已停用',
        description: '该模型不再作为优先模型组。',
      })
      await loadGroups()
    } catch (error) {
      notify({
        variant: 'danger',
        title: '操作失败',
        description: error instanceof Error ? error.message : '停用模型失败，请稍后再试。',
      })
    }
  }

  const handleCreateNew = () => {
    resetForm()
    setShowAdvanced(false)
  }

  const validateForm = () => {
    if (NAME_FORBIDDEN.test(formState.name)) {
      throw new Error('组名不能包含 / ? & # = % 等特殊字符')
    }
    if (!formState.name.trim()) {
      throw new Error('请填写组名')
    }
    if (!formState.modelName.trim()) {
      throw new Error('请填写模型名称')
    }
    if (!formState.apiUrl.trim()) {
      throw new Error('请填写 API 地址')
    }
    if (formMode === 'create' && !formState.apiKey.trim()) {
      throw new Error('请填写 API Key')
    }
    if (formState.priority && Number.isNaN(Number(formState.priority))) {
      throw new Error('优先级必须为数字')
    }
  }

  const buildPayload = () => {
    const payload: Record<string, unknown> = {
      name: formState.name.trim(),
      modelName: formState.modelName.trim(),
      modelType: formState.modelType,
      usageScope: formState.usageScope,
      apiUrl: formState.apiUrl.trim(),
      enableVision: formState.enableVision,
      includeQuestion: formState.includeQuestion,
      includeOptions: formState.includeOptions,
      userPrompt: formState.userPrompt,
      systemPrompt: formState.systemPrompt,
    }

    if (formState.proxyUrl.trim()) {
      payload.proxyUrl = formState.proxyUrl.trim()
    } else if (formMode === 'edit') {
      payload.proxyUrl = ''
    }

    if (formState.apiKey.trim()) {
      payload.apiKey = formState.apiKey.trim()
    } else if (formMode === 'create') {
      payload.apiKey = ''
    }

    if (formState.temperature !== '') payload.temperature = Number(formState.temperature)
    if (formState.topP !== '') payload.topP = Number(formState.topP)
    if (formState.presencePenalty !== '') payload.presencePenalty = Number(formState.presencePenalty)
    if (formState.frequencyPenalty !== '') payload.frequencyPenalty = Number(formState.frequencyPenalty)

    if (formState.priority !== '') {
      payload.priority = Number(formState.priority)
    }

    if (formState.extraBody.trim()) {
      payload.extraBody = formState.extraBody.trim()
    } else if (formMode === 'edit') {
      payload.extraBody = ''
    }

    if (formState.markAsPrimary) {
      payload.isActive = true
    } else if (formMode === 'edit') {
      payload.isActive = false
    }

    return payload
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback(null)
    try {
      validateForm()
    } catch (validationError) {
      const message =
        validationError instanceof Error ? validationError.message : '表单校验失败'
      setFeedback(message)
      return
    }

    const payload = buildPayload()

    try {
      setSubmitting(true)
      const endpoint =
        formMode === 'create'
          ? '/api/admin/openai/model-groups'
          : `/api/admin/openai/model-groups/${editingId}`
      const method = formMode === 'create' ? 'POST' : 'PATCH'

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error ?? '保存失败')
      }

      notify({
        variant: 'success',
        title: formMode === 'create' ? '创建成功' : '更新成功',
        description: '模型组配置已保存。',
      })

      await loadGroups()
      if (formMode === 'create') {
        resetForm()
      } else {
        setFormState((prev) => ({ ...prev, apiKey: '' }))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存失败'
      setFeedback(message)
    } finally {
      setSubmitting(false)
    }
  }

  const renderGroupCard = (group: ModelGroup) => {
    const isPrimary = group.isActive
    return (
      <Card
        key={group.id}
        className={`bg-white/80 shadow-sm dark:bg-slate-900/60 ${
          isPrimary
            ? 'border-blue-400/70 ring-2 ring-blue-200/60 dark:border-blue-500/50 dark:ring-blue-500/20'
            : 'border-slate-200/80 dark:border-slate-800/60'
        }`}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">{group.name}</CardTitle>
              <Badge variant={usageScopeBadgeVariant[group.usageScope]}>
                {USAGE_SCOPE_DESCRIPTIONS[group.usageScope]}
              </Badge>
              <Badge variant={isPrimary ? 'default' : 'secondary'}>
                {isPrimary ? '优先模型组' : '备用'}
              </Badge>
              <Badge variant="outline">优先级 {group.priority}</Badge>
            </div>
            <div className="flex gap-2">
              {isPrimary ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDisable(group)}
                  disabled={submitting}
                >
                  <PowerOff className="mr-1 h-4 w-4" />
                  停用
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSetPrimary(group)}
                  disabled={submitting}
                >
                  <Power className="mr-1 h-4 w-4" />
                  设为优先
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEdit(group)}
                disabled={submitting}
              >
                <Edit3 className="mr-1 h-4 w-4" />
                编辑
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(group)}
                disabled={submitting}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                删除
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <span className="text-slate-500 dark:text-slate-400">模型类型：</span>
              <strong>{group.modelType}</strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">模型名称：</span>
              <strong>{group.modelName}</strong>
            </div>
            <div className="md:col-span-2">
              <span className="text-slate-500 dark:text-slate-400">API 地址：</span>
              <strong>{group.apiUrl}</strong>
            </div>
            {group.proxyUrl ? (
              <div className="md:col-span-2">
                <span className="text-slate-500 dark:text-slate-400">代理地址：</span>
                <strong>{group.proxyUrl}</strong>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Temperature: {group.temperature ?? '默认'}</span>
            <span>Top P: {group.topP ?? '默认'}</span>
            <span>Presence Penalty: {group.presencePenalty ?? '默认'}</span>
            <span>Frequency Penalty: {group.frequencyPenalty ?? '默认'}</span>
            <span>包含题干：{group.includeQuestion ? '是' : '否'}</span>
            <span>包含选项：{group.includeOptions ? '是' : '否'}</span>
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500">
            最近更新：{new Date(group.updatedAt).toLocaleString()}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <AdminPageShell maxWidthClassName="max-w-6xl" contentClassName="space-y-8 py-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">AI 模型组管理</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            根据使用范围管理题目解析与小助手模型。每个使用范围仅允许一个优先模型组。
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCreateNew} disabled={submitting}>
            <PlusCircle className="mr-2 h-4 w-4" />
            新建配置
          </Button>
          <Button variant="outline" onClick={() => loadGroups()} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            刷新
          </Button>
        </div>
      </header>

      {error ? (
        <Card className="border-red-200 bg-red-50/80 dark:border-red-500/40 dark:bg-red-500/10">
          <CardContent className="py-6 text-sm text-red-600 dark:text-red-200">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          {SCOPE_ORDER.map((scope) => (
            <div key={scope} className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {USAGE_SCOPE_OPTIONS.find((item) => item.value === scope)?.label}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {USAGE_SCOPE_DESCRIPTIONS[scope]}
                  {scope !== 'BOTH' ? '（仅允许一个优先模型组）' : ''}
                </p>
              </div>
              {groupedByScope[scope].length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200/80 bg-white/70 p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
                  尚未配置模型组。
                </div>
              ) : (
                groupedByScope[scope].map(renderGroupCard)
              )}
            </div>
          ))}
        </div>

        <div>
          <Card className="border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/60">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg text-slate-900 dark:text-slate-100">
                {formMode === 'create' ? '新建模型组' : '编辑模型组'}
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>显示高级选项</span>
                  <Switch checked={showAdvanced} onCheckedChange={setShowAdvanced} />
                </div>
              </CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {formMode === 'create'
                  ? '填写核心信息即可创建模型组，勾选“设为优先模型组”将自动停用同范围的其他模型。'
                  : '更新配置后立即生效，如需更换 API Key 请重新填写。'}
              </p>
            </CardHeader>
              <CardContent>
                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="name">配置名称*</Label>
                    <Input
                      id="name"
                      value={formState.name}
                      onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="例如：OpenAI 解析主模型"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>模型类型*</Label>
                      <Select
                        value={formState.modelType}
                        onValueChange={(value) => setFormState((prev) => ({ ...prev, modelType: value as ModelType }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MODEL_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>使用范围*</Label>
                      <Select
                        value={formState.usageScope}
                        onValueChange={(value) => setFormState((prev) => ({ ...prev, usageScope: value as UsageScope }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {USAGE_SCOPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="modelName">模型名称*</Label>
                      <Input
                        id="modelName"
                        value={formState.modelName}
                        onChange={(event) => setFormState((prev) => ({ ...prev, modelName: event.target.value }))}
                        placeholder="例如：gpt-4o-mini"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apiUrl">API 地址*</Label>
                      <Input
                        id="apiUrl"
                        value={formState.apiUrl}
                        onChange={(event) => setFormState((prev) => ({ ...prev, apiUrl: event.target.value }))}
                        placeholder="https://api.openai.com/v1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="proxyUrl">代理地址（可选）</Label>
                    <Input
                      id="proxyUrl"
                      value={formState.proxyUrl}
                      onChange={(event) => setFormState((prev) => ({ ...prev, proxyUrl: event.target.value }))}
                      placeholder="自定义代理地址，无需填则留空"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key{formMode === 'create' ? '*' : '（留空则不更新）'}</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={formState.apiKey}
                      onChange={(event) => setFormState((prev) => ({ ...prev, apiKey: event.target.value }))}
                      placeholder="sk-xxxx"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="priority">优先级</Label>
                      <Input
                        id="priority"
                        value={formState.priority}
                        onChange={(event) => setFormState((prev) => ({ ...prev, priority: event.target.value }))}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex flex-col gap-2 text-sm font-medium">
                        <div className="flex items-center justify-between">
                          <span>设为优先模型组</span>
                          <Switch
                            checked={formState.markAsPrimary}
                            onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, markAsPrimary: checked }))}
                          />
                        </div>
                        <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                          勾选后将自动停用同使用范围的其他模型。
                        </span>
                      </Label>
                    </div>
                  </div>

                  {showAdvanced ? (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="temperature">Temperature</Label>
                          <Input
                            id="temperature"
                            type="number"
                            step="0.1"
                            min="0"
                            max="2"
                            value={formState.temperature}
                            onChange={(event) => setFormState((prev) => ({ ...prev, temperature: event.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="topP">Top P</Label>
                          <Input
                            id="topP"
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            value={formState.topP}
                            onChange={(event) => setFormState((prev) => ({ ...prev, topP: event.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="presencePenalty">Presence Penalty</Label>
                          <Input
                            id="presencePenalty"
                            type="number"
                            step="0.1"
                            min="-2"
                            max="2"
                            value={formState.presencePenalty}
                            onChange={(event) =>
                              setFormState((prev) => ({ ...prev, presencePenalty: event.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="frequencyPenalty">Frequency Penalty</Label>
                          <Input
                            id="frequencyPenalty"
                            type="number"
                            step="0.1"
                            min="-2"
                            max="2"
                            value={formState.frequencyPenalty}
                            onChange={(event) =>
                              setFormState((prev) => ({ ...prev, frequencyPenalty: event.target.value }))
                            }
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm">
                        <label className="flex items-center gap-2">
                          <Switch
                            checked={formState.enableVision}
                            onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, enableVision: checked }))}
                          />
                          支持多模态（Vision）
                        </label>
                        <label className="flex items-center gap-2">
                          <Switch
                            checked={formState.includeQuestion}
                            onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, includeQuestion: checked }))}
                          />
                          请求中包含题干
                        </label>
                        <label className="flex items-center gap-2">
                          <Switch
                            checked={formState.includeOptions}
                            onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, includeOptions: checked }))}
                          />
                          请求中包含选项
                        </label>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="systemPrompt">系统提示词（可选）</Label>
                        <Textarea
                          id="systemPrompt"
                          rows={4}
                          value={formState.systemPrompt}
                          onChange={(event) => setFormState((prev) => ({ ...prev, systemPrompt: event.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="userPrompt">用户提示模板（可选）</Label>
                        <Textarea
                          id="userPrompt"
                          rows={4}
                          value={formState.userPrompt}
                          onChange={(event) => setFormState((prev) => ({ ...prev, userPrompt: event.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="extraBody">额外请求体（JSON，可选）</Label>
                        <Textarea
                          id="extraBody"
                          rows={4}
                          value={formState.extraBody}
                          onChange={(event) => setFormState((prev) => ({ ...prev, extraBody: event.target.value }))}
                          placeholder='{ "response_format": { "type": "json_object" } }'
                        />
                      </div>
                    </>
                  ) : null}

                  {feedback ? (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
                      {feedback}
                    </div>
                  ) : null}

                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={resetForm} disabled={submitting}>
                      取消
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 保存中...</> : '保存配置'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
        </div>
      </div>
    </AdminPageShell>
  )
}
