'use client'

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

import AdminNav from './AdminNav'

type AdminPageShellProps = {
  children: ReactNode
  className?: string
  contentClassName?: string
  includeNav?: boolean
  maxWidthClassName?: string
}

export function AdminPageShell({
  children,
  className,
  contentClassName,
  includeNav = true,
  maxWidthClassName = 'max-w-6xl',
}: AdminPageShellProps) {
  return (
    <div
      className={cn(
        'admin-shell min-h-screen bg-slate-100/70 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-50',
        className,
      )}
    >
      {includeNav ? <AdminNav /> : null}
      <main className={cn('mx-auto w-full px-4 py-10', maxWidthClassName, contentClassName)}>{children}</main>
    </div>
  )
}
