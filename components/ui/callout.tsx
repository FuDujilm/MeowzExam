"use client"

import * as React from "react"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
} from "lucide-react"

import { cn } from "@/lib/utils"

const VARIANT_PRESETS = {
  info: {
    background: "from-blue-100/60 via-blue-100/20 to-transparent dark:from-blue-950/30 dark:via-blue-900/10 dark:to-transparent",
    border: "border-blue-500/30 dark:border-blue-400/40",
    iconWrap: "bg-blue-50/80 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100",
    title: "text-blue-950 dark:text-blue-50",
    body: "text-blue-900/85 dark:text-blue-200/85",
    icon: Info,
  },
  success: {
    background: "from-emerald-100/60 via-emerald-100/20 to-transparent dark:from-emerald-950/30 dark:via-emerald-900/10 dark:to-transparent",
    border: "border-emerald-500/30 dark:border-emerald-400/40",
    iconWrap: "bg-emerald-50/80 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100",
    title: "text-emerald-950 dark:text-emerald-50",
    body: "text-emerald-900/85 dark:text-emerald-200/85",
    icon: CheckCircle2,
  },
  warning: {
    background: "from-amber-100/60 via-amber-100/20 to-transparent dark:from-amber-950/30 dark:via-amber-900/10 dark:to-transparent",
    border: "border-amber-500/40 dark:border-amber-400/50",
    iconWrap: "bg-amber-50/80 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100",
    title: "text-amber-950 dark:text-amber-50",
    body: "text-amber-900/85 dark:text-amber-200/85",
    icon: AlertTriangle,
  },
  danger: {
    background: "from-rose-100/60 via-rose-100/20 to-transparent dark:from-rose-950/30 dark:via-rose-900/10 dark:to-transparent",
    border: "border-rose-500/40 dark:border-rose-400/50",
    iconWrap: "bg-rose-50/80 text-rose-700 dark:bg-rose-500/20 dark:text-rose-100",
    title: "text-rose-900 dark:text-rose-50",
    body: "text-rose-900/90 dark:text-rose-100/90",
    icon: ShieldAlert,
  },
  neutral: {
    background: "from-slate-100/50 via-slate-100/20 to-transparent dark:from-slate-950/30 dark:via-slate-900/10 dark:to-transparent",
    border: "border-slate-400/40 dark:border-slate-600/50",
    iconWrap: "bg-slate-50/80 text-slate-700 dark:bg-slate-800/60 dark:text-slate-100",
    title: "text-slate-900 dark:text-slate-50",
    body: "text-slate-700 dark:text-slate-200/85",
    icon: AlertCircle,
  },
} as const

export type CalloutVariant = keyof typeof VARIANT_PRESETS

export interface CalloutProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode
  icon?: React.ElementType
  variant?: CalloutVariant
  actions?: React.ReactNode
}

export function Callout({
  title,
  icon,
  variant = "info",
  children,
  actions,
  className,
  ...props
}: CalloutProps) {
  const preset = VARIANT_PRESETS[variant] ?? VARIANT_PRESETS.info
  const IconComponent = icon ?? preset.icon

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border shadow-sm transition-shadow hover:shadow-md",
        "bg-white dark:bg-slate-900",
        preset.border,
        className,
      )}
      {...props}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br opacity-60 dark:opacity-40",
          preset.background,
        )}
      />
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-inner",
              "bg-white dark:bg-slate-900/70",
              preset.iconWrap,
            )}
          >
            <IconComponent className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1.5">
            {title && (
              <div className={cn("text-sm font-semibold leading-none", preset.title)}>{title}</div>
            )}
            {children && (
              <div
                className={cn(
                  "text-sm leading-relaxed",
                  preset.body ?? "text-slate-700 dark:text-slate-300",
                )}
              >
                {children}
              </div>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  )
}

Callout.displayName = "Callout"







