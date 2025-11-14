'use client'

import { useRouter } from 'next/navigation'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  BookOpen,
  Shuffle,
  AlertCircle,
  Heart,
  GraduationCap,
  List,
  History,
  TrendingDown
} from 'lucide-react'

export default function PracticeModesPage() {
  const router = useRouter()

  const modes = [
    {
      id: 'sequential',
      name: '顺序练习',
      description: '按题库顺序逐题练习,系统学习所有知识点',
      icon: BookOpen,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      id: 'random',
      name: '随机练习',
      description: '随机抽取题目练习,增加练习趣味性',
      icon: Shuffle,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
    {
      id: 'error-rate',
      name: '错误率练习',
      description: '按错误率从高到低刷题,未做过的题优先',
      icon: TrendingDown,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
      path: '/practice/error-rate?type=A_CLASS',
    },
    {
      id: 'wrong',
      name: '错题练习',
      description: '专注练习答错的题目,针对性提高',
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
    },
    {
      id: 'favorite',
      name: '收藏练习',
      description: '练习收藏的重点题目,巩固关键知识',
      icon: Heart,
      color: 'text-pink-500',
      bgColor: 'bg-pink-50',
    },
  ]

  const handleModeSelect = (mode: any) => {
    if (mode.path) {
      router.push(mode.path)
    } else {
      router.push(`/practice?mode=${mode.id}&type=A_CLASS`)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">选择练习模式</h1>
        <p className="text-gray-600">
          选择适合你的练习方式,开始刷题之旅
        </p>
      </div>

      {/* 练习模式卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {modes.map((mode) => {
          const Icon = mode.icon
          return (
            <Card
              key={mode.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleModeSelect(mode)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${mode.bgColor}`}>
                    <Icon className={`h-6 w-6 ${mode.color}`} />
                  </div>
                  <div>
                    <CardTitle>{mode.name}</CardTitle>
                    <CardDescription>{mode.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )
        })}
      </div>

      {/* 其他功能 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/practice/history?type=A_CLASS')}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-indigo-50">
                <History className="h-6 w-6 text-indigo-500" />
              </div>
              <div>
                <CardTitle>已练习题</CardTitle>
                <CardDescription>回顾练习过的题目,巩固记忆</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/questions')}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-50">
                <List className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <CardTitle>题库预览</CardTitle>
                <CardDescription>浏览所有题目,按分类查看</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/exam')}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-orange-50">
                <GraduationCap className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <CardTitle>模拟考试</CardTitle>
                <CardDescription>真实考试环境,检验学习成果</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* 返回按钮 */}
      <div className="mt-6">
        <Button
          variant="outline"
          onClick={() => router.push('/')}
        >
          返回首页
        </Button>
      </div>
    </div>
  )
}

