'use server'

import fs from 'fs/promises'
import path from 'path'

export interface OAuthSettings {
  displayName: string
}

const defaultSettings: OAuthSettings = {
  displayName: '自建OAuth',
}

const SETTINGS_PATH = path.join(process.cwd(), 'config', 'oauth-settings.json')

async function ensureSettingsFile() {
  try {
    await fs.access(SETTINGS_PATH)
  } catch {
    await fs.mkdir(path.dirname(SETTINGS_PATH), { recursive: true })
    await fs.writeFile(SETTINGS_PATH, JSON.stringify(defaultSettings, null, 2), 'utf8')
  }
}

export async function getOAuthSettings(): Promise<OAuthSettings> {
  try {
    await ensureSettingsFile()
    const raw = await fs.readFile(SETTINGS_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    return {
      ...defaultSettings,
      ...parsed,
    }
  } catch (error) {
    console.error('[OAuth Settings] Failed to read settings file:', error)
    return defaultSettings
  }
}

export async function updateOAuthSettings(updates: Partial<OAuthSettings>) {
  const current = await getOAuthSettings()
  const next = { ...current, ...updates }
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(next, null, 2), 'utf8')
  return next
}
