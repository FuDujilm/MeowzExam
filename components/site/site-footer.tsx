'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import type { ProgramInfo } from '@/lib/program-info'

import { useSiteConfig } from './site-config-provider'

function hasContent(value: string) {
  return value && value.trim().length > 0
}

export function SiteFooter() {
  const { config } = useSiteConfig()
  const [programInfo, setProgramInfo] = useState<ProgramInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/program-info', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('无法加载程序信息')
        }
        const data = (await response.json()) as ProgramInfo
        if (active) {
          setProgramInfo(data)
          setError(null)
        }
      } catch (err: any) {
        if (active) {
          setError(err?.message ?? '程序信息暂不可用')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [])

  const showFooterContent = hasContent(config.footerContent)
  const lastUpdated = programInfo?.metadata.lastUpdated?.trim()
  const versionText = programInfo?.version.combined

  return (
    <footer className="border-t border-gray-200 bg-gray-950 text-gray-200 dark:border-gray-800">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 text-sm leading-relaxed">
        {showFooterContent ? (
          <div
            className="text-gray-200 [&_a]:text-indigo-300 [&_a:hover]:text-indigo-200"
            dangerouslySetInnerHTML={{ __html: config.footerContent }}
          />
        ) : (
          <p className="text-gray-400">感谢使用本刷题平台，祝您顺利通过无线电考试。</p>
        )}

        <div className="mt-6 flex flex-col gap-4 border-t border-white/10 pt-4 text-xs text-gray-400 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            {loading ? (
              <span>程序版本信息加载中...</span>
            ) : error ? (
              <span>{error}</span>
            ) : versionText ? (
              <span>
                版本：{versionText}
                {lastUpdated ? ` ｜ 更新日期：${lastUpdated}` : null}
              </span>
            ) : (
              <span>版本信息尚未配置</span>
            )}
            {programInfo?.metadata.author ? (
              <div>维护者：{programInfo.metadata.author}</div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
            <Link href="/about" className="transition hover:text-white">
              关于本程序
            </Link>
            <Link href="/about#terms" className="transition hover:text-white">
              服务条款
            </Link>
            <Link href="/about#privacy" className="transition hover:text-white">
              隐私政策
            </Link>
            {programInfo?.metadata.contactEmail ? (
              <Link href={`mailto:${programInfo.metadata.contactEmail}`} className="transition hover:text-white">
                联系我们
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  )
}
