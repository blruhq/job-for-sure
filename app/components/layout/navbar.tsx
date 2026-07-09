'use client'

import { Menu, Search, Moon } from 'lucide-react'
import { useTheme } from './theme-provider'

interface Props {
  onMenuToggle: () => void
}

export function Navbar({ onMenuToggle }: Props) {
  const { theme, toggle } = useTheme()

  return (
    <header className="flex h-[--header-height] items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-1.5 text-text-secondary hover:bg-hover transition-colors duration-150"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          className="rounded-lg p-1.5 text-text-secondary hover:bg-hover transition-colors duration-150"
          aria-label="Toggle theme"
        >
          <Moon className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}