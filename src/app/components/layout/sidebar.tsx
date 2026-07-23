'use client'

import { useState, useEffect } from 'react'
import { Link, usePathname } from '~/i18n/routing'
import { MessageSquare, KanbanSquare, CheckSquare, Settings, Brain, Mail, Shield, FileText } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useUIStore } from '~/hooks/use-ui'
import { useApplications } from '~/hooks/use-apps'
import { Tooltip } from '~/components/ui/tooltip'
import { useTranslations } from 'next-intl'
import { authClient } from '~/lib/auth-client'

type NavItem = {
  href: string
  labelKey: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  badge?: boolean
}

const NAV_HOME: readonly NavItem[] = [
  { href: '/chat', labelKey: 'careerCoach', icon: MessageSquare },
]

const NAV_TOOLS: readonly NavItem[] = [
  { href: '/ats', labelKey: 'atsOptimizer', icon: CheckSquare },
  { href: '/cover-letter', labelKey: 'coverLetter', icon: Mail },
]

const NAV_PRACTICE: readonly NavItem[] = [
  { href: '/interview', labelKey: 'interviewPrep', icon: Brain },
]

const NAV_JOBS: readonly NavItem[] = [
  { href: '/applications', labelKey: 'applications', icon: KanbanSquare, badge: true },
]

function NavSection({
  items,
  collapsed,
  label,
  pathname,
  t,
  totalPipeline,
  showSeparator = true,
}: {
  items: readonly NavItem[]
  collapsed: boolean
  label: string
  pathname: string
  t: (key: string) => string
  totalPipeline: number
  showSeparator?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5 p-1">
        <div className="relative h-[32px] px-2.5 shrink-0">
          <span className={cn('label-mono absolute inset-0 flex items-center px-2.5 transition-opacity duration-150', collapsed ? 'opacity-0' : 'opacity-100')} style={{ fontSize: '11px' }}>
            {label}
          </span>
          {showSeparator && (
            <span className={cn('absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-0.5 w-5 bg-muted-foreground/30 transition-opacity duration-150', collapsed ? 'opacity-100' : 'opacity-0')} />
          )}
        </div>
      {items.map((item) => {
        const isActive = pathname === item.href
        const Icon = item.icon
        const navLabel = t(item.labelKey)
        return (
          <Tooltip key={item.href} label={navLabel} disabled={!collapsed}>
            <Link
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-sm text-sm font-medium transition-[padding,background-color,color] duration-200 ease-[cubic-bezier(0.2,0,0,1)]',
                isActive
                  ? 'bg-sidebar-active text-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground',
                collapsed ? 'pl-[16px] pr-[17px] py-2' : 'px-2.5 py-2',
              )}
            >
              <span className="relative shrink-0">
                <Icon size={15} className={cn(isActive ? 'text-primary' : 'opacity-70')} />
                {collapsed && 'badge' in item && item.badge && totalPipeline > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-red-500 ring-1 ring-sidebar" />
                )}
              </span>
              <span className={cn('transition-opacity duration-150', collapsed && 'opacity-0')}>{navLabel}</span>
              {'badge' in item && item.badge && totalPipeline > 0 && (
                <span className={cn('ml-auto rounded-xs bg-accent-soft px-1.5 py-px font-mono text-[10px] font-semibold text-primary transition-opacity duration-150', collapsed && 'opacity-0')}>
                  {totalPipeline}
                </span>
              )}
            </Link>
          </Tooltip>
        )
      })}
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const t = useTranslations('common')
  const { data: applications } = useApplications()
  const c = useUIStore((s) => s.sidebarCollapsed)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadRole() {
      try {
        const { data: session } = await authClient.getSession()
        if (!cancelled && session) {
          setIsAdmin((session.user as { role?: string }).role === 'admin')
        }
      } catch {
        // not authenticated — AuthGuard will redirect
      }
    }
    loadRole()
    return () => { cancelled = true }
  }, [])

  const totalPipeline = (applications?.bookmark.length ?? 0) + (applications?.applied.length ?? 0) + (applications?.interviewing.length ?? 0) + (applications?.offers.length ?? 0)

  return (
    <>
      <aside
        className={cn(
          'flex h-full flex-col border-r border-border bg-sidebar bg-grid-blueprint overflow-hidden transition-[width] duration-200 ease-[cubic-bezier(0.2,0,0,1)]',
          c ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]',
        )}
      >
        {isAdmin ? (
          /* ── ADMIN: monitor-only nav — just the Admin link ── */
          <div className="flex flex-col gap-0.5 p-1">
            <div className="label-mono px-2.5 pt-3 pb-1">
              {c ? '' : 'Admin'}
            </div>
            <Tooltip label="Admin" disabled={!c}>
              <Link
                href="/admin"
                className={cn(
                  'flex items-center gap-2 rounded-sm text-xs font-medium transition-[padding,background-color,color] duration-200 ease-[cubic-bezier(0.2,0,0,1)]',
                  pathname === '/admin'
                    ? 'bg-sidebar-active text-foreground font-semibold'
                    : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground',
                  c ? 'pl-[16px] pr-[17px] py-1.5' : 'px-2.5 py-1.5',
                )}
              >
                <Shield size={15} className={cn('shrink-0', pathname === '/admin' ? 'text-primary' : 'opacity-70')} />
                <span className={cn('transition-opacity duration-150', c && 'opacity-0')}>Admin Dashboard</span>
              </Link>
            </Tooltip>
          </div>
        ) : (
          <>
            {/* ── HOME ── */}
            <NavSection
              items={NAV_HOME}
              collapsed={c}
              label={t('home')}
              pathname={pathname}
              t={t}
              totalPipeline={totalPipeline}
              showSeparator={false}
            />

            {/* ── MY RESUMES — single link to collection page ── */}
            <div className="flex flex-col gap-0.5 p-1">
              <div className="relative h-[32px] px-2.5 shrink-0">
                <span className={cn('label-mono absolute inset-0 flex items-center px-2.5 transition-opacity duration-150', c ? 'opacity-0' : 'opacity-100')} style={{ fontSize: '11px' }}>
                  {t('resumes')}
                </span>
                <span className={cn('absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-0.5 w-5 bg-muted-foreground/30 transition-opacity duration-150', c ? 'opacity-100' : 'opacity-0')} />
              </div>
              <Tooltip label={t('resumes')} disabled={!c}>
                <Link
                  href="/resumes"
                  className={cn(
                    'flex items-center gap-2 rounded-sm text-sm font-medium transition-[padding,background-color,color] duration-200 ease-[cubic-bezier(0.2,0,0,1)]',
                    pathname === '/resumes'
                      ? 'bg-sidebar-active text-foreground font-semibold'
                      : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground',
                    c ? 'pl-[16px] pr-[17px] py-2' : 'px-2.5 py-2',
                  )}
                >
                  <FileText size={15} className={cn('shrink-0', pathname === '/resumes' ? 'text-primary' : 'opacity-70')} />
                  <span className={cn('transition-opacity duration-150', c && 'opacity-0')}>{t('resumes')}</span>
                </Link>
              </Tooltip>
            </div>

            {/* ── JOBS ── */}
            <NavSection
              items={NAV_JOBS}
              collapsed={c}
              label={t('jobs')}
              pathname={pathname}
              t={t}
              totalPipeline={totalPipeline}
            />

            {/* ── PRACTICE ── */}
            <NavSection
              items={NAV_PRACTICE}
              collapsed={c}
              label={t('practice')}
              pathname={pathname}
              t={t}
              totalPipeline={totalPipeline}
            />

            {/* ── TOOLS ── */}
            <NavSection
              items={NAV_TOOLS}
              collapsed={c}
              label={t('tools')}
              pathname={pathname}
              t={t}
              totalPipeline={totalPipeline}
            />
          </>
        )}

        {/* ── ACCOUNT ── */}
        <div className="flex flex-col gap-0.5 p-1 mt-auto">
          <div className="relative h-[28px] px-2.5 shrink-0">
            <span className={cn('label-mono absolute inset-0 flex items-center px-2.5 transition-opacity duration-150', c ? 'opacity-0' : 'opacity-100')}>
              Account
            </span>
            <span className={cn('absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-0.5 w-5 bg-muted-foreground/30 transition-opacity duration-150', c ? 'opacity-100' : 'opacity-0')} />
          </div>
          <Tooltip label={t('settings')} disabled={!c}>
            <Link
              href="/settings"
              className={cn(
                'flex items-center gap-2 rounded-sm text-xs font-medium transition-[padding,background-color,color] duration-200 ease-[cubic-bezier(0.2,0,0,1)]',
                pathname === '/settings'
                  ? 'bg-sidebar-active text-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground',
                c ? 'pl-[16px] pr-[17px] py-2' : 'px-2.5 py-2',
              )}
            >
              <Settings size={15} className="shrink-0 opacity-70" />
              <span className={cn('transition-opacity duration-150', c && 'opacity-0')}>{t('settings')}</span>
            </Link>
          </Tooltip>
        </div>
      </aside>
    </>
  )
}
