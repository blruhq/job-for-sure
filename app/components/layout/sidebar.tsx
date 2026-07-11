'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { MessageSquare, KanbanSquare, CheckSquare, Settings, Plus, Brain, LayoutDashboard, Mail } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useAppStore } from '~/lib/store'
import { notify } from '~/lib/toast'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/interview', label: 'Interview Prep', icon: Brain },
  { href: '/cover-letter', label: 'Cover Letter', icon: Mail },
  { href: '/pipeline', label: 'Applications', icon: KanbanSquare, badge: true },
  { href: '/ats', label: 'ATS Optimizer', icon: CheckSquare },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { resumes, activeResumeId, setActiveResumeId, pipeline, sidebarCollapsed } = useAppStore()
  const c = sidebarCollapsed

  const totalPipeline = pipeline.bookmark.length + pipeline.applied.length + pipeline.interviewing.length + pipeline.offers.length

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border bg-sidebar overflow-hidden transition-[width] duration-200 ease-[cubic-bezier(0.2,0,0,1)]',
        c ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]',
      )}
    >
      {/* ── NAVIGATE ── */}
      <div className="flex flex-col gap-0.5 p-1">
        {/* Label: hide visually but keep height stable when collapsed */}
        <div className={cn('label-mono px-2.5 pt-3 pb-1', c && 'opacity-0')}>
          Navigate
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              title={c ? item.label : undefined}
              className={cn(
                'flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-active text-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground',
                c && 'justify-center px-0 mx-2',
              )}
            >
              <Icon size={15} className={cn('shrink-0', isActive ? 'text-primary' : 'opacity-70')} />
              {!c && <span>{item.label}</span>}
              {!c && item.badge && totalPipeline > 0 && (
                <span className="ml-auto rounded-xs bg-accent-soft px-1.5 py-px font-mono text-[10px] font-semibold text-primary">
                  {totalPipeline}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* ── RESUMES ── */}
      <div className="flex flex-col gap-0.5 p-1">
        <div className={cn('label-mono px-2.5 pt-3 pb-1', c && 'opacity-0')}>
          Resumes
        </div>
        {/* Resume items — always rendered, just hide text when collapsed */}
        {resumes.map((r) => (
          <button
            key={r.id}
            onClick={() => {
              setActiveResumeId(r.id)
              router.push(`/resume/${r.id}`)
            }}
            title={c ? r.name : undefined}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors',
              r.id === activeResumeId ? 'bg-sidebar-active' : 'hover:bg-sidebar-hover',
              c && 'justify-center px-0 mx-2',
            )}
          >
            <span
              className={cn(
                'h-2 w-2 shrink-0 rounded-full border-2 transition-all',
                r.id === activeResumeId ? 'border-primary bg-primary' : 'border-muted-foreground',
              )}
            />
            {!c && <span className="flex-1 truncate text-left font-medium">{r.name}</span>}
            {!c && <span className="font-mono text-[10px] font-semibold text-success">{r.score}%</span>}
          </button>
        ))}
        {/* Add resume — always rendered, icon stays when collapsed */}
        <button
          onClick={() => { router.push('/chat'); notify({ message: 'Upload a resume in chat to add one!', type: 'info' }); }}
          title={c ? 'Add Resume' : undefined}
          className={cn(
            'flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-xs text-primary transition-colors hover:bg-accent-soft',
            c && 'justify-center px-0 mx-2',
          )}
        >
          <Plus size={13} className="shrink-0" strokeWidth={2.5} />
          {!c && <span>Add Resume</span>}
        </button>
      </div>

      {/* ── ACCOUNT ── */}
      <div className="flex flex-col gap-0.5 p-1">
        <div className={cn('label-mono px-2.5 pt-3 pb-1', c && 'opacity-0')}>
          Account
        </div>
        <Link
          href="/settings"
          title={c ? 'Settings' : undefined}
          className={cn(
            'flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors',
            pathname === '/settings'
              ? 'bg-sidebar-active text-foreground font-semibold'
              : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground',
            c && 'justify-center px-0 mx-2',
          )}
        >
          <Settings size={15} className="shrink-0 opacity-70" />
          {!c && <span>Settings</span>}
        </Link>
      </div>


    </aside>
  )
}
