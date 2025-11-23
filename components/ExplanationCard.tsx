'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Lightbulb,
  CheckCircle2,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Sparkles,
  BookOpen,
  Zap
} from 'lucide-react'
import { useNotification } from '@/components/ui/notification-provider'

export interface StructuredExplanation {
  summary: string
  answer: string[]
  optionAnalysis: Array<{
    option: string
    verdict: 'correct' | 'wrong'
    reason: string
  }>
  keyPoints: string[]
  memoryAids?: Array<{
    type: 'ACRONYM' | 'RHYMING' | 'RULE' | 'STORY'
    text: string
  }>
  citations?: Array<{
    title: string
    url: string
    quote: string
  }>
  difficulty?: number
  insufficiency?: boolean
}

export interface ExplanationCardProps {
  type: 'OFFICIAL' | 'USER' | 'AI'
  content: string | StructuredExplanation
  format: 'text' | 'structured'
  upvotes?: number
  downvotes?: number
  userVote?: 'UP' | 'DOWN' | 'REPORT' | null
  createdBy?: {
    id: string
    name: string
  } | null
  explanationId?: string
  onVote?: (vote: 'UP' | 'DOWN' | 'REPORT', reportReason?: string) => void
  selectedOptionIds?: string[]
  optionTextMap?: Record<string, string>
}

const MemoryAidIcon: React.FC<{ type: string }> = ({ type }) => {
  const baseClass = 'text-base leading-none'
  switch (type) {
    case 'ACRONYM':
      return <span className={`${baseClass} text-purple-600 dark:text-purple-300`}>🔤</span>
    case 'RHYMING':
      return <span className={`${baseClass} text-pink-600 dark:text-pink-300`}>🎵</span>
    case 'RULE':
      return <span className={`${baseClass} text-blue-600 dark:text-blue-300`}>📏</span>
    case 'STORY':
      return <span className={`${baseClass} text-green-600 dark:text-green-300`}>📖</span>
    default:
      return <Zap className="h-4 w-4 text-amber-600 dark:text-amber-300" />
  }
}

const MemoryAidLabel: Record<string, string> = {
  ACRONYM: '首字母记忆',
  RHYMING: '口诀记忆',
  RULE: '规律记忆',
  STORY: '故事记忆',
  MNEMONIC: '记忆技巧',
  OTHER: '辅助记忆',
}

export function ExplanationCard({
  type,
  content,
  format,
  upvotes = 0,
  downvotes = 0,
  userVote,
  createdBy,
  explanationId,
  onVote,
  selectedOptionIds = [],
  optionTextMap = {},
}: ExplanationCardProps) {
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const { notify } = useNotification()
  const [voteLocked, setVoteLocked] = useState(false)
  const voteCooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedOptionSet = new Set(
    (selectedOptionIds || []).map(option => option.toUpperCase())
  )

  const formatAnswerText = (answers: string[]) => {
    return answers
      .map(answer => {
        const key = answer.toUpperCase()
        const mappedText = optionTextMap?.[key]

        if (mappedText) {
          return `${mappedText} (${key})`
        }

        return key
      })
      .join('、')
  }

  useEffect(() => {
    return () => {
      if (voteCooldownRef.current) {
        clearTimeout(voteCooldownRef.current)
      }
    }
  }, [])

  const scheduleUnlock = () => {
    if (voteCooldownRef.current) {
      clearTimeout(voteCooldownRef.current)
    }
    voteCooldownRef.current = setTimeout(() => setVoteLocked(false), 800)
  }

  const executeVote = async (vote: 'UP' | 'DOWN' | 'REPORT', reason?: string) => {
    if (!onVote || voteLocked) {
      return false
    }
    setVoteLocked(true)
    try {
      await Promise.resolve(onVote(vote, reason))
      return true
    } catch (error) {
      notify({
        variant: 'destructive',
        title: '操作失败',
        description: error instanceof Error ? error.message : '请求未完成，请稍后重试。',
      })
      return false
    } finally {
      scheduleUnlock()
    }
  }

  const handleReport = async () => {
    if (!reportReason.trim()) {
      notify({
        variant: 'warning',
        title: '请填写举报原因',
        description: '为了便于审核，请简要说明举报的理由。',
      })
      return
    }
    const dispatched = await executeVote('REPORT', reportReason)
    if (dispatched) {
      setReportDialogOpen(false)
      setReportReason('')
    }
  }

  const typeColors = {
    OFFICIAL: 'border-green-300 bg-green-50/80 dark:border-emerald-500/50 dark:bg-emerald-500/10',
    AI: 'border-blue-300 bg-blue-50/80 dark:border-blue-500/50 dark:bg-blue-500/10',
    USER: 'border-purple-300 bg-purple-50/80 dark:border-purple-500/50 dark:bg-purple-500/12',
  }

  const typeIcons = {
    OFFICIAL: <CheckCircle2 className="h-4 w-4 text-green-600" />,
    AI: <Sparkles className="h-4 w-4 text-blue-600" />,
    USER: <Lightbulb className="h-4 w-4 text-purple-600" />,
  }

  const typeLabels = {
    OFFICIAL: '官方解析',
    AI: 'AI 解析',
    USER: '用户解析',
  }

  // 文本格式（旧格式）
  if (format === 'text') {
    return (
      <Card className={`border-2 ${typeColors[type]}`}>
        <CardContent className="pt-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              {typeIcons[type]}
              <span className="font-semibold text-gray-700 dark:text-gray-200">{typeLabels[type]}</span>
              {createdBy && (
                <span className="text-xs text-gray-500 dark:text-gray-400">by {createdBy.name}</span>
              )}
            </div>
            {type !== 'OFFICIAL' && onVote && explanationId && (
              <div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap sm:justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className={userVote === 'UP' ? 'text-green-600' : ''}
                  disabled={voteLocked}
                  onClick={() => executeVote('UP')}
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span className="ml-1 text-xs">{upvotes}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={userVote === 'DOWN' ? 'text-red-600' : ''}
                  disabled={voteLocked}
                  onClick={() => executeVote('DOWN')}
                >
                  <ThumbsDown className="h-4 w-4" />
                  <span className="ml-1 text-xs">{downvotes}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={userVote === 'REPORT' ? 'text-orange-600' : ''}
                  onClick={() => setReportDialogOpen(true)}
                >
                  <Flag className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <p className="whitespace-pre-line text-sm text-gray-700 dark:text-gray-100">{content as string}</p>
        </CardContent>

        {/* 举报对话框 */}
        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>举报解析</DialogTitle>
              <DialogDescription>
                请说明举报原因，帮助我们改善内容质量
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reason">举报原因</Label>
                <Textarea
                  id="reason"
                  placeholder="例如：内容错误、含有误导信息、抄袭等..."
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleReport}>
                提交举报
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    )
  }

  // 结构化格式（新格式）
  const structured = content as StructuredExplanation

  // 防御性检查：如果数据不完整，降级为文本模式
  if (!structured || typeof structured !== 'object' || !structured.summary || !structured.answer) {
    return (
      <Card className={`border-2 ${typeColors[type]}`}>
        <CardContent className="pt-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              {typeIcons[type]}
              <span className="font-semibold text-gray-700 dark:text-gray-200">{typeLabels[type]}</span>
              {createdBy && (
                <span className="text-xs text-gray-500 dark:text-gray-400">by {createdBy.name}</span>
              )}
            </div>
                {type !== 'OFFICIAL' && onVote && explanationId && (
                  <div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap sm:justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={userVote === 'UP' ? 'text-green-600' : ''}
                      disabled={voteLocked}
                      onClick={() => executeVote('UP')}
                    >
                      <ThumbsUp className="h-4 w-4" />
                      <span className="ml-1 text-xs">{upvotes}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={userVote === 'DOWN' ? 'text-red-600' : ''}
                      disabled={voteLocked}
                      onClick={() => executeVote('DOWN')}
                    >
                      <ThumbsDown className="h-4 w-4" />
                      <span className="ml-1 text-xs">{downvotes}</span>
                    </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={userVote === 'REPORT' ? 'text-orange-600' : ''}
                  onClick={() => setReportDialogOpen(true)}
                >
                  <Flag className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <p className="whitespace-pre-line text-sm text-gray-700 dark:text-gray-100">
            {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
          </p>
          <p className="text-xs text-red-500 mt-2">解析格式不完整，显示原始内容</p>
        </CardContent>

        {/* 举报对话框 */}
        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>举报解析</DialogTitle>
              <DialogDescription>
                请说明举报原因，帮助我们改善内容质量
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reason">举报原因</Label>
                <Textarea
                  id="reason"
                  placeholder="例如：内容错误、含有误导信息、抄袭等..."
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleReport}>
                提交举报
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    )
  }

  return (
    <Card className={`border-2 ${typeColors[type]}`}>
      <CardContent className="pt-4 space-y-4">
        {/* 头部 */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {typeIcons[type]}
            <span className="font-semibold text-gray-700 dark:text-gray-200">{typeLabels[type]}</span>
            {createdBy && (
              <span className="text-xs text-gray-500 dark:text-gray-400">by {createdBy.name}</span>
            )}
            {structured.insufficiency && (
              <Badge variant="outline" className="text-xs text-orange-600">
                证据不足
              </Badge>
            )}
          </div>
          {type !== 'OFFICIAL' && onVote && explanationId && (
            <div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap sm:justify-end">
              <Button
                variant="ghost"
                size="sm"
                className={userVote === 'UP' ? 'text-green-600' : ''}
                disabled={voteLocked}
                onClick={() => executeVote('UP')}
              >
                <ThumbsUp className="h-4 w-4" />
                <span className="ml-1 text-xs">{upvotes}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={userVote === 'DOWN' ? 'text-red-600' : ''}
                disabled={voteLocked}
                onClick={() => executeVote('DOWN')}
              >
                <ThumbsDown className="h-4 w-4" />
                <span className="ml-1 text-xs">{downvotes}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={userVote === 'REPORT' ? 'text-orange-600' : ''}
                onClick={() => setReportDialogOpen(true)}
              >
                <Flag className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* 一句话结论 */}
        <div className="rounded-lg bg-white p-3 border border-gray-100 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">结论</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">{structured.summary}</p>
              {structured.answer && structured.answer.length > 0 && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  正确答案：
                  <span className="font-semibold text-green-600">
                    {formatAnswerText(structured.answer)}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 逐项分析 */}
        {structured.optionAnalysis && structured.optionAnalysis.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">逐项分析</p>
            <div className="space-y-2">
              {structured.optionAnalysis.map((item, idx) => {
                const upperOption = (item.option || '').toUpperCase()
                const optionText = optionTextMap?.[upperOption] || ''
                const isSelected = selectedOptionSet.has(upperOption)
                const verdictClasses =
                  item.verdict === 'correct'
                    ? 'bg-green-50 border-green-200 text-green-700 dark:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-emerald-100'
                    : 'bg-red-50 border-red-200 text-red-700 dark:bg-rose-500/15 dark:border-rose-500/40 dark:text-rose-100'
                const selectedClasses = isSelected
                  ? 'ring-2 ring-blue-300 shadow-sm dark:ring-blue-500/60'
                  : ''

                return (
                  <div
                    key={idx}
                    className={`rounded p-3 text-sm flex items-start gap-3 border ${verdictClasses} ${selectedClasses}`}
                  >
                    {item.verdict === 'correct' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="space-y-1">
                      {optionText ? (
                        <p className="font-medium text-gray-900 dark:text-slate-100 leading-snug">
                          {optionText}
                        </p>
                      ) : (
                        <p className="font-medium text-gray-600 dark:text-slate-200 leading-snug">
                          {upperOption}
                        </p>
                      )}
                      {isSelected && (
                        <Badge
                          variant="outline"
                          className="w-fit bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-200 dark:border-blue-500/40 text-[11px]"
                        >
                          当前选择
                        </Badge>
                      )}
                      <p
                        className={
                          item.verdict === 'correct'
                            ? 'text-green-700 leading-relaxed dark:text-emerald-100'
                            : 'text-red-700 leading-relaxed dark:text-rose-100'
                        }
                      >
                        {item.reason}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 知识点 */}
        {structured.keyPoints && structured.keyPoints.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-indigo-600" />
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">考点</p>
            </div>
            <ul className="space-y-1">
              {structured.keyPoints.map((point, idx) => (
                <li key={idx} className="text-sm text-gray-700 dark:text-gray-200 flex items-start gap-2">
                  <span className="text-indigo-600">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 助记技巧 */}
        {structured.memoryAids && structured.memoryAids.length > 0 && (
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 dark:bg-amber-500/15 dark:border-amber-500/40">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-yellow-600 dark:text-amber-300" />
              <p className="text-sm font-semibold text-yellow-800 dark:text-amber-100">助记技巧</p>
            </div>
            <div className="space-y-2">
              {structured.memoryAids.map((aid, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 text-sm text-gray-800 dark:text-amber-50"
                >
                  <MemoryAidIcon type={aid.type} />
                  <div>
                    <span className="text-xs text-yellow-700 dark:text-amber-200 font-medium">
                      {MemoryAidLabel[aid.type]}:
                    </span>
                    <p className="text-gray-800 dark:text-amber-50">{aid.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 引用来源 */}
        {structured.citations && structured.citations.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-600 dark:text-gray-300 hover:text-gray-800 font-medium">
              参考资料 ({structured.citations.length})
            </summary>
            <div className="mt-2 space-y-2">
              {structured.citations.map((citation, idx) => (
                <div key={idx} className="bg-gray-50 rounded p-2 border border-gray-200 dark:bg-slate-900/50 dark:border-slate-700/60">
                  <p className="font-medium text-gray-700 dark:text-gray-100">{citation.title}</p>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">{citation.quote}</p>
                  <a
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline mt-1 inline-block"
                  >
                    查看来源 →
                  </a>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* 难度指示 */}
        {structured.difficulty !== undefined && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            AI 难度评估: {'⭐'.repeat(structured.difficulty)}
          </div>
        )}
      </CardContent>

      {/* 举报对话框 */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>举报解析</DialogTitle>
            <DialogDescription>
              请说明举报原因，帮助我们改善内容质量
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">举报原因</Label>
              <Textarea
                id="reason"
                placeholder="例如：内容错误、含有误导信息、抄袭等..."
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleReport}>
              提交举报
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

