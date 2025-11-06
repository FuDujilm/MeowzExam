'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'

interface AdminConfig {
  adminEmails: string[]
  currentUser: string
  totalAdmins: number
}

export default function AdminConfigPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [config, setConfig] = useState<AdminConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 加载管理员配置
  const loadConfig = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/config')
      
      if (res.ok) {
        const data = await res.json()
        setConfig(data.data)
        setError(null)
      } else if (res.status === 403) {
        const errorData = await res.json()
        setError(errorData.error || '权限不足：需要管理员权限')
      } else {
        setError('加载配置失败')
      }
    } catch (error) {
      console.error('Failed to load config:', error)
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  // 加载初始配置
  useEffect(() => {
    if (status === 'authenticated') {
      loadConfig()
    }
  }, [status])

  // 处理未登录用户的重定向
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>加载中...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>重定向到登录页面...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">管理员配置</h1>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">错误</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 管理员信息 */}
        {config && (
          <div className="space-y-8">
            {/* 当前用户信息 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">当前用户</h2>
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-900">{config.currentUser}</p>
                  <p className="text-sm text-green-600">✓ 管理员权限</p>
                </div>
              </div>
            </div>

            {/* 管理员列表 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">管理员邮箱列表</h2>
                <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
                  共 {config.totalAdmins} 个管理员
                </span>
              </div>
              
              <div className="space-y-3">
                {config.adminEmails.map((email, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                      </div>
                      <span className="text-gray-900">{email}</span>
                    </div>
                    {email === config.currentUser && (
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                        当前用户
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 配置说明 */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="font-semibold mb-2 text-blue-900">配置说明</h3>
              <ul className="text-sm space-y-1 list-disc list-inside text-blue-800">
                <li>管理员邮箱通过环境变量 <code className="bg-blue-100 px-1 rounded">ADMIN_EMAILS</code> 配置</li>
                <li>多个邮箱用逗号分隔，例如：<code className="bg-blue-100 px-1 rounded">admin1@example.com,admin2@example.com</code></li>
                <li>只有配置的管理员邮箱才能访问管理员功能</li>
                <li>修改配置后需要重启应用程序才能生效</li>
              </ul>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
