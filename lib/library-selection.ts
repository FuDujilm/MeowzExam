const STORAGE_KEY = 'selectedLibraryCode'

export function getStoredLibraryCode(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setStoredLibraryCode(code: string | null) {
  if (typeof window === 'undefined') {
    return
  }
  try {
    if (code) {
      window.localStorage.setItem(STORAGE_KEY, code)
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // ignore storage failures
  }
}
