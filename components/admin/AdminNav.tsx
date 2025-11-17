'use client'

import type { ComponentType, SVGProps } from 'react'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bot,
  Cloud,
  Cpu,
  FileUp,
  Globe,
  KeyRound,
  LayoutDashboard,
  MailCheck,
  MessageCircle,
  Palette,
  ScrollText,
  Settings2,
  ShieldCheck,
  Users,
  Wand2,
} from 'lucide-react'

import { cn } from '@/lib/utils'

type AdminNavItem = {
  label: string
  href: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
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
    <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-slate-800 dark:bg-slate-950/80">
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
                  : 'border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={cn(
                  'h-4 w-4 transition-colors',
                  isActive
                    ? 'text-white dark:text-slate-900'
                    : 'text-slate-400 group-hover:text-slate-900 dark:text-slate-500 dark:group-hover:text-white'
                )}
              />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
