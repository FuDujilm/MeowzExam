'use client'

import { createContext, type ReactNode, useContext, useMemo, useState } from 'react'

import type { SiteConfig } from '@/lib/site-config'

interface SiteConfigContextValue {
  config: SiteConfig
  setConfig: (next: SiteConfig) => void
}

const SiteConfigContext = createContext<SiteConfigContextValue | null>(null)

export function SiteConfigProvider({
  initialConfig,
  children,
}: {
  initialConfig: SiteConfig
  children: ReactNode
}) {
  const [config, setConfig] = useState(initialConfig)

  const value = useMemo(
    () => ({
      config,
      setConfig,
    }),
    [config]
  )

  return <SiteConfigContext.Provider value={value}>{children}</SiteConfigContext.Provider>
}

export function useSiteConfig() {
  const context = useContext(SiteConfigContext)

  if (!context) {
    throw new Error('useSiteConfig must be used within a SiteConfigProvider')
  }

  return context
}
