'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useMemo, useState } from 'react'

import { ThemeToggle } from '@/components/theme/theme-toggle'
import { Button } from '@/components/ui/button'
import { getDisplayInitial, getUserDisplayName } from '@/lib/users/display-name'
import { getGravatarUrl } from '@/lib/users/avatar'

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
              {(() => {
                const displayName = getUserDisplayName({
                  callsign: session.user.callsign,
                  name: session.user.name,
                  email: session.user.email,
                })
                return (
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 rounded-full border border-transparent px-2 py-1 text-sm text-gray-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:text-gray-300 dark:hover:border-blue-800 dark:hover:bg-blue-950"
                  >
                    <UserAvatar
                      name={session.user.name}
                      email={session.user.email}
                      callsign={session.user.callsign}
                      image={session.user.image}
                      gravatarMirrorUrl={config.gravatarMirrorUrl}
                    />
                    <span>{displayName}</span>
                  </Link>
                )
              })()}
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
  callsign,
  image,
  gravatarMirrorUrl,
}: {
  name?: string | null
  email?: string | null
  callsign?: string | null
  image?: string | null
  gravatarMirrorUrl?: string | null
}) {
  const fallbackText = getDisplayInitial({ callsign, name, email })
  const label = getUserDisplayName({ callsign, name, email })
  const [gravatarFailed, setGravatarFailed] = useState(false)

  const gravatarUrl = useMemo(() => {
    if (image || gravatarFailed) {
      return null
    }
    return getGravatarUrl(email, gravatarMirrorUrl, { defaultImage: '404' })
  }, [email, gravatarMirrorUrl, image, gravatarFailed])

  const avatarSrc = image || gravatarUrl

  const handleImageError = () => {
    if (!image && !gravatarFailed) {
      setGravatarFailed(true)
    }
  }

  if (avatarSrc) {
    return (
      <span className="relative block h-8 w-8 overflow-hidden rounded-full border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
        <Image
          src={avatarSrc}
          alt={`${label}的头像`}
          width={32}
          height={32}
          sizes="32px"
          unoptimized
          referrerPolicy="no-referrer"
          className="h-full w-full rounded-full object-cover"
          onError={handleImageError}
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
