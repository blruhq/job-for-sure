'use client'

import { useState, useEffect } from 'react'
import { Link, useRouter, usePathname } from '~/i18n/routing'
import { MessageSquare, KanbanSquare, CheckSquare, Settings, Plus, Brain, LayoutDashboard, Mail, Shield, Trash2, FileText } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useAppStore } from '~/lib/store'
import { notify } from '~/lib/toast'
import { ConfirmDialog } from '~/components/ui/confirm-dialog'
import { Tooltip } from '~/components/ui/tooltip'
import { useTranslations } from 'next-intl'
import { authClient } from '~/lib/auth-client'
import { PreviewCard } from '@base-ui/react/preview-card'

type NavItem = {
  href: string
  labelKey: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  badge?: boolean
}

const NAV_WORKSPACE: readonly NavItem[] = [
  { href: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
  { href: '/chat', labelKey: 'chat', icon: MessageSquare },
  { href: '/applications', labelKey: 'applications', icon: KanbanSquare, badge: true },
]

const NAV_TAILOR: readonly NavItem[] = [
  { href: '/ats', labelKey: 'atsOptimizer', icon: CheckSquare },
  { href: '/cover-letter', labelKey: 'coverLetter', icon: Mail },
]

const NAV_PREPARE: readonly NavItem[] = [
  { href: '/interview', labelKey: 'interviewPrep', icon: Brain },
]

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

  // ── Reusable nav item renderer ──
  // KEY: text spans stay MOUNTED. When collapsed, they fade via opacity
  // and get clipped by the aside's overflow-hidden. No DOM unmount = no jitter.
  // Icon centering: animate padding-left from 10px → 16px (synced with 200ms width transition).
  // 16px accounts for parent div p-1 (4px): 4 + 16 + 7.5 (half icon) = 27.5px ≈ 28px center.
  function renderNavItems(items: readonly NavItem[]) {
    return items.map((item) => {
      const isActive = pathname === item.href
      const Icon = item.icon
      const label = t(item.labelKey)
      const hasBadge = 'badge' in item && item.badge
      return (
        <Tooltip key={item.href} label={label} disabled={!c}>
          <Link
            href={item.href}
            className={cn(
              'flex items-center gap-2 rounded-sm text-xs font-medium transition-[padding,background-color,color] duration-200 ease-[cubic-bezier(0.2,0,0,1)]',
              isActive
                ? 'bg-sidebar-active text-foreground font-semibold'
                : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground',
              // Collapsed: pad to center icon in 56px. Expanded: normal 10px padding.
              c ? 'pl-[16px] pr-[17px] py-1.5' : 'px-2.5 py-1.5',
            )}
          >
            <span className="relative shrink-0">
              <Icon size={15} className={cn(isActive ? 'text-primary' : 'opacity-70')} />
              {/* Activity dot badge — only when collapsed AND has pipeline items */}
              {c && hasBadge && totalPipeline > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-destructive ring-1 ring-sidebar" />
              )}
            </span>
            {/* Label: stays mounted, fades when collapsed. whitespace-nowrap + clipped by aside overflow-hidden */}
            <span className={cn('whitespace-nowrap transition-opacity duration-150', c ? 'opacity-0' : 'opacity-100')}>
              {label}
            </span>
            {/* Badge count: stays mounted, fades when collapsed */}
            {hasBadge && totalPipeline > 0 && (
              <span
                className={cn(
                  'ml-auto whitespace-nowrap rounded-xs bg-accent-soft px-1.5 py-px font-mono text-[10px] font-semibold text-primary transition-opacity duration-150',
                  c ? 'opacity-0' : 'opacity-100',
                )}
              >
                {totalPipeline}
              </span>
            )}
          </Link>
        </Tooltip>
      )
    })
  }

  // ── Section label renderer — FIXED HEIGHT in both states (no vertical shift)
  // When expanded: shows text label. When collapsed: shows thin separator line.
  // First section (showSeparator=false): blank space when collapsed (Option B).
  function renderSectionLabel(labelKey: string, showSeparator = true) {
    return (
      <div className="relative h-[28px] px-2.5 shrink-0">
        {/* Text label — always mounted, visible when expanded */}
        <span
          className={cn(
            'label-mono absolute inset-0 flex items-center px-2.5 transition-opacity duration-150',
            c ? 'opacity-0' : 'opacity-100',
          )}
        >
          {t(labelKey)}
        </span>
        {/* Separator line — visible when collapsed. Skipped for first section. */}
        {showSeparator && (
          <span
            className={cn(
              'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-0.5 w-5 bg-muted-foreground/30 transition-opacity duration-150',
              c ? 'opacity-100' : 'opacity-0',
            )}
          />
        )}
      </div>
    )
  }

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border bg-sidebar overflow-hidden transition-[width] duration-200 ease-[cubic-bezier(0.2,0,0,1)]',
        c ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]',
      )}
    >
      {/* ══ WORKSPACE ══ */}
      <div className="flex flex-col gap-0.5 p-1">
        {renderSectionLabel('navigate', false)}
        {renderNavItems(NAV_WORKSPACE)}
      </div>

      {/* ══ TAILOR & APPLY ══ */}
      <div className="flex flex-col gap-0.5 p-1">
        {renderSectionLabel('tailorApply')}
        {renderNavItems(NAV_TAILOR)}
      </div>

      {/* ══ PREPARE ══ */}
      <div className="flex flex-col gap-0.5 p-1">
        {renderSectionLabel('prepare')}
        {renderNavItems(NAV_PREPARE)}
      </div>

      {/* ══ RESUMES ══ */}
      {c ? (
        /* COLLAPSED: single Documents icon → hover opens flyout (PreviewCard) */
        <div className="flex flex-col items-center p-1">
          <PreviewCard.Root>
            <PreviewCard.Trigger
              delay={300}
              closeDelay={200}
              render={
                <button className="flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-sidebar-hover hover:text-foreground cursor-pointer focus:outline-none">
                  <FileText size={15} />
                </button>
              }
            />
            <PreviewCard.Portal>
              <PreviewCard.Positioner side="right" align="start" sideOffset={8} className="z-[100]">
                <PreviewCard.Popup className="min-w-[200px] rounded-md border border-border bg-popover p-1 shadow-lg">
                  <div className="label-mono px-2 py-1">{t('resumes')}</div>
                  {resumes.length === 0 && (
                    <div className="px-2 py-3 text-xs text-muted-foreground text-center">{t('noResumes')}</div>
                  )}
                  {resumes.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setActiveResumeId(r.id)
                        router.push(`/resume/${r.id}`)
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors',
                        r.id === activeResumeId ? 'bg-sidebar-active font-semibold' : 'hover:bg-sidebar-hover',
                      )}
                    >
                      <span className={cn('h-2 w-2 shrink-0 rounded-full border-2', r.id === activeResumeId ? 'border-primary bg-primary' : 'border-muted-foreground')} />
                      <span className="flex-1 truncate text-left">{r.name}</span>
                      <span className="font-mono text-[10px] font-semibold text-success">{r.score}%</span>
                    </button>
                  ))}
                  <button
                    onClick={() => { router.push('/chat'); notify({ message: 'Upload a resume in chat to add one!', type: 'info' }) }}
                    className="flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-xs text-primary hover:bg-accent-soft"
                  >
                    <Plus size={13} strokeWidth={2.5} />
                    {t('newResume')}
                  </button>
                </PreviewCard.Popup>
              </PreviewCard.Positioner>
            </PreviewCard.Portal>
          </PreviewCard.Root>
        </div>
      ) : (
        /* EXPANDED: full resume list */
        <div className="flex flex-col gap-0.5 p-1">
          <div className="label-mono px-2.5 pt-3 pb-1">{t('resumes')}</div>
          {resumes.length === 0 && (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">{t('noResumes')}</div>
          )}
          {resumes.map((r) => (
            <div
              key={r.id}
              className={cn(
                'group flex items-center gap-1 rounded-sm transition-colors border-l-2',
                r.id === activeResumeId && pathname === `/resume/${r.id}`
                  ? 'bg-sidebar-active border-l-primary'
                  : 'hover:bg-sidebar-hover border-l-transparent',
                'px-2 py-1',
              )}
            >
              <button
                onClick={() => {
                  setActiveResumeId(r.id)
                  router.push(`/resume/${r.id}`)
                }}
                className="flex cursor-pointer items-center gap-2 text-xs flex-1 min-w-0"
              >
                <span
                  className={cn(
                    'h-2 w-2 shrink-0 rounded-full border-2 transition-all',
                    r.id === activeResumeId ? 'border-primary bg-primary' : 'border-muted-foreground',
                  )}
                />
                <span className="flex-1 truncate text-left font-medium">{r.name}</span>
                <span className="font-mono text-[10px] font-semibold text-success">{r.score}%</span>
              </button>
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
            </div>
          ))}
          <button
            onClick={() => { router.push('/chat'); notify({ message: 'Upload a resume in chat to add one!', type: 'info' }); }}
            className="flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-xs text-primary transition-colors hover:bg-accent-soft"
          >
            <Plus size={13} className="shrink-0" strokeWidth={2.5} />
            <span>{t('newResume')}</span>
          </button>
        </div>
      )}

      {/* ══ ACCOUNT ══ */}
      <div className="flex flex-col gap-0.5 p-1">
        <div className="relative h-[28px] px-2.5 shrink-0">
          <span
            className={cn(
              'label-mono absolute inset-0 flex items-center px-2.5 transition-opacity duration-150',
              c ? 'opacity-0' : 'opacity-100',
            )}
          >
            Account
          </span>
          <span
            className={cn(
              'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-0.5 w-5 bg-muted-foreground/30 transition-opacity duration-150',
              c ? 'opacity-100' : 'opacity-0',
            )}
          />
        </div>
        <Tooltip label={t('settings')} disabled={!c}>
          <Link
            href="/settings"
            className={cn(
              'flex items-center gap-2 rounded-sm text-xs font-medium transition-[padding,background-color,color] duration-200 ease-[cubic-bezier(0.2,0,0,1)]',
              pathname === '/settings'
                ? 'bg-sidebar-active text-foreground font-semibold'
                : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground',
              c ? 'pl-[16px] pr-[17px] py-1.5' : 'px-2.5 py-1.5',
            )}
          >
            <Settings size={15} className="shrink-0 opacity-70" />
            <span className={cn('whitespace-nowrap transition-opacity duration-150', c ? 'opacity-0' : 'opacity-100')}>
              {t('settings')}
            </span>
          </Link>
        </Tooltip>
        {isAdmin && (
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
              <Shield size={15} className="shrink-0 opacity-70" />
              <span className={cn('whitespace-nowrap transition-opacity duration-150', c ? 'opacity-0' : 'opacity-100')}>
                Admin
              </span>
            </Link>
          </Tooltip>
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
