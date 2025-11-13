import Link from 'next/link'
import type { ReactNode } from 'react'

type Action = {
  label: string
  href: string
  external?: boolean
}

interface ErrorViewProps {
  statusCode: string
  title: string
  description: string
  hint?: string
  primaryAction?: Action
  secondaryAction?: Action
  children?: ReactNode
}

export function ErrorView({
  statusCode,
  title,
  description,
  hint,
  primaryAction,
  secondaryAction,
  children,
}: ErrorViewProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 px-6 py-16 text-slate-700 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-16 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-900/30" />
        <div className="absolute right-1/4 bottom-16 h-72 w-72 rounded-full bg-indigo-200/50 blur-3xl dark:bg-indigo-900/20" />
      </div>

      <div className="relative w-full max-w-2xl rounded-3xl border border-white/60 bg-white/80 p-10 shadow-2xl shadow-slate-200/80 backdrop-blur-md dark:border-white/5 dark:bg-slate-900/80 dark:shadow-slate-900/50">
        <div className="flex flex-col items-center space-y-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-indigo-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-sky-400">
            {statusCode}
          </span>

          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-slate-800 dark:text-white">{title}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-300">{description}</p>
          </div>

          {children}

          {hint ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>
          ) : null}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            {primaryAction ? (
              <ErrorLink action={primaryAction} variant="primary" />
            ) : null}
            {secondaryAction ? (
              <ErrorLink action={secondaryAction} variant="secondary" />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function ErrorLink({ action, variant }: { action: Action; variant: 'primary' | 'secondary' }) {
  const className =
    variant === 'primary'
      ? 'inline-flex items-center rounded-full bg-gradient-to-r from-indigo-500 to-sky-500 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/40 transition hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:shadow-indigo-900/40'
      : 'inline-flex items-center rounded-full border border-slate-200/80 px-6 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-500 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500'

  const targetProps = action.external
    ? { target: '_blank', rel: 'noreferrer noopener' }
    : undefined

  return (
    <Link href={action.href} className={className} {...targetProps}>
      {action.label}
    </Link>
  )
}
