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
  Filter
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Question {
  id: string
  uuid: string
  externalId: string
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
  answerMapping?: Record<string, string>
}

interface UserQuestion {
  correctCount: number
  incorrectCount: number
  lastAnswered: Date
  lastCorrect?: boolean
}

function HistoryContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const type = searchParams.get('type') || 'A_CLASS'

  const [questions, setQuestions] = useState<{ question: Question; userQuestion: UserQuestion }[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong'>('all')
  const [selectedAnswer, setSelectedAnswer] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [answerMapping, setAnswerMapping] = useState<Record<string, string>>({})
  const [optionTextMap, setOptionTextMap] = useState<Record<string, string>>({})
  const { notify } = useNotification()

  const currentData = questions[currentIndex]
  const currentQuestion = currentData?.question
  const userQuestion = currentData?.userQuestion

  useEffect(() => {
    if (!currentQuestion) {
      setAnswerMapping({})
      setOptionTextMap({})
      return
    }

    const mapping = currentQuestion.answerMapping || {}
    setAnswerMapping(mapping)

    const map: Record<string, string> = {}
    if (Array.isArray(currentQuestion.options)) {
      currentQuestion.options.forEach(option => {
        const originalId = mapping?.[option.id] ?? option.id
        if (typeof originalId === 'string') {
          map[originalId.toUpperCase()] = option.text
        }
      })
    }
    setOptionTextMap(map)
  }, [currentQuestion])

  // 加载练习历史
  const loadHistory = async (filterType: 'all' | 'correct' | 'wrong' = 'all') => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        type,
        filter: filterType,
      })

      const response = await fetch(`/api/practice/history?${params}`)
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        notify({
          variant: 'danger',
          title: '加载失败',
          description: error.error || '无法获取练习历史，请稍后再试。',
        })
        return
      }

      const data = await response.json()
      setQuestions(data.questions)
      setCurrentIndex(0)
      setSelectedAnswer([])
      setSubmitted(false)
      setIsCorrect(null)
      setCorrectAnswers([])
      setAiLoading(false)
    } catch (error) {
      console.error('加载练习历史失败:', error)
      notify({
        variant: 'danger',
        title: '加载失败',
        description: '网络或服务器异常，请稍后再试。',
      })
    } finally {
      setLoading(false)
    }
  }

  // 初始加载
  useEffect(() => {
    loadHistory(filter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  // 切换筛选条件
  const handleFilterChange = (value: 'all' | 'correct' | 'wrong') => {
    setFilter(value)
    loadHistory(value)
  }

  // 提交答案
  const handleSubmit = async () => {
    if (!currentQuestion || selectedAnswer.length === 0) {
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
          questionId: currentQuestion.id,
          userAnswer: selectedAnswer,
          answerMapping: currentQuestion.answerMapping || {},
        }),
      })

      if (!response.ok) {
        throw new Error('提交失败')
      }

      const data = await response.json()
      setSubmitted(true)
      setIsCorrect(data.isCorrect)

      // 将原始的correctAnswers转换为打乱后的ID
      const answerMapping = currentQuestion.answerMapping || {}
      const shuffledCorrectAnswers = data.correctAnswers.map((originalId: string) => {
        const newId = Object.keys(answerMapping).find(key => answerMapping[key] === originalId)
        return newId || originalId
      })
      setCorrectAnswers(shuffledCorrectAnswers)
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
    if (!currentQuestion) {
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
          questionId: currentQuestion.id,
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

  // 上一题
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      setSelectedAnswer([])
      setSubmitted(false)
      setIsCorrect(null)
      setCorrectAnswers([])
      setAiLoading(false)
    }
  }

  // 下一题
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setSelectedAnswer([])
      setSubmitted(false)
      setIsCorrect(null)
      setCorrectAnswers([])
      setAiLoading(false)
    }
  }

  // 处理选项选择
  const handleOptionChange = (optionId: string) => {
    if (submitted) return

    if (currentQuestion?.questionType === 'multiple_choice') {
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

  if (loading && questions.length === 0) {
    return (
      <div className="container mx-auto max-w-4xl p-4 min-h-[60vh] flex items-center justify-center text-slate-600 dark:text-slate-300">
        加载中...
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="container mx-auto p-4 max-w-4xl text-slate-900 dark:text-slate-100">
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            返回
          </Button>
        </div>
        <Card className="border-slate-200 dark:border-slate-800 dark:bg-slate-900/70">
          <CardContent className="p-6 text-center text-gray-500 dark:text-slate-400">
            暂无练习记录
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
          <Badge variant="outline" className="dark:text-slate-200 dark:border-slate-700">已练习题目</Badge>
          <Badge className="dark:bg-slate-800 dark:text-slate-100">{currentQuestion?.externalId}</Badge>
        </div>

        {/* 筛选器 */}
        <div className="flex items-center gap-2 text-gray-600 dark:text-slate-300">
          <Filter className="h-4 w-4" />
          <Select value={filter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="correct">仅正确</SelectItem>
              <SelectItem value="wrong">仅错误</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 进度信息 */}
      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-slate-300">
            第 <strong>{currentIndex + 1}</strong> / {questions.length} 题
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-green-600 dark:text-emerald-300">
              答对: <strong>{userQuestion?.correctCount || 0}</strong>次
            </span>
            <span className="text-red-600 dark:text-rose-300">
              答错: <strong>{userQuestion?.incorrectCount || 0}</strong>次
            </span>
          </div>
        </div>
      </div>

      {/* 题目卡片 */}
      <Card className="mb-4 border border-slate-200 dark:border-slate-800 dark:bg-slate-900/70">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="dark:text-slate-900 dark:bg-slate-100">{currentQuestion?.category}</Badge>
                <Badge variant="outline" className="dark:text-slate-200 dark:border-slate-700">
                  {currentQuestion?.questionType === 'single_choice' && '单选题'}
                  {currentQuestion?.questionType === 'multiple_choice' && '多选题'}
                  {currentQuestion?.questionType === 'true_false' && '判断题'}
                </Badge>
                {userQuestion?.lastCorrect !== undefined && (
                  <Badge variant={userQuestion.lastCorrect ? 'default' : 'destructive'} className="dark:text-slate-900 dark:bg-slate-100">
                    上次{userQuestion.lastCorrect ? '正确' : '错误'}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg">{currentQuestion?.title}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 选项 */}
          <div className="space-y-3">
            {currentQuestion?.questionType === 'multiple_choice' ? (
              // 多选题
              currentQuestion.options.map((option) => (
                <div
                  key={option.id}
                  className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    submitted
                      ? correctAnswers.includes(option.id)
                        ? 'border-green-500 bg-green-50 dark:border-emerald-400/70 dark:bg-emerald-500/15'
                        : selectedAnswer.includes(option.id)
                        ? 'border-red-500 bg-red-50 dark:border-rose-500/60 dark:bg-rose-500/15'
                        : 'border-gray-200 dark:border-slate-700'
                      : selectedAnswer.includes(option.id)
                      ? 'border-blue-500 bg-blue-50 dark:border-blue-400/60 dark:bg-blue-500/15'
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
                {currentQuestion?.options.map((option) => (
                  <div
                    key={option.id}
                    className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      submitted
                        ? correctAnswers.includes(option.id)
                          ? 'border-green-500 bg-green-50 dark:border-emerald-400/70 dark:bg-emerald-500/15'
                          : selectedAnswer.includes(option.id)
                          ? 'border-red-500 bg-red-50 dark:border-rose-500/60 dark:bg-rose-500/15'
                          : 'border-gray-200 dark:border-slate-700'
                        : selectedAnswer.includes(option.id)
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-400/60 dark:bg-blue-500/15'
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
                        const option = currentQuestion?.options.find(opt => opt.id === id)
                        return option ? `${id}. ${option.text}` : id
                      }).join('; ')}
                    </span>
                  </>
                )}
              </div>

              {currentQuestion && (
                <ExplanationList
                  questionId={currentQuestion.id}
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
          onClick={handlePrev}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          上一题
        </Button>

        <div className="flex gap-2">
          {!submitted ? (
            <Button onClick={handleSubmit} disabled={loading || selectedAnswer.length === 0}>
              提交答案
            </Button>
          ) : currentIndex < questions.length - 1 ? (
            <Button onClick={handleNext} disabled={loading}>
              下一题
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => router.push('/practice/modes')} disabled={loading}>
              返回练习模式
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PracticeHistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-4xl p-4 text-center text-slate-600 dark:text-slate-300">
          加载中...
        </div>
      }
    >
      <HistoryContent />
    </Suspense>
  )
}
