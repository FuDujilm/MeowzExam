type DisplayNameSource = {
  callsign?: string | null
  name?: string | null
  email?: string | null
}

const DEFAULT_FALLBACK = '无线电爱好者'

export function getUserDisplayName(source: DisplayNameSource, fallback = DEFAULT_FALLBACK): string {
  const callsign = source.callsign?.trim()
  if (callsign) {
    return callsign
  }

  const name = source.name?.trim()
  if (name) {
    return name
  }

  const email = source.email?.trim()
  if (email) {
    const localPart = email.split('@')[0]
    return localPart || email
  }

  return fallback
}

export function getDisplayInitial(source: DisplayNameSource): string {
  const displayName = getUserDisplayName(source)
  return displayName.charAt(0)?.toUpperCase() || '?'
}
