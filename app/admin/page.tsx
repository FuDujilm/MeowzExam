'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  AlertCircle,
  Bot,
  ChevronRight,
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
import type { LucideIcon } from 'lucide-react'

import AdminNav from '@/components/admin/AdminNav'
import { cn } from '@/lib/utils'

type Accent = 'blue' | 'violet' | 'emerald' | 'indigo' | 'rose' | 'amber' | 'sky' | 'slate'

type AdminSectionItem = {
  href: string
  label: string
  description: string
  icon: LucideIcon
  accent: Accent
}

type AdminSection = {
  id: string
  title: string
  description: string
  items: AdminSectionItem[]
}

const accentStyles: Record<Accent, string> = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200',
  rose: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
  sky: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200',
  slate: 'bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-100',
}

const adminSections: AdminSection[] = [
  {
    id: 'security',
    title: '账号与安全',
    description: '把控访问权限、审计操作，确保系统安全。',
    items: [
      {
        href: '/admin/config',
        label: '管理员配置',
        description: '维护管理员邮箱白名单与权限。',
        icon: ShieldCheck,
        accent: 'blue',
      },
      {
        href: '/admin/users',
        label: '用户管理',
        description: '查看并调整用户与角色状态。',
        icon: Users,
        accent: 'violet',
      },
      {
        href: '/admin/audit',
        label: '审计日志',
        description: '追踪敏感操作与风险事件。',
        icon: ScrollText,
        accent: 'amber',
      },
      {
        href: '/admin/oauth',
        label: 'OAuth 管理',
        description: '配置自建 OAuth 登录体验。',
        icon: KeyRound,
        accent: 'slate',
      },
    ],
  },
  {
    id: 'site',
    title: '站点与沟通',
    description: '维护站点呈现并及时触达用户。',
    items: [
      {
        href: '/admin/site',
        label: '站点设置',
        description: '品牌、域名以及 SEO 配置。',
        icon: Globe,
        accent: 'indigo',
      },
      {
        href: '/admin/messages',
        label: '站内消息',
        description: '撰写通知与运营消息推送。',
        icon: MessageCircle,
        accent: 'rose',
      },
      {
        href: '/admin/smtp-test',
        label: 'SMTP 测试',
        description: '检测连接并发送测试邮件。',
        icon: MailCheck,
        accent: 'emerald',
      },
    ],
  },
  {
    id: 'ai',
    title: 'AI 能力',
    description: '配置模型、风格和解析体验。',
    items: [
      {
        href: '/admin/openai',
        label: 'OpenAI 配置',
        description: '管理密钥、速率与调用安全。',
        icon: Settings2,
        accent: 'slate',
      },
      {
        href: '/admin/ai-models',
        label: 'AI 模型',
        description: '选择可用模型和使用场景。',
        icon: Cpu,
        accent: 'emerald',
      },
      {
        href: '/admin/ai-style-presets',
        label: 'AI 风格预设',
        description: '调整解题语气与方法模板。',
        icon: Palette,
        accent: 'violet',
      },
      {
        href: '/admin/explanations',
        label: 'AI 解析监控',
        description: '评估解释质量并排查异常。',
        icon: Bot,
        accent: 'sky',
      },
    ],
  },
  {
    id: 'content',
    title: '题库与激励',
    description: '同步题库资源并维护积分策略。',
    items: [
      {
        href: '/admin/import',
        label: '题库导入',
        description: '导入新题库版本并校验数据。',
        icon: FileUp,
        accent: 'blue',
      },
      {
        href: '/admin/r2',
        label: '题库图片',
        description: '上传题库配图并获取 R2 链接。',
        icon: Cloud,
        accent: 'sky',
      },
      {
        href: '/admin/points-config',
        label: '积分规则',
        description: '设置积分获取与奖励曲线。',
        icon: Wand2,
        accent: 'emerald',
      },
    ],
  },
]

const totalConfigEntries = adminSections.reduce((total, section) => total + section.items.length, 0)

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [permissionError, setPermissionError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'authenticated') {
      const verifyPermission = async () => {
        try {
          const res = await fetch('/api/admin/config')
          if (res.status === 403) {
            const errorData = await res.json()
            setPermissionError(errorData.error ?? '权限不足：需要管理员权限')
          } else if (res.ok) {
            setPermissionError(null)
          }
        } catch (error) {
          console.error('Permission check failed:', error)
        }
      }

      void verifyPermission()
    }
  }, [status])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100/70 dark:bg-slate-950">
        <p className="text-sm text-slate-600 dark:text-slate-300">加载中...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100/70 dark:bg-slate-950">
        <p className="text-sm text-slate-600 dark:text-slate-300">重定向到登录页面...</p>
      </div>
    )
  }

  const adminEmail = session.user?.email ?? '管理员'

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-50">
      <AdminNav />
      <main className="py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4">
          {permissionError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-6 text-rose-900 shadow-sm dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-100">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/15 text-rose-500 dark:bg-rose-500/25 dark:text-rose-100">
                  <AlertCircle className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-semibold">权限不足</h2>
                  <p className="mt-2 text-sm leading-relaxed">{permissionError}</p>
                  <p className="mt-3 text-xs text-rose-700/80 dark:text-rose-200/80">
                    请联系系统管理员将您的邮箱添加到管理员列表中。
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 px-6 py-7 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white dark:bg-slate-100/90 dark:text-slate-950">
                    控制台
                  </span>
                  <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">管理员控制台</h1>
                  <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                    在一个视图中管理站点、AI 能力以及题库配置，快速定位需要调整的模块。
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch lg:items-start">
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/60 px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                      <LayoutDashboard className="h-5 w-5" />
                    </span>
                    <div className="text-sm">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{adminEmail}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">已获得管理员访问权限</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-white/60 px-4 py-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
                      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">配置域</div>
                      <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{adminSections.length}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white/60 px-4 py-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
                      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">配置入口</div>
                      <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{totalConfigEntries}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-10">
            {adminSections.map((section) => (
              <section
                key={section.id}
                className="rounded-2xl border border-slate-200 bg-white/70 px-6 py-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900/70"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{section.title}</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{section.description}</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const accentClass = accentStyles[item.accent] ?? accentStyles.slate

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="group relative flex min-h-[110px] items-start gap-4 rounded-xl border border-slate-200 bg-white/80 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-slate-500"
                      >
                        <span
                          className={cn(
                            'flex h-11 w-11 items-center justify-center rounded-xl text-sm font-medium',
                            accentClass
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="flex flex-1 flex-col gap-2">
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.label}</span>
                          <span className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{item.description}</span>
                        </div>
                        <ChevronRight className="mt-1 h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-300" />
                      </Link>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className="rounded-2xl border border-blue-200/60 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-sky-500/10 p-6 shadow-sm dark:border-blue-500/40 dark:from-blue-500/15 dark:via-indigo-500/15 dark:to-sky-500/15">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">系统信息</h3>
            <ul className="mt-3 space-y-2 text-xs text-blue-900 dark:text-blue-100 sm:text-sm">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-300" aria-hidden />
                <span>
                  管理员权限通过环境变量
                  {' '}
                  <code className="rounded bg-white/60 px-1.5 py-0.5 font-mono text-[11px] text-blue-900 dark:bg-slate-900/70 dark:text-blue-200">
                    ADMIN_EMAILS
                  </code>
                  {' '}进行配置。
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-300" aria-hidden />
                <span>仅白名单邮箱可访问管理员功能，必要时请及时增补。</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-300" aria-hidden />
                <span>所有敏感操作会记录在审计日志中，建议定期检查。</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}
