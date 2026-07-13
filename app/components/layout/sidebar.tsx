'use client'

import { useState, useEffect } from 'react'
import { Link, useRouter, usePathname } from '~/i18n/routing'
import { MessageSquare, KanbanSquare, CheckSquare, Settings, Plus, Brain, LayoutDashboard, Mail, Shield, Trash2, FileText } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useAppStore } from '~/lib/store'
import { notify } from '~/lib/toast'
import { ConfirmDialog } from '~/components/ui/confirm-dialog'
import { PreviewCard } from '@base-ui/react/preview-card'
import { Tooltip } from '~/components/ui/tooltip'
import { useTranslations } from 'next-intl'
import { authClient } from '~/lib/auth-client'

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

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border bg-sidebar overflow-hidden transition-[width] duration-200 ease-[cubic-bezier(0.2,0,0,1)]',
        c ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]',
      )}
    >
      {/* ── WORKSPACE ── */}
      <div className="flex flex-col gap-0.5 p-1">
        <div className={cn('label-mono px-2.5 pt-3 pb-1', c && 'opacity-0')}>
          {t('navigate')}
        </div>
        {NAV_WORKSPACE.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          const label = t(item.labelKey)
          return (
            <Tooltip key={item.href} label={label} disabled={!c}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-active text-foreground font-semibold'
                    : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground',
                  c && 'justify-center px-0 mx-2',
                )}
              >
                <span className="relative shrink-0">
                  <Icon size={15} className={cn(isActive ? 'text-primary' : 'opacity-70')} />
                  {c && 'badge' in item && item.badge && totalPipeline > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-red-500 ring-1 ring-sidebar" />
                  )}
                </span>
                <span className={cn('transition-opacity duration-150', c && 'opacity-0')}>{label}</span>
                {'badge' in item && item.badge && totalPipeline > 0 && (
                  <span className={cn('ml-auto rounded-xs bg-accent-soft px-1.5 py-px font-mono text-[10px] font-semibold text-primary transition-opacity duration-150', c && 'opacity-0')}>
                    {totalPipeline}
                  </span>
                )}
              </Link>
            </Tooltip>
          )
        })}
      </div>

      {/* ── TAILOR & APPLY ── */}
      <div className="flex flex-col gap-0.5 p-1">
        <div className={cn('label-mono px-2.5 pt-3 pb-1', c && 'opacity-0')}>
          {t('tailorApply')}
        </div>
        {NAV_TAILOR.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          const label = t(item.labelKey)
          return (
            <Tooltip key={item.href} label={label} disabled={!c}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-active text-foreground font-semibold'
                    : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground',
                  c && 'justify-center px-0 mx-2',
                )}
              >
                <Icon size={15} className={cn('shrink-0', isActive ? 'text-primary' : 'opacity-70')} />
                <span className={cn('transition-opacity duration-150', c && 'opacity-0')}>{label}</span>
              </Link>
            </Tooltip>
          )
        })}
      </div>

      {/* ── PREPARE ── */}
      <div className="flex flex-col gap-0.5 p-1">
        <div className={cn('label-mono px-2.5 pt-3 pb-1', c && 'opacity-0')}>
          {t('prepare')}
        </div>
        {NAV_PREPARE.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          const label = t(item.labelKey)
          return (
            <Tooltip key={item.href} label={label} disabled={!c}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-active text-foreground font-semibold'
                    : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground',
                  c && 'justify-center px-0 mx-2',
                )}
              >
                <Icon size={15} className={cn('shrink-0', isActive ? 'text-primary' : 'opacity-70')} />
                <span className={cn('transition-opacity duration-150', c && 'opacity-0')}>{label}</span>
              </Link>
            </Tooltip>
          )
        })}
      </div>

      {/* ── RESUMES ── */}
      {c ? (
        /* COLLAPSED: single icon + hover flyout */
        <div className="flex flex-col items-center p-1 pt-3">
          <PreviewCard.Root>
            <PreviewCard.Trigger className="flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-sidebar-hover hover:text-foreground cursor-pointer">
              <FileText size={15} />
            </PreviewCard.Trigger>
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
                        r.id === activeResumeId ? 'bg-sidebar-active font-semibold text-foreground' : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground',
                      )}
                    >
                      <span className={cn('h-2 w-2 rounded-full border-2 shrink-0', r.id === activeResumeId ? 'border-primary bg-primary' : 'border-muted-foreground')} />
                      <span className="flex-1 truncate text-left">{r.name}</span>
                      <span className="font-mono text-[10px] font-semibold text-success shrink-0">{r.score}%</span>
                    </button>
                  ))}
                  <button
                    onClick={() => { router.push('/chat'); notify({ message: 'Upload a resume in chat to add one!', type: 'info' }) }}
                    className="flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-xs text-primary hover:bg-accent-soft cursor-pointer"
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
        /* EXPANDED: existing resume list */
        <div className="flex flex-col gap-0.5 p-1">
          <div className={cn('label-mono px-2.5 pt-3 pb-1', c && 'opacity-0')}>
            {t('resumes')}
          </div>
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
                className={cn(
                  'flex cursor-pointer items-center gap-2 text-xs flex-1 min-w-0',
                )}
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
          {/* Add resume */}
          <button
            onClick={() => { router.push('/chat'); notify({ message: 'Upload a resume in chat to add one!', type: 'info' }); }}
            className={cn(
              'flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-xs text-primary transition-colors hover:bg-accent-soft',
            )}
          >
            <Plus size={13} className="shrink-0" strokeWidth={2.5} />
            <span>{t('newResume')}</span>
          </button>
        </div>
      )}

      {/* ── ACCOUNT ── */}
      <div className="flex flex-col gap-0.5 p-1">
        <div className={cn('label-mono px-2.5 pt-3 pb-1', c && 'opacity-0')}>
          Account
        </div>
        <Tooltip label={t('settings')} disabled={!c}>
          <Link
            href="/settings"
            className={cn(
              'flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors',
              pathname === '/settings'
                ? 'bg-sidebar-active text-foreground font-semibold'
                : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground',
              c && 'justify-center px-0 mx-2',
            )}
          >
            <Settings size={15} className="shrink-0 opacity-70" />
            <span className={cn('transition-opacity duration-150', c && 'opacity-0')}>{t('settings')}</span>
          </Link>
        </Tooltip>
        {isAdmin && (
          <Tooltip label="Admin" disabled={!c}>
            <Link
              href="/admin"
              className={cn(
                'flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors',
                pathname === '/admin'
                  ? 'bg-sidebar-active text-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground',
                c && 'justify-center px-0 mx-2',
              )}
            >
              <Shield size={15} className="shrink-0 opacity-70" />
              <span className={cn('transition-opacity duration-150', c && 'opacity-0')}>Admin</span>
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
