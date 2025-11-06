'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'

import { ThemeToggle } from '@/components/theme/theme-toggle'
import { Button } from '@/components/ui/button'

import { SiteMessageCenter } from './site-message-center'
import { useSiteConfig } from './site-config-provider'

function hasContent(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0
}

export function SiteHeader() {
  const { data: session, status } = useSession()
  const { config } = useSiteConfig()

  const signOutHandler = async () => {
    await signOut({ callbackUrl: '/' })
  }

  return (
    <header className="border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:py-3">
        <div className="flex items-center gap-3">
          {hasContent(config.logoUrl) ? (
            <Link
              href="/"
              className="relative block h-10 w-10 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
            >
              <Image
                src={config.logoUrl!}
                alt={config.siteTitle}
                fill
                sizes="40px"
                className="object-contain"
                unoptimized
              />
            </Link>
          ) : null}
          <div className="flex flex-col">
            <Link href="/" className="text-xl font-bold text-gray-900 hover:text-blue-600 dark:text-white">
              {config.siteTitle}
            </Link>
            {hasContent(config.headerContent) ? (
              <div
                className="mt-1 text-sm text-gray-600 dark:text-gray-300"
                dangerouslySetInnerHTML={{ __html: config.headerContent! }}
              />
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          <ThemeToggle />
          {status === 'loading' ? (
            <span className="text-sm text-gray-500 dark:text-gray-400">正在加载...</span>
          ) : session?.user ? (
            <>
              <SiteMessageCenter />
              <Link
                href="/settings"
                className="text-sm text-gray-600 transition hover:text-blue-600 dark:text-gray-300"
              >
                {session.user.name || session.user.email}
              </Link>
              <Button variant="outline" size="sm" onClick={signOutHandler}>
                登出
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm">登录</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
