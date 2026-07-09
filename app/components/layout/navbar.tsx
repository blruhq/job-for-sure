'use client'

import { Menu, Sun, Moon } from 'lucide-react'
import { useTheme } from './theme-provider'

interface Props {
  collapsed: boolean
  onMenuToggle: () => void
}

export function Navbar({ collapsed, onMenuToggle }: Props) {
  const { theme, toggle } = useTheme()

  return (
    <header className="flex h-[--header-height] shrink-0 border-b border-border">
      {/* Brand area — matches sidebar width, collapses with it */}
      <div
        className="flex items-center gap-2.5 h-full border-r border-border px-3 transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] overflow-hidden shrink-0"
        style={{ width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)' }}
      >
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-1.5 text-text-secondary hover:bg-hover transition-colors duration-150 shrink-0"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>
        {!collapsed && (
          <span className="text-sm font-[600] tracking-[-0.02em] text-text-primary whitespace-nowrap">
            Job For Sure
          </span>
        )}
      </div>

      {/* Spacer + actions */}
      <div className="flex items-center justify-end flex-1 px-4 gap-2">
        <button
          onClick={toggle}
          className="rounded-lg p-1.5 text-text-secondary hover:bg-hover transition-colors duration-150"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <div className="h-7 w-7 rounded-full bg-accent-muted flex items-center justify-center text-xs font-[600] text-accent">
          U
        </div>
      </div>
    </header>
  )
}
