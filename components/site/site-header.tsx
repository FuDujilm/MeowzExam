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
                className="flex items-center gap-2 rounded-full border border-transparent px-2 py-1 text-sm text-gray-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:text-gray-300 dark:hover:border-blue-800 dark:hover:bg-blue-950"
              >
                <UserAvatar
                  name={session.user.name}
                  email={session.user.email}
                  image={session.user.image}
                />
                <span>{session.user.name || session.user.email}</span>
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

function UserAvatar({
  name,
  email,
  image,
}: {
  name?: string | null
  email?: string | null
  image?: string | null
}) {
  const fallbackText = (name?.trim() || email?.trim() || '?')[0]?.toUpperCase() || '?'
  const label = name || email || '用户'

  if (image) {
    return (
      <span className="relative block h-8 w-8 overflow-hidden rounded-full border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
        <Image
          src={image}
          alt={`${label}的头像`}
          fill
          sizes="32px"
          className="object-cover"
          referrerPolicy="no-referrer"
        />
      </span>
    )
  }

  return (
    <span
      aria-hidden
      className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-sm font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
    >
      {fallbackText}
    </span>
  )
}
