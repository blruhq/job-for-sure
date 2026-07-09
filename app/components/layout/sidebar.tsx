'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare, KanbanSquare, CheckSquare, Settings, Plus } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useAppStore } from '~/lib/store'

const NAV_ITEMS = [
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/pipeline', label: 'Pipeline', icon: KanbanSquare, badge: true },
  { href: '/ats', label: 'ATS Optimizer', icon: CheckSquare },
]

export function Sidebar() {
  const pathname = usePathname()
  const { resumes, activeResumeId, setActiveResumeId, pipeline, sidebarCollapsed } = useAppStore()

  const totalPipeline = pipeline.bookmark.length + pipeline.applied.length + pipeline.interviewing.length + pipeline.offers.length

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-border bg-sidebar overflow-hidden transition-all duration-200',
        sidebarCollapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]',
      )}
    >
      {/* NAVIGATE section */}
      <div className="flex flex-col gap-0.5 p-1">
        <div className="label-mono px-2.5 pt-3 pb-1">Navigate</div>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs font-medium transition-all',
                isActive
                  ? 'bg-sidebar-active text-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground',
                sidebarCollapsed && 'justify-center px-0',
              )}
            >
              <Icon
                size={15}
                className={cn('shrink-0', isActive ? 'text-primary' : 'opacity-70')}
              />
              {!sidebarCollapsed && <span>{item.label}</span>}
              {!sidebarCollapsed && item.badge && totalPipeline > 0 && (
                <span className="ml-auto rounded-xs bg-accent-soft px-1.5 py-px font-mono text-[10px] font-semibold text-primary">
                  {totalPipeline}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* RESUMES section */}
      <div className="flex flex-col gap-0.5 p-1">
        <div className={cn('label-mono px-2.5 pt-3 pb-1', sidebarCollapsed && 'sr-only')}>Resumes</div>
        {!sidebarCollapsed && resumes.length > 0 && (
          <div className="flex flex-col gap-0.5 px-1 pb-1">
            {resumes.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveResumeId(r.id)}
                className={cn(
                  'flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-all',
                  r.id === activeResumeId
                    ? 'bg-sidebar-active'
                    : 'hover:bg-sidebar-hover',
                )}
              >
                <span
                  className={cn(
                    'h-2 w-2 shrink-0 rounded-full border-2 transition-all',
                    r.id === activeResumeId ? 'border-primary bg-primary' : 'border-muted-foreground',
                  )}
                />
                <span className="flex-1 truncate font-medium">{r.name}</span>
                <span className="font-mono text-[10px] font-semibold text-success">{r.score}%</span>
              </button>
            ))}
          </div>
        )}
        {!sidebarCollapsed && (
          <button
            className="mx-1 flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-xs text-primary transition-all hover:bg-accent-soft"
          >
            <Plus size={13} className="shrink-0" strokeWidth={2.5} />
            <span>Add Resume</span>
          </button>
        )}
      </div>

      {/* ACCOUNT section */}
      <div className="flex flex-col gap-0.5 p-1">
        <div className={cn('label-mono px-2.5 pt-3 pb-1', sidebarCollapsed && 'sr-only')}>Account</div>
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs font-medium transition-all',
            pathname === '/settings'
              ? 'bg-sidebar-active text-foreground font-semibold'
              : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground',
            sidebarCollapsed && 'justify-center px-0',
          )}
        >
          <Settings size={15} className="shrink-0 opacity-70" />
          {!sidebarCollapsed && <span>Settings</span>}
        </Link>
      </div>

      {/* Footer — user info */}
      <div className="mt-auto border-t border-border p-2">
        <div className={cn('flex items-center gap-2 p-1', sidebarCollapsed && 'justify-center')}>
          <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white">
            JD
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <div className="text-xs font-semibold">John Doe</div>
              <div className="font-mono text-[10px] text-muted-foreground">FREE PLAN</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
