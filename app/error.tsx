'use client'

import { useEffect } from 'react'

import { ErrorView } from '@/components/site/error-view'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Global Error]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <ErrorView
        statusCode="500"
        title="系统似乎出了点问题"
        description="我们已记录该错误，请稍后再试或联系管理员协助排查。"
        hint={error.digest ? `错误编号：${error.digest}` : undefined}
        primaryAction={{ label: '返回首页', href: '/' }}
        secondaryAction={{ label: '查看状态公告', href: '/about' }}
      >
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center rounded-full bg-slate-900/80 px-4 py-1 text-xs font-semibold text-white shadow-lg shadow-slate-900/30 transition hover:scale-[1.01] dark:bg-white/10 dark:text-white"
        >
          重新加载页面
        </button>
      </ErrorView>
    </div>
  )
}
