'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, PlusCircle, RefreshCw } from 'lucide-react'

import { AdminPageShell } from '@/components/admin/AdminPageShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useNotification } from '@/components/ui/notification-provider'

interface AiStylePreset {
  id: string
  name: string
  description: string | null
  prompt: string
  isDefault: boolean
  isActive: boolean
  usageCount: number
  createdAt: string
  updatedAt: string
}

interface FormState {
  id?: string
  name: string
  description: string
  prompt: string
  isDefault: boolean
  isActive: boolean
}

const DEFAULT_FORM: FormState = {
  name: '',
  description: '',
  prompt: '',
  isDefault: false,
  isActive: true,
}

export default function AiStylePresetsPage() {
  const { notify } = useNotification()
  const [presets, setPresets] = useState<AiStylePreset[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadPresets()
  }, [])

  const loadPresets = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/ai-style-presets')
      if (response.ok) {
        const data = await response.json()
        setPresets(Array.isArray(data.presets) ? data.presets : [])
      } else {
        notify({
          variant: 'danger',
          title: '加载失败',
          description: '无法获取风格预设列表，请稍后重试。',
        })
      }
    } catch (error) {
      console.error('[admin][ai-style-presets] load failed:', error)
      notify({
        variant: 'danger',
        title: '加载失败',
        description: '网络或服务器异常，请稍后再试。',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      await loadPresets()
    } finally {
      setRefreshing(false)
    }
  }

  const handleOpenCreate = () => {
    setFormState(DEFAULT_FORM)
    setFormOpen(true)
  }

  const handleEdit = (preset: AiStylePreset) => {
    setFormState({
      id: preset.id,
      name: preset.name,
      description: preset.description ?? '',
      prompt: preset.prompt,
      isDefault: preset.isDefault,
      isActive: preset.isActive,
    })
    setFormOpen(true)
  }

  const selectedPresetLabel = useMemo(() => {
    if (formState.isDefault) {
      return '该预设将替换当前默认风格'
    }
    return undefined
  }, [formState.isDefault])

  const handleSubmit = async () => {
    if (!formState.name.trim()) {
      notify({ variant: 'danger', title: '请填写名称' })
      return
    }

    if (!formState.prompt.trim()) {
      notify({ variant: 'danger', title: '请填写风格提示内容' })
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        name: formState.name.trim(),
        description: formState.description.trim() || null,
        prompt: formState.prompt.trim(),
        isDefault: formState.isDefault,
        isActive: formState.isActive,
      }

      const url = formState.id
        ? `/api/admin/ai-style-presets/${formState.id}`
        : '/api/admin/ai-style-presets'
      const method = formState.id ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        notify({
          variant: 'danger',
          title: '保存失败',
          description: error.error || '请稍后再试。',
        })
        return
      }

      notify({
        variant: 'success',
        title: formState.id ? '预设已更新' : '预设已创建',
      })

      setFormOpen(false)
      setFormState(DEFAULT_FORM)
      await loadPresets()
    } catch (error) {
      console.error('[admin][ai-style-presets] submit failed:', error)
      notify({
        variant: 'danger',
        title: '保存失败',
        description: '网络或服务器异常，请稍后再试。',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (preset: AiStylePreset) => {
    const confirmed = window.confirm(`确认删除风格预设「${preset.name}」？该操作不可撤销。`)
    if (!confirmed) {
      return
    }

    try {
      const res = await fetch(`/api/admin/ai-style-presets/${preset.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        notify({
          variant: 'danger',
          title: '删除失败',
          description: error.error || '请稍后再试。',
        })
        return
      }

      notify({
        variant: 'success',
        title: '预设已删除',
      })

      await loadPresets()
    } catch (error) {
      console.error('[admin][ai-style-presets] delete failed:', error)
      notify({
        variant: 'danger',
        title: '删除失败',
        description: '网络或服务器异常，请稍后再试。',
      })
    }
  }

  return (
    <AdminPageShell maxWidthClassName="max-w-5xl" contentClassName="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI 风格预设</h1>
          <p className="mt-1 text-sm text-gray-500">
            管理可复用的系统提示风格，用户可在个人设置中选择或自定义补充。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            刷新
          </Button>
          <Button onClick={handleOpenCreate}>
            <PlusCircle className="mr-2 h-4 w-4" />
            新建预设
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>预设列表</CardTitle>
          <CardDescription>
            默认预设会在未选择个性化风格时使用；自定义风格可在模型组提示中通过 {'{'}{`{AI_STYLE}`}{'}'} 占位符引用。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 正在加载预设...
            </div>
          ) : presets.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-300 p-8 text-center text-gray-500">
              暂无风格预设，点击右上角“新建预设”进行添加。
            </div>
          ) : (
            <div className="space-y-4">
              {presets.map((preset) => (
                <div key={preset.id} className="rounded-lg border border-gray-200 p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{preset.name}</h3>
                      {preset.isDefault && <Badge>默认</Badge>}
                      {!preset.isActive && (
                        <Badge variant="outline" className="text-red-600">
                          已停用
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(preset)}>
                        编辑
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(preset)}>
                        删除
                      </Button>
                    </div>
                  </div>

                  {preset.description && (
                    <p className="mt-2 text-sm text-gray-600">{preset.description}</p>
                  )}

                  <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                    <div className="text-xs font-semibold uppercase text-gray-400">系统提示</div>
                    <pre className="mt-1 whitespace-pre-wrap break-words text-gray-700">{preset.prompt}</pre>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span>使用次数：{preset.usageCount}</span>
                    <span>更新时间：{new Date(preset.updatedAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{formState.id ? '编辑风格预设' : '新建风格预设'}</DialogTitle>
            <DialogDescription>
              定义 AI 回复的语气、结构或格式，可在模型组和用户设置中复用。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="preset-name">预设名称</Label>
              <Input
                id="preset-name"
                value={formState.name}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                placeholder="例如：严谨专业、轻松鼓励"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="preset-description">描述（可选）</Label>
              <Textarea
                id="preset-description"
                rows={2}
                value={formState.description}
                onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                placeholder="简要说明该风格适用场景"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="preset-prompt">风格提示内容</Label>
              <Textarea
                id="preset-prompt"
                rows={8}
                value={formState.prompt}
                onChange={(e) => setFormState({ ...formState, prompt: e.target.value })}
                placeholder="示例：请以温暖、鼓励的语气回答，并在每段末尾附上一句学习建议。"
                className="mt-1"
              />
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="preset-default"
                  checked={formState.isDefault}
                  onCheckedChange={(checked) => setFormState({ ...formState, isDefault: checked })}
                />
                <Label htmlFor="preset-default">设为默认风格</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="preset-active"
                  checked={formState.isActive}
                  onCheckedChange={(checked) => setFormState({ ...formState, isActive: checked })}
                />
                <Label htmlFor="preset-active">对用户可见</Label>
              </div>
            </div>

            {selectedPresetLabel && (
              <p className="text-xs text-amber-600">{selectedPresetLabel}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={submitting}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {formState.id ? '保存修改' : '创建预设'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  )
}
