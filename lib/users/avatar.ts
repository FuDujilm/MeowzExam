import { md5 } from '@/lib/utils/md5'

const DEFAULT_GRAVATAR_BASE = 'https://www.gravatar.com/avatar'

function normaliseBaseUrl(base?: string | null): string {
  const trimmed = base?.trim()
  if (!trimmed) {
    return DEFAULT_GRAVATAR_BASE
  }
  return trimmed.replace(/\/+$/, '')
}

type GravatarOptions = {
  size?: number
  defaultImage?: string
  rating?: string
}

export function getGravatarUrl(
  email?: string | null,
  baseUrl?: string | null,
  options?: GravatarOptions,
): string | null {
  const normalisedEmail = email?.trim().toLowerCase()
  if (!normalisedEmail) {
    return null
  }
  const hash = md5(normalisedEmail)
  const base = normaliseBaseUrl(baseUrl)
  const size = options?.size ?? 96
  const defaultImage = options?.defaultImage ?? 'identicon'
  const rating = options?.rating ?? 'g'
  const params = new URLSearchParams({
    s: String(size),
    d: defaultImage,
    r: rating,
  })
  return `${base}/${hash}?${params.toString()}`
}
