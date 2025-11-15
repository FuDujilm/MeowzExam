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
}

interface UserQuestion {
  correctCount: number
  incorrectCount: number
  lastCorrect?: boolean
}

function PracticeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const mode = searchParams.get('mode') || 'sequential'
  const type = searchParams.get('type') || 'A_CLASS'
  
  const [question, setQuestion] = useState<Question | null>(null)
  const [userQuestion, setUserQuestion] = useState<UserQuestion | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
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
  const { notify } = useNotification()

  // 获取模式名称
  const getModeName = () => {
    switch (mode) {
      case 'sequential': return '顺序练习'
      case 'random': return '随机练习'
      case 'wrong': return '错题练习'
      case 'favorite': return '收藏练习'
      default: return '练习'
    }
  }

  // 加载题目
  const loadQuestion = async (currentId?: string, direction: 'next' | 'prev' = 'next') => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        mode,
        type,
      })
      if (currentId) {
        params.append('currentId', currentId)
      }

      const response = await fetch(`/api/practice/next?${params}`)
      if (!response.ok) {
        const error = await response.json().catch(() => null)
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
      setQuestion(data.question)
      setUserQuestion(data.userQuestion)
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

  // 初始加载
  useEffect(() => {
    loadQuestion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, type])

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
    if (!question) return

    try {
      if (isFavorite) {
        // 取消收藏
        const response = await fetch(`/api/favorites?questionId=${question.id}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          setIsFavorite(false)
        }
      } else {
        // 添加收藏
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ questionId: question.id }),
        })
        if (response.ok) {
          setIsFavorite(true)
        }
      }
    } catch (error) {
      console.error('收藏操作失败:', error)
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

  return (
    <div className="container mx-auto p-4 max-w-4xl text-slate-900 dark:text-slate-100">
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
              <CardTitle className="text-lg">{question.title}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                    className="flex-1 cursor-pointer"
                  >
                    <span className="font-medium mr-2">{option.id}.</span>
                    {option.text}
                  </Label>
                </div>
              ))
            ) : (
              // 单选题
              <RadioGroup
                value={selectedAnswer[0] || ''}
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
                      className="flex-1 cursor-pointer"
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
                    <span className="font-medium">
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

      {/* 操作按钮 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="outline"
          onClick={() => router.push('/practice/modes')}
          className="w-full sm:w-auto"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          选择模式
        </Button>

        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-nowrap sm:justify-end">
          {/* 上一题按钮 */}
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={loading || currentHistoryIndex <= 0}
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
                disabled={loading}
                className="flex-1 min-w-[120px] sm:flex-none sm:w-auto"
              >
                跳过
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || selectedAnswer.length === 0}
                className="w-full text-base sm:w-auto sm:min-w-[180px] sm:text-sm"
              >
                提交答案
              </Button>
            </>
          ) : (
            <Button
              onClick={handleNext}
              disabled={loading}
              className="w-full sm:w-auto sm:min-w-[160px]"
            >
              下一题
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
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
