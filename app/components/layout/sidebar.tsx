'use client'

import { useState, useEffect } from 'react'
import { Link, useRouter, usePathname } from '~/i18n/routing'
import { MessageSquare, KanbanSquare, CheckSquare, Settings, Plus, Brain, Mail, Shield, Trash2, FileText } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useAppStore } from '~/lib/store'
import { notify } from '~/lib/toast'
import { ConfirmDialog } from '~/components/ui/confirm-dialog'
import { PreviewCard } from '@base-ui/react/preview-card'
import { Tooltip } from '~/components/ui/tooltip'
import { useTranslations } from 'next-intl'
import { authClient } from '~/lib/auth-client'
import { UploadModal } from '~/components/layout/upload-modal'

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
        <div className="relative h-[28px] px-2.5 shrink-0">
          <span className={cn('label-mono absolute inset-0 flex items-center px-2.5 transition-opacity duration-150', collapsed ? 'opacity-0' : 'opacity-100')}>
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
                'flex items-center gap-2 rounded-sm text-xs font-medium transition-[padding,background-color,color] duration-200 ease-[cubic-bezier(0.2,0,0,1)]',
                isActive
                  ? 'bg-sidebar-active text-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground',
                collapsed ? 'pl-[16px] pr-[17px] py-1.5' : 'px-2.5 py-1.5',
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
  const router = useRouter()
  const t = useTranslations('common')
  const { resumes, activeResumeId, setActiveResumeId, deleteResume, applications, sidebarCollapsed } = useAppStore()
  const [isAdmin, setIsAdmin] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

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

  const handleNewResume = () => {
    setUploadModalOpen(true)
  }

  return (
    <>
      <aside
        className={cn(
          'flex h-full flex-col border-r border-border bg-sidebar overflow-hidden transition-[width] duration-200 ease-[cubic-bezier(0.2,0,0,1)]',
          c ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]',
        )}
      >
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

        {/* ── MY RESUMES ── */}
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
                    <div className="max-h-[200px] overflow-y-auto">
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
                    </div>
                    <button
                      onClick={handleNewResume}
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
          /* EXPANDED: resume list with scroll container */
          <div className="flex flex-col gap-0.5 p-1">
            <div className="label-mono px-2.5 pt-3 pb-1">
              {t('resumes')}
            </div>
            {/* SCROLLABLE RESUME LIST — max-height prevents pushing tools down */}
            <div className="max-h-[160px] overflow-y-auto scrollbar-thin">
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
            </div>
            {/* Add resume — opens modal */}
            <button
              onClick={handleNewResume}
              className={cn(
                'flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-xs text-primary transition-colors hover:bg-accent-soft',
              )}
            >
              <Plus size={13} className="shrink-0" strokeWidth={2.5} />
              <span>{t('newResume')}</span>
            </button>
          </div>
        )}

        {/* ── TOOLS ── */}
        <NavSection
          items={NAV_TOOLS}
          collapsed={c}
          label={t('tools')}
          pathname={pathname}
          t={t}
          totalPipeline={totalPipeline}
        />

        {/* ── JOBS ── */}
        <NavSection
          items={NAV_JOBS}
          collapsed={c}
          label={t('jobs')}
          pathname={pathname}
          t={t}
          totalPipeline={totalPipeline}
        />

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
                c ? 'pl-[16px] pr-[17px] py-1.5' : 'px-2.5 py-1.5',
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
                  'flex items-center gap-2 rounded-sm text-xs font-medium transition-[padding,background-color,color] duration-200 ease-[cubic-bezier(0.2,0,0,1)]',
                  pathname === '/admin'
                    ? 'bg-sidebar-active text-foreground font-semibold'
                    : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground',
                  c ? 'pl-[16px] pr-[17px] py-1.5' : 'px-2.5 py-1.5',
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

      {/* Upload Modal — opens from "+ New Resume" */}
      <UploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
      />
    </>
  )
}
