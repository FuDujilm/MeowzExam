'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

import { AdminPageShell } from '@/components/admin/AdminPageShell'

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

  const loadConfig = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/config')
      if (res.ok) {
        const data = await res.json()
        setConfig(data.data)
        setError(null)
      } else {
        const payload = await res.json().catch(() => ({}))
        setError(payload.error || '加载配置失败')
      }
    } catch (err) {
      console.error('[admin][config] load failed:', err)
      setError('网络错误，请稍后再试。')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      loadConfig()
    }
  }, [status])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  if (status === 'loading' || loading) {
    return (
      <AdminPageShell maxWidthClassName="max-w-4xl">
        <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
          {status === 'loading' ? '正在校验会话...' : '加载配置中...'}
        </div>
      </AdminPageShell>
    )
  }

  if (!session) {
    return (
      <AdminPageShell maxWidthClassName="max-w-4xl">
        <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">重定向到登录页面...</div>
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell maxWidthClassName="max-w-4xl" contentClassName="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">管理员配置</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">查看当前管理员账户列表与配置方式。</p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50/80 p-4 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {config ? (
        <div className="space-y-8">
          <section className="rounded-xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">当前用户</h2>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-medium text-slate-900 dark:text-slate-50">{config.currentUser}</p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">✓ 管理员权限</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">管理员邮箱列表</h2>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">
                共 {config.totalAdmins} 个管理员
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {config.adminEmails.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-800 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-100"
                >
                  <span>{email}</span>
                  {email === config.currentUser ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                      当前用户
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-blue-100 bg-blue-50/80 p-6 text-sm text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
            <h3 className="text-base font-semibold">配置说明</h3>
            <ul className="mt-3 space-y-1 pl-5 leading-relaxed marker:text-blue-400 dark:marker:text-blue-200">
              <li>
                管理员邮箱通过环境变量 <code className="rounded bg-white/70 px-1 py-0.5 text-blue-900 dark:bg-slate-900/40 dark:text-blue-100">ADMIN_EMAILS</code> 配置
              </li>
              <li>多个邮箱以英文逗号分隔，例如 admin1@example.com,admin2@example.com</li>
              <li>只有在名单中的邮箱才能访问后台功能</li>
              <li>修改环境变量后请重新部署或重启服务</li>
            </ul>
          </section>
        </div>
      ) : null}
    </AdminPageShell>
  )
}
