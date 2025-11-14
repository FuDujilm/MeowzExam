'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ExplanationList } from '@/components/ExplanationList'
import { useNotification } from '@/components/ui/notification-provider'
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  TrendingDown,
  Heart,
  HeartOff
} from 'lucide-react'

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
  }>
  correctAnswers: string[]
  explanation?: string
  aiExplanation?: string
  hasImage: boolean
  imagePath?: string
  answerMapping?: Record<string, string>
}

interface UserQuestion {
  correctCount: number
  incorrectCount: number
  lastCorrect?: boolean
}

function ErrorRateContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const type = searchParams.get('type') || 'A_CLASS'

  const [question, setQuestion] = useState<Question | null>(null)
  const [userQuestion, setUserQuestion] = useState<UserQuestion | null>(null)
  const [errorRate, setErrorRate] = useState<number>(1.0)
  const [isFavorite, setIsFavorite] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<string[]>([])
  const [answerMapping, setAnswerMapping] = useState<Record<string, string>>({})
  const [optionTextMap, setOptionTextMap] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const { notify } = useNotification()
  const [loading, setLoading] = useState(false)

  // 加载题目
  const loadQuestion = async (currentId?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ type })
      if (currentId) {
        params.append('currentId', currentId)
      }

      const response = await fetch(`/api/practice/error-rate?${params}`)
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        notify({
          variant: 'danger',
          title: '加载题目失败',
          description: error.error || '请稍后再试。',
        })
        return
      }

      const data = await response.json()
      setQuestion(data.question)
      setUserQuestion(data.userQuestion)
      setErrorRate(data.errorRate)
      setIsFavorite(data.isFavorite)
      setSelectedAnswer([])
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
  }, [type])

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
          answerMapping,
        }),
      })

      if (!response.ok) {
        throw new Error('提交失败')
      }

      const data = await response.json()
      setSubmitted(true)
      setIsCorrect(data.isCorrect)

      // 将原始的correctAnswers转换为打乱后的ID
      const shuffledCorrectAnswers = data.correctAnswers.map((originalId: string) => {
        const newId = Object.keys(answerMapping).find(key => answerMapping[key] === originalId)
        return newId || originalId
      })
      setCorrectAnswers(shuffledCorrectAnswers)
      setUserQuestion(data.userQuestion)
    } catch (error) {
      console.error('提交答案失败:', error)
      notify({
        variant: 'danger',
        title: '提交答案失败',
        description: '请稍后再试或检查网络连接。',
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
      loadQuestion(question.id)
    }
  }

  // 切换收藏
  const toggleFavorite = async () => {
    if (!question) return

    try {
      if (isFavorite) {
        const response = await fetch(`/api/favorites?questionId=${question.id}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          setIsFavorite(false)
        }
      } else {
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
      if (selectedAnswer.includes(optionId)) {
        setSelectedAnswer(selectedAnswer.filter(id => id !== optionId))
      } else {
        setSelectedAnswer([...selectedAnswer, optionId])
      }
    } else {
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
      <div className="container mx-auto max-w-4xl p-4">
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
          <Badge variant="outline">
            <TrendingDown className="h-3 w-3 mr-1" />
            错误率练习
          </Badge>
          <Badge>{question.externalId}</Badge>
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

      {/* 错误率信息卡片 */}
      <Card className="mb-4 border-transparent bg-gradient-to-r from-red-50 to-orange-50 dark:from-rose-500/15 dark:via-amber-500/10 dark:to-amber-500/15 dark:border-rose-500/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-300 mb-1">当前题目错误率</p>
              <p className="text-3xl font-bold text-red-600 dark:text-rose-200">
                {(errorRate * 100).toFixed(0)}%
              </p>
            </div>
            {userQuestion && (
              <div className="text-right text-sm text-gray-600 dark:text-slate-200">
                <p>答对: <span className="text-green-600 dark:text-emerald-300 font-medium">{userQuestion.correctCount}</span>次</p>
                <p>答错: <span className="text-red-600 dark:text-rose-300 font-medium">{userQuestion.incorrectCount}</span>次</p>
              </div>
            )}
            {!userQuestion && (
              <div className="text-sm text-gray-600 dark:text-slate-200">
                <Badge variant="destructive" className="dark:bg-rose-500/20 dark:text-rose-100 dark:border-rose-400/30">未练习</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 题目卡片 */}
      <Card className="mb-4 border border-slate-200 dark:border-slate-800 dark:bg-slate-900/70">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{question.category}</Badge>
                <Badge variant="outline">
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
                  className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    submitted
                      ? correctAnswers.includes(option.id)
                        ? 'border-green-500 bg-green-50 dark:border-emerald-400 dark:bg-emerald-500/10'
                        : selectedAnswer.includes(option.id)
                        ? 'border-red-500 bg-red-50 dark:border-rose-500 dark:bg-rose-500/10'
                        : 'border-gray-200 dark:border-slate-700'
                      : selectedAnswer.includes(option.id)
                      ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-500/10'
                      : 'border-gray-200 hover:border-gray-300 dark:border-slate-700 dark:hover:border-slate-500'
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
                    className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      submitted
                        ? correctAnswers.includes(option.id)
                          ? 'border-green-500 bg-green-50 dark:border-emerald-400 dark:bg-emerald-500/10'
                          : selectedAnswer.includes(option.id)
                          ? 'border-red-500 bg-red-50 dark:border-rose-500 dark:bg-rose-500/10'
                          : 'border-gray-200 dark:border-slate-700'
                        : selectedAnswer.includes(option.id)
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-500/10'
                        : 'border-gray-200 hover:border-gray-300 dark:border-slate-700 dark:hover:border-slate-500'
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
                isCorrect
                  ? 'bg-green-50 text-green-700 dark:bg-emerald-500/10 dark:text-emerald-200'
                  : 'bg-red-50 text-red-700 dark:bg-rose-500/10 dark:text-rose-200'
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
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => router.push('/practice/modes')}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          选择模式
        </Button>

        <div className="flex gap-2">
          {!submitted ? (
            <>
              <Button
                variant="outline"
                onClick={handleNext}
                disabled={loading}
              >
                跳过
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <Button onClick={handleSubmit} disabled={loading || selectedAnswer.length === 0}>
                提交答案
              </Button>
            </>
          ) : (
            <Button onClick={handleNext} disabled={loading}>
              下一题
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ErrorRatePage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-4xl p-4 text-center text-slate-600 dark:text-slate-300">
          加载中...
        </div>
      }
    >
      <ErrorRateContent />
    </Suspense>
  )
}
