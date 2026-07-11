'use client'

import Link from 'next/link'
import { PanelLeft, Sun, Moon, Globe } from 'lucide-react'
import { UserMenu } from '~/components/layout/user-menu'
import { cn } from '~/lib/utils'
import { useTheme } from '~/components/layout/theme-provider'
import { useAppStore } from '~/lib/store'
import { Menu } from '@base-ui/react/menu'
import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '~/i18n/routing'

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const handleLanguageChange = (nextLocale: 'en' | 'th') => {
    router.replace(pathname, { locale: nextLocale })
  }

  return (
    <Menu.Root modal={false}>
      <Menu.Trigger className="flex h-[30px] items-center gap-1 text-xs font-semibold text-muted-foreground transition-all duration-150 hover:bg-background hover:text-foreground active:scale-95 cursor-pointer rounded-sm px-1.5">
        <Globe size={14} />
        <span className="inline-block w-5 text-center uppercase tabular-nums">{locale}</span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" className="z-50">
          <Menu.Popup className="min-w-[120px] rounded-md border border-border bg-popover p-1 shadow-lg">
            <Menu.Item
              className="flex cursor-pointer items-center justify-between rounded-sm px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[highlighted]:bg-accent data-[highlighted]:text-foreground"
              onClick={() => handleLanguageChange('en')}
            >
              <span>English</span>
              {locale === 'en' && <span className="text-[10px] text-primary font-bold">✓</span>}
            </Menu.Item>
            <Menu.Item
              className="flex cursor-pointer items-center justify-between rounded-sm px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[highlighted]:bg-accent data-[highlighted]:text-foreground"
              onClick={() => handleLanguageChange('th')}
            >
              <span>ไทย</span>
              {locale === 'th' && <span className="text-[10px] text-primary font-bold">✓</span>}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

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
        <Link href="/dashboard" className="flex items-center gap-2">
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
        <LanguageSwitcher />
        <button
          onClick={toggle}
          className="relative flex h-[30px] w-[30px] items-center justify-center rounded-sm text-muted-foreground transition-all duration-150 hover:bg-background hover:text-foreground active:scale-95"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <UserMenu />
      </div>
    </header>
  )
}
