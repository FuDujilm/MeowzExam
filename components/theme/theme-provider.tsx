'use client'

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  isDark: boolean
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const THEME_STORAGE_KEY = 'exam-web-theme'

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement

  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    }

    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
      if (stored === 'light' || stored === 'dark') {
        return stored
      }
    }

    return 'light'
  })

  const setTheme = useCallback((value: Theme) => {
    setThemeState(value)
    applyTheme(value)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, value)
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    isDark: theme === 'dark',
    setTheme,
    toggleTheme,
  }), [theme, setTheme, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
