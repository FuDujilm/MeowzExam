import './globals.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { FloatingWidgets } from '@/components/site/floating-widgets'
import { SiteFooter } from '@/components/site/site-footer'
import { SiteHeader } from '@/components/site/site-header'
import { SiteConfigProvider } from '@/components/site/site-config-provider'
import { NotificationProvider } from '@/components/ui/notification-provider'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { getSiteConfig } from '@/lib/site-config'

import { AuthProvider } from './providers'

function parseKeywords(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  const keywords = parseKeywords(config.seoKeywords)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  const favicon = config.faviconUrl || '/favicon.ico'

  return {
    title: config.siteTitle,
    description: config.siteDescription,
    keywords: keywords.length ? keywords : undefined,
    metadataBase: baseUrl ? new URL(baseUrl) : undefined,
    alternates: baseUrl ? { canonical: '/' } : undefined,
    icons: {
      icon: favicon,
      shortcut: favicon,
    },
    openGraph: {
      title: config.siteTitle,
      description: config.siteDescription,
      url: baseUrl,
      images: config.ogImageUrl ? [{ url: config.ogImageUrl }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: config.siteTitle,
      description: config.siteDescription,
      images: config.ogImageUrl ? [config.ogImageUrl] : undefined,
    },
  }
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  const config = await getSiteConfig()

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="bg-white text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-50">
        <AuthProvider>
          <ThemeProvider>
            <NotificationProvider>
              <SiteConfigProvider initialConfig={config}>
                <FloatingWidgets />
                <div className="flex min-h-screen flex-col">
                  <SiteHeader />
                  <main className="flex-1">
                    {children}
                  </main>
                  <SiteFooter />
                </div>
              </SiteConfigProvider>
            </NotificationProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
