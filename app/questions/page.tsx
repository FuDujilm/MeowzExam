'use client'

import { useState, useEffect } from 'react'
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
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'

interface Question {
  id: string
  uuid: string
  externalId: string
  type: string
  questionType: string
  difficulty: string
  category: string
  categoryCode: string
  subSection?: string
  title: string
  hasImage: boolean
  tags: string[]
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export default function QuestionsPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('A_CLASS')
  const { notify } = useNotification()

  // 加载题目列表
  const loadQuestions = async (page: number = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pagination.pageSize.toString(),
        type: typeFilter,
      })
      if (search) {
        params.append('search', search)
      }

      const response = await fetch(`/api/questions?${params}`)
      if (!response.ok) {
        throw new Error('加载失败')
      }

      const data = await response.json()
      setQuestions(data.questions)
      setPagination(data.pagination)
    } catch (error) {
      console.error('加载题目列表失败:', error)
      notify({
        variant: 'danger',
        title: '加载题目列表失败',
        description: '请检查网络连接或稍后再试。',
      })
    } finally {
      setLoading(false)
    }
  }

  // 初始加载
  useEffect(() => {
    loadQuestions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter])

  // 搜索
  const handleSearch = () => {
    loadQuestions(1)
  }

  // 翻页
  const handlePageChange = (newPage: number) => {
    loadQuestions(newPage)
  }

  // 查看题目详情
  const handleViewQuestion = (questionId: string) => {
    router.push(`/practice?mode=sequential&type=${typeFilter}&currentId=${questionId}`)
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      {/* 头部 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">题库预览</h1>
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            返回
          </Button>
        </div>

        {/* 筛选和搜索 */}
        <div className="flex flex-col md:flex-row gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="选择题库类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A_CLASS">A类题库</SelectItem>
              <SelectItem value="B_CLASS">B类题库</SelectItem>
              <SelectItem value="C_CLASS">C类题库</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1 flex gap-2">
            <Input
              placeholder="搜索题目..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 题目列表 */}
      {loading ? (
        <div className="text-center py-8">加载中...</div>
      ) : questions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            暂无题目
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3 mb-6">
            {questions.map((question) => (
              <Card
                key={question.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleViewQuestion(question.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <Badge variant="outline">{question.externalId}</Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {question.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {question.questionType === 'single_choice' && '单选'}
                          {question.questionType === 'multiple_choice' && '多选'}
                          {question.questionType === 'true_false' && '判断'}
                        </Badge>
                        {question.subSection && (
                          <span className="text-xs text-gray-500">
                            {question.subSection}
                          </span>
                        )}
                      </div>
                      <p className="text-sm line-clamp-2">{question.title}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 分页 */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              共 {pagination.total} 题,第 {pagination.page} / {pagination.totalPages} 页
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                下一页
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
