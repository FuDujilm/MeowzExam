'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useNotification } from '@/components/ui/notification-provider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react'
import { useQuestionLibraries } from '@/lib/use-question-libraries'

interface QuestionOption {
  id: string
  text: string
}

interface Question {
  id: string
  uuid: string
  externalId: string
  type: string
  questionType: string
  difficulty: string
  category: string
  categoryCode: string
  subSection?: string | null
  title: string
  hasImage: boolean
  tags: string[]
  libraryCode?: string | null
  libraryName?: string | null
  libraryShortName?: string | null
  options: QuestionOption[]
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  single_choice: '单选题',
  multiple_choice: '多选题',
  true_false: '判断题',
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '入门',
  medium: '中等',
  hard: '困难',
}

const VISIBILITY_LABELS: Record<string, string> = {
  ADMIN_ONLY: '仅管理员可见',
  PUBLIC: '所有用户可见',
  CUSTOM: '定向授权',
}

export default function QuestionsPage() {
  const router = useRouter()
  const { notify } = useNotification()
  const {
    libraries,
    loading: libraryLoading,
    error: libraryError,
    reload: reloadLibraries,
  } = useQuestionLibraries()

  const [selectedLibraryCode, setSelectedLibraryCode] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 0,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  const selectedLibrary = useMemo(
    () => libraries.find((item) => item.code === selectedLibraryCode) ?? null,
    [libraries, selectedLibraryCode],
  )

  const presetSummary = useMemo(() => {
    if (!selectedLibrary || selectedLibrary.presets.length === 0) {
      return null
    }
    return selectedLibrary.presets
      .map(
        (preset) =>
          `${preset.name} · ${preset.totalQuestions}题 / ${preset.durationMinutes}分钟`,
      )
      .join('；')
  }, [selectedLibrary])

  useEffect(() => {
    if (!libraryLoading && libraries.length > 0 && !selectedLibraryCode) {
      setSelectedLibraryCode(libraries[0].code)
    }
  }, [libraryLoading, libraries, selectedLibraryCode])

  const normalizeOptions = (value: unknown): QuestionOption[] => {
    if (!Array.isArray(value)) {
      return []
    }
    return value
      .map((option) => {
        const id = typeof option?.id === 'string' ? option.id.trim() : ''
        const text = typeof option?.text === 'string' ? option.text : ''
        return id ? { id, text } : null
      })
      .filter((option): option is QuestionOption => Boolean(option))
  }

  const loadQuestions = async (page: number = 1, overrideLibrary?: string | null) => {
    const targetLibraryCode = overrideLibrary ?? selectedLibraryCode
    if (!targetLibraryCode) {
      notify({
        variant: 'warning',
        title: '请选择题库',
        description: '请选择可访问的题库后再进行浏览。',
      })
      return
    }

    const sanitizedPage = Math.max(page, 1)
    const trimmedSearch = search.trim()

    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: sanitizedPage.toString(),
        pageSize: pagination.pageSize.toString(),
        library: targetLibraryCode,
      })
      if (trimmedSearch) {
        params.append('search', trimmedSearch)
      }

      const response = await fetch(`/api/questions?${params.toString()}`)
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || '加载题目列表失败')
      }

      const data = await response.json()
      const normalizedQuestions: Question[] = Array.isArray(data?.questions)
        ? data.questions.map((question: Question) => ({
            ...question,
            options: normalizeOptions((question as any)?.options),
          }))
        : []
      setQuestions(normalizedQuestions)

      const fallbackPagination: Pagination = {
        page: sanitizedPage,
        pageSize: pagination.pageSize,
        total: 0,
        totalPages: 0,
      }

      setPagination(
        data?.pagination
          ? {
              page:
                typeof data.pagination.page === 'number'
                  ? data.pagination.page
                  : fallbackPagination.page,
              pageSize:
                typeof data.pagination.pageSize === 'number'
                  ? data.pagination.pageSize
                  : fallbackPagination.pageSize,
              total: typeof data.pagination.total === 'number' ? data.pagination.total : 0,
              totalPages:
                typeof data.pagination.totalPages === 'number'
                  ? data.pagination.totalPages
                  : 0,
            }
          : fallbackPagination,
      )
    } catch (error: any) {
      console.error('加载题目列表失败:', error)
      notify({
        variant: 'danger',
        title: '加载题目列表失败',
        description: error?.message || '请检查网络连接或稍后再试。',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedLibraryCode) {
      loadQuestions(1, selectedLibraryCode)
    } else {
      setQuestions([])
      setPagination((prev) => ({
        ...prev,
        page: 0,
        total: 0,
        totalPages: 0,
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLibraryCode])

  const handleSearch = () => {
    if (!selectedLibraryCode) {
      notify({
        variant: 'warning',
        title: '请选择题库',
        description: '请选择可访问的题库后再进行搜索。',
      })
      return
    }
    loadQuestions(1)
  }

  const handlePageChange = (newPage: number) => {
    if (
      loading ||
      pagination.totalPages === 0 ||
      newPage <= 0 ||
      newPage === pagination.page ||
      newPage > pagination.totalPages
    ) {
      return
    }
    loadQuestions(newPage)
  }

  const handleOpenInPractice = (questionId: string) => {
    if (!selectedLibraryCode) return
    const params = new URLSearchParams({
      mode: 'sequential',
      type: selectedLibraryCode,
      library: selectedLibraryCode,
      currentId: questionId,
    })
    router.push(`/practice?${params.toString()}`)
  }

  const disablePrev = pagination.page <= 1 || pagination.totalPages === 0
  const disableNext =
    pagination.totalPages === 0 || pagination.page >= pagination.totalPages

  return (
    <div className="container mx-auto max-w-6xl p-4">
      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">题库预览</h1>
            <p className="text-sm text-gray-500">
              浏览当前选定题库的题目，支持模糊搜索；预览模式默认将 A 选项视为正确答案。
            </p>
          </div>
          <Button variant="outline" onClick={() => router.back()}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            返回
          </Button>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex flex-1 items-center gap-2">
              <Select
                value={selectedLibraryCode ?? undefined}
                onValueChange={(value) => setSelectedLibraryCode(value)}
                disabled={libraryLoading || libraries.length === 0}
              >
                <SelectTrigger className="w-full md:w-[280px]">
                  <SelectValue
                    placeholder={libraryLoading ? '正在加载题库…' : '请选择题库'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {libraries.map((library) => (
                    <SelectItem key={library.code} value={library.code}>
                      {library.displayLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={reloadLibraries}
                disabled={libraryLoading}
                className="text-gray-500"
              >
                <RefreshCw
                  className={`mr-1 h-4 w-4 ${libraryLoading ? 'animate-spin' : ''}`}
                />
                刷新列表
              </Button>
            </div>
            <div className="flex flex-1 gap-2">
              <Input
                placeholder="搜索题干、题号或关键词…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                disabled={!selectedLibraryCode}
              />
              <Button type="button" onClick={handleSearch} disabled={!selectedLibraryCode}>
                <Search className="mr-1 h-4 w-4" />
                搜索
              </Button>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {!libraryLoading && libraries.length === 0 && (
              <span>当前账号暂无可访问的题库，请联系管理员开通权限。</span>
            )}
            {libraryError && (
              <span className="text-red-500">
                题库加载失败：{libraryError}，请点击“刷新列表”重试。
              </span>
            )}
          </div>
        </div>
      </div>

      {!selectedLibraryCode && !libraryLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-gray-500">
            当前账号尚未分配题库，请联系管理员或尝试刷新列表。
          </CardContent>
        </Card>
      ) : (
        <>
          {selectedLibrary && (
            <Card className="mb-6 border-blue-200 bg-blue-50/80">
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-blue-600">
                      当前题库
                    </p>
                    <h2 className="text-2xl font-semibold text-gray-900">
                      {selectedLibrary.name}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {selectedLibrary.description || '该题库尚未提供简介。'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                      <Badge variant="outline" className="text-xs">
                        {VISIBILITY_LABELS[selectedLibrary.visibility] ||
                          selectedLibrary.visibility}
                      </Badge>
                      {selectedLibrary.region && (
                        <Badge variant="outline" className="text-xs">
                          地区：{selectedLibrary.region}
                        </Badge>
                      )}
                      {selectedLibrary.version && (
                        <Badge variant="outline" className="text-xs">
                          版本：{selectedLibrary.version}
                        </Badge>
                      )}
                      {selectedLibrary.sourceType && (
                        <Badge variant="outline" className="text-xs">
                          类型：{selectedLibrary.sourceType}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center md:grid-cols-4">
                    {[
                      { label: '总题量', value: selectedLibrary.totalQuestions },
                      { label: '单选', value: selectedLibrary.singleChoiceCount },
                      { label: '多选', value: selectedLibrary.multipleChoiceCount },
                      { label: '判断', value: selectedLibrary.trueFalseCount },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-lg border border-white/60 bg-white/60 p-3"
                      >
                        <p className="text-xs text-gray-500">{stat.label}</p>
                        <p className="text-lg font-semibold text-gray-900">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {presetSummary && (
                  <div className="rounded-lg border border-blue-100 bg-white/70 p-3 text-xs text-blue-900">
                    可用考试预设：{presetSummary}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {loading ? (
            <div className="py-16 text-center text-sm text-gray-500">题目加载中...</div>
          ) : questions.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-gray-500">
                暂无题目，请尝试调整搜索条件。
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-6 space-y-3">
                {questions.map((question) => {
                  const questionTypeLabel =
                    QUESTION_TYPE_LABELS[question.questionType] || question.questionType
                  const difficultyLabel =
                    DIFFICULTY_LABELS[question.difficulty?.toLowerCase()] ||
                    question.difficulty?.toUpperCase() ||
                    '未知'
                  const tagList = Array.isArray(question.tags) ? question.tags : []
                  const options = Array.isArray(question.options) ? question.options : []

                  return (
                    <Card key={question.id} className="border border-slate-200">
                      <CardContent className="space-y-3 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Badge variant="outline" className="font-semibold">
                              {question.externalId}
                            </Badge>
                            {(question.libraryShortName || question.libraryCode) && (
                              <Badge variant="secondary" className="text-xs">
                                {question.libraryShortName || question.libraryCode}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                            {question.category && (
                              <Badge variant="outline" className="text-xs">
                                {question.category}
                              </Badge>
                            )}
                            {question.subSection && (
                              <Badge variant="outline" className="text-xs">
                                章节 {question.subSection}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {questionTypeLabel}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              难度：{difficultyLabel}
                            </Badge>
                            {question.hasImage && (
                              <Badge variant="outline" className="text-xs">
                                含图
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-sm leading-6 text-gray-900">{question.title}</p>
                        <div className="space-y-2">
                          {options.length === 0 ? (
                            <p className="text-xs text-gray-400">该题暂无选项数据。</p>
                          ) : (
                            options.map((option) => {
                              const isCorrect =
                                typeof option.id === 'string' &&
                                option.id.trim().toUpperCase() === 'A'
                              return (
                                <div
                                  key={`${question.id}-${option.id}`}
                                  className={`rounded-md border p-3 text-sm ${
                                    isCorrect
                                      ? 'border-green-200 bg-green-50 text-green-900'
                                      : 'border-slate-200 bg-white text-gray-800'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="font-semibold text-gray-900">
                                      {option.id || '选项'}.
                                    </div>
                                    {isCorrect && (
                                      <Badge variant="secondary" className="text-[11px]">
                                        预览正确
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="mt-1 text-[13px] leading-5 text-gray-700">
                                    {option.text || '（尚未提供内容）'}
                                  </p>
                                </div>
                              )
                            })
                          )}
                        </div>
                        {tagList.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {tagList.slice(0, 4).map((tag) => (
                              <Badge
                                key={`${question.id}-${tag}`}
                                variant="outline"
                                className="text-[11px] font-normal text-gray-600"
                              >
                                #{tag}
                              </Badge>
                            ))}
                            {tagList.length > 4 && (
                              <span className="text-[11px] text-gray-400">
                                +{tagList.length - 4}
                              </span>
                            )}
                          </div>
                        )}
                        {selectedLibraryCode && (
                          <div className="pt-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenInPractice(question.id)}
                            >
                              在练习中打开
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              <div className="flex flex-col gap-3 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  共 {pagination.total} 题，
                  {pagination.totalPages > 0 ? (
                    <>第 {pagination.page} / {pagination.totalPages} 页</>
                  ) : (
                    '暂无分页数据'
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={disablePrev}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={disableNext}
                  >
                    下一页
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

