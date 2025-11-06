'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface User {
  id: string
  email: string
  callsign?: string
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 检查用户登录状态
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (token && userData) {
      try {
        setUser(JSON.parse(userData))
      } catch (error) {
        console.error('Parse user data error:', error)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                业余无线电刷题系统
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    欢迎，{user.callsign || user.email}
                  </span>
                  <Button variant="outline" onClick={handleLogout}>
                    退出登录
                  </Button>
                </>
              ) : (
                <Link href="/login">
                  <Button>登录</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {user ? (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                开始练习
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
                选择您要练习的考试类别
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  type: 'A类',
                  title: 'A类操作技术能力验证',
                  description: '40题（单选32题，多选8题）| 40分钟 | 答对30题合格',
                  questions: '683道题目',
                },
                {
                  type: 'B类',
                  title: 'B类操作技术能力验证',
                  description: '60题（单选45题，多选15题）| 60分钟 | 答对45题合格',
                  questions: '1143道题目',
                },
                {
                  type: 'C类',
                  title: 'C类操作技术能力验证',
                  description: '90题（单选70题，多选20题）| 90分钟 | 答对70题合格',
                  questions: '1282道题目',
                },
              ].map((exam) => (
                <Card key={exam.type} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-xl">{exam.title}</CardTitle>
                    <CardDescription>{exam.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {exam.questions}
                    </p>
                    <div className="space-y-2">
                      <Button className="w-full" variant="default">
                        顺序练习
                      </Button>
                      <Button className="w-full" variant="outline">
                        随机练习
                      </Button>
                      <Button className="w-full" variant="outline">
                        错题本
                      </Button>
                      <Button className="w-full" variant="secondary">
                        模拟考试
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle>学习进度</CardTitle>
                  <CardDescription>查看您的练习统计和考试成绩</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">0</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">今日答题</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">0</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">模拟考试</div>
                    </div>
                  </div>
                  <Button className="w-full" variant="outline">
                    查看详细统计
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
                业余无线电刷题系统
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                专为中国业余无线电考试设计的练习平台
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-2">全面题库</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    涵盖A/B/C类全部考试题目，实时更新
                  </p>
                </div>
                <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-2">智能练习</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    错题本、模拟考试、AI解析助您高效学习
                  </p>
                </div>
                <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-2">完全免费</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    公益项目，助力业余无线电爱好者
                  </p>
                </div>
              </div>
              <Link href="/login">
                <Button size="lg" className="px-8 py-3">
                  立即开始练习
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
