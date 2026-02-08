'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Heart,
  HeartOff,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { ExplanationList } from '@/components/ExplanationList'
import { useNotification } from '@/components/ui/notification-provider'

interface Question {
  id: string
  uuid: string
  externalId: string
  type: string
  questionType: string
  difficulty: string
  category: string
  categoryCode: string
  title: string
  options: Array<{
    id: string
    text: string
    is_correct: boolean
  }>
  correctAnswers: string[]
  explanation?: string
  aiExplanation?: string
  hasImage: boolean
  imagePath?: string
  imageAlt?: string | null
}

interface UserQuestion {
  correctCount: number
  incorrectCount: number
  lastCorrect?: boolean
}

interface DailyPracticeProgress {
  target: number
  count: number
  remaining: number
  completed: boolean
  rewardPoints?: number
}

function PracticeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const mode = searchParams.get('mode') || 'sequential'
  const type = searchParams.get('type') || 'A_CLASS'
  const dailyPracticeRedirectUrl = `/daily-practice?type=${encodeURIComponent(type)}`
  const questionIdParam = searchParams.get('questionId')
  
  const [question, setQuestion] = useState<Question | null>(null)
  const [userQuestion, setUserQuestion] = useState<UserQuestion | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoritePending, setFavoritePending] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<string[]>([])
  const [answerMapping, setAnswerMapping] = useState<Record<string, string>>({}) // 保存当前题目的选项映射
  const [optionTextMap, setOptionTextMap] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [questionHistory, setQuestionHistory] = useState<string[]>([]) // 保存浏览过的题目ID
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1) // 当前历史位置
  const [dailyProgress, setDailyProgress] = useState<DailyPracticeProgress | null>(null)
  const { notify } = useNotification()
  const isDailyMode = mode === 'daily'

  // 获取模式名称
  const getModeName = () => {
    switch (mode) {
    case 'sequential': return '顺序练习'
    case 'random': return '随机练习'
    case 'wrong': return '错题练习'
    case 'favorite': return '收藏练习'
    case 'daily': return '每日练习'
    default: return '练习'
    }
  }

  const refreshDailyStatus = async () => {
    if (!isDailyMode) {
      setDailyProgress(null)
      return
    }
    try {
      const res = await fetch('/api/daily-practice/status?days=7', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setDailyProgress({
        target: data.target,
        count: data.today?.count ?? 0,
        remaining: Math.max(data.target - (data.today?.count ?? 0), 0),
        completed: data.today?.completed ?? false,
        rewardPoints: data.today?.rewardPoints ?? 0,
      })
    } catch (error) {
      console.error('加载每日练习状态失败', error)
    }
  }

  // 加载题目
const loadQuestion = async (
    currentId?: string,
    direction: 'next' | 'prev' | 'jump' = 'next',
    targetQuestionId?: string | null,
  ) => {
    try {
      if (isDailyMode && dailyProgress?.completed) {
        notify({
          variant: 'success',
          title: '今日每日练习已完成',
          description: '明天再来继续坚持吧！',
        })
        return false
      }
      setLoading(true)
      const params = new URLSearchParams({
        mode,
        type,
      })

      if (targetQuestionId) {
        params.append('questionId', targetQuestionId)
      } else if (currentId) {
        params.append('currentId', currentId)
      }

      const response = await fetch(`/api/practice/next?${params}`)
      if (!response.ok) {
        const error = await response.json().catch(() => null)
        if (isDailyMode && error?.dailyPractice) {
          setDailyProgress({
            target: error.dailyPractice.target,
            count: error.dailyPractice.count,
            remaining: error.dailyPractice.remaining ?? 0,
            completed: error.dailyPractice.completed ?? false,
            rewardPoints: error.dailyPractice.rewardPoints ?? 0,
          })
          if (error.dailyPractice.completed) {
            notify({
              variant: 'success',
              title: '今日每日练习已完成',
              description: '即将跳转到打卡日历查看奖励及记录。',
            })
            setTimeout(() => router.push(dailyPracticeRedirectUrl), 1200)
          }
        }
        notify({
          variant: 'danger',
          title: '加载题目失败',
          description: error?.error || '请稍后再试。',
        })
        return false
      }

      const data = await response.json().catch(() => null)
      if (!data || !data.question) {
        console.error('loadQuestion parse error', data)
        notify({
          variant: 'danger',
          title: '加载题目失败',
          description: '题目数据异常，请稍后再试。',
        })
        return false
      }
      if (isDailyMode && data.dailyPractice) {
        setDailyProgress({
          target: data.dailyPractice.target,
          count: data.dailyPractice.count,
          remaining: data.dailyPractice.remaining ?? Math.max(data.dailyPractice.target - data.dailyPractice.count, 0),
          completed: data.dailyPractice.completed ?? false,
          rewardPoints: data.dailyPractice.rewardPoints ?? 0,
        })
      }
      setQuestion(data.question)
      setUserQuestion(data.userQuestion)
      if (isDailyMode && data.dailyPractice) {
        setDailyProgress({
          target: data.dailyPractice.target,
          count: data.dailyPractice.count,
          remaining: Math.max(data.dailyPractice.target - data.dailyPractice.count, 0),
          completed: data.dailyPractice.completed ?? false,
          rewardPoints: data.dailyPractice.rewardPoints ?? 0,
        })
        if (data.dailyPractice.completed && data.dailyPractice.rewardPoints) {
          notify({
            variant: 'success',
            title: '每日练习完成！',
            description: `获得 ${data.dailyPractice.rewardPoints} 积分奖励，别忘了明天继续哦！`,
          })
          setTimeout(() => router.push(dailyPracticeRedirectUrl), 1500)
        }
      }
      setIsFavorite(data.isFavorite)
      setSelectedAnswer([]) // 重置选择
      setSubmitted(false)
      setIsCorrect(null)
      setCorrectAnswers([])
      setAiLoading(false)

      // 保存answerMapping
      const incomingMapping = data.question?.answerMapping || {}
      setAnswerMapping(incomingMapping)

      const derivedOptionMap: Record<string, string> = {}
      const questionOptions = Array.isArray(data.question?.options)
        ? (data.question.options as Array<{ id: string; text: string }>)
        : []

      questionOptions.forEach(opt => {
        const originalId = incomingMapping?.[opt.id] ?? opt.id
        if (typeof originalId === 'string') {
          derivedOptionMap[originalId.toUpperCase()] = opt.text
        }
      })
      setOptionTextMap(derivedOptionMap)

      // 更新历史记录
      if (direction === 'next' && data.question) {
        const newHistory = [...questionHistory.slice(0, currentHistoryIndex + 1), data.question.id]
        setQuestionHistory(newHistory)
        setCurrentHistoryIndex(newHistory.length - 1)
      } else if (direction === 'jump' && data.question) {
        setQuestionHistory([data.question.id])
        setCurrentHistoryIndex(0)
      }
    } catch (error) {
      console.error('加载题目失败:', error)
      notify({
        variant: 'danger',
        title: '加载题目失败',
        description: '网络或服务器异常，请稍后再试。',
      })
    } finally {
      setLoading(false)
    }
  }

  // 初始加载 & 根据地址栏 questionId 跳转
  useEffect(() => {
    const jumpId = questionIdParam ?? undefined
    loadQuestion(undefined, jumpId ? 'jump' : 'next', jumpId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, type, questionIdParam])

  useEffect(() => {
    if (isDailyMode) {
      refreshDailyStatus()
    } else {
      setDailyProgress(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // 提交答案
  const handleSubmit = async () => {
    if (!question || selectedAnswer.length === 0) {
      notify({
        variant: 'warning',
        title: '请选择答案',
        description: '提交前请至少选择一个选项。',
      })
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/practice/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId: question.id,
          userAnswer: selectedAnswer,
          answerMapping, // 传递映射关系
          mode,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload) {
        const message =
          (payload && typeof payload === 'object' && 'error' in payload
            ? (payload as { error?: string }).error
            : undefined) ||
          (!response.ok ? '提交失败' : '解析提交结果失败')
        throw new Error(message)
      }

      const data = payload
      setSubmitted(true)
      setIsCorrect(data.isCorrect)

      // 将原始的correctAnswers转换为打乱后的ID
      const shuffledCorrectAnswers = data.correctAnswers.map((originalId: string) => {
        // 在answerMapping中查找：哪个新ID对应这个原始ID
        const newId = Object.keys(answerMapping).find(key => answerMapping[key] === originalId)
        return newId || originalId
      })
      setCorrectAnswers(shuffledCorrectAnswers)

      setUserQuestion(data.userQuestion)
    } catch (error) {
      console.error('提交答案失败:', error)
      const message = error instanceof Error ? error.message : '请稍后再试或检查网络连接。'
      notify({
        variant: 'danger',
        title: '提交答案失败',
        description: message,
      })
    } finally {
      setLoading(false)
    }
  }

  const triggerAIExplanation = async (regenerate = false): Promise<boolean> => {
    if (!question) {
      return false
    }

    try {
      setAiLoading(true)

      const response = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId: question.id,
          mode: 'structured',
          regenerate,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        const message = (typeof data === 'object' && data && 'error' in data ? (data as any).error : null) || '请稍后再试'

        notify({
          variant: response.status === 402 ? 'warning' : 'danger',
          title: regenerate ? 'AI 解析重新生成失败' : 'AI 解析生成失败',
          description: message,
        })
        return false
      }

      const message = (typeof data === 'object' && data && 'message' in data ? (data as any).message : null)
        || (regenerate ? '新的解析已保存并替换旧版本。' : '新的解析已保存，将自动显示在解析列表中。')

      notify({
        variant: 'success',
        title: regenerate ? 'AI 解析已重新生成' : 'AI 解析已生成',
        description: message,
      })

      return true
    } catch (error) {
      console.error('生成AI解析失败:', error)
      notify({
        variant: 'danger',
        title: regenerate ? 'AI 解析重新生成失败' : 'AI 解析失败',
        description: '请稍后重新尝试生成解析。',
      })
      return false
    } finally {
      setAiLoading(false)
    }
  }

  // 下一题
  const handleNext = () => {
    if (isDailyMode && dailyProgress?.completed) {
      notify({
        variant: 'success',
        title: '今日每日练习已结束',
        description: '明天再来获取新奖励吧！',
      })
      return
    }
    if (question) {
      loadQuestion(question.id, 'next')
    }
  }

  // 上一题
  const handlePrev = async () => {
    if (currentHistoryIndex > 0) {
      const prevIndex = currentHistoryIndex - 1
      const prevQuestionId = questionHistory[prevIndex]

      try {
        setLoading(true)
        const response = await fetch(`/api/questions/${prevQuestionId}`)
        if (!response.ok) {
          throw new Error('加载失败')
        }

        const data = await response.json()

        // 生成新的打乱选项（不包含答案）
        let shuffledOptions = data.question.options as Array<{ id: string; text: string }>
        const mapping: Record<string, string> = {}

        if (Array.isArray(data.question.options)) {
          const originalOptions = [...(data.question.options as Array<{ id: string; text: string }>)]
          const shuffledContents = [...originalOptions].sort(() => Math.random() - 0.5)
          const optionIds = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

          shuffledOptions = shuffledContents.map((opt, index: number) => {
            const newId = optionIds[index]
            mapping[newId] = opt.id
            return { id: newId, text: opt.text }
          })
        }

        setQuestion({ ...data.question, options: shuffledOptions })
        setAnswerMapping(mapping)
        const map: Record<string, string> = {}
        shuffledOptions.forEach(opt => {
          const originalId = mapping?.[opt.id] ?? opt.id
          if (typeof originalId === 'string') {
            map[originalId.toUpperCase()] = opt.text
          }
        })
        setOptionTextMap(map)
        setUserQuestion(data.userQuestion)
        setIsFavorite(data.isFavorite)
        setSelectedAnswer([])
        setSubmitted(false)
        setIsCorrect(null)
        setCorrectAnswers([])
        setAiLoading(false)
        setCurrentHistoryIndex(prevIndex)
      } catch (error) {
        console.error('加载上一题失败:', error)
        notify({
          variant: 'danger',
          title: '加载上一题失败',
          description: '回退历史题目时出现异常，请稍后再试。',
        })
      } finally {
        setLoading(false)
      }
    }
  }

  // 切换收藏
  const toggleFavorite = async () => {
    if (!question || favoritePending) return

    setFavoritePending(true)
    try {
      if (isFavorite) {
        const response = await fetch(`/api/favorites?questionId=${question.id}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          throw new Error('取消收藏失败')
        }
        setIsFavorite(false)
      } else {
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ questionId: question.id }),
        })
        if (!response.ok) {
          throw new Error('收藏失败')
        }
        setIsFavorite(true)
      }
    } catch (error) {
      console.error('收藏操作失败:', error)
      notify({
        variant: 'danger',
        title: '收藏失败',
        description: error instanceof Error ? error.message : '请稍后重试。',
      })
    } finally {
      setFavoritePending(false)
    }
  }

  // 处理选项选择
  const handleOptionChange = (optionId: string) => {
    if (submitted) return

    if (question?.questionType === 'multiple_choice') {
      // 多选题
      if (selectedAnswer.includes(optionId)) {
        setSelectedAnswer(selectedAnswer.filter(id => id !== optionId))
      } else {
        setSelectedAnswer([...selectedAnswer, optionId])
      }
    } else {
      // 单选题
      setSelectedAnswer([optionId])
    }
  }

  if (loading && !question) {
    return (
      <div className="container mx-auto max-w-4xl p-4 min-h-[60vh] flex items-center justify-center text-slate-600 dark:text-slate-300">
        加载中...
      </div>
    )
  }

  if (!question) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card className="border-slate-200 dark:border-slate-800 dark:bg-slate-900/70">
          <CardContent className="p-6 text-center text-gray-500 dark:text-slate-400">
            暂无题目
          </CardContent>
        </Card>
      </div>
    )
  }

  const isHistoryPrevDisabled = loading || currentHistoryIndex <= 0

  return (
    <>
      <div className="container mx-auto p-4 pb-36 max-w-4xl text-slate-900 dark:text-slate-100">
      {/* 头部信息 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            返回
          </Button>
          <Badge variant="outline" className="dark:text-slate-200 dark:border-slate-600">{getModeName()}</Badge>
          <Badge className="dark:bg-slate-800 dark:text-slate-100">{question.externalId}</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleFavorite}
          disabled={favoritePending}
        >
          {isFavorite ? (
            <Heart className="h-5 w-5 fill-red-500 text-red-500" />
          ) : (
            <HeartOff className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* 题目卡片 */}
      <Card className="mb-4 border border-slate-200 dark:border-slate-800 dark:bg-slate-900/70">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="dark:text-slate-900 dark:bg-slate-100">{question.category}</Badge>
                <Badge variant="outline" className="dark:text-slate-200 dark:border-slate-700">
                  {question.questionType === 'single_choice' && '单选题'}
                  {question.questionType === 'multiple_choice' && '多选题'}
                  {question.questionType === 'true_false' && '判断题'}
                </Badge>
              </div>
              <CardTitle className="text-lg break-words break-all whitespace-pre-line">{question.title}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isDailyMode && dailyProgress && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-400/30 dark:bg-amber-500/15">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                今日进度：{dailyProgress.count}/{dailyProgress.target} 题
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-200">
                {dailyProgress.completed
                  ? '今日十练已打卡，积分奖励已到账。'
                  : `距离完成还剩 ${dailyProgress.remaining} 题，坚持就是胜利！`}
              </p>
            </div>
          )}
          {question.hasImage && question.imagePath ? (
            <div className="mb-4 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900/60">
              <img
                src={question.imagePath}
                alt={question.imageAlt || question.title}
                className="mx-auto max-h-64 w-full rounded-md object-contain"
                loading="lazy"
              />
              {question.imageAlt ? (
                <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">{question.imageAlt}</p>
              ) : null}
            </div>
          ) : null}
          {/* 选项 */}
          <div className="space-y-3">
            {question.questionType === 'multiple_choice' ? (
              // 多选题
              question.options.map((option) => (
                <div
                  key={option.id}
                  className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer ${
                    submitted
                      ? correctAnswers.includes(option.id)
                        ? 'border-green-500 bg-green-50 dark:border-emerald-400/70 dark:bg-emerald-500/15'
                        : selectedAnswer.includes(option.id)
                        ? 'border-red-500 bg-red-50 dark:border-rose-500/60 dark:bg-rose-500/15'
                        : 'border-gray-200 dark:border-gray-700'
                      : selectedAnswer.includes(option.id)
                      ? 'border-blue-500 bg-blue-50 dark:border-blue-400/60 dark:bg-blue-500/15'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-500'
                  }`}
                  onClick={() => !submitted && handleOptionChange(option.id)}
                >
                  <Checkbox
                    id={option.id}
                    checked={selectedAnswer.includes(option.id)}
                    onCheckedChange={() => handleOptionChange(option.id)}
                    disabled={submitted}
                  />
                  <Label
                    htmlFor={option.id}
                    className="flex-1 cursor-pointer text-left whitespace-pre-line break-words break-all"
                  >
                    <span className="font-medium mr-2">{option.id}.</span>
                    {option.text}
                  </Label>
                </div>
              ))
            ) : (
              // 单选题
              <RadioGroup
                value={selectedAnswer?.[0] || ''}
                onValueChange={(value) => handleOptionChange(value)}
                disabled={submitted}
              >
                {question.options.map((option) => (
                  <div
                    key={option.id}
                    className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer ${
                      submitted
                        ? correctAnswers.includes(option.id)
                          ? 'border-green-500 bg-green-50 dark:border-emerald-400/70 dark:bg-emerald-500/15'
                          : selectedAnswer.includes(option.id)
                          ? 'border-red-500 bg-red-50 dark:border-rose-500/60 dark:bg-rose-500/15'
                          : 'border-gray-200 dark:border-gray-700'
                        : selectedAnswer.includes(option.id)
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-400/60 dark:bg-blue-500/15'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-500'
                    }`}
                    onClick={() => !submitted && handleOptionChange(option.id)}
                  >
                    <RadioGroupItem value={option.id} id={option.id} />
                    <Label
                      htmlFor={option.id}
                      className="flex-1 cursor-pointer text-left whitespace-pre-line break-words break-all"
                    >
                      <span className="font-medium mr-2">{option.id}.</span>
                      {option.text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>

          {/* 答题结果 */}
          {submitted && (
            <div className="mt-4 space-y-3">
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                isCorrect ? 'bg-green-50 text-green-700 dark:bg-emerald-500/15 dark:text-emerald-200' : 'bg-red-50 text-red-700 dark:bg-rose-500/15 dark:text-rose-200'
              }`}>
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">回答正确!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5" />
                    <span className="font-medium break-words break-all whitespace-pre-line">
                      回答错误! 正确答案: {correctAnswers.map(id => {
                        const option = question.options.find(opt => opt.id === id)
                        return option ? `${id}. ${option.text}` : id
                      }).join('; ')}
                    </span>
                  </>
                )}
              </div>

              {/* 新的解析系统 */}
              {question && (
                <ExplanationList
                  questionId={question.id}
                  onGenerateAI={() => triggerAIExplanation(false)}
                  onRegenerateAI={() => triggerAIExplanation(true)}
                  aiLoading={aiLoading}
                  selectedOptionIds={selectedAnswer}
                  answerMapping={answerMapping}
                  optionTextMap={optionTextMap}
                />
              )}
            </div>
          )}

          {/* 答题统计 */}
          {userQuestion && (
            <div className="mt-4 flex items-center gap-4 text-sm text-gray-500 dark:text-slate-300">
              <span>答对: {userQuestion.correctCount}次</span>
              <span>答错: {userQuestion.incorrectCount}次</span>
            </div>
          )}
        </CardContent>
      </Card>

      </div>

      {/* 悬浮操作条 */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-4 sm:pb-6">
        <div className="pointer-events-auto mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="w-full sm:w-auto"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              返回首页
            </Button>

            <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-nowrap sm:justify-end">
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={isHistoryPrevDisabled}
                className="flex-1 min-w-[120px] sm:flex-none sm:w-auto"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                上一题
              </Button>

              {!submitted ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleNext}
                    disabled={loading || (isDailyMode && dailyProgress?.completed)}
                    className="flex-1 min-w-[120px] sm:flex-none sm:w-auto"
                  >
                    跳过
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading || selectedAnswer.length === 0 || (isDailyMode && dailyProgress?.completed)}
                    className="w-full text-base sm:w-auto sm:min-w-[180px] sm:text-sm"
                  >
                    提交答案
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={loading || (isDailyMode && dailyProgress?.completed)}
                  className="w-full sm:w-auto sm:min-w-[160px]"
                >
                  下一题
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-4xl p-4 text-center text-slate-600 dark:text-slate-300">
          加载中...
        </div>
      }
    >
      <PracticeContent />
    </Suspense>
  )
}
