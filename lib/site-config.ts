import { promises as fs } from 'fs'
import path from 'path'

export interface SiteConfig {
  siteTitle: string
  siteDescription: string
  seoKeywords: string
  logoUrl: string
  faviconUrl: string
  ogImageUrl: string
  headerContent: string
  footerContent: string
}

const CONFIG_PATH = path.join(process.cwd(), 'config/site-config.json')

const defaultConfig: SiteConfig = {
  siteTitle: '业余无线电刷题系统',
  siteDescription: '专为中国业余无线电考试设计的在线练习与模拟平台',
  seoKeywords: '业余无线电,刷题,考试,模拟,ATV,电路原理',
  logoUrl: '/logo.svg',
  faviconUrl: '/favicon.ico',
  ogImageUrl: '',
  headerContent:
    '<strong>业余无线电刷题系统</strong><span class="ml-3 text-sm text-indigo-600">提升通过率，从现在开始</span>',
  footerContent: '<p>© {YEAR} 业余无线电刷题系统 · 保留所有权利</p>',
}

async function ensureConfigFile(): Promise<void> {
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true })
  try {
    await fs.access(CONFIG_PATH)
  } catch {
    await fs.writeFile(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2), 'utf-8')
  }
}

function fillPlaceholders(config: SiteConfig): SiteConfig {
  const year = new Date().getFullYear().toString()
  return {
    ...config,
    footerContent: config.footerContent.replace(/\{YEAR\}/g, year),
  }
}

export async function getSiteConfig(): Promise<SiteConfig> {
  await ensureConfigFile()

  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<SiteConfig>
    const merged: SiteConfig = {
      ...defaultConfig,
      ...parsed,
    }
    return fillPlaceholders(merged)
  } catch (error) {
    console.error('[site-config] Failed to read site-config.json:', error)
    return fillPlaceholders(defaultConfig)
  }
}

export async function updateSiteConfig(partial: Partial<SiteConfig>): Promise<SiteConfig> {
  await ensureConfigFile()

  const current = await getSiteConfig()
  const updated: SiteConfig = {
    ...current,
    ...partial,
  }

  const normalised: SiteConfig = {
    ...updated,
    siteTitle: updated.siteTitle?.trim() || defaultConfig.siteTitle,
    siteDescription: updated.siteDescription?.trim() || defaultConfig.siteDescription,
    seoKeywords: updated.seoKeywords?.trim() || defaultConfig.seoKeywords,
    logoUrl: updated.logoUrl?.trim() || defaultConfig.logoUrl,
    faviconUrl: updated.faviconUrl?.trim() || defaultConfig.faviconUrl,
    ogImageUrl: updated.ogImageUrl?.trim() || '',
    headerContent: updated.headerContent?.trim() || defaultConfig.headerContent,
    footerContent: updated.footerContent?.trim() || defaultConfig.footerContent,
  }

  await fs.writeFile(CONFIG_PATH, JSON.stringify(normalised, null, 2), 'utf-8')

  return fillPlaceholders(normalised)
}
