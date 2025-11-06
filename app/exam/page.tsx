'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useNotification } from '@/components/ui/notification-provider'
import { Clock, CheckCircle2, XCircle, Lightbulb, Sparkles, Loader2, RotateCcw } from 'lucide-react'

interface Question {
  id: string
  uuid: string
  externalId: string
  questionType: string
  title: string
  options: Array<{
    id: string
    text: string
  }>
  category: string
  difficulty: string
}

interface ExamConfig {
  duration: number
  totalQuestions: number
  passScore: number
  singleChoice: number
  multipleChoice: number
}

function ExamContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const { notify } = useNotification()

  const type = searchParams.get('type') || 'A_CLASS'

  const [examId, setExamId] = useState<string | null>(null)
  const [examResultId, setExamResultId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [config, setConfig] = useState<ExamConfig | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [answerMappings, setAnswerMappings] = useState<Record<string, Record<string, string>>>({}) // 保存选项映射
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [examStarted, setExamStarted] = useState(false)
  const [examSubmitted, setExamSubmitted] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [aiResultLoading, setAiResultLoading] = useState<Record<string, boolean>>({})
  const [aiResultError, setAiResultError] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const currentQuestion = questions[currentIndex]

  // 倒计时
  useEffect(() => {
    if (!examStarted || examSubmitted || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleAutoSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [examStarted, examSubmitted, timeLeft])

  // 开始考试
  const handleStartExam = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/exam/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      })

      if (res.ok) {
        const data = await res.json()
        setExamId(data.examId)
        setExamResultId(data.examResultId)
        setQuestions(data.questions)
        setConfig(data.config)
        setTimeLeft(data.config.duration * 60) // 转换为秒
        setExamStarted(true)
        setExamSubmitted(false)
        setResult(null)
        setAnswers({})
        setAiResultLoading({})
        setAiResultError({})

        // 保存每道题的answerMapping
        const mappings: Record<string, Record<string, string>> = {}
        data.questions.forEach((q: any) => {
          if (q.answerMapping) {
            mappings[q.id] = q.answerMapping
          }
        })
        setAnswerMappings(mappings)
        notify({
          variant: 'success',
          title: '考试已开始',
          description: '请合理分配时间，祝你顺利通关！',
        })
      } else {
        const error = await res.json()
        notify({
          variant: 'danger',
          title: '开始考试失败',
          description: error.error || '请稍后再试。',
        })
      }
    } catch (error) {
      console.error('Failed to start exam:', error)
      notify({
        variant: 'danger',
        title: '开始考试失败',
        description: '网络或服务器异常，请稍后再试。',
      })
    } finally {
      setLoading(false)
    }
  }

  // 选择答案
  const handleSelectAnswer = (answerId: string) => {
    if (!currentQuestion) return

    const questionId = currentQuestion.id

    if (currentQuestion.questionType === 'multiple_choice') {
      // 多选题
      setAnswers(prev => {
        const current = prev[questionId] || []
        const updated = current.includes(answerId)
          ? current.filter(id => id !== answerId)
          : [...current, answerId]
        return { ...prev, [questionId]: updated }
      })
    } else {
      // 单选题
      setAnswers(prev => ({ ...prev, [questionId]: [answerId] }))
    }
  }

  // 提交考试
  const handleSubmitExam = async () => {
    if (!examId || !examResultId) return

    // 确认提交
    const unanswered = questions.filter(q => !answers[q.id] || answers[q.id].length === 0)
    if (unanswered.length > 0) {
      const confirm = window.confirm(`还有 ${unanswered.length} 题未作答，确定要提交吗？`)
      if (!confirm) return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/exam/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId,
          examResultId,
          answers,
          answerMappings, // 传递映射关系
        })
      })

      if (res.ok) {
        const data = await res.json()
        setAiResultLoading({})
        setAiResultError({})
        setResult(data)
        setExamSubmitted(true)
      } else {
        const error = await res.json()
        notify({
          variant: 'danger',
          title: '提交失败',
          description: error.error || '请稍后再试。',
        })
      }
    } catch (error) {
      console.error('Failed to submit exam:', error)
      notify({
        variant: 'danger',
        title: '提交失败',
        description: '网络或服务器异常，请稍后再试。',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateResultAI = async (questionId: string) => {
    try {
      setAiResultLoading(prev => ({ ...prev, [questionId]: true }))
      setAiResultError(prev => {
        const next = { ...prev }
        delete next[questionId]
        return next
      })

      const response = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ questionId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '生成AI解析失败')
      }

      const data = await response.json()

      setResult((prev: any) => {
        if (!prev) return prev
        return {
          ...prev,
          questionResults: prev.questionResults.map((item: any) =>
            item.questionId === questionId
              ? { ...item, aiExplanation: data.explanation }
              : item
          ),
        }
      })

    } catch (error: any) {
      console.error('Generate AI explanation failed:', error)
      setAiResultError(prev => ({
        ...prev,
        [questionId]: error.message || '生成AI解析失败，请稍后再试',
      }))
    } finally {
      setAiResultLoading(prev => ({
        ...prev,
        [questionId]: false,
      }))
    }
  }

  // 自动提交（时间到）
  const handleAutoSubmit = async () => {
    if (examSubmitted) return
    await handleSubmitExam()
  }

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 重定向未登录用户
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>加载中...</p>
      </div>
    )
  }

  // 开始考试前
  if (!examStarted) {
    const typeNames = {
      A_CLASS: 'A类',
      B_CLASS: 'B类',
      C_CLASS: 'C类',
    }
    const examInfo = {
      A_CLASS: { questions: 40, duration: 40, pass: 30 },
      B_CLASS: { questions: 60, duration: 60, pass: 45 },
      C_CLASS: { questions: 90, duration: 90, pass: 70 },
    }
    const info = examInfo[type as keyof typeof examInfo]

    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                {typeNames[type as keyof typeof typeNames]}操作技术能力验证 - 模拟考试
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <p><strong>题目数量：</strong>{info.questions} 题</p>
                <p><strong>考试时长：</strong>{info.duration} 分钟</p>
                <p><strong>及格分数：</strong>{info.pass} 分</p>
                <p className="text-sm text-gray-600">
                  * 考试开始后将自动计时，时间到自动提交
                </p>
              </div>

              <Button
                onClick={handleStartExam}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? '准备中...' : '开始考试'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // 考试结果页
  if (examSubmitted && result) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Card className={result.passed ? 'border-green-500' : 'border-red-500'}>
            <CardHeader>
              <div className="text-center">
                {result.passed ? (
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                ) : (
                  <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                )}
                <CardTitle className="text-3xl mb-2">
                  {result.passed ? '恭喜通过！' : '未通过考试'}
                </CardTitle>
                <p className="text-xl">
                  得分: {result.score} / {result.totalQuestions}
                  {result.passed && ' (及格)'}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">{result.correctCount}</p>
                  <p className="text-sm text-gray-600">答对</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{result.wrongCount}</p>
                  <p className="text-sm text-gray-600">答错</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{result.passScore}</p>
                  <p className="text-sm text-gray-600">及格线</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">错题详情</h3>
                {result.questionResults
                  .filter((q: any) => !q.isCorrect)
                  .map((q: any, index: number) => (
                    <Card key={q.questionId} className="bg-red-50 dark:bg-rose-500/15 dark:border-rose-500/40">
                      <CardContent className="pt-4">
                        <p className="font-medium mb-2">
                          {index + 1}. {q.title}
                        </p>
                        <p className="mb-1 text-sm text-red-600 dark:text-rose-200">
                          你的答案: {q.userAnswer.join(', ') || '未作答'}
                        </p>
                        <p className="text-sm text-green-600 mb-2">
                          正确答案: {q.correctAnswers.join(', ')}
                        </p>
                        {q.explanation ? (
                          <div className="mb-3 rounded-md bg-white p-3">
                            <div className="flex items-center gap-2 text-gray-700">
                              <Lightbulb className="h-4 w-4" />
                              <span className="font-semibold">人工解析</span>
                            </div>
                            <p className="mt-2 whitespace-pre-line text-sm text-gray-700">
                              {q.explanation}
                            </p>
                          </div>
                        ) : (
                          <div className="mb-3 rounded-md bg-white p-3">
                            <div className="flex items-center gap-2 text-gray-500">
                              <Lightbulb className="h-4 w-4" />
                              <span className="font-semibold">人工解析</span>
                            </div>
                            <p className="mt-2 text-sm text-gray-500">
                              暂无人工解析，管理员稍后会补充该题解析。
                            </p>
                          </div>
                        )}

                        <div className="rounded-md border border-red-200 bg-white p-3">
                          <div className="flex flex-wrap items-center gap-2 text-red-600">
                            <Sparkles className="h-4 w-4" />
                            <span className="font-semibold">AI解析</span>
                            {q.aiExplanation && (
                              <Badge variant="outline" className="border-red-200 text-red-600">
                                已生成
                              </Badge>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="ml-auto"
                              onClick={() => handleGenerateResultAI(q.questionId)}
                              disabled={aiResultLoading[q.questionId]}
                            >
                              {aiResultLoading[q.questionId] ? (
                                <>
                                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                  正在生成...
                                </>
                              ) : q.aiExplanation ? (
                                <>
                                  <RotateCcw className="mr-1 h-4 w-4" />
                                  重新生成
                                </>
                              ) : (
                                <>
                                  <Sparkles className="mr-1 h-4 w-4" />
                                  生成AI解析
                                </>
                              )}
                            </Button>
                          </div>
                          <p className="mt-2 whitespace-pre-line text-sm text-gray-700">
                            {q.aiExplanation
                              || (aiResultLoading[q.questionId]
                                ? '正在生成AI解析，请稍候...'
                                : '尚未生成AI解析，点击上方按钮进行生成。')}
                          </p>
                          {aiResultError[q.questionId] && (
                            <p className="mt-2 text-xs text-red-500">{aiResultError[q.questionId]}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => router.push('/')}
                  variant="outline"
                  className="flex-1"
                >
                  返回首页
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  className="flex-1"
                >
                  再考一次
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // 考试进行中
  if (!currentQuestion) return null

  const userAnswer = answers[currentQuestion.id] || []
  const answeredCount = Object.keys(answers).filter(id => answers[id].length > 0).length

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 顶部信息栏 */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex justify-between items-center">
          <div className="flex gap-6">
            <span className="text-sm">
              第 <strong>{currentIndex + 1}</strong> / {questions.length} 题
            </span>
            <span className="text-sm">
              已答: <strong>{answeredCount}</strong> 题
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            <span className={`text-lg font-bold ${timeLeft < 300 ? 'text-red-500' : 'text-gray-700'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        {/* 题目卡片 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-sm text-gray-500">题号: {currentQuestion.externalId}</span>
                <span className="ml-4 text-sm text-gray-500">
                  {currentQuestion.questionType === 'multiple_choice' ? '多选题' : '单选题'}
                </span>
              </div>
              <Badge variant={currentQuestion.difficulty === 'easy' ? 'default' : 'destructive'}>
                {currentQuestion.difficulty === 'easy' ? '简单' :
                 currentQuestion.difficulty === 'medium' ? '中等' : '困难'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="text-lg font-medium mb-6">{currentQuestion.title}</h3>

            {currentQuestion.questionType === 'multiple_choice' ? (
              <div className="space-y-3">
                {currentQuestion.options.map((option: any) => {
                  const isSelected = userAnswer.includes(option.id)

                  return (
                    <div
                      key={option.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleSelectAnswer(option.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox checked={isSelected} />
                        <Label className="flex-1 cursor-pointer">
                          <span className="font-medium">{option.id}. </span>
                          {option.text}
                        </Label>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <RadioGroup value={userAnswer[0] || ''} onValueChange={(value) => handleSelectAnswer(value)}>
                <div className="space-y-3">
                  {currentQuestion.options.map((option: any) => {
                    const isSelected = userAnswer.includes(option.id)

                    return (
                      <div
                        key={option.id}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleSelectAnswer(option.id)}
                      >
                        <div className="flex items-start gap-3">
                          <RadioGroupItem value={option.id} id={option.id} />
                          <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                            <span className="font-medium">{option.id}. </span>
                            {option.text}
                          </Label>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </RadioGroup>
            )}

            {currentQuestion.questionType === 'multiple_choice' && (
              <p className="mt-4 text-sm text-gray-500">* 此题为多选题</p>
            )}
          </CardContent>
        </Card>

        {/* 底部按钮 */}
        <div className="flex gap-4">
          <Button
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            variant="outline"
          >
            上一题
          </Button>

          {currentIndex < questions.length - 1 ? (
            <Button
              onClick={() => setCurrentIndex(prev => prev + 1)}
              className="flex-1"
            >
              下一题
            </Button>
          ) : (
            <Button
              onClick={handleSubmitExam}
              disabled={loading}
              className="flex-1"
            >
              {loading ? '提交中...' : '提交试卷'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ExamPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">加载中...</div>}>
      <ExamContent />
    </Suspense>
  )
}
