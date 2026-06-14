'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  Gift,
  GraduationCap,
  Heart,
  History,
  List,
  Shuffle,
  TrendingDown,
  Trophy,
  CalendarCheck,
  Settings,
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

type ModuleConfig = {
  id: string
  name: string
  description: string
  icon: typeof BookOpen
  color: string
  bgColor: string
  path: string
  enabled?: boolean
  disabledText?: string
}

const GUEST_GUIDE_STORAGE_KEY = 'meowz_guest_register_guide_seen'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { notify } = useNotification()

  const { libraries, loading: libraryLoading, error: libraryError } = useQuestionLibraries()
  const [selectedLibraryCode, setSelectedLibraryCode] = useState<string | null>(null)
  const [checkInStatus, setCheckInStatus] = useState<CheckInStatus | null>(null)
  const [checkingIn, setCheckingIn] = useState(false)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [dailyStatus, setDailyStatus] = useState<DailyPracticeStatus | null>(null)
  const [libraryStats, setLibraryStats] = useState<{
    browsedCount: number
    totalQuestions?: number
    isCompleted?: boolean
  } | null>(null)
  const [guestGuideOpen, setGuestGuideOpen] = useState(false)
  const [migrationCodeLoading, setMigrationCodeLoading] = useState(false)

  const loading = status === 'loading'

  useEffect(() => {
    if (status !== 'unauthenticated') return
    const hasSeen = localStorage.getItem(GUEST_GUIDE_STORAGE_KEY) === '1'
    if (!hasSeen) {
      setGuestGuideOpen(true)
    }
  }, [status])

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
      fetch(`/api/user/library-stats?code=${selectedLibraryCode}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.browsedCount !== undefined) {
            setLibraryStats(data)
          }
        })
        .catch((err) => console.error('加载题库统计失败:', err))
    }
  }, [selectedLibraryCode])

  const selectedLibrary = useMemo(
    () => libraries.find((library) => library.code === selectedLibraryCode) ?? null,
    [libraries, selectedLibraryCode],
  )

  const activeLibraryCode = selectedLibrary?.code ?? ''
  const resolvedTotalQuestions = libraryStats?.totalQuestions ?? selectedLibrary?.totalQuestions ?? 0
  const libraryCompleted = Boolean(
    libraryStats?.isCompleted ||
      (
        resolvedTotalQuestions > 0 &&
        libraryStats &&
        libraryStats.browsedCount >= resolvedTotalQuestions
      ),
  )

  const primaryPreset = useMemo(
    () => selectedLibrary?.presets?.[0] ?? null,
    [selectedLibrary],
  )

  useEffect(() => {
    if (status === 'loading') return

    const load = async () => {
      const tasks = [loadUserStats(), loadDailyStatus()]
      if (session?.user) {
        tasks.push(loadCheckInStatus())
      }
      await Promise.allSettled(tasks)
    }

    load()
  }, [session, status])

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
    if (!session?.user) {
      notify({
        variant: 'warning',
        title: '匿名模式不可签到',
        description: '练习和考试可直接使用；签到积分需要注册账号。',
      })
      return
    }

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

  const closeGuestGuide = () => {
    localStorage.setItem(GUEST_GUIDE_STORAGE_KEY, '1')
    setGuestGuideOpen(false)
  }

  const createMigrationCode = async () => {
    setMigrationCodeLoading(true)
    try {
      const response = await fetch('/api/guest/migration-code', { method: 'POST' })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || '生成迁移码失败')
      }
      notify({
        variant: 'success',
        title: `迁移码：${data.code}`,
        description: '注册后首次进入系统时输入该代码即可合并匿名数据。',
      })
      closeGuestGuide()
    } catch (error: unknown) {
      notify({
        variant: 'danger',
        title: '生成迁移码失败',
        description: error instanceof Error ? error.message : '请稍后再试。',
      })
    } finally {
      setMigrationCodeLoading(false)
    }
  }

  const practiceModesRow1 = useMemo<ModuleConfig[]>(
    () => [
      {
        id: 'sequential',
        name: '顺序练习',
        description: libraryCompleted ? '当前题库已练完，点击查看历史' : '按题库顺序逐题练习',
        icon: BookOpen,
        color: 'text-blue-500 dark:text-blue-200',
        bgColor: 'bg-blue-50 dark:bg-blue-500/20',
        path: activeLibraryCode ? `/practice?mode=sequential&type=${activeLibraryCode}` : '',
        enabled: Boolean(activeLibraryCode && !libraryCompleted),
        disabledText: libraryCompleted ? '当前题库已练完，请到已练习题复盘' : '请选择题库后使用',
      },
      {
        id: 'random',
        name: '随机练习',
        description: libraryCompleted ? '当前题库已练完，点击查看历史' : '随机抽取题目练习',
        icon: Shuffle,
        color: 'text-purple-500 dark:text-purple-200',
        bgColor: 'bg-purple-50 dark:bg-purple-500/20',
        path: activeLibraryCode ? `/practice?mode=random&type=${activeLibraryCode}` : '',
        enabled: Boolean(activeLibraryCode && !libraryCompleted),
        disabledText: libraryCompleted ? '当前题库已练完，请到已练习题复盘' : '请选择题库后使用',
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
    [activeLibraryCode, libraryCompleted],
  )

  const practiceModesRow2 = useMemo<ModuleConfig[]>(
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

  const otherFeatures = useMemo<ModuleConfig[]>(
    () => [
      {
        id: 'questions',
        name: '题库预览',
        description: '浏览所有题目，按分类查找',
        icon: List,
        color: 'text-green-500 dark:text-emerald-200',
        bgColor: 'bg-green-50 dark:bg-emerald-500/20',
        path: activeLibraryCode ? `/questions?library=${activeLibraryCode}` : '/questions',
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
        id: 'settings',
        name: '练习设置',
        description: '错题权重、每日目标、考试偏好',
        icon: Settings,
        color: 'text-slate-600 dark:text-slate-200',
        bgColor: 'bg-slate-100 dark:bg-slate-700/60',
        path: '/settings',
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
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">功能模块</h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  基础练习、考试和错题记录可匿名使用；解析与后台功能需要注册账号。
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="practice-type">
                  当前题库
                </label>
                <Select
                  value={selectedLibraryCode ?? ''}
                  onValueChange={(value) => setSelectedLibraryCode(value)}
                  disabled={libraryLoading || libraries.length === 0}
                >
                  <SelectTrigger id="practice-type" className="w-full sm:w-[320px]">
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
              </div>
            </div>
            {!libraryLoading && libraries.length === 0 && (
              <p className="mt-4 text-sm text-gray-500">当前无可用题库，请联系管理员。</p>
            )}
            {libraryError && (
              <p className="mt-4 text-sm text-red-500">题库加载失败：{libraryError}</p>
            )}
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <Card className="dark:border-slate-800 dark:bg-slate-900">
              <CardHeader>
                <CardTitle>{selectedLibrary?.name ?? '请选择题库'}</CardTitle>
                <CardDescription>
                  {selectedLibrary
                    ? `${selectedLibrary.totalQuestions} 题 · 单选 ${selectedLibrary.singleChoiceCount} · 多选 ${selectedLibrary.multipleChoiceCount} · 判断 ${selectedLibrary.trueFalseCount}`
                    : '导入题库后可开始练习。'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedLibrary && libraryStats ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-300">学习进度</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {libraryStats.browsedCount} / {resolvedTotalQuestions}
                      </span>
                    </div>
                    <Progress value={(libraryStats.browsedCount / (resolvedTotalQuestions || 1)) * 100} className="h-2" />
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">暂无进度数据。</p>
                )}
              </CardContent>
            </Card>
            <Card className="dark:border-slate-800 dark:bg-slate-900">
              <CardHeader>
                <CardTitle>{primaryPreset?.name ?? '模拟考试'}</CardTitle>
                <CardDescription>
                  {primaryPreset
                    ? `${primaryPreset.totalQuestions} 题 · ${primaryPreset.durationMinutes} 分钟 · ${primaryPreset.passScore} 分合格`
                    : '当前题库尚未配置考试预设。'}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3">
                <StatCard label="今日答题" value={userStats?.todayAnswered ?? 0} className="bg-blue-50 dark:bg-blue-500/20" />
                <StatCard label="累计答题" value={userStats?.totalAnswered ?? 0} className="bg-green-50 dark:bg-emerald-500/20" />
                <StatCard label="正确率" value={`${userStats?.accuracy ?? 0}%`} className="bg-purple-50 dark:bg-purple-500/20" />
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">练习模式</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[practiceModesRow1, practiceModesRow2].flat().map((mode) => {
                const Icon = mode.icon
                const isEnabled = Boolean(mode.enabled && mode.path)
                return (
                  <ModuleCard
                    key={mode.id}
                    title={mode.name}
                    description={mode.description}
                    icon={Icon}
                    iconClassName={mode.color}
                    iconWrapClassName={mode.bgColor}
                    enabled={isEnabled}
                    disabledText={mode.disabledText ?? '请选择题库后使用'}
                    onClick={isEnabled ? () => router.push(mode.path as string) : undefined}
                  />
                )
              })}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">功能模块</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <ModuleCard
                title="每日签到"
                description={
                  session?.user
                    ? checkInStatus?.hasCheckedIn
                      ? '今日已签到'
                      : checkingIn
                        ? '签到中...'
                        : '点击签到获得积分'
                    : '注册账号后可签到积分'
                }
                icon={Gift}
                iconClassName="text-blue-600 dark:text-blue-200"
                iconWrapClassName="bg-blue-100 dark:bg-blue-500/20"
                enabled={Boolean(session?.user && !checkInStatus?.hasCheckedIn)}
                onClick={handleCheckIn}
              />
              {otherFeatures.map((feature) => {
                const Icon = feature.icon
                const isEnabled = feature.enabled !== false
                return (
                  <ModuleCard
                    key={feature.id}
                    title={feature.name}
                    description={feature.description}
                    icon={Icon}
                    iconClassName={feature.color}
                    iconWrapClassName={feature.bgColor}
                    enabled={isEnabled}
                    disabledText={feature.id === 'exam' ? '请选择题库后使用' : undefined}
                    onClick={isEnabled ? () => router.push(feature.path) : undefined}
                  />
                )
              })}
            </div>
          </section>

          <GuestRegisterGuide
            open={guestGuideOpen}
            loading={migrationCodeLoading}
            onContinue={closeGuestGuide}
            onCreateMigrationCode={createMigrationCode}
          />
        </div>
      </main>
    </div>
  )
}

function ModuleCard({
  title,
  description,
  icon: Icon,
  iconClassName,
  iconWrapClassName,
  enabled,
  disabledText,
  onClick,
}: {
  title: string
  description: string
  icon: typeof BookOpen
  iconClassName: string
  iconWrapClassName: string
  enabled: boolean
  disabledText?: string
  onClick?: () => void
}) {
  return (
    <Card
      className={`transition-shadow dark:border-slate-700/60 dark:bg-slate-900/40 ${
        enabled
          ? 'cursor-pointer hover:shadow-lg'
          : 'cursor-not-allowed opacity-70 bg-gray-100 dark:bg-slate-800/50'
      }`}
      onClick={enabled ? onClick : undefined}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-3 ${iconWrapClassName}`}>
            <Icon className={`h-6 w-6 ${iconClassName}`} />
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>
              {description}
              {!enabled && disabledText ? `（${disabledText}）` : ''}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}

function GuestRegisterGuide({
  open,
  loading,
  onContinue,
  onCreateMigrationCode,
}: {
  open: boolean
  loading: boolean
  onContinue: () => void
  onCreateMigrationCode: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onContinue()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>匿名使用已开启</DialogTitle>
          <DialogDescription>
            你可以直接练习、考试和保存错题。注册账号后，可用迁移码把匿名数据合并到账号。
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          解析、投票、签到积分和后台管理需要注册账号；基础刷题功能不受影响。
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCreateMigrationCode} disabled={loading}>
            {loading ? '生成中...' : '生成迁移码'}
          </Button>
          <Button onClick={onContinue}>继续匿名使用</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
