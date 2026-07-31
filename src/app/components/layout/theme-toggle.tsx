'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '~/components/layout/theme-provider'
import { Button } from '~/components/ui/button'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="h-[30px] w-[30px] rounded-sm text-muted-foreground"
      title="Toggle theme"
      suppressHydrationWarning
    >
      {mounted ? (theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />) : <Moon size={16} />}
    </Button>
  )
}
