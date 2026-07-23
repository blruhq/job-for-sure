'use client'

import Image from 'next/image'
import { PanelLeft, Sun, Moon, Globe } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { UserMenu } from '~/components/layout/user-menu'
import { cn } from '~/lib/utils'
import { useTheme } from '~/components/layout/theme-provider'
import { useUIStore } from '~/hooks/use-ui'
import { useLocale } from 'next-intl'
import { Link, useRouter, usePathname } from '~/i18n/routing'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '~/components/ui/dropdown-menu'

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const handleLanguageChange = (nextLocale: 'en' | 'th') => {
    router.replace(pathname, { locale: nextLocale })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-[30px] items-center gap-1 rounded-sm px-1.5 text-xs font-semibold text-muted-foreground transition-all duration-150 hover:bg-background hover:text-foreground active:scale-95 cursor-pointer">
        <Globe size={14} />
        <span className="inline-block w-5 text-center uppercase tabular-nums">{locale}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        <DropdownMenuItem onClick={() => handleLanguageChange('en')} className="flex items-center justify-between">
          <span>English</span>
          {locale === 'en' && <span className="text-[10px] text-primary font-bold">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleLanguageChange('th')} className="flex items-center justify-between">
          <span>ไทย</span>
          {locale === 'th' && <span className="text-[10px] text-primary font-bold">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function Topbar() {
  const { theme, toggle } = useTheme()
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)

  return (
    <header className="flex h-[var(--topbar-height)] shrink-0 items-center neuro-surface z-50">
      {/* Brand area — matches sidebar width, collapses */}
      <div
        className={cn(
          'flex h-full items-center px-3 transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] shrink-0',
          sidebarCollapsed ? 'w-[var(--sidebar-collapsed-width)] justify-center px-0' : 'w-[var(--sidebar-width)]',
        )}
      >
        <Link href="/chat" className="flex items-center gap-2">
          <div className="neuro-icon-well rounded-[3px] p-0.5">
            <Image
              src="/logo.png"
              alt="Job For Sure"
              width={sidebarCollapsed ? 20 : 24}
              height={sidebarCollapsed ? 20 : 24}
              className="shrink-0 transition-all duration-200"
              priority
            />
          </div>
          {!sidebarCollapsed && (
            <span className="text-sm font-semibold tracking-[-0.02em]">JOB FOR SURE</span>
          )}
        </Link>
      </div>

      {/* Sidebar toggle — visible on all sizes */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="ml-1 h-[30px] w-[30px] rounded-sm text-muted-foreground"
        title="Toggle sidebar"
      >
        <PanelLeft size={15} />
      </Button>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1 pr-3">
        <LanguageSwitcher />
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="relative h-[30px] w-[30px] rounded-sm text-muted-foreground"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </Button>
        <UserMenu />
      </div>
    </header>
  )
}
