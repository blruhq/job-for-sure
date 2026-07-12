'use client'

import { useState, useEffect } from 'react'
import { Link, useRouter, usePathname } from '~/i18n/routing'
import { MessageSquare, KanbanSquare, CheckSquare, Settings, Plus, Brain, LayoutDashboard, Mail, Shield, Trash2 } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useAppStore } from '~/lib/store'
import { notify } from '~/lib/toast'
import { ConfirmDialog } from '~/components/ui/confirm-dialog'
import { useTranslations } from 'next-intl'
import { authClient } from '~/lib/auth-client'

const NAV_ITEMS = [
  { href: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
  { href: '/chat', labelKey: 'chat', icon: MessageSquare },
  { href: '/interview', labelKey: 'interviewPrep', icon: Brain },
  { href: '/cover-letter', labelKey: 'coverLetter', icon: Mail },
  { href: '/applications', labelKey: 'applications', icon: KanbanSquare, badge: true },
  { href: '/ats', labelKey: 'atsOptimizer', icon: CheckSquare },
] as const

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('common')
  const { resumes, activeResumeId, setActiveResumeId, deleteResume, applications, sidebarCollapsed } = useAppStore()
  const [isAdmin, setIsAdmin] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function checkAdmin() {
      try {
        const { data: session } = await authClient.getSession()
        if (session?.user?.email) {
          setIsAdmin(true)
        }
      } catch {
        // not logged in
      }
    }
    checkAdmin()
  }, [])

  const c = sidebarCollapsed

  const totalPipeline = applications.bookmark.length + applications.applied.length + applications.interviewing.length + applications.offers.length

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
          {t('navigate')}
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          const label = t(item.labelKey)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={c ? label : undefined}
              className={cn(
                'flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-active text-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground',
                c && 'justify-center px-0 mx-2',
              )}
            >
              <Icon size={15} className={cn('shrink-0', isActive ? 'text-primary' : 'opacity-70')} />
              {!c && <span>{label}</span>}
              {!c && 'badge' in item && item.badge && totalPipeline > 0 && (
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
          {t('resumes')}
        </div>
        {/* Resume items — always rendered, just hide text when collapsed */}
        {resumes.map((r) => (
          <div
            key={r.id}
            className={cn(
              'group flex items-center gap-1 rounded-sm transition-colors border-l-2',
              r.id === activeResumeId && pathname === `/resume/${r.id}`
                ? 'bg-sidebar-active border-l-primary'
                : 'hover:bg-sidebar-hover border-l-transparent',
              c ? 'justify-center px-0 mx-2' : 'px-2 py-1',
            )}
          >
            <button
              onClick={() => {
                setActiveResumeId(r.id)
                router.push(`/resume/${r.id}`)
              }}
              title={c ? r.name : undefined}
              className={cn(
                'flex cursor-pointer items-center gap-2 text-xs flex-1 min-w-0',
                c && 'justify-center py-1.5',
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
            {!c && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteTarget({ id: r.id, name: r.name })
                }}
                className="shrink-0 opacity-0 group-hover:opacity-100 cursor-pointer rounded-xs p-1 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
                title="Delete resume"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
        {/* Add resume — always rendered, icon stays when collapsed */}
        <button
          onClick={() => { router.push('/chat'); notify({ message: 'Upload a resume in chat to add one!', type: 'info' }); }}
          title={c ? t('newResume') : undefined}
          className={cn(
            'flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-xs text-primary transition-colors hover:bg-accent-soft',
            c && 'justify-center px-0 mx-2',
          )}
        >
          <Plus size={13} className="shrink-0" strokeWidth={2.5} />
          {!c && <span>{t('newResume')}</span>}
        </button>
      </div>

      {/* ── ACCOUNT ── */}
      <div className="flex flex-col gap-0.5 p-1">
        <div className={cn('label-mono px-2.5 pt-3 pb-1', c && 'opacity-0')}>
          Account
        </div>
        <Link
          href="/settings"
          title={c ? t('settings') : undefined}
          className={cn(
            'flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors',
            pathname === '/settings'
              ? 'bg-sidebar-active text-foreground font-semibold'
              : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground',
            c && 'justify-center px-0 mx-2',
          )}
        >
          <Settings size={15} className="shrink-0 opacity-70" />
          {!c && <span>{t('settings')}</span>}
        </Link>
        {isAdmin && (
          <Link
            href="/admin"
            title={c ? 'Admin' : undefined}
            className={cn(
              'flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors',
              pathname === '/admin'
                ? 'bg-sidebar-active text-foreground font-semibold'
                : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground',
              c && 'justify-center px-0 mx-2',
            )}
          >
            <Shield size={15} className="shrink-0 opacity-70" />
            {!c && <span>Admin</span>}
          </Link>
        )}
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => { if (!deleting) setDeleteTarget(null) }}
        onConfirm={async () => {
          if (!deleteTarget) return
          setDeleting(true)
          try {
            await deleteResume(deleteTarget.id)
            notify({ message: `"${deleteTarget.name}" deleted`, type: 'success' })
            setDeleteTarget(null)
          } catch {
            notify({ message: 'Failed to delete resume', type: 'error' })
          } finally {
            setDeleting(false)
          }
        }}
        title="Delete Resume?"
        description={`Remove "${deleteTarget?.name}" from your list? You can re-upload it anytime.`}
        confirmLabel="Delete Resume"
        variant="danger"
        loading={deleting}
      />
    </aside>
  )
}
