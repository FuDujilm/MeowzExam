'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useNotification } from '@/components/ui/notification-provider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Clock, CheckCircle2, XCircle, Lightbulb, Sparkles, Loader2, RotateCcw } from 'lucide-react'
import { useQuestionLibraries } from '@/lib/use-question-libraries'

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
  const {
    libraries,
    loading: libraryLoading,
    error: libraryError,
    reload: reloadLibraries,
  } = useQuestionLibraries()

  const searchParamsKey = searchParams.toString()

  const queryLibraryCode = useMemo(() => {
    const value =
      searchParams.get('library') ?? searchParams.get('type') ?? undefined
    return value ? value.toUpperCase() : null
  }, [searchParamsKey])

  const queryPresetCode = useMemo(() => {
    const value = searchParams.get('preset')
    return value ? value.toUpperCase() : null
  }, [searchParamsKey])

  const [selectedLibraryCode, setSelectedLibraryCode] = useState<string | null>(null)
  const [selectedPresetCode, setSelectedPresetCode] = useState<string | null>(null)

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

  useEffect(() => {
    if (!libraries.length) return
    setSelectedLibraryCode((prev) => {
      if (prev && libraries.some((library) => library.code === prev)) {
        return prev
      }
      const matched =
        (queryLibraryCode &&
          libraries.find((library) => library.code === queryLibraryCode)) ||
        libraries[0]
      return matched ? matched.code : null
    })
  }, [libraries, queryLibraryCode])

  useEffect(() => {
    if (!selectedLibraryCode) {
      setSelectedPresetCode(null)
      return
    }
    const currentLibrary = libraries.find((library) => library.code === selectedLibraryCode)
    if (!currentLibrary) {
      setSelectedPresetCode(null)
      return
    }
    setSelectedPresetCode((prev) => {
      if (
        prev &&
        currentLibrary.presets.some((preset) => preset.code === prev)
      ) {
        return prev
      }
      const matched =
        (queryPresetCode &&
          currentLibrary.presets.find(
            (preset) => preset.code.toUpperCase() === queryPresetCode,
          )) ||
        currentLibrary.presets[0]
      return matched ? matched.code : null
    })
  }, [libraries, selectedLibraryCode, queryPresetCode])

  const selectedLibrary = useMemo(
    () => libraries.find((library) => library.code === selectedLibraryCode) ?? null,
    [libraries, selectedLibraryCode],
  )

  const selectedPreset = useMemo(() => {
    if (!selectedLibrary) return null
    if (!selectedLibrary.presets.length) return null
    if (!selectedPresetCode) return selectedLibrary.presets[0]
    return (
      selectedLibrary.presets.find(
        (preset) => preset.code === selectedPresetCode,
      ) ?? selectedLibrary.presets[0]
    )
  }, [selectedLibrary, selectedPresetCode])

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
    if (!selectedLibraryCode) {
      notify({
        variant: 'warning',
        title: '请选择题库',
        description: '请先选择你要参加考试的题库。',
      })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/exam/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          library: selectedLibraryCode,
          presetCode: selectedPreset?.code,
        }),
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

  const handleExportWrongQuestions = () => {
    if (!result?.questionResults || typeof window === 'undefined') {
      notify({
        variant: 'warning',
        title: '无法导出',
        description: '暂无错题数据可导出，请稍后再试。',
      })
      return
    }

    const wrongQuestions = result.questionResults.filter((q: any) => !q.isCorrect)
    if (!wrongQuestions.length) {
      notify({
        variant: 'info',
        title: '没有错题',
        description: '本次考试没有需要导出的错题。',
      })
      return
    }

    const sections = wrongQuestions.map((q: any, index: number) => {
      const optionLines = Array.isArray(q.options)
        ? q.options
            .map((option: any) => `  ${option.id}. ${option.text}`)
            .join('\n')
        : ''
      const explanationText = q.explanation?.trim() || q.aiExplanation?.trim() || '暂无解析'
      return [
        `题目 ${index + 1}: ${q.title}`,
        optionLines ? `选项:\n${optionLines}` : null,
        `你的答案：${q.userAnswer?.length ? q.userAnswer.join(', ') : '未作答'}`,
        `正确答案：${q.correctAnswers?.join(', ') || '无'}`,
        `解析：${explanationText}`,
      ]
        .filter(Boolean)
        .join('\n')
    })

    const content = sections.join('\n\n------------------------------\n\n')
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const now = new Date()
    const dateLabel = [
      now.getFullYear(),
      (now.getMonth() + 1).toString().padStart(2, '0'),
      now.getDate().toString().padStart(2, '0'),
    ].join('-')
    const timeLabel = `${now.getHours().toString().padStart(2, '0')}${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}`
    link.href = url
    link.download = `错题导出_${dateLabel}_${timeLabel}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 1000)

    notify({
      variant: 'success',
      title: '导出成功',
      description: `已导出 ${wrongQuestions.length} 道错题为 txt 文件。`,
    })
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-slate-600 dark:bg-slate-950 dark:text-slate-200">
        <p>加载中...</p>
      </div>
    )
  }

  // 开始考试前
  if (!examStarted) {
    if (libraryLoading) {
      return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 dark:bg-slate-950">
          <div className="max-w-2xl mx-auto text-center text-gray-500 dark:text-slate-400">
            正在加载可用题库...
          </div>
        </div>
      )
    }

    if (!libraries.length) {
      return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 dark:bg-slate-950">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <p className="text-gray-600 dark:text-slate-300">
              当前账号暂无可参加的题库，请联系管理员或稍后再试。
            </p>
            {libraryError && (
              <p className="text-sm text-red-500">
                题库加载失败：{libraryError}
              </p>
            )}
            <Button onClick={reloadLibraries} variant="outline">
              重新加载
            </Button>
          </div>
        </div>
      )
    }

    const presetSummary = selectedPreset
      ? `${selectedPreset.totalQuestions} 题 · ${selectedPreset.durationMinutes} 分钟 · ${selectedPreset.passScore} 分及格`
      : '该题库尚未配置考试预设，将使用默认配置。'

    const singleChoiceCount =
      selectedPreset?.singleChoiceCount ?? selectedLibrary?.singleChoiceCount ?? 0
    const multipleChoiceCount =
      selectedPreset?.multipleChoiceCount ?? selectedLibrary?.multipleChoiceCount ?? 0
    const trueFalseCount =
      selectedPreset?.trueFalseCount ?? selectedLibrary?.trueFalseCount ?? 0

    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 dark:bg-slate-950">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                {selectedLibrary?.name ?? '模拟考试'} — 考试配置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-slate-200">选择题库</Label>
                  <Select
                    value={selectedLibraryCode ?? undefined}
                    onValueChange={(value) => setSelectedLibraryCode(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择题库" />
                    </SelectTrigger>
                    <SelectContent>
                      {libraries.map((library) => (
                        <SelectItem key={library.code} value={library.code}>
                          {library.displayLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-slate-200">考试预设</Label>
                  {selectedLibrary?.presets.length ? (
                    <Select
                      value={selectedPreset?.code ?? undefined}
                      onValueChange={(value) => setSelectedPresetCode(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择预设" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedLibrary.presets.map((preset) => (
                          <SelectItem key={preset.code} value={preset.code}>
                            {preset.name}（{preset.totalQuestions}题 / {preset.durationMinutes}分钟）
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      未配置预设，将使用系统默认配置。
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200">
                <p className="font-medium text-slate-900 dark:text-slate-100">考试信息</p>
                <p className="mt-1">{presetSummary}</p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                      {singleChoiceCount}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-slate-300">单选题数量</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                      {multipleChoiceCount}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-slate-300">多选题数量</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                      {trueFalseCount}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-slate-300">判断题数量</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">
                  * 考试开始后将自动计时，时间到会自动交卷。
                </p>
              </div>

              <Button
                onClick={handleStartExam}
                disabled={loading || !selectedLibraryCode}
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
    const hasWrongQuestions = result.questionResults?.some((q: any) => !q.isCorrect)
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 dark:bg-slate-950">
        <div className="max-w-4xl mx-auto">
          <Card
            className={`${result.passed ? 'border-green-500' : 'border-red-500'} dark:bg-slate-900/70`}
          >
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
                  <p className="text-sm text-gray-600 dark:text-slate-300">答对</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{result.wrongCount}</p>
                  <p className="text-sm text-gray-600 dark:text-slate-300">答错</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{result.passScore}</p>
                  <p className="text-sm text-gray-600 dark:text-slate-300">及格线</p>
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
                          <div className="mb-3 rounded-md border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/60">
                            <div className="flex items-center gap-2 text-gray-700 dark:text-slate-200">
                              <Lightbulb className="h-4 w-4" />
                              <span className="font-semibold">人工解析</span>
                            </div>
                            <p className="mt-2 whitespace-pre-line text-sm text-gray-700 dark:text-slate-200">
                              {q.explanation}
                            </p>
                          </div>
                        ) : (
                          <div className="mb-3 rounded-md border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/60">
                            <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400">
                              <Lightbulb className="h-4 w-4" />
                              <span className="font-semibold">人工解析</span>
                            </div>
                            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                              暂无人工解析，管理员稍后会补充该题解析。
                            </p>
                          </div>
                        )}

                        <div className="rounded-md border border-red-200 bg-white p-3 dark:border-rose-500/40 dark:bg-rose-500/10">
                          <div className="flex flex-wrap items-center gap-2 text-red-600 dark:text-rose-200">
                            <Sparkles className="h-4 w-4" />
                            <span className="font-semibold">AI解析</span>
                            {q.aiExplanation && (
                              <Badge variant="outline" className="border-red-200 text-red-600 dark:border-rose-400 dark:text-rose-100">
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
                          <p className="mt-2 whitespace-pre-line text-sm text-gray-700 dark:text-slate-100">
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

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={handleExportWrongQuestions}
                  variant="outline"
                  className="flex-1"
                  disabled={!hasWrongQuestions}
                >
                  导出错题（TXT）
                </Button>
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
    <div className="min-h-screen bg-gray-50 py-6 px-4 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto">
        {/* 顶部信息栏 */}
        <div className="bg-white rounded-lg border border-slate-100 shadow p-4 mb-6 flex justify-between items-center dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex gap-6">
            <span className="text-sm text-slate-700 dark:text-slate-200">
              第 <strong>{currentIndex + 1}</strong> / {questions.length} 题
            </span>
            <span className="text-sm text-slate-700 dark:text-slate-200">
              已答: <strong>{answeredCount}</strong> 题
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            <span
              className={`text-lg font-bold ${
                timeLeft < 300 ? 'text-red-500 dark:text-red-300' : 'text-gray-700 dark:text-slate-200'
              }`}
            >
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        {/* 题目卡片 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-sm text-gray-500 dark:text-slate-400">题号: {currentQuestion.externalId}</span>
                <span className="ml-4 text-sm text-gray-500 dark:text-slate-400">
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
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-6">{currentQuestion.title}</h3>

            {currentQuestion.questionType === 'multiple_choice' ? (
              <div className="space-y-3">
                {currentQuestion.options.map((option: any) => {
                  const isSelected = userAnswer.includes(option.id)

                  return (
                    <div
                      key={option.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-500/10'
                          : 'border-gray-200 hover:border-gray-300 dark:border-slate-700 dark:hover:border-slate-500'
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
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-500/10'
                            : 'border-gray-200 hover:border-gray-300 dark:border-slate-700 dark:hover:border-slate-500'
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
              <p className="mt-4 text-sm text-gray-500 dark:text-slate-400">* 此题为多选题</p>
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
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 text-slate-600 dark:bg-slate-950 dark:text-slate-200">
          加载中...
        </div>
      }
    >
      <ExamContent />
    </Suspense>
  )
}
