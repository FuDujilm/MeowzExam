'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { CalendarCheck, Loader2 } from 'lucide-react'
import { useQuestionLibraries } from '@/lib/use-question-libraries'

interface DailyRecord {
  id: string
  date: string
  questionCount: number
  completed: boolean
  rewardPoints: number
}

interface DailyStatusResponse {
  target: number
  today: {
    count: number
    completed: boolean
    remaining: number
    rewardPoints: number
  }
  streak: number
  nextReward: number
  records: DailyRecord[]
}

const DAY_MS = 24 * 60 * 60 * 1000
const CALENDAR_DAYS = 28

function buildCalendar(records: DailyRecord[]) {
  const today = new Date()
  const start = new Date(today.getTime() - (CALENDAR_DAYS - 1) * DAY_MS)
  const recordMap = new Map(records.map((item) => [item.date, item]))
  const days = []

  for (let i = 0; i < CALENDAR_DAYS; i++) {
    const current = new Date(start.getTime() + i * DAY_MS)
    const year = current.getUTCFullYear()
    const month = `${current.getUTCMonth() + 1}`.padStart(2, '0')
    const day = `${current.getUTCDate()}`.padStart(2, '0')
    const key = `${year}-${month}-${day}`

    days.push({
      date: key,
      label: `${month}/${day}`,
      record: recordMap.get(key),
      isToday: key === `${today.getUTCFullYear()}-${`${today.getUTCMonth() + 1}`.padStart(2, '0')}-${`${today.getUTCDate()}`.padStart(2, '0')}`,
    })
  }

  return days
}

export default function DailyPracticePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<DailyStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { libraries, loading: librariesLoading } = useQuestionLibraries()
  const [libraryCode, setLibraryCode] = useState<string | null>(searchParams.get('type'))

  const queryLibrary = searchParams.get('type')

  useEffect(() => {
    if (queryLibrary) {
      setLibraryCode(queryLibrary)
    }
  }, [queryLibrary])

  useEffect(() => {
    if (!libraryCode && !librariesLoading && libraries.length > 0) {
      setLibraryCode(libraries[0].code)
    }
  }, [libraryCode, librariesLoading, libraries])

  const resolvedLibraryCode =
    libraryCode ??
    (libraries.length > 0 ? libraries[0].code : 'A_CLASS')

  useEffect(() => {
    const loadStatus = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/daily-practice/status?days=60', { cache: 'no-store' })
        if (!res.ok) {
          const payload = await res.json().catch(() => null)
          throw new Error(payload?.error || '无法获取每日练习状态')
        }
        const data = await res.json()
        setStatus(data)
      } catch (err) {
        console.error('daily practice page error:', err)
        setError(err instanceof Error ? err.message : '加载失败')
      } finally {
        setLoading(false)
      }
    }

    loadStatus()
  }, [])

  const calendarDays = useMemo(() => buildCalendar(status?.records ?? []), [status])

  return (
    <div className="container mx-auto max-w-5xl p-4 text-slate-900 dark:text-slate-100">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">每日练习</h1>
          <p className="text-slate-600 dark:text-slate-400">坚持每日十练，积少成多，领取逐日递增的积分奖励。</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={resolvedLibraryCode}
            onValueChange={(value) => setLibraryCode(value)}
            disabled={librariesLoading || libraries.length === 0}
          >
            <SelectTrigger className="min-w-[220px]">
              <SelectValue placeholder="选择练习题库" />
            </SelectTrigger>
            <SelectContent>
              {libraries.map((library) => (
                <SelectItem key={library.code} value={library.code}>
                  {library.displayLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button
              onClick={() =>
                router.push(
                  `/practice?mode=daily&type=${encodeURIComponent(resolvedLibraryCode)}`,
                )
              }
              className="flex items-center gap-2"
              disabled={
                librariesLoading ||
                loading ||
                (status?.today?.completed ?? false) ||
                (!resolvedLibraryCode && libraries.length === 0)
              }
            >
              <CalendarCheck className="h-4 w-4" />
              {status?.today?.completed ? '今日任务已完成' : '开始今日练习'}
            </Button>
            <Button variant="outline" onClick={() => router.push('/')}>
              返回首页
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            正在加载每日练习统计...
          </div>
        </div>
      ) : error ? (
        <Card className="border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/20">
          <CardHeader>
            <CardTitle>无法获取每日练习状态</CardTitle>
            <CardDescription className="text-red-700 dark:text-red-200">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.refresh()}>重新加载</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="border-green-200 bg-green-50 dark:border-emerald-500/40 dark:bg-emerald-500/15">
              <CardHeader>
                <CardTitle>今日进度</CardTitle>
                <CardDescription>完成目标即可获得积分奖励</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-green-700 dark:text-emerald-100">
                  {status?.today?.count ?? 0}/{status?.target ?? 10}
                </p>
                <p className="text-sm text-green-700 dark:text-emerald-200">
                  {status?.today?.completed
                    ? `已打卡，奖励 +${status?.today?.rewardPoints ?? 0} 积分`
                    : `还差 ${status ? Math.max(status.target - status.today.count, 0) : 0} 题即可完成`}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>连续天数</CardTitle>
                <CardDescription>每连续七天一轮，奖励逐步提高</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{status?.streak ?? 0} 天</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  下一天奖励：{status?.nextReward ?? 5} 积分
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>今日状态</CardTitle>
                <CardDescription>坚持完成今日十练即可解锁奖励</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p>目标题量：{status?.target ?? 10} 题</p>
                  <p>今日已答：{status?.today?.count ?? 0} 题</p>
                  <p>
                    状态：
                    {status?.today?.completed ? (
                      <span className="text-green-600 dark:text-emerald-300">已完成</span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-300">进行中</span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>打卡日历</CardTitle>
              <CardDescription>最近四周每日练习记录，绿色代表完成、橙色代表部分完成、灰色代表未练习</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day) => {
                  const completed = day.record?.completed
                  const partial = !completed && day.record && day.record.questionCount > 0
                  return (
                    <div
                      key={day.date}
                      className={cn(
                        'rounded-lg border p-2 text-center text-xs transition',
                        completed
                          ? 'border-green-200 bg-green-50 text-green-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-100'
                          : partial
                          ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100'
                          : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400',
                        day.isToday ? 'ring-2 ring-blue-400 dark:ring-blue-500' : '',
                      )}
                    >
                      <div className="font-semibold">{day.label}</div>
                      {completed ? (
                        <div className="text-[10px]">+{day.record?.rewardPoints ?? 0} 积分</div>
                      ) : partial ? (
                        <div className="text-[10px]">{day.record?.questionCount ?? 0} 题</div>
                      ) : (
                        <div className="text-[10px] opacity-70">未打卡</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
