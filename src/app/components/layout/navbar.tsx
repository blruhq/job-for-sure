'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { PanelLeft, Sun, Moon } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { UserMenu } from '~/components/layout/user-menu'
import { cn } from '~/lib/utils'
import { BRAND_LOGO_SRC } from '~/lib/constants'
import { useTheme } from '~/components/layout/theme-provider'
import { useUIStore } from '~/hooks/use-ui'
import { Link } from '~/i18n/routing'
import { LanguageSwitcher } from '~/components/layout/language-switcher'

export function Topbar() {
  const { theme, toggle } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)

  return (
    <header className="relative flex h-[var(--topbar-height)] shrink-0 items-center neuro-surface z-50">
      {/*
        Logo — positioned relative to the HEADER (not the brand area).
        The header never changes size, so left-[16px] is bulletproof.
        z-10 ensures it sits above the spacer div below.
      */}
      <Link
        href="/chat"
        className="absolute left-[16px] top-1/2 -translate-y-1/2 z-10 flex items-center"
      >
        <div className="neuro-icon-well rounded-[3px] p-0.5">
          <Image
            src={BRAND_LOGO_SRC}
            alt="Job For Sure"
            width={24}
            height={24}
            className="shrink-0"
            priority
          />
        </div>
      </Link>
      {/*
        Brand text — also relative to header, fades in/out with opacity
        instead of mounting/unmounting (preserves animation context).
      */}
      <Link
        href="/chat"
        className={cn(
          'absolute left-[52px] top-1/2 -translate-y-1/2 z-10 text-sm font-semibold tracking-[-0.02em] transition-opacity duration-200',
          sidebarCollapsed ? 'pointer-events-none opacity-0' : 'opacity-100',
        )}
      >
        JOB FOR SURE
      </Link>
      {/*
        Brand area spacer — empty div, NO content, NO children.
        Only animates width (transition-[width], NOT transition-all).
        This reserves horizontal space so the toggle button sits at the right edge.
      */}
      <div
        className={cn(
          'h-full shrink-0 transition-[width] duration-200 ease-[cubic-bezier(0.2,0,0,1)]',
          sidebarCollapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]',
        )}
      />

      {/* Sidebar toggle — visible on all sizes, enhanced touch target on mobile */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="ml-1 h-[30px] w-[30px] sm:h-[34px] sm:w-[34px] rounded-sm text-muted-foreground touch-target"
        title="Toggle sidebar"
      >
        <PanelLeft size={15} />
      </Button>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1 sm:gap-1.5 pr-2 sm:pr-3">
        <LanguageSwitcher />
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="relative h-[30px] w-[30px] sm:h-[34px] sm:w-[34px] rounded-sm text-muted-foreground touch-target"
          title="Toggle theme"
        >
          {mounted ? (theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />) : <Moon size={16} />}
        </Button>
        <UserMenu />
      </div>
    </header>
  )
}
