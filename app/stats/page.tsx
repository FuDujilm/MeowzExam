'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeft,
  Trophy,
  Target,
  TrendingUp,
  Calendar,
  Flame,
  Award,
  BookOpen
} from 'lucide-react'

export default function StatsPage() {
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [recentHistory, setRecentHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
    loadRecentHistory()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/user/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('加载统计失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRecentHistory = async () => {
    try {
      const response = await fetch('/api/user/points-history?limit=10')
      if (response.ok) {
        const data = await response.json()
        setRecentHistory(data.history)
      }
    } catch (error) {
      console.error('加载积分历史失败:', error)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-6xl p-4 min-h-screen flex items-center justify-center text-slate-600 dark:text-slate-300">
        加载中...
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl text-slate-900 dark:text-slate-100">
      {/* 头部 */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          返回
        </Button>

        <h1 className="text-3xl font-bold mb-2">详细统计</h1>
        <p className="text-gray-600 dark:text-slate-300">查看您的学习数据和积分记录</p>
      </div>

      {/* 主要统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-slate-900/70 dark:border-blue-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-slate-200 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              今日答题
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-200">
              {stats?.todayAnswered || 0}
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">题</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-emerald-950/40 dark:to-slate-900/70 dark:border-emerald-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-slate-200 flex items-center gap-2">
              <Target className="h-4 w-4" />
              累计答题
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-emerald-200">
              {stats?.totalAnswered || 0}
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">题</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-amber-900/40 dark:to-slate-900/70 dark:border-amber-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-slate-200 flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              当前积分
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600 dark:text-amber-200">
              {stats?.totalPoints || 0}
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{stats?.pointsName || '积分'}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-rose-950/40 dark:to-slate-900/70 dark:border-rose-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-slate-200 flex items-center gap-2">
              <Award className="h-4 w-4" />
              当前排名
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-pink-600 dark:text-rose-200">
              #{stats?.currentRank || '-'}
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">名</p>
          </CardContent>
        </Card>
      </div>

      {/* 学习数据 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              学习数据
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-900/60">
              <span className="text-sm text-gray-600 dark:text-slate-300">累计答题数</span>
              <span className="text-xl font-bold text-gray-900 dark:text-slate-100">
                {stats?.totalAnswered || 0} 题
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-900/60">
              <span className="text-sm text-gray-600 dark:text-slate-300">整体正确率</span>
              <span className="text-xl font-bold text-green-600 dark:text-emerald-300">
                {stats?.accuracy || 0}%
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-900/60">
              <span className="text-sm text-gray-600 dark:text-slate-300">模拟考试次数</span>
              <span className="text-xl font-bold text-orange-600 dark:text-orange-300">
                {stats?.examCount || 0} 次
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-900/60">
              <span className="text-sm text-gray-600 dark:text-slate-300 flex items-center gap-1">
                <Flame className="h-4 w-4 text-orange-500" />
                连续签到天数
              </span>
              <span className="text-xl font-bold text-orange-600 dark:text-orange-300">
                {stats?.currentStreak || 0} 天
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              最近积分记录
            </CardTitle>
            <CardDescription>显示最近10条积分变动</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {recentHistory.length > 0 ? (
                recentHistory.map((record: any) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-2 rounded border border-slate-100 bg-gray-50 dark:border-slate-800 dark:bg-slate-900/60"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{record.reason}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {new Date(record.createdAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <Badge
                      variant={record.points > 0 ? 'default' : 'destructive'}
                      className="ml-2"
                    >
                      {record.points > 0 ? '+' : ''}{record.points}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-500 dark:text-slate-400">
                  暂无积分记录
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 快捷操作 */}
      <Card>
        <CardHeader>
          <CardTitle>快捷操作</CardTitle>
          <CardDescription>快速访问常用功能</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={() => router.push('/practice?mode=sequential&type=A_CLASS')}
            >
              <BookOpen className="h-6 w-6 mb-2" />
              <span>开始练习</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={() => router.push('/exam?type=A_CLASS')}
            >
              <Award className="h-6 w-6 mb-2" />
              <span>模拟考试</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={() => router.push('/leaderboard')}
            >
              <Trophy className="h-6 w-6 mb-2" />
              <span>排行榜</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={() => router.push('/')}
            >
              <ChevronLeft className="h-6 w-6 mb-2" />
              <span>返回首页</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
