'use client'

import Link from 'next/link'
import { PanelLeft, Sun, Moon } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useTheme } from '~/components/layout/theme-provider'
import { useAppStore } from '~/lib/store'

export function Topbar() {
  const { theme, toggle } = useTheme()
  const { sidebarCollapsed, toggleSidebar } = useAppStore()

  return (
    <header className="flex h-[var(--topbar-height)] shrink-0 items-center border-b border-border bg-card z-50">
      {/* Brand area — matches sidebar width, collapses */}
      <div
        className={cn(
          'flex h-full items-center border-r border-border px-3 transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] shrink-0',
          sidebarCollapsed ? 'w-[var(--sidebar-collapsed-width)] justify-center px-0' : 'w-[var(--sidebar-width)]',
        )}
      >
        <Link href="/chat" className="flex items-center gap-2">
          {/* Always show the brand mark */}
          <div className="h-3.5 w-3.5 shrink-0 rounded-[3px] bg-primary transition-transform duration-200 hover:scale-110" />
          {/* Show text when expanded */}
          {!sidebarCollapsed && (
            <span className="text-sm font-semibold tracking-[-0.02em]">JOB FOR SURE</span>
          )}
        </Link>
      </div>

      {/* Sidebar toggle — visible on all sizes */}
      <button
        onClick={toggleSidebar}
        className="ml-1 flex h-[30px] w-[30px] items-center justify-center rounded-sm text-muted-foreground transition-all duration-150 hover:bg-background hover:text-foreground active:scale-95"
        title="Toggle sidebar"
      >
        <PanelLeft size={15} />
      </button>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1 pr-1">
        <button
          onClick={toggle}
          className="relative flex h-[30px] w-[30px] items-center justify-center rounded-sm text-muted-foreground transition-all duration-150 hover:bg-background hover:text-foreground active:scale-95"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <div className="mr-1 flex h-[26px] w-[26px] items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
          JD
        </div>
      </div>
    </header>
  )
}
