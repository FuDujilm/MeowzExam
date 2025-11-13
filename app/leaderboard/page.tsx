'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Trophy,
  Medal,
  Award,
  ChevronLeft,
  Flame
} from 'lucide-react'

interface LeaderboardUser {
  rank: number
  id: string
  name: string
  callsign?: string
  points: number
  streak: number
  lastCheckIn?: Date
}

export default function LeaderboardPage() {
  const router = useRouter()
  const [users, setUsers] = useState<LeaderboardUser[]>([])
  const [pointsName, setPointsName] = useState('积分')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLeaderboard()
  }, [])

  const loadLeaderboard = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/points/leaderboard?limit=100')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
        setPointsName(data.pointsName)
      }
    } catch (error) {
      console.error('加载排行榜失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) {
      return <Trophy className="h-8 w-8 text-yellow-500" />
    } else if (rank === 2) {
      return <Medal className="h-8 w-8 text-gray-400" />
    } else if (rank === 3) {
      return <Award className="h-8 w-8 text-orange-600" />
    }
    return null
  }

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    if (rank === 2) return 'bg-gray-100 text-gray-800 border-gray-300'
    if (rank === 3) return 'bg-orange-100 text-orange-800 border-orange-300'
    return 'bg-blue-50 text-blue-700 border-blue-200'
  }

  const shouldShowCallsign = (user: LeaderboardUser) =>
    Boolean(user.callsign && user.callsign !== user.name)

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">加载中...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
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

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="h-8 w-8 text-yellow-500" />
            <h1 className="text-3xl font-bold">积分排行榜</h1>
          </div>
          <p className="text-gray-600">
            答对题目获得{pointsName}，每日签到获得更多奖励！
          </p>
        </div>
      </div>

      {/* 前三名特殊展示 */}
      {users.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* 第二名 */}
          <Card className="bg-gradient-to-br from-gray-50 to-gray-100">
            <CardHeader>
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  {getRankIcon(2)}
                </div>
                <CardTitle className="text-lg">{users[1].name}</CardTitle>
                {shouldShowCallsign(users[1]) && (
                  <CardDescription>{users[1].callsign}</CardDescription>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-700 mb-1">
                  {users[1].points}
                </div>
                <div className="text-sm text-gray-600">{pointsName}</div>
                {users[1].streak > 0 && (
                  <div className="flex items-center justify-center gap-1 mt-2 text-orange-600">
                    <Flame className="h-4 w-4" />
                    <span className="text-sm">连续签到 {users[1].streak} 天</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 第一名 */}
          <Card className="bg-gradient-to-br from-yellow-50 to-orange-100 border-yellow-400 border-2">
            <CardHeader>
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  {getRankIcon(1)}
                </div>
                <CardTitle className="text-xl">{users[0].name}</CardTitle>
                {shouldShowCallsign(users[0]) && (
                  <CardDescription className="text-base">{users[0].callsign}</CardDescription>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-700 mb-1">
                  {users[0].points}
                </div>
                <div className="text-sm text-yellow-800">{pointsName}</div>
                {users[0].streak > 0 && (
                  <div className="flex items-center justify-center gap-1 mt-2 text-orange-600">
                    <Flame className="h-4 w-4" />
                    <span className="text-sm font-medium">连续签到 {users[0].streak} 天</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 第三名 */}
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
            <CardHeader>
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  {getRankIcon(3)}
                </div>
                <CardTitle className="text-lg">{users[2].name}</CardTitle>
                {shouldShowCallsign(users[2]) && (
                  <CardDescription>{users[2].callsign}</CardDescription>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-700 mb-1">
                  {users[2].points}
                </div>
                <div className="text-sm text-orange-800">{pointsName}</div>
                {users[2].streak > 0 && (
                  <div className="flex items-center justify-center gap-1 mt-2 text-orange-600">
                    <Flame className="h-4 w-4" />
                    <span className="text-sm">连续签到 {users[2].streak} 天</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 完整排行榜 */}
      <Card>
        <CardHeader>
          <CardTitle>完整排行榜</CardTitle>
          <CardDescription>查看所有用户的积分排名</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                  user.rank <= 3 ? getRankBadgeColor(user.rank) : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* 排名 */}
                  <div className="w-12 text-center">
                    {user.rank <= 3 ? (
                      <div className="flex justify-center">
                        {getRankIcon(user.rank)}
                      </div>
                    ) : (
                      <span className="text-xl font-bold text-gray-600">
                        #{user.rank}
                      </span>
                    )}
                  </div>

                  {/* 用户信息 */}
                  <div className="flex-1">
                    <div className="font-semibold text-lg">{user.name}</div>
                    {shouldShowCallsign(user) && (
                      <div className="text-sm text-gray-600">{user.callsign}</div>
                    )}
                  </div>

                  {/* 连续签到 */}
                  {user.streak > 0 && (
                    <div className="flex items-center gap-1 text-orange-600">
                      <Flame className="h-4 w-4" />
                      <span className="text-sm font-medium">{user.streak}天</span>
                    </div>
                  )}

                  {/* 积分 */}
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {user.points}
                    </div>
                    <div className="text-xs text-gray-600">{pointsName}</div>
                  </div>
                </div>
              </div>
            ))}

            {users.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                暂无排行榜数据
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
