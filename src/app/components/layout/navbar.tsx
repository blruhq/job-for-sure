'use client'

import Image from 'next/image'
import { PanelLeft, Sun, Moon, Globe, Search } from 'lucide-react'
import { UserMenu } from '~/components/layout/user-menu'
import { cn } from '~/lib/utils'
import { useTheme } from '~/components/layout/theme-provider'
import { useUIStore } from '~/hooks/use-ui'
import { Menu } from '@base-ui/react/menu'
import { useLocale } from 'next-intl'
import { Link, useRouter, usePathname } from '~/i18n/routing'

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
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)

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
          <Image
            src="/logo.png"
            alt="Job For Sure"
            width={sidebarCollapsed ? 20 : 24}
            height={sidebarCollapsed ? 20 : 24}
            className="shrink-0 transition-all duration-200"
            priority
          />
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

      {/* ⌘K Command Palette trigger */}
      <button
        onClick={() => {
          const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
          document.dispatchEvent(event)
        }}
        className="hidden sm:flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent-soft transition-colors mr-2 max-w-[200px] w-full"
      >
        <Search size={13} className="shrink-0" />
        <span className="flex-1 text-left text-xs">Search...</span>
        <kbd className="ml-auto rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-1 pr-3">
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
