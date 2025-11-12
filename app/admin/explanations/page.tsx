'use client'

import { useState, useEffect } from 'react'

import { AdminPageShell } from '@/components/admin/AdminPageShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useNotification } from '@/components/ui/notification-provider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Lightbulb, Sparkles, Save, X, Edit } from 'lucide-react'

interface Question {
  id: string
  uuid: string
  externalId: string
  type: string
  category: string
  title: string
  explanation?: string | null
  aiExplanation?: string | null
}

export default function AdminExplanationsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>('A_CLASS')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const { notify } = useNotification()

  const loadQuestions = async (reset = false) => {
    try {
      setLoading(true)
      setError(null)

      const currentPage = reset ? 1 : page
      const params = new URLSearchParams({
        type: typeFilter,
        page: String(currentPage),
        limit: '10',
      })

      const response = await fetch(`/api/admin/questions?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '获取题目失败')
      }

      const data = await response.json()

      if (reset) {
        setQuestions(data.questions || [])
        setPage(1)
      } else {
        setQuestions(prev => [...prev, ...(data.questions || [])])
      }

      setHasMore((data.questions || []).length >= 10)
    } catch (err: any) {
      console.error('Failed to load questions:', err)
      setError(err.message || '获取题目失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQuestions(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter])

  const handleEdit = (question: Question) => {
    setEditingId(question.id)
    setEditText(question.explanation || '')
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditText('')
  }

  const handleSave = async (questionId: string) => {
    try {
      setSaving(true)

      const response = await fetch(`/api/admin/questions/${questionId}/explanation`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          explanation: editText,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '保存失败')
      }

      const data = await response.json()

      // 更新本地状态
      setQuestions(prev =>
        prev.map(q =>
          q.id === questionId
            ? { ...q, explanation: data.question.explanation }
            : q
        )
      )

      setEditingId(null)
      setEditText('')
    } catch (err: any) {
      console.error('Failed to save explanation:', err)
      notify({
        variant: 'danger',
        title: '保存失败',
        description: err.message || '提交解析内容时出现异常。',
      })
    } finally {
      setSaving(false)
    }
  }

  const loadMore = () => {
    setPage(prev => prev + 1)
    loadQuestions(false)
  }

  return (
    <AdminPageShell maxWidthClassName="max-w-6xl" contentClassName="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-2xl font-semibold">人工解析管理</CardTitle>
              <p className="mt-1 text-sm text-gray-500">
                编辑和管理题目的人工解析内容
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="选择题库类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A_CLASS">A类题库</SelectItem>
                  <SelectItem value="B_CLASS">B类题库</SelectItem>
                  <SelectItem value="C_CLASS">C类题库</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                disabled={loading}
                onClick={() => loadQuestions(true)}
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

            <div className="space-y-4">
              {questions.length === 0 && !loading ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  暂无题目数据
                </div>
              ) : (
                questions.map(question => (
                  <Card key={question.id} className="border border-gray-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <Badge variant="outline">{question.externalId}</Badge>
                            <Badge variant="secondary">{question.category}</Badge>
                            {question.explanation && (
                              <Badge variant="default" className="gap-1">
                                <Lightbulb className="h-3 w-3" />
                                有人工解析
                              </Badge>
                            )}
                            {question.aiExplanation && (
                              <Badge variant="default" className="gap-1">
                                <Sparkles className="h-3 w-3" />
                                有AI解析
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-900">
                            {question.title}
                          </p>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      {/* 人工解析编辑区 */}
                      <div className="rounded-lg border border-gray-200 bg-white p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Lightbulb className="h-4 w-4" />
                            <span className="font-semibold">人工解析</span>
                          </div>
                          {editingId !== question.id && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(question)}
                            >
                              <Edit className="mr-1 h-3.5 w-3.5" />
                              编辑
                            </Button>
                          )}
                        </div>

                        {editingId === question.id ? (
                          <div className="space-y-2">
                            <textarea
                              className="w-full rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
                              rows={6}
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              placeholder="输入人工解析内容..."
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={handleCancel}
                                disabled={saving}
                              >
                                <X className="mr-1 h-3.5 w-3.5" />
                                取消
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleSave(question.id)}
                                disabled={saving}
                              >
                                <Save className="mr-1 h-3.5 w-3.5" />
                                {saving ? '保存中...' : '保存'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="whitespace-pre-line text-sm text-gray-700">
                            {question.explanation || (
                              <span className="text-gray-400">暂无人工解析</span>
                            )}
                          </p>
                        )}
                      </div>

                      {/* AI解析显示区（只读） */}
                      {question.aiExplanation && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                          <div className="mb-2 flex items-center gap-2 text-blue-700">
                            <Sparkles className="h-4 w-4" />
                            <span className="font-semibold">AI解析</span>
                            <Badge variant="outline" className="border-blue-200 text-blue-700">
                              已生成
                            </Badge>
                          </div>
                          <p className="whitespace-pre-line text-sm text-gray-700">
                            {question.aiExplanation}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {loading && questions.length === 0 && (
              <p className="mt-4 text-center text-sm text-gray-500">正在加载题目...</p>
            )}

            {hasMore && questions.length > 0 && (
              <div className="mt-6 text-center">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loading}
                >
                  {loading ? '加载中...' : '加载更多'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
    </AdminPageShell>
  )
}
