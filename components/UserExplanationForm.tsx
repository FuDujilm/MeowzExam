import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Lightbulb, X, Send, Loader2 } from 'lucide-react'

export interface UserExplanationFormProps {
  questionId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function UserExplanationForm({
  questionId,
  onSuccess,
  onCancel,
}: UserExplanationFormProps) {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim()) {
      setError('请输入解析内容')
      return
    }

    if (content.trim().length < 20) {
      setError('解析内容至少需要20个字符')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const response = await fetch(`/api/questions/${questionId}/explanations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          format: 'text',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '提交失败')
      }

      // 成功
      setContent('')
      onSuccess?.()
    } catch (error) {
      console.error('Submit error:', error)
      setError(error instanceof Error ? error.message : '提交失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="border-2 border-purple-300 bg-purple-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">贡献您的解析</CardTitle>
          </div>
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={submitting}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="explanation-content" className="text-sm font-medium text-gray-700">
              解析内容
            </Label>
            <p className="text-xs text-gray-500 mb-2">
              请详细解释正确答案的理由，帮助其他考生理解这道题
            </p>
            <Textarea
              id="explanation-content"
              placeholder="例如：这道题考察的是...正确答案是 X，因为...其他选项错误的原因是..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              disabled={submitting}
              className="resize-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              {content.length} / 最少20字符
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="bg-purple-100 rounded-lg p-3 text-xs text-purple-800">
            <p className="font-semibold mb-1">提交须知：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>每道题只能提交一次解析</li>
              <li>您的解析将公开显示，其他用户可以点赞或点踩</li>
              <li>解析被举报≥5次会自动隐藏待审核</li>
              <li>请确保内容准确、清晰、有帮助</li>
            </ul>
          </div>

          <div className="flex gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={submitting}
                className="flex-1"
              >
                取消
              </Button>
            )}
            <Button
              type="submit"
              disabled={submitting || content.trim().length < 20}
              className="flex-1"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  提交解析
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
