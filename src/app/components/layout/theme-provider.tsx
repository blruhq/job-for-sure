'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'dark' | 'light'

interface ThemeContext {
  theme: Theme
  toggle: () => void
}

const ThemeCtx = createContext<ThemeContext>({ theme: 'light', toggle: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initial state: read the class the inline no-flash script already set on <html>.
  // This keeps React in sync with what the browser painted and avoids a re-render flash.
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
      return 'dark'
    }
    return 'light'
  })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Prefer explicit user choice in localStorage over the system-pref fallback
    // the no-flash script may have used. Runs once on mount — closure captures
    // initial theme so we only reconcile if the stored pref differs.
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored && stored !== theme) {
      setTheme(stored)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!mounted) return
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme, mounted])

  const toggle = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeCtx.Provider value={{ theme, toggle }}>
      {children}
    </ThemeCtx.Provider>
  )
}

export const useTheme = () => useContext(ThemeCtx)
