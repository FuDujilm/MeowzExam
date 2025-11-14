'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircle, Edit, Trash2, Power, PowerOff } from 'lucide-react'

import { AdminPageShell } from '@/components/admin/AdminPageShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useNotification } from '@/components/ui/notification-provider'

type UsageScope = 'EXPLANATION' | 'ASSISTANT' | 'BOTH'

interface AiModel {
  id: string
  name: string
  provider: string
  modelName: string
  apiUrl: string
  isActive: boolean
  priority: number
  usageScope: UsageScope
}

const usageScopeLabels: Record<UsageScope, string> = {
  EXPLANATION: 'Explanation',
  ASSISTANT: 'Assistant',
  BOTH: 'Universal',
}

const usageScopeBadgeVariant: Record<UsageScope, 'default' | 'secondary' | 'outline'> = {
  EXPLANATION: 'outline',
  ASSISTANT: 'secondary',
  BOTH: 'default',
}

export default function AdminAiModelsPage() {
  const router = useRouter()
  const { notify } = useNotification()
  const [models, setModels] = useState<AiModel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void loadModels()
  }, [])

  const loadModels = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/ai-models')
      if (!res.ok) throw new Error('Failed to fetch models')
      const data = await res.json()
      setModels(data.models)
    } catch (error) {
      notify({
        variant: 'danger',
        title: 'Load failed',
        description: 'Unable to load AI model configurations. Please verify admin permissions.',
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/ai-models/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      await loadModels()
    } catch (error) {
      notify({
        variant: 'danger',
        title: 'Update failed',
        description: 'Unable to update model status. Please try again later.',
      })
    }
  }

  const deleteModel = async (id: string) => {
    if (!confirm('Delete this model configuration?')) return
    try {
      const res = await fetch(`/api/admin/ai-models/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete model')
      await loadModels()
    } catch (error) {
      notify({
        variant: 'danger',
        title: 'Delete failed',
        description: 'Operation did not complete. Please retry or check your network connection.',
      })
    }
  }

  if (loading) {
    return (
      <AdminPageShell maxWidthClassName="max-w-6xl">
        <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">Loading...</div>
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell maxWidthClassName="max-w-6xl" contentClassName="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">AI Model Management</h1>
        <Button onClick={() => router.push('/admin/ai-models/new')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New configuration
        </Button>
      </div>

      <div className="grid gap-4">
        {models.map((model) => (
          <Card key={model.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle>{model.name}</CardTitle>
                  <Badge variant={model.isActive ? 'default' : 'secondary'}>
                    {model.isActive ? 'Active' : 'Disabled'}
                  </Badge>
                  <Badge variant="outline">Priority {model.priority}</Badge>
                  <Badge variant={usageScopeBadgeVariant[model.usageScope]}>
                    Scope: {usageScopeLabels[model.usageScope]}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleActive(model.id, model.isActive)}
                  >
                    {model.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/admin/ai-models/${model.id}`)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteModel(model.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Provider:</span> <strong>{model.provider}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Model:</span> <strong>{model.modelName}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">API URL:</span> <strong>{model.apiUrl}</strong>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {models.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500 dark:border-slate-800 dark:text-slate-400">
            No configurations found. Click “New configuration” to create one.
          </div>
        ) : null}
      </div>
    </AdminPageShell>
  )
}
