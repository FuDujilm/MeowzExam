'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

import { useSiteConfig } from '@/components/site/site-config-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useQuestionLibraries } from '@/lib/use-question-libraries'
import { useNotification } from '@/components/ui/notification-provider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertCircle,
  BookOpen,
  Flame,
  Gift,
  GraduationCap,
  Heart,
  History,
  List,
  Radio,
  Shuffle,
  TrendingDown,
  Trophy,
  CalendarCheck,
} from 'lucide-react'

interface CheckInStatus {
  hasCheckedIn: boolean
  currentStreak: number
  totalPoints: number
}

interface UserStats {
  todayAnswered: number
  totalAnswered: number
  examCount: number
  accuracy: number
  totalPoints: number
  pointsName?: string
  currentRank?: number
}

interface DailyPracticeStatus {
  target: number
  today?: {
    count: number
    completed: boolean
    remaining: number
    rewardPoints: number
  }
}

const HERO_FEATURES = [
  {
    title: '全面题库',
    description: '涵盖 A/B/C 类全部考试题目，实时更新。',
  },
  {
    title: '智能练习',
    description: '错题本、模拟考试、AI 解析助您高效学习。',
  },
  {
    title: '完全免费',
    description: '公益项目，助力业余无线电爱好者。',
  },
]

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { notify } = useNotification()
  const { config } = useSiteConfig()

  const { libraries, loading: libraryLoading, error: libraryError } = useQuestionLibraries()
  const [selectedLibraryCode, setSelectedLibraryCode] = useState<string | null>(null)
  const [checkInStatus, setCheckInStatus] = useState<CheckInStatus | null>(null)
  const [checkingIn, setCheckingIn] = useState(false)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [dailyStatus, setDailyStatus] = useState<DailyPracticeStatus | null>(null)
  const [libraryStats, setLibraryStats] = useState<{ browsedCount: number } | null>(null)

  const loading = status === 'loading'
  const isAuthenticated = Boolean(session?.user)

  // 从 localStorage 恢复上次选择的题库
  useEffect(() => {
    if (!libraryLoading && libraries.length) {
      const savedCode = localStorage.getItem('selectedLibraryCode')
      const isValidCode = savedCode && libraries.some((lib) => lib.code === savedCode)
      setSelectedLibraryCode(isValidCode ? savedCode : libraries[0].code)
    }
    if (!libraryLoading && libraries.length === 0) {
      setSelectedLibraryCode(null)
    }
  }, [libraries, libraryLoading])

  // 保存选择的题库到 localStorage
  useEffect(() => {
    if (selectedLibraryCode) {
      localStorage.setItem('selectedLibraryCode', selectedLibraryCode)
      // 加载题库统计
      if (isAuthenticated) {
        fetch(`/api/user/library-stats?code=${selectedLibraryCode}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.browsedCount !== undefined) {
              setLibraryStats(data)
            }
          })
          .catch((err) => console.error('加载题库统计失败:', err))
      }
    }
  }, [selectedLibraryCode, isAuthenticated])

  const selectedLibrary = useMemo(
    () => libraries.find((library) => library.code === selectedLibraryCode) ?? null,
    [libraries, selectedLibraryCode],
  )

  const activeLibraryCode = selectedLibrary?.code ?? ''

  const primaryPreset = useMemo(
    () => selectedLibrary?.presets?.[0] ?? null,
    [selectedLibrary],
  )

  useEffect(() => {
    if (!session?.user) {
      return
    }

    const load = async () => {
      await Promise.allSettled([loadCheckInStatus(), loadUserStats(), loadDailyStatus()])
    }

    load()
  }, [session])

  const loadUserStats = async () => {
    try {
      const response = await fetch('/api/user/stats')
      if (response.ok) {
        const data = (await response.json()) as UserStats
        setUserStats(data)
      }
    } catch (error) {
      console.error('加载用户统计失败:', error)
    }
  }

  const loadDailyStatus = async () => {
    try {
      const response = await fetch('/api/daily-practice/status?days=1', { cache: 'no-store' })
      if (response.ok) {
        const data = (await response.json()) as DailyPracticeStatus
        setDailyStatus(data)
      }
    } catch (error) {
      console.error('加载每日练习状态失败:', error)
    }
  }

  const loadCheckInStatus = async () => {
    try {
      const response = await fetch('/api/points/checkin')
      if (response.ok) {
        const data = (await response.json()) as CheckInStatus
        setCheckInStatus(data)
      }
    } catch (error) {
      console.error('加载签到状态失败:', error)
    }
  }

  const handleCheckIn = async () => {
    if (checkingIn || checkInStatus?.hasCheckedIn) {
      return
    }

    try {
      setCheckingIn(true)
      const response = await fetch('/api/points/checkin', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()

        notify({
          variant: 'success',
          title: '签到成功',
          description: (
            <div className="space-y-1 text-sm">
              <p>获得积分：{data.points}</p>
              {data.bonusPoints > 0 && (
                <p>
                  {data.bonusReason}：{data.bonusPoints}
                </p>
              )}
              <p>连续签到：{data.streak} 天</p>
              <p>当前总积分：{data.totalPoints}</p>
            </div>
          ),
        })

        await Promise.allSettled([loadCheckInStatus(), loadUserStats()])
      } else {
        const error = await response.json()
        notify({
          variant: 'warning',
          title: '签到失败',
          description: error.error || '请稍后再试',
        })
      }
    } catch (error) {
      console.error('签到失败:', error)
      notify({
        variant: 'danger',
        title: '签到失败',
        description: '网络或服务器异常，请稍后再试',
      })
    } finally {
      setCheckingIn(false)
    }
  }

  const practiceModesRow1 = useMemo(
    () => [
      {
        id: 'sequential',
        name: '顺序练习',
        description: '按题库顺序逐题练习',
        icon: BookOpen,
        color: 'text-blue-500 dark:text-blue-200',
        bgColor: 'bg-blue-50 dark:bg-blue-500/20',
        path: activeLibraryCode ? `/practice?mode=sequential&type=${activeLibraryCode}` : '',
        enabled: Boolean(activeLibraryCode),
      },
      {
        id: 'random',
        name: '随机练习',
        description: '随机抽取题目练习',
        icon: Shuffle,
        color: 'text-purple-500 dark:text-purple-200',
        bgColor: 'bg-purple-50 dark:bg-purple-500/20',
        path: activeLibraryCode ? `/practice?mode=random&type=${activeLibraryCode}` : '',
        enabled: Boolean(activeLibraryCode),
      },
      {
        id: 'error-rate',
        name: '错误率练习',
        description: '按错误率从高到低刷题',
        icon: TrendingDown,
        color: 'text-orange-500 dark:text-orange-200',
        bgColor: 'bg-orange-50 dark:bg-orange-500/20',
        path: activeLibraryCode ? `/practice/error-rate?type=${activeLibraryCode}` : '',
        enabled: Boolean(activeLibraryCode),
      },
    ],
    [activeLibraryCode],
  )

  const practiceModesRow2 = useMemo(
    () => [
      {
        id: 'wrong',
        name: '错题练习',
        description: '专注练习答错的题目',
        icon: AlertCircle,
        color: 'text-red-500 dark:text-rose-200',
        bgColor: 'bg-red-50 dark:bg-rose-500/20',
        path: activeLibraryCode ? `/practice?mode=wrong&type=${activeLibraryCode}` : '',
        enabled: Boolean(activeLibraryCode),
      },
      {
        id: 'daily',
        name: '每日练习',
        description: dailyStatus
          ? dailyStatus.today?.completed
            ? '今日任务已完成，可查看奖励'
            : `今日进度 ${dailyStatus.today?.count ?? 0}/${dailyStatus.target ?? 10}`
          : '每天十题打卡赢积分',
        icon: CalendarCheck,
        color: 'text-emerald-500 dark:text-emerald-200',
        bgColor: 'bg-emerald-50 dark:bg-emerald-500/20',
        path: activeLibraryCode ? `/practice?mode=daily&type=${activeLibraryCode}` : '',
        enabled: Boolean(activeLibraryCode),
      },
      {
        id: 'favorite',
        name: '收藏练习',
        description: '练习收藏的重点题目',
        icon: Heart,
        color: 'text-pink-500 dark:text-pink-200',
        bgColor: 'bg-pink-50 dark:bg-pink-500/20',
        path: activeLibraryCode ? `/practice?mode=favorite&type=${activeLibraryCode}` : '',
        enabled: Boolean(activeLibraryCode),
      },
      {
        id: 'history',
        name: '已练习题',
        description: '回顾练习过的题目',
        icon: History,
        color: 'text-indigo-500 dark:text-indigo-200',
        bgColor: 'bg-indigo-50 dark:bg-indigo-500/20',
        path: activeLibraryCode ? `/practice/history?type=${activeLibraryCode}` : '',
        enabled: Boolean(activeLibraryCode),
      },
    ],
    [activeLibraryCode, dailyStatus],
  )

  const otherFeatures = useMemo(
    () => [
      {
        id: 'questions',
        name: '题库预览',
        description: '浏览所有题目，按分类查找',
        icon: List,
        color: 'text-green-500 dark:text-emerald-200',
        bgColor: 'bg-green-50 dark:bg-emerald-500/20',
        path: '/questions',
      },
      {
        id: 'exam',
        name: '模拟考试',
        description: '真实考试环境，检验学习成果',
        icon: GraduationCap,
        color: 'text-orange-600 dark:text-orange-200',
        bgColor: 'bg-orange-50 dark:bg-orange-500/20',
        path: activeLibraryCode ? `/exam?type=${activeLibraryCode}` : '',
        enabled: Boolean(activeLibraryCode),
      },
      {
        id: 'leaderboard',
        name: '积分排行榜',
        description: '查看全站积分排名',
        icon: Trophy,
        color: 'text-yellow-600 dark:text-amber-200',
        bgColor: 'bg-yellow-50 dark:bg-amber-500/20',
        path: '/leaderboard',
      },
      {
        id: 'daily-practice',
        name: '每日打卡日历',
        description: '查看近一个月的打卡记录',
        icon: CalendarCheck,
        color: 'text-emerald-600 dark:text-emerald-200',
        bgColor: 'bg-emerald-50 dark:bg-emerald-500/20',
        path: '/daily-practice',
      },
    ],
    [activeLibraryCode],
  )

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-gray-500">加载中...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {isAuthenticated ? (
          <div className="space-y-8">
            <section className="text-center">
              <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">开始练习</h2>
              <div className="flex flex-col items-center justify-center gap-3 md:flex-row">
                <label className="text-lg text-gray-700 dark:text-gray-300" htmlFor="practice-type">
                  选择训练目标：
                </label>
                <Select
                  value={selectedLibraryCode ?? undefined}
                  onValueChange={(value) => setSelectedLibraryCode(value)}
                  disabled={libraryLoading || libraries.length === 0}
                >
                  <SelectTrigger id="practice-type" className="w-[320px]">
                    <SelectValue
                      placeholder={libraryLoading ? '正在加载题库…' : '请选择可用题库'}
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
                {!libraryLoading && libraries.length === 0 && (
                  <p className="mt-2 text-sm text-gray-500">
                    当前无可用题库，请联系管理员。
                  </p>
                )}
                {libraryError && (
                  <p className="mt-2 text-sm text-red-500">
                    题库加载失败：{libraryError}
                  </p>
                )}
              </div>
            </section>

            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Radio className="h-5 w-5" />
                  {selectedLibrary
                    ? primaryPreset?.name ?? `${selectedLibrary.name} 模拟考试`
                    : '请选择题库后开始模拟考试'}
                </CardTitle>
                <CardDescription className="text-base text-gray-700 dark:text-gray-200">
                  {selectedLibrary
                    ? primaryPreset
                      ? primaryPreset.description ??
                        `考试 ${primaryPreset.totalQuestions} 题 · ${primaryPreset.durationMinutes} 分钟 · ${primaryPreset.passScore} 分及格，其中单选 ${primaryPreset.singleChoiceCount} 题，多选 ${primaryPreset.multipleChoiceCount} 题${primaryPreset.trueFalseCount ? `，判断 ${primaryPreset.trueFalseCount} 题` : ''}。题库共 ${selectedLibrary.totalQuestions} 题。`
                      : `题库共 ${selectedLibrary.totalQuestions} 道题，尚未配置考试预设。`
                    : '导入题库后可查看对应的考试预设与题量统计。'}
                </CardDescription>
                {selectedLibrary && libraryStats && (
                  <div className="mt-4 space-y-2 w-full">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">学习进度</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {libraryStats.browsedCount} / {selectedLibrary.totalQuestions} ({Math.round((libraryStats.browsedCount / (selectedLibrary.totalQuestions || 1)) * 100)}%)
                      </span>
                    </div>
                    <Progress value={(libraryStats.browsedCount / (selectedLibrary.totalQuestions || 1)) * 100} className="h-2 bg-blue-200/50 dark:bg-blue-950/50" />
                  </div>
                )}
              </CardHeader>
            </Card>

            <section>
              <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">练习模式</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[practiceModesRow1, practiceModesRow2].flat().map((mode) => {
                  const Icon = mode.icon
                  const isEnabled = Boolean(mode.enabled && mode.path)
                  return (
                    <Card
                      key={mode.id}
                      className={`transition-shadow dark:border-slate-700/60 dark:bg-slate-900/40 ${
                        isEnabled
                          ? 'cursor-pointer hover:shadow-lg'
                          : 'cursor-not-allowed opacity-60 bg-gray-100 dark:bg-slate-800/50'
                      }`}
                      onClick={isEnabled ? () => router.push(mode.path as string) : undefined}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className={`rounded-lg p-3 ${mode.bgColor}`}>
                            <Icon className={`h-6 w-6 ${mode.color}`} />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{mode.name}</CardTitle>
                            <CardDescription>
                              {mode.description}
                              {!isEnabled && '（请选择题库后使用）'}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  )
                })}
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">其他功能</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card
                  className={
                    checkInStatus?.hasCheckedIn
                      ? 'cursor-not-allowed bg-gray-100 dark:bg-slate-800/70 dark:border-slate-700/60'
                      : 'cursor-pointer bg-gradient-to-br from-blue-50 to-indigo-50 transition-shadow hover:shadow-lg dark:from-sky-500/10 dark:to-indigo-500/10 dark:border-slate-700/60'
                  }
                  onClick={!checkInStatus?.hasCheckedIn ? handleCheckIn : undefined}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-500/20">
                        <Gift className="h-6 w-6 text-blue-600 dark:text-blue-200" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg dark:text-gray-50">每日签到</CardTitle>
                        <CardDescription>
                          {checkInStatus?.hasCheckedIn ? '今日已签到' : checkingIn ? '签到中…' : '点击签到获得积分'}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  {checkInStatus && (
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-orange-600 dark:text-amber-300">
                          <Flame className="h-4 w-4" />
                          <span>连续 {checkInStatus.currentStreak} 天</span>
                        </div>
                        <div className="font-semibold text-blue-600 dark:text-blue-200">
                          {checkInStatus.totalPoints} 积分
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>


                {otherFeatures.map((feature) => {
                  const Icon = feature.icon
                  const isEnabled = feature.enabled !== false
                  return (
                    <Card
                      key={feature.id}
                      className={`transition-shadow dark:border-slate-700/60 dark:bg-slate-900/40 ${
                        isEnabled
                          ? 'cursor-pointer hover:shadow-lg'
                          : 'cursor-not-allowed opacity-60 bg-gray-100 dark:bg-slate-800/50'
                      }`}
                      onClick={isEnabled ? () => router.push(feature.path) : undefined}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className={`rounded-lg p-3 ${feature.bgColor}`}>
                            <Icon className={`h-6 w-6 ${feature.color}`} />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{feature.name}</CardTitle>
                            <CardDescription>
                              {feature.description}
                              {!isEnabled && feature.id === 'exam' && '（请选择题库后使用）'}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  )
                })}
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">学习统计</h3>
              <Card>
                <CardHeader>
                  <CardTitle>学习进度</CardTitle>
                  <CardDescription>查看您的练习统计和考试成绩</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                    <StatCard label="今日答题" value={userStats?.todayAnswered ?? 0} className="bg-blue-50 dark:bg-blue-500/20" />
                    <StatCard label="累计答题" value={userStats?.totalAnswered ?? 0} className="bg-green-50 dark:bg-emerald-500/20" />
                    <StatCard label="模拟考试" value={userStats?.examCount ?? 0} className="bg-orange-50 dark:bg-orange-500/20" />
                    <StatCard label="正确率" value={`${userStats?.accuracy ?? 0}%`} className="bg-purple-50 dark:bg-purple-500/20" />
                    <StatCard
                      label={userStats?.pointsName || '积分'}
                      value={userStats?.totalPoints ?? 0}
                      className="bg-yellow-50 dark:bg-amber-500/20"
                    />
                    <StatCard label="当前排名" value={`#${userStats?.currentRank ?? '-'}`} className="bg-pink-50 dark:bg-pink-500/20" />
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => router.push('/stats')}>
                    查看详细统计
                  </Button>
                </CardContent>
              </Card>
            </section>
          </div>
        ) : (
          <section className="space-y-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3">
                {config.logoUrl ? (
                  <span className="relative h-12 w-12 overflow-hidden rounded-full border border-blue-200 bg-blue-50 dark:bg-blue-500/20 dark:border-gray-700 dark:bg-gray-900">
                    <Image
                      src={config.logoUrl}
                      alt={config.siteTitle}
                      fill
                      sizes="48px"
                      className="object-contain"
                      unoptimized
                    />
                  </span>
                ) : (
                  <Radio className="h-12 w-12 text-blue-600 dark:text-blue-200" />
                )}
                <h2 className="text-4xl font-bold text-gray-900 dark:text-white">{config.siteTitle}</h2>
              </div>
              <p className="text-xl text-gray-600 dark:text-gray-300">{config.siteDescription}</p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {HERO_FEATURES.map((feature) => (
                <div key={feature.title} className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
                  <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
                </div>
              ))}
            </div>
            <Link href="/login">
              <Button size="lg" className="px-8 py-3">
                立即开始练习
              </Button>
            </Link>
          </section>
        )}
      </main>
    </div>
  )
}

function StatCard({
  label,
  value,
  className,
}: {
  label: string
  value: string | number
  className?: string
}) {
  return (
    <div className={`rounded-lg p-4 text-center ${className ?? ''}`}>
      <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
      <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">{label}</div>
    </div>
  )
}
