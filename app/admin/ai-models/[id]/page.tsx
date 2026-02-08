'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useNotification } from '@/components/ui/notification-provider'

type Provider = 'OPENAI' | 'DIFY' | 'AZURE_OPENAI'
type UsageScope = 'EXPLANATION' | 'ASSISTANT' | 'BOTH'

interface FormState {
  name: string
  provider: Provider
  modelName: string
  modelType: 'CHAT' | 'IMAGE' | 'EMBEDDING'
  usageScope: UsageScope
  apiUrl: string
  apiKey: string
  difyAppId: string
  difyUser: string
  temperature: number
  topP: number
  systemPrompt: string
  includeQuestion: boolean
  includeOptions: boolean
  isActive: boolean
  priority: number
}

const usageScopeOptions: Array<{ value: UsageScope; label: string; hint: string }> = [
  { value: 'EXPLANATION', label: 'Explanation', hint: 'Used for question explanations and answer analysis.' },
  { value: 'ASSISTANT', label: 'Assistant', hint: 'Used by the in-app assistant. Not applied to question analysis.' },
  { value: 'BOTH', label: 'Universal', hint: 'Usable for both question explanations and assistant conversations.' },
]

const initialState: FormState = {
  name: '',
  provider: 'OPENAI',
  modelName: '',
  modelType: 'CHAT',
  usageScope: 'EXPLANATION',
  apiUrl: '',
  apiKey: '',
  difyAppId: '',
  difyUser: '',
  temperature: 0.7,
  topP: 1,
  systemPrompt: '',
  includeQuestion: true,
  includeOptions: true,
  isActive: true,
  priority: 0,
}

export default function AiModelFormPage() {
  const params = useParams()
  const router = useRouter()
  const { notify } = useNotification()

  const isEdit = useMemo(() => params?.id !== 'new', [params?.id])
  const modelId = isEdit ? (params?.id as string) : null

  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<FormState>(initialState)

  useEffect(() => {
    if (isEdit && modelId) {
      void loadModel(modelId)
    }
  }, [isEdit, modelId])

  const loadModel = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/ai-models/${id}`)
      if (!res.ok) throw new Error('Failed to load model configuration')
      const data = await res.json()
      const model = data.model as Partial<FormState>
      setFormData((prev) => ({
        ...prev,
        ...model,
        apiKey: '',
        usageScope: (model.usageScope as UsageScope) ?? 'EXPLANATION',
      }))
    } catch (error) {
      notify({
        variant: 'danger',
        title: 'Load failed',
        description: 'Unable to fetch model details. Returning to list.',
      })
      router.push('/admin/ai-models')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)

    try {
      const endpoint = isEdit ? `/api/admin/ai-models/${modelId}` : '/api/admin/ai-models'
      const method = isEdit ? 'PUT' : 'POST'

      const payload: Record<string, unknown> = {
        ...formData,
        temperature: Number.isFinite(formData.temperature) ? formData.temperature : 0.7,
        topP: Number.isFinite(formData.topP) ? formData.topP : 1,
        priority: Number.isFinite(formData.priority) ? formData.priority : 0,
      }

      if (isEdit && !formData.apiKey.trim()) {
        delete payload.apiKey
      }

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(error?.error ?? 'Save failed')
      }

      notify({
        variant: 'success',
        title: isEdit ? 'Updated' : 'Created',
        description: 'AI model configuration saved successfully.',
      })
      router.push('/admin/ai-models')
    } catch (error: any) {
      notify({
        variant: 'danger',
        title: 'Operation failed',
        description: error?.message ?? 'Please try again later.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="container mx-auto max-w-4xl p-8">
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit AI Model' : 'Create AI Model'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="name">Configuration name*</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Provider*</Label>
                <Select
                  value={formData.provider}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, provider: value as Provider }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPENAI">OpenAI</SelectItem>
                    <SelectItem value="DIFY">Dify</SelectItem>
                    <SelectItem value="AZURE_OPENAI">Azure OpenAI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="modelName">Model name*</Label>
                <Input
                  id="modelName"
                  value={formData.modelName}
                  onChange={(event) => setFormData((prev) => ({ ...prev, modelName: event.target.value }))}
                  placeholder="e.g. gpt-4o-mini"
                  required
                />
              </div>
              <div>
                <Label htmlFor="apiUrl">API URL*</Label>
                <Input
                  id="apiUrl"
                  value={formData.apiUrl}
                  onChange={(event) => setFormData((prev) => ({ ...prev, apiUrl: event.target.value }))}
                  placeholder="https://api.openai.com/v1"
                  required
                />
              </div>
            </div>

            <div>
              <Label>Usage scope*</Label>
              <Select
                value={formData.usageScope}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, usageScope: value as UsageScope }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select usage" />
                </SelectTrigger>
                <SelectContent>
                  {usageScopeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="space-y-1">
                        <p className="font-medium">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.hint}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="apiKey">API Key{isEdit ? ' (leave empty to keep current)' : '*'}</Label>
              <Input
                id="apiKey"
                type="password"
                value={formData.apiKey}
                onChange={(event) => setFormData((prev) => ({ ...prev, apiKey: event.target.value }))}
                placeholder={isEdit ? 'Enter a new key only if you need to rotate it' : ''}
                required={!isEdit}
              />
            </div>

            {formData.provider === 'DIFY' && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="difyAppId">Dify App ID</Label>
                  <Input
                    id="difyAppId"
                    value={formData.difyAppId}
                    onChange={(event) => setFormData((prev) => ({ ...prev, difyAppId: event.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="difyUser">Dify User</Label>
                  <Input
                    id="difyUser"
                    value={formData.difyUser}
                    onChange={(event) => setFormData((prev) => ({ ...prev, difyUser: event.target.value }))}
                    placeholder="anonymous"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="temperature">Temperature</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={formData.temperature}
                  onChange={(event) => setFormData((prev) => ({ ...prev, temperature: parseFloat(event.target.value) }))}
                />
              </div>
              <div>
                <Label htmlFor="topP">Top P</Label>
                <Input
                  id="topP"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={formData.topP}
                  onChange={(event) => setFormData((prev) => ({ ...prev, topP: parseFloat(event.target.value) }))}
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(event) => setFormData((prev) => ({ ...prev, priority: parseInt(event.target.value || '0', 10) }))}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={formData.includeQuestion}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, includeQuestion: !!checked }))}
                />
                Include question text
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={formData.includeOptions}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, includeOptions: !!checked }))}
                />
                Include options
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: !!checked }))}
                />
                Active
              </label>
            </div>

            <div>
              <Label htmlFor="systemPrompt">System prompt (optional)</Label>
              <Textarea
                id="systemPrompt"
                rows={4}
                value={formData.systemPrompt || ''}
                onChange={(event) => setFormData((prev) => ({ ...prev, systemPrompt: event.target.value }))}
                placeholder="Leave blank to use the default prompt"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save configuration'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
