'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Bot,
  Cloud,
  Cpu,
  FileUp,
  Globe,
  KeyRound,
  LayoutDashboard,
  MailCheck,
  Menu,
  MessageCircle,
  Palette,
  ScrollText,
  Settings2,
  ShieldCheck,
  Users,
  Wand2,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type AdminNavItem = {
  label: string
  href: string
  icon: LucideIcon
}

const adminNavItems: AdminNavItem[] = [
  { label: '总览', href: '/admin', icon: LayoutDashboard },
  { label: '题库导入', href: '/admin/import', icon: FileUp },
  { label: 'R2 存储', href: '/admin/r2', icon: Cloud },
  { label: '管理员配置', href: '/admin/config', icon: ShieldCheck },
  { label: '站点设置', href: '/admin/site', icon: Globe },
  { label: 'SMTP 测试', href: '/admin/smtp-test', icon: MailCheck },
  { label: '用户管理', href: '/admin/users', icon: Users },
  { label: '站内消息', href: '/admin/messages', icon: MessageCircle },
  { label: '积分规则', href: '/admin/points-config', icon: Wand2 },
  { label: 'OAuth 管理', href: '/admin/oauth', icon: KeyRound },
  { label: 'AI 模型', href: '/admin/ai-models', icon: Cpu },
  { label: 'AI 风格', href: '/admin/ai-style-presets', icon: Palette },
  { label: 'AI 解析', href: '/admin/explanations', icon: Bot },
  { label: 'OpenAI 配置', href: '/admin/openai', icon: Settings2 },
  { label: '审计日志', href: '/admin/audit', icon: ScrollText },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <>
      <nav className="sticky top-0 z-30 hidden border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-slate-800 dark:bg-slate-950/80 md:block">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-2 px-4 py-4">
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-all',
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                    : 'border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 transition-colors',
                    isActive
                      ? 'text-white dark:text-slate-900'
                      : 'text-slate-400 group-hover:text-slate-900 dark:text-slate-500 dark:group-hover:text-white',
                  )}
                />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
      <MobileAdminNav pathname={pathname} />
    </>
  )
}

function MobileAdminNav({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    const { body } = document
    const original = body.style.overflow
    body.style.overflow = 'hidden'
    return () => {
      body.style.overflow = original
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <>
      <button
        type="button"
        className="fixed bottom-5 left-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 md:hidden"
        aria-label="打开管理员导航"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div className="relative ml-auto flex h-full w-full flex-col bg-white text-slate-900 shadow-2xl dark:bg-slate-950 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <p className="text-base font-semibold">管理员导航</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">选择要访问的页面</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500"
                aria-label="关闭导航"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="flex flex-col gap-2">
                {adminNavItems.map((item) => {
                  const isActive = pathname === item.href
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-base font-medium transition-colors',
                        isActive
                          ? 'border-slate-900 bg-slate-900 text-white shadow-sm dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                          : 'border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white',
                      )}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => setOpen(false)}
                    >
                      <Icon
                        className={cn(
                          'h-5 w-5 transition-colors',
                          isActive
                            ? 'text-white dark:text-slate-900'
                            : 'text-slate-400 group-hover:text-slate-900 dark:text-slate-500 dark:group-hover:text-white',
                        )}
                      />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
