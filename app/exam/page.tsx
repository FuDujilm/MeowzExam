'use client'

import { useState, useEffect, Suspense, useMemo, useRef } from 'react'
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
import { Clock, CheckCircle2, XCircle, Lightbulb, Sparkles, Loader2, RotateCcw, Grid3x3, X } from 'lucide-react'
import { useQuestionLibraries } from '@/lib/use-question-libraries'
import { getStoredLibraryCode, setStoredLibraryCode } from '@/lib/library-selection'
import type { AiExplainOutput, OptionAnalysis } from '@/lib/ai/schema'

function formatAiExplanation(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') {
    return value.trim()
  }

  try {
    const explanation = value as Partial<AiExplainOutput>
    const sections: string[] = []

    if (typeof explanation.summary === 'string' && explanation.summary.trim().length > 0) {
      sections.push(`【总结】${explanation.summary.trim()}`)
    }

    if (Array.isArray(explanation.answer) && explanation.answer.length > 0) {
      sections.push(`【标准答案】${explanation.answer.join(', ')}`)
    }

    if (Array.isArray(explanation.optionAnalysis) && explanation.optionAnalysis.length > 0) {
      const optionLines = (explanation.optionAnalysis as OptionAnalysis[]).map((item) => {
        const verdictLabel = item.verdict === 'correct' ? '正确' : '错误'
        return `${item.option ?? ''}（${verdictLabel}）：${item.reason}`
      })
      sections.push(`【选项解析】\n${optionLines.join('\n')}`)
    }

    if (Array.isArray(explanation.keyPoints) && explanation.keyPoints.length > 0) {
      sections.push(`【考点提示】${explanation.keyPoints.join('；')}`)
    }

    if (Array.isArray(explanation.memoryAids) && explanation.memoryAids.length > 0) {
      const aids = explanation.memoryAids.map((item) => `${item.type ?? '技巧'}：${item.text}`)
      sections.push(`【记忆技巧】${aids.join('；')}`)
    }

    if (typeof explanation.difficulty === 'number') {
      sections.push(`【难度】${explanation.difficulty}/5`)
    }

    if (Array.isArray(explanation.citations) && explanation.citations.length > 0) {
      const refs = explanation.citations
        .map((item) => `${item.title ?? '资料'}：${item.url ?? ''}`)
        .join('\n')
      sections.push(`【参考资料】\n${refs}`)
    }

    const text = sections.filter((section) => section && section.trim().length > 0).join('\n\n')
    return text || '[AI 解析数据已生成，但格式暂不支持直接展示]'
  } catch (error) {
    console.error('Failed to format AI explanation:', error)
    try {
      return JSON.stringify(value)
    } catch {
      return '[AI 解析数据格式无法展示]'
    }
  }
}

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
  hasImage?: boolean
  imagePath?: string | null
  imageAlt?: string | null
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
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const navButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const navContainerRef = useRef<HTMLDivElement | null>(null)
  const [answerSheetOpen, setAnswerSheetOpen] = useState(false)

  useEffect(() => {
    if (!libraries.length) {
      setSelectedLibraryCode(null)
      return
    }

    const isValidCode = (code: string | null | undefined) =>
      Boolean(code && libraries.some((library) => library.code === code))

    const queryCandidate = isValidCode(queryLibraryCode) ? queryLibraryCode : null
    const storedCandidate = getStoredLibraryCode()
    const storedValid = isValidCode(storedCandidate) ? storedCandidate : null
    const fallback = libraries[0]?.code ?? null

    setSelectedLibraryCode((prev) => {
      if (queryCandidate && queryCandidate !== prev) {
        return queryCandidate
      }
      if (prev && isValidCode(prev)) {
        return prev
      }
      if (storedValid && storedValid !== prev) {
        return storedValid
      }
      return prev ?? fallback
    })
  }, [libraries, queryLibraryCode])

  useEffect(() => {
    if (selectedLibraryCode) {
      setStoredLibraryCode(selectedLibraryCode)
    }
  }, [selectedLibraryCode])

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
        questionRefs.current = {}

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
  const handleSelectAnswer = (question: Question, answerId: string) => {
    const questionId = question.id

    if (question.questionType === 'multiple_choice') {
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
      const explanationText = formatAiExplanation(data.explanation)

      setResult((prev: any) => {
        if (!prev) return prev
        return {
          ...prev,
          questionResults: prev.questionResults.map((item: any) =>
            item.questionId === questionId
              ? { ...item, aiExplanation: explanationText }
              : item
          ),
        }
      })

      if (data?.message) {
        notify({
          variant: 'success',
          title: 'AI 解析已生成',
          description: data.message,
        })
      }

    } catch (error: any) {
      console.error('Generate AI explanation failed:', error)
      setAiResultError(prev => ({
        ...prev,
        [questionId]: error.message || '生成 AI 解析失败，请稍后再试',
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
      const questionNumber =
        typeof q.questionNumber === 'number' && q.questionNumber > 0 ? q.questionNumber : index + 1
      const metadata = [
        q.externalId ? `题号：${q.externalId}` : null,
        q.questionType
          ? `题型：${q.questionType === 'multiple_choice' ? '多选题' : q.questionType === 'single_choice' ? '单选题' : q.questionType}`
          : null,
        q.difficulty
          ? `难度：${q.difficulty === 'easy' ? '简单' : q.difficulty === 'medium' ? '中等' : '困难'}`
          : null,
        q.category ? `分类：${q.category}` : null,
      ]
        .filter(Boolean)
        .join(' | ')
      return [
        `题目 ${questionNumber}: ${q.title}`,
        metadata ? `(${metadata})` : null,
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

  const registerQuestionRef = (id: string) => (el: HTMLDivElement | null) => {
    questionRefs.current[id] = el
  }

  const registerNavButtonRef = (id: string) => (el: HTMLButtonElement | null) => {
    navButtonRefs.current[id] = el
  }

  const scrollToQuestion = (questionId: string, index: number) => {
    const node = questionRefs.current[questionId]
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setCurrentIndex(index)
    }
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

  useEffect(() => {
    if (!examStarted || !questions.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (!visible.length) {
          return
        }
        const id = visible[0].target.getAttribute('data-question-id')
        if (!id) return
        const idx = questions.findIndex((question) => question.id === id)
        if (idx >= 0) {
          setCurrentIndex((prev) => (prev === idx ? prev : idx))
        }
      },
      {
        root: null,
        rootMargin: '0px 0px -60% 0px',
        threshold: [0.3, 0.5, 0.7],
      },
    )

    const nodes = questions
      .map((question) => questionRefs.current[question.id])
      .filter((node): node is HTMLDivElement => Boolean(node))
    nodes.forEach((node) => observer.observe(node))

    return () => {
      nodes.forEach((node) => observer.unobserve(node))
      observer.disconnect()
    }
  }, [examStarted, questions])

  useEffect(() => {
    const activeId = questions[currentIndex]?.id
    if (!activeId) return
    const container = navContainerRef.current
    const button = navButtonRefs.current[activeId]
    if (!container || !button) return

    const containerHeight = container.clientHeight
    if (container.scrollHeight <= containerHeight + 4) {
      return
    }

    const offsetTop = button.offsetTop - container.offsetTop
    const offsetBottom = offsetTop + button.offsetHeight
    const visibleTop = container.scrollTop
    const visibleBottom = visibleTop + containerHeight

    if (offsetTop < visibleTop + 8) {
      const targetTop = Math.max(offsetTop - containerHeight / 3, 0)
      container.scrollTo({ top: targetTop, behavior: 'smooth' })
    } else if (offsetBottom > visibleBottom - 8) {
      const targetTop = offsetBottom - (containerHeight * 2) / 3
      container.scrollTo({ top: targetTop, behavior: 'smooth' })
    }
  }, [currentIndex, questions])

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
    const wrongQuestions = result.questionResults?.filter((q: any) => !q.isCorrect) ?? []
    const hasWrongQuestions = wrongQuestions.length > 0
    const summaryStats = [
      { label: '得分', value: `${result.score}/${result.totalQuestions}`, accent: 'text-blue-600 dark:text-blue-300' },
      { label: '答对', value: result.correctCount, accent: 'text-emerald-600 dark:text-emerald-300' },
      { label: '答错', value: result.wrongCount, accent: 'text-rose-600 dark:text-rose-300' },
      { label: '及格线', value: result.passScore, accent: 'text-slate-800 dark:text-slate-200' },
    ]

    return (
      <div className="min-h-screen bg-slate-50/70 py-10 px-4 dark:bg-slate-950">
        <div className="mx-auto max-w-5xl space-y-8">
          <div
            className={`rounded-3xl border bg-gradient-to-br p-8 text-white shadow-lg ${
              result.passed
                ? 'from-emerald-500 via-emerald-500/90 to-emerald-600'
                : 'from-rose-500 via-rose-500/90 to-rose-600'
            }`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                {result.passed ? (
                  <CheckCircle2 className="h-12 w-12 text-white/90" />
                ) : (
                  <XCircle className="h-12 w-12 text-white/90" />
                )}
                <div>
                  <p className="text-sm uppercase tracking-widest text-white/80">
                    {result.library?.name || selectedLibrary?.name}
                  </p>
                  <h1 className="text-3xl font-semibold">
                    {result.passed ? '恭喜通过考试' : '本次考试未通过'}
                  </h1>
                  <p className="text-sm text-white/80">
                    {result.passed
                      ? '继续保持，向更高等级发起冲击！'
                      : '别灰心，查看错题解析后再战一次。'}
                  </p>
                </div>
              </div>
              <Badge
                className="bg-white/20 text-white text-base px-4 py-2"
                variant={result.passed ? 'default' : 'destructive'}
              >
                {result.preset?.name || selectedPreset?.name || '本次考试'}
              </Badge>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {summaryStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl bg-white/15 px-4 py-3 text-center backdrop-blur"
                >
                  <p className={`text-2xl font-semibold ${stat.accent}`}>{stat.value}</p>
                  <p className="text-sm uppercase tracking-wide text-white/70">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 lg:flex-row">
              <Button
                onClick={handleExportWrongQuestions}
                variant="secondary"
                className="flex-1 bg-white/90 text-slate-900 hover:bg-white"
                disabled={!hasWrongQuestions}
              >
                导出错题（TXT）
              </Button>
              <Button
                onClick={() => router.push('/')}
                variant="outline"
                className="flex-1 border-white/50 text-white hover:bg-white/10"
              >
                返回首页
              </Button>
              <Button
                onClick={() => window.location.reload()}
                className="flex-1 bg-white/20 text-white hover:bg-white/30"
              >
                再考一次
              </Button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_1fr]">
            <Card className="border-slate-100 shadow-sm dark:border-slate-800">
              <CardHeader>
                <CardTitle>错题复盘</CardTitle>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {hasWrongQuestions
                    ? '逐题查看错因、参考解析以及 AI 指导，帮助你巩固薄弱点。'
                    : '本次考试全部答对，太棒了！'}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasWrongQuestions ? (
                  wrongQuestions.map((q: any, index: number) => {
                    const displayOptions = Array.isArray(q.options) ? q.options : []
                    const userAnswerSet = new Set(q.userAnswer ?? [])
                    const correctAnswerSet = new Set(q.correctAnswers ?? [])
                    const questionLabel =
                      typeof q.questionNumber === 'number' && q.questionNumber > 0
                        ? q.questionNumber
                        : index + 1
                    return (
                      <div
                        key={q.questionId}
                        className="rounded-xl border border-rose-100/80 bg-rose-50/50 p-4 dark:border-rose-500/30 dark:bg-rose-500/10"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-sm text-rose-500 dark:text-rose-200">
                          <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold text-rose-600 dark:bg-rose-500/20 dark:text-rose-100">
                            错题 #{questionLabel}
                          </span>
                          <span>题号: {q.externalId}</span>
                          <span>题型: {q.questionType === 'multiple_choice' ? '多选' : '单选'}</span>
                        </div>
                        <p className="mt-3 font-medium text-slate-800 dark:text-slate-100">{q.title}</p>

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          {q.category && <span>分类：{q.category}</span>}
                          {q.difficulty && (
                            <span>
                              难度：
                              {q.difficulty === 'easy'
                                ? '简单'
                                : q.difficulty === 'medium'
                                ? '中等'
                                : q.difficulty === 'hard'
                                ? '困难'
                                : q.difficulty}
                            </span>
                          )}
                        </div>

                        {q.hasImage && q.imagePath ? (
                          <div className="mt-3 rounded-lg border border-slate-200 bg-white/60 p-2 dark:border-slate-700 dark:bg-slate-900/60">
                            <img
                              src={q.imagePath}
                              alt={q.imageAlt || q.title}
                              className="mx-auto max-h-60 w-full rounded-md object-contain"
                            />
                          </div>
                        ) : null}

                        <div className="mt-3 space-y-2">
                          {displayOptions.map((option: any) => {
                            const isCorrect = correctAnswerSet.has(option.id)
                            const isSelected = userAnswerSet.has(option.id)
                            const optionClasses = isCorrect
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/60 dark:bg-emerald-500/10 dark:text-emerald-100'
                              : isSelected
                              ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-400/60 dark:bg-rose-500/10 dark:text-rose-100'
                              : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
                            return (
                              <div
                                key={`${q.questionId}-${option.id}`}
                                className={`rounded-lg border px-3 py-2 text-sm ${optionClasses}`}
                              >
                                <div className="flex items-start gap-2">
                                  <span className="font-semibold">{option.id}.</span>
                                  <p className="flex-1 whitespace-pre-line break-words break-all">{option.text}</p>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                  {isCorrect && (
                                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100">
                                      正确答案
                                    </Badge>
                                  )}
                                  {isSelected && (
                                    <Badge
                                      variant="outline"
                                      className="border-rose-300 text-rose-600 dark:border-rose-400/70 dark:text-rose-100"
                                    >
                                      你的选择
                                    </Badge>
                                  )}
                                  {!isSelected && !isCorrect && (
                                    <Badge variant="outline" className="border-slate-200 text-slate-500 dark:border-slate-600 dark:text-slate-300">
                                      未选择
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <p>
                            <span className="font-semibold text-rose-500 dark:text-rose-200">你的答案：</span>
                            {q.userAnswer.join(', ') || '未作答'}
                          </p>
                          <p>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-200">正确答案：</span>
                            {q.correctAnswers.join(', ')}
                          </p>
                        </div>

                        <div className="mt-4 space-y-3">
                          <div className="rounded-lg border border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/60">
                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-100">
                              <Lightbulb className="h-4 w-4" />
                              <span className="font-semibold">人工解析</span>
                            </div>
                            <p className="mt-2 whitespace-pre-line text-sm text-slate-600 dark:text-slate-200">
                              {q.explanation || '暂无人工解析，管理员稍后会补充该题解析。'}
                            </p>
                          </div>

                          <div className="rounded-lg border border-rose-200 bg-white/90 p-3 dark:border-rose-500/40 dark:bg-rose-500/10">
                            <div className="flex flex-wrap items-center gap-2 text-rose-600 dark:text-rose-200">
                              <Sparkles className="h-4 w-4" />
                              <span className="font-semibold">AI 解析</span>
                              {q.aiExplanation && (
                                <Badge
                                  variant="outline"
                                  className="border-rose-200 text-rose-600 dark:border-rose-300 dark:text-rose-100"
                                >
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
                            <p className="mt-2 whitespace-pre-line text-sm text-slate-700 dark:text-slate-100">
                              {q.aiExplanation
                                || (aiResultLoading[q.questionId]
                                  ? '正在生成AI解析，请稍候...'
                                  : '尚未生成AI解析，点击上方按钮进行生成。')}
                            </p>
                            {aiResultError[q.questionId] && (
                              <p className="mt-2 text-xs text-rose-500">{aiResultError[q.questionId]}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-6 text-center text-emerald-700 dark:border-emerald-400/50 dark:bg-emerald-500/10 dark:text-emerald-100">
                    <p className="text-lg font-semibold">完美！本次考试没有错题。</p>
                    <p className="mt-2 text-sm">保持状态，继续挑战更高难度的题库吧。</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="border-slate-100 shadow-sm dark:border-slate-800">
                <CardHeader>
                  <CardTitle>本次考试概览</CardTitle>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    回顾考试配置与关键数据。
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>题库</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {result.library?.name || selectedLibrary?.name || '--'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>考试预设</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {result.preset?.name || selectedPreset?.name || '--'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>考试时长</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {config?.duration || selectedPreset?.durationMinutes || '--'} 分钟
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>总题数</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {result.totalQuestions}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>及格条件</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {result.passScore} 分
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-100 shadow-sm dark:border-slate-800">
                <CardHeader>
                  <CardTitle>下一步行动</CardTitle>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    继续练习或复盘以强化记忆。
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={() => router.push('/practice?mode=wrong')}
                  >
                    进入错题练习
                  </Button>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() =>
                      router.push(`/practice?mode=sequential&type=${selectedLibraryCode ?? ''}`)
                    }
                  >
                    顺序刷题巩固
                  </Button>
                  <Button
                    className="w-full"
                    variant="ghost"
                    onClick={() => router.push('/stats')}
                  >
                    查看我的成绩统计
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 考试进行中
  if (!questions.length) return null

  const answeredCount = Object.keys(answers).filter(id => answers[id].length > 0).length
  const activeQuestion = questions[currentIndex] ?? questions[0]

  const renderProgressSummary = () => (
    <div className="rounded-lg border border-slate-100 bg-white/90 p-4 shadow dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
        <span>
          当前第 <strong>{currentIndex + 1}</strong> / {questions.length} 题
        </span>
        <span>
          已答：<strong>{answeredCount}</strong> 题
        </span>
        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-orange-500" />
          <strong className={timeLeft < 300 ? 'text-red-500 dark:text-red-300' : 'text-slate-800 dark:text-slate-100'}>
            {formatTime(timeLeft)}
          </strong>
        </span>
      </div>
    </div>
  )

  const renderAnswerSheetCard = () => (
    <Card className="bg-white/90 dark:border-slate-800 dark:bg-slate-900/70 overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">答题卡</CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        <div ref={navContainerRef} className="max-h-72 overflow-y-auto pr-1 lg:max-h-[calc(100vh-9rem)]">
          <div className="grid grid-cols-5 gap-2 text-sm">
            {questions.map((question, index) => {
              const answered = answers[question.id]?.length
              const isActive = activeQuestion?.id === question.id
              return (
                <button
                  key={question.id}
                  ref={registerNavButtonRef(question.id)}
                  type="button"
                  onClick={() => scrollToQuestion(question.id, index)}
                  className={`h-10 rounded-md border text-center font-medium transition-colors ${
                    isActive
                      ? 'border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-500/20 dark:text-blue-100'
                      : answered
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-400/60 dark:bg-emerald-500/15 dark:text-emerald-100'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                  }`}
                >
                  {index + 1}
                </button>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderExamInfoCard = () => (
    <Card className="bg-white/90 dark:border-slate-800 dark:bg-slate-900/70 shrink-0">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">考试信息</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
        <div className="flex items-center justify-between">
          <span>剩余时间</span>
          <span className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
            <Clock className="h-4 w-4 text-orange-500" />
            {formatTime(timeLeft)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>已答题数</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {answeredCount}/{questions.length}
          </span>
        </div>
        {selectedPreset ? (
          <div className="rounded-md border border-slate-100 bg-slate-50/80 p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
            <p>预设：{selectedPreset.name}</p>
            <p>时长：{selectedPreset.durationMinutes} 分钟</p>
            <p>及格：{selectedPreset.passScore} 分</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )

  const renderActionCard = () => (
    <Card className="bg-white/90 dark:border-slate-800 dark:bg-slate-900/70 shrink-0">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">操作</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button type="button" className="w-full" onClick={handleSubmitExam} disabled={loading}>
          {loading ? '提交中...' : '提交试卷'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            if (window.confirm('确定要重置当前考试吗？将重新抽题并开始计时。')) {
              window.location.reload()
            }
          }}
        >
          重置考试
        </Button>
      </CardContent>
    </Card>
  )

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-6 px-4 pb-32 dark:bg-slate-950">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 lg:grid lg:grid-cols-[260px_minmax(0,1fr)_300px] lg:items-start">
          <div className="hidden lg:flex lg:flex-col lg:space-y-4 lg:sticky lg:top-6 lg:self-start">
            {renderAnswerSheetCard()}
          </div>

          <div className="space-y-6">
            {renderProgressSummary()}
            {questions.map((question, index) => {
            const userAnswer = answers[question.id] || []
            const isActive = activeQuestion?.id === question.id
            return (
              <Card
                key={question.id}
                ref={registerQuestionRef(question.id)}
                data-question-id={question.id}
                className={`scroll-mt-28 transition-shadow ${
                  isActive ? 'border-blue-300 shadow-lg shadow-blue-100 dark:border-blue-400/60 dark:shadow-blue-500/10' : ''
                }`}
              >
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-slate-400">
                        <span>
                          序号: <strong>{index + 1}</strong>
                        </span>
                        <span>
                          题号: <strong>{question.externalId}</strong>
                        </span>
                        <span>{question.questionType === 'multiple_choice' ? '多选题' : '单选题'}</span>
                      </div>
                      <Badge variant={question.difficulty === 'easy' ? 'default' : 'destructive'}>
                        {question.difficulty === 'easy' ? '简单' : question.difficulty === 'medium' ? '中等' : '困难'}
                      </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 break-words break-all whitespace-pre-line">
                    {question.title}
                  </h3>
                  {question.hasImage && question.imagePath ? (
                    <div className="rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900/60">
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
                  {question.questionType === 'multiple_choice' ? (
                    <div className="space-y-3">
                      {question.options.map((option: any) => {
                        const isSelected = userAnswer.includes(option.id)
                        return (
                          <div
                            key={option.id}
                            className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-500/10'
                                : 'border-gray-200 hover:border-gray-300 dark:border-slate-700 dark:hover-border-slate-500'
                            }`}
                            onClick={() => handleSelectAnswer(question, option.id)}
                            >
                              <div className="flex items-start gap-3">
                                <Checkbox checked={isSelected} />
                                <Label className="flex-1 cursor-pointer break-words break-all text-left whitespace-pre-line">
                                  <span className="font-medium">{option.id}. </span>
                                  {option.text}
                                </Label>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  ) : (
                    <RadioGroup value={userAnswer?.[0] || ''} onValueChange={(value) => handleSelectAnswer(question, value)}>
                      <div className="space-y-3">
                        {question.options.map((option: any) => {
                          const isSelected = userAnswer.includes(option.id)
                          return (
                            <div
                              key={option.id}
                              className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-500/10'
                                  : 'border-gray-200 hover:border-gray-300 dark:border-slate-700 dark:hover-border-slate-500'
                              }`}
                              onClick={() => handleSelectAnswer(question, option.id)}
                            >
                                <div className="flex items-start gap-3">
                                  <RadioGroupItem value={option.id} id={`${question.id}-${option.id}`} />
                                  <Label
                                    htmlFor={`${question.id}-${option.id}`}
                                    className="flex-1 cursor-pointer break-words break-all text-left whitespace-pre-line"
                                  >
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
                  {question.questionType === 'multiple_choice' && (
                    <p className="text-sm text-gray-500 dark:text-slate-400">* 此题为多选题</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="hidden lg:flex lg:flex-col lg:space-y-4 lg:sticky lg:top-6 lg:self-start">
          {renderExamInfoCard()}
          {renderActionCard()}
        </div>
      </div>
    </div>

    {/* 移动端底部悬窗 */}
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-4 lg:hidden">
      <div className="pointer-events-auto mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Clock className="h-4 w-4 text-orange-500" />
            <span className={timeLeft < 300 ? 'font-semibold text-red-500 dark:text-red-300' : 'font-semibold'}>
              {formatTime(timeLeft)}
            </span>
            <span className="text-xs">·</span>
            <span>
              {answeredCount}/{questions.length}
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAnswerSheetOpen(true)}
              className="inline-flex w-full items-center justify-center gap-1 sm:w-auto"
            >
              <Grid3x3 className="h-4 w-4" />
              答题卡
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmitExam}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? '提交中...' : '提交试卷'}
            </Button>
          </div>
        </div>
      </div>
    </div>

    {/* 移动端右侧滑出答题卡 */}
    {answerSheetOpen && (
      <>
        {/* 背景遮罩 */}
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setAnswerSheetOpen(false)}
        />

        {/* 答题卡面板 */}
        <div className="fixed inset-y-0 right-0 z-50 w-[85%] max-w-sm overflow-y-auto bg-white shadow-2xl dark:bg-slate-900 lg:hidden">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">答题卡</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAnswerSheetOpen(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="p-4">
            <div className="mb-4 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>已答题数</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {answeredCount}/{questions.length}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>剩余时间</span>
                <span className="flex items-center gap-1 font-semibold text-slate-900 dark:text-slate-100">
                  <Clock className="h-4 w-4 text-orange-500" />
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {questions.map((question, index) => {
                const answered = answers[question.id]?.length
                const isActive = activeQuestion?.id === question.id
                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => {
                      scrollToQuestion(question.id, index)
                      setAnswerSheetOpen(false)
                    }}
                    className={`h-12 rounded-md border text-center text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-500/20 dark:text-blue-100'
                        : answered
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-400/60 dark:bg-emerald-500/15 dark:text-emerald-100'
                        : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {index + 1}
                  </button>
                )
              })}
            </div>

            <div className="mt-4 space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded border-2 border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-500/20" />
                <span>当前题目</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded border-2 border-emerald-200 bg-emerald-50 dark:border-emerald-400/60 dark:bg-emerald-500/15" />
                <span>已作答</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded border-2 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" />
                <span>未作答</span>
              </div>
            </div>
          </div>
        </div>
      </>
    )}
    </>
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
