'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
  X,
} from 'lucide-react'

import { cn } from '@/lib/utils'

type NotificationVariant = 'info' | 'success' | 'warning' | 'danger'

interface NotificationOptions {
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: NotificationVariant
  duration?: number
}

interface Notification extends NotificationOptions {
  id: string
  createdAt: number
}

interface NotificationContextValue {
  notify: (options: NotificationOptions) => string
  dismiss: (id: string) => void
}

const NotificationContext = React.createContext<NotificationContextValue | null>(null)

const VARIANT_STYLES: Record<NotificationVariant, {
  icon: React.ElementType
  accent: string
  border: string
  title: string
  description: string
}> = {
  info: {
    icon: Info,
    accent: 'bg-gradient-to-r from-blue-500/70 to-blue-400/50',
    border: 'border-blue-400/50',
    title: 'text-blue-950 dark:text-blue-50',
    description: 'text-blue-900/90 dark:text-blue-100/90',
  },
  success: {
    icon: CheckCircle2,
    accent: 'bg-gradient-to-r from-emerald-500/70 to-emerald-400/50',
    border: 'border-emerald-400/50',
    title: 'text-emerald-950 dark:text-emerald-50',
    description: 'text-emerald-900/90 dark:text-emerald-100/90',
  },
  warning: {
    icon: AlertTriangle,
    accent: 'bg-gradient-to-r from-amber-500/80 to-amber-400/60',
    border: 'border-amber-400/60',
    title: 'text-amber-950 dark:text-amber-50',
    description: 'text-amber-900/90 dark:text-amber-100/90',
  },
  danger: {
    icon: ShieldAlert,
    accent: 'bg-gradient-to-r from-rose-500/80 to-rose-400/60',
    border: 'border-rose-400/60',
    title: 'text-rose-950 dark:text-rose-50',
    description: 'text-rose-900/90 dark:text-rose-100/90',
  },
}

const DEFAULT_DURATION = 4200

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = React.useState<Notification[]>([])
  const timers = React.useRef(new Map<string, number>())
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    const timerMap = timers.current
    return () => {
      timerMap.forEach((handle) => window.clearTimeout(handle))
      timerMap.clear()
    }
  }, [])

  const dismiss = React.useCallback((id: string) => {
    setNotifications((current) => current.filter((item) => item.id !== id))
    const handle = timers.current.get(id)
    if (handle) {
      window.clearTimeout(handle)
      timers.current.delete(id)
    }
  }, [])

  const notify = React.useCallback(
    ({ title, description, variant = 'info', duration = DEFAULT_DURATION }: NotificationOptions) => {
      const id = (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)
      setNotifications((current) => [
        ...current,
        {
          id,
          title,
          description,
          variant,
          duration,
          createdAt: Date.now(),
        },
      ])

      if (duration !== Infinity) {
        const handle = window.setTimeout(() => dismiss(id), duration)
        timers.current.set(id, handle)
      }

      return id
    },
    [dismiss]
  )

  const value = React.useMemo(() => ({ notify, dismiss }), [notify, dismiss])

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {mounted
        ? createPortal(
            <div className="fixed inset-x-0 top-4 z-[80] flex flex-col items-center gap-3 px-4 md:top-6 md:right-6 md:left-auto md:items-end md:px-0">
              {notifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onDismiss={() => dismiss(notification.id)}
                />
              ))}
            </div>,
            document.body
          )
        : null}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = React.useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}

function NotificationCard({
  notification,
  onDismiss,
}: {
  notification: Notification
  onDismiss: () => void
}) {
  const { variant = 'info', title, description } = notification
  const styles = VARIANT_STYLES[variant] ?? VARIANT_STYLES.info
  const Icon = styles.icon

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto w-full max-w-md rounded-2xl border bg-white/85 p-4 shadow-lg backdrop-blur-md transition-all dark:bg-slate-900/80',
        'animate-in slide-in-from-top-3 fade-in-50 data-[state=closing]:fade-out-50 data-[state=closing]:slide-out-to-top-2',
        styles.border,
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-inner', styles.accent)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          {title && (
            <div className={cn('text-sm font-semibold', styles.title)}>
              {title}
            </div>
          )}
          {description && (
            <div className={cn('mt-1 text-sm leading-relaxed', styles.description)}>
              {description}
            </div>
          )}
        </div>
        <button
          type="button"
          aria-label="关闭通知"
          onClick={onDismiss}
          className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
