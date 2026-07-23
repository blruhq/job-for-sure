'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from '~/components/layout/theme-provider'
import { Button } from '~/components/ui/button'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="h-[30px] w-[30px] rounded-sm text-muted-foreground"
      title="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </Button>
  )
}
