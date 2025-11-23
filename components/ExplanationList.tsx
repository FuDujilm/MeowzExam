import React, { useState, useEffect } from 'react'
import { ExplanationCard } from './ExplanationCard'
import { UserExplanationForm } from './UserExplanationForm'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { useNotification } from '@/components/ui/notification-provider'
import { Sparkles, Loader2, RefreshCw, PlusCircle } from 'lucide-react'

export interface ExplanationListProps {
  questionId: string
  onGenerateAI?: () => Promise<boolean | void> | boolean | void
  onRegenerateAI?: () => Promise<boolean | void> | boolean | void
  aiLoading?: boolean
  selectedOptionIds?: string[]
  answerMapping?: Record<string, string>
  optionTextMap?: Record<string, string>
}

export function ExplanationList({
  questionId,
  onGenerateAI,
  onRegenerateAI,
  aiLoading = false,
  selectedOptionIds = [],
  answerMapping = {},
  optionTextMap = {},
}: ExplanationListProps) {
  const [explanations, setExplanations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUserForm, setShowUserForm] = useState(false)
  const [internalGenerating, setInternalGenerating] = useState(false)
  const [internalRegenerating, setInternalRegenerating] = useState(false)
  const { notify } = useNotification()

  const hasAI = explanations.some(e => e.type === 'AI')
  const hasUserSubmitted = explanations.some(e => e.type === 'USER' && e.createdBy?.id)

  // 加载解析列表
  const loadExplanations = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/questions/${questionId}/explanations`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('获取解析失败')
      }

      const data = await response.json()
      setExplanations(data.explanations || [])
    } catch (err: any) {
      console.error('Load explanations error:', err)
      setError(err.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExplanations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId])

  const handleGenerateAI = async () => {
    if (!onGenerateAI || internalGenerating) {
      return
    }

    setInternalGenerating(true)
    try {
      await Promise.resolve(onGenerateAI())
    } catch (error) {
      console.error('Generate AI explanation via list failed:', error)
      notify({
        variant: 'danger',
        title: 'AI 解析生成失败',
        description: '请稍后重试或手动撰写解析。',
      })
    } finally {
      await loadExplanations()
      setInternalGenerating(false)
    }
  }

  const aiButtonDisabled = aiLoading || internalGenerating || internalRegenerating

  const renderAIButton = (props: { variant?: 'default' | 'outline'; label?: string }) => {
    if (!onGenerateAI || hasAI) {
      return null
    }

    return (
      <Button
        onClick={handleGenerateAI}
        disabled={aiButtonDisabled}
        size="sm"
        variant={props.variant ?? 'outline'}
      >
        {aiButtonDisabled ? (
          <>
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            正在生成...
          </>
        ) : (
          <>
            <Sparkles className="mr-1 h-4 w-4" />
            {props.label ?? '生成 AI 解析'}
          </>
        )}
      </Button>
    )
  }

  const handleRegenerateAI = async () => {
    if (!onRegenerateAI || internalRegenerating) {
      return
    }

    setInternalRegenerating(true)
    try {
      await Promise.resolve(onRegenerateAI())
    } catch (error) {
      console.error('Regenerate AI explanation via list failed:', error)
      notify({
        variant: 'danger',
        title: '重新生成失败',
        description: '请稍后再试或检查积分余额',
      })
    } finally {
      await loadExplanations()
      setInternalRegenerating(false)
    }
  }

  const renderRegenerateButton = () => {
    if (!onRegenerateAI || !hasAI) {
      return null
    }

    const disabled = aiLoading || internalGenerating || internalRegenerating

    return (
      <Button
        onClick={handleRegenerateAI}
        disabled={disabled}
        size="sm"
        variant="outline"
      >
        {disabled ? (
          <>
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            正在重新生成...
          </>
        ) : (
          <>
            <RefreshCw className="mr-1 h-4 w-4" />
            不满意，重新生成
          </>
        )}
      </Button>
    )
  }

  const renderUserButton = (props?: { variant?: 'default' | 'outline' }) => {
    if (showUserForm || hasUserSubmitted) {
      return null
    }

    return (
      <Button
        onClick={() => setShowUserForm(true)}
        size="sm"
        variant={props?.variant ?? 'outline'}
        className={
          props?.variant === 'default'
            ? undefined
            : 'border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-500/60 dark:text-purple-200 dark:hover:bg-purple-500/20'
        }
      >
        <PlusCircle className="mr-1 h-4 w-4" />
        我来贡献解析
      </Button>
    )
  }

  // 投票
  const handleVote = async (explanationId: string, vote: 'UP' | 'DOWN' | 'REPORT', reportReason?: string) => {
    try {
      const response = await fetch(`/api/explanations/${explanationId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vote, reportReason }),
      })

      if (!response.ok) {
        let message = '投票失败'

        try {
          const data = await response.json()
          if (data?.error) {
            message = data.error
          }
        } catch (_parseError) {
          // ignore JSON parse errors, keep default message
        }

        if (response.status === 401) {
          message = '请先登录后再投票'
        }

        throw new Error(message)
      }

      // 重新加载解析
      await loadExplanations()
    } catch (err: any) {
      console.error('Vote error:', err)
      const message = err?.message || '投票失败'
      notify({
        variant: message === '请先登录后再投票' ? 'warning' : 'danger',
        title: message === '请先登录后再投票' ? '需要登录' : '操作未完成',
        description: message,
      })

      if (message === '请先登录后再投票') {
        window.location.href = '/login'
      }
    }
  }

  // 用户提交成功
  const handleUserSubmitSuccess = () => {
    setShowUserForm(false)
    loadExplanations()
  }

  const toolbarAIButton = renderAIButton({})
  const toolbarRegenerateButton = renderRegenerateButton()
  const toolbarUserButton = renderUserButton()

  const shouldShowToolbar = (explanations.length > 0 || showUserForm) && Boolean(toolbarAIButton || toolbarRegenerateButton || toolbarUserButton)

  const normalizedSelectedOptionIds = (selectedOptionIds || []).map(optionId => {
    const mapped = answerMapping?.[optionId]
    const finalId = typeof mapped === 'string' && mapped.trim() ? mapped : optionId
    return typeof finalId === 'string' ? finalId.toUpperCase() : ''
  }).filter(Boolean)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-600 dark:text-slate-300">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-slate-500" />
        <span className="ml-2 text-sm">加载解析中...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Callout
        variant="danger"
        title="解析加载失败"
        actions={(
          <Button variant="secondary" size="sm" onClick={loadExplanations}>
            <RefreshCw className="h-4 w-4 mr-1" />
            重试
          </Button>
        )}
      >
        {error || '加载解析列表时出现错误，请稍后再试。'}
      </Callout>
    )
  }

  return (
    <div className="space-y-4">
      {/* 操作按钮 */}
      {shouldShowToolbar && (
        <div className="flex flex-wrap justify-end gap-2 sm:flex-nowrap">
          {toolbarAIButton}
          {toolbarRegenerateButton}
          {toolbarUserButton}
        </div>
      )}

      {/* 用户提交表单 */}
      {showUserForm && (
        <UserExplanationForm
          questionId={questionId}
          onSuccess={handleUserSubmitSuccess}
          onCancel={() => setShowUserForm(false)}
        />
      )}

      {/* 解析列表 */}
      {explanations.length === 0 && !showUserForm ? (
        <Callout
          variant="neutral"
          title="还没有解析内容"
          actions={(
            <div className="flex flex-wrap items-center gap-2">
              {renderAIButton({ variant: 'default', label: 'AI 快速生成' })}
              {renderUserButton({ variant: 'outline' })}
            </div>
          )}
        >
          这道题还没有任何解析，您可以通过 AI 一键生成，或贡献自己的思考帮助更多考生。
        </Callout>
      ) : (
        explanations.map((exp, idx) => (
          <ExplanationCard
            key={exp.id || idx}
            type={exp.type}
            content={exp.content}
            format={exp.format}
            upvotes={exp.upvotes}
            downvotes={exp.downvotes}
            userVote={exp.userVote}
            createdBy={exp.createdBy}
            explanationId={exp.id !== 'legacy-official' && exp.id !== 'legacy-ai' ? exp.id : undefined}
            onVote={
              exp.id !== 'legacy-official' && exp.id !== 'legacy-ai'
                ? (vote, reportReason) => handleVote(exp.id, vote, reportReason)
                : undefined
            }
            selectedOptionIds={normalizedSelectedOptionIds}
            optionTextMap={optionTextMap}
          />
        ))
      )}
    </div>
  )
}
