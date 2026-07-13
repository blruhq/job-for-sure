# PLAN: Chat-First Architecture + Sidebar Redesign + Landing De-Bias

> **For:** Coding agent (fast writer, no thinking)
> **Scope:** Kill dashboard, make chat the home, restructure sidebar, add upload modal, de-bias landing page
> **Principle:** Follow every instruction literally. Copy provided code verbatim. Do NOT improvise.

---

## EXECUTIVE SUMMARY

```
┌──────────────────────────────────────────────────────────────────┐
│  PRIORITY ORDER (do them sequentially)                           │
├──────────────────────────────────────────────────────────────────┤
│  1. REDIRECT FIX  — Change all /dashboard references to /chat   │
│  2. KILL DASHBOARD — Make /dashboard/page.tsx a redirect         │
│  3. SIDEBAR REBUILD — New structure + scrollable resumes        │
│  4. UPLOAD MODAL   — New component, opens from "+ New Resume"   │
│  5. LANDING DE-BIAS — Remove React/TypeScript from mockups      │
│  6. i18n + TESTS   — Update keys and fix broken assertions      │
└──────────────────────────────────────────────────────────────────┘
```

---

## FILES TO MODIFY

```
proxy.ts                                    ← redirect target
app/[locale]/(auth)/login/page.tsx          ← post-login redirect
app/[locale]/(app)/admin/page.tsx           ← non-admin redirect
app/[locale]/(app)/error.tsx                ← error fallback link
app/components/layout/navbar.tsx            ← logo link
app/components/layout/sidebar.tsx           ← FULL REBUILD
app/[locale]/(app)/dashboard/page.tsx       ← becomes redirect
app/[locale]/(app)/dashboard/layout.tsx     ← check if needed
app/messages/en.json                        ← i18n keys
app/messages/th.json                        ← i18n keys
app/robots.ts                               ← update disallow
tests/unit/proxy.test.ts                    ← fix assertions
tests/e2e/protected-routes.spec.ts          ← fix assertions
tests/e2e/auth-flow.spec.ts                 ← fix assertions
```

## FILES TO CREATE

```
app/components/layout/upload-modal.tsx      ← NEW upload modal component
```

## FILES THAT EXIST (do NOT modify these)

```
app/[locale]/(app)/chat/page.tsx            ← chat page, no changes
app/components/chat/chat-view.tsx           ← chat view, no changes
app/components/chat/build-wizard.tsx        ← reused by modal, no changes
app/lib/store.tsx                           ← store, no changes
app/lib/company-data.ts                     ← createResume, no changes
app/lib/ai-providers.ts                     ← do NOT touch
app/lib/with-auth.ts                        ← do NOT touch
app/lib/schema.ts                           ← do NOT touch
```

---

## STEP 1: Fix All /dashboard Redirects

Every file that redirects to `/dashboard` must redirect to `/chat` instead.

### File: `proxy.ts`

Line 8 — add /cover-letter to protectedRoutes (keep /dashboard for backwards compat):
```typescript
const protectedRoutes = ['/chat', '/ats', '/applications', '/resume', '/settings', '/interview', '/dashboard', '/cover-letter']
```

Line 57 — change redirect target:
```typescript
// OLD:
return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url))
// NEW:
return NextResponse.redirect(new URL(`/${locale}/chat`, request.url))
```

### File: `app/[locale]/(auth)/login/page.tsx`

Line 35 — change redirect:
```typescript
// OLD:
router.push('/dashboard')
// NEW:
router.push('/chat')
```

### File: `app/[locale]/(app)/admin/page.tsx`

Line 17 — change redirect:
```typescript
// OLD:
if (session.user.email !== process.env.ADMIN_EMAIL) redirect('/dashboard')
// NEW:
if (session.user.email !== process.env.ADMIN_EMAIL) redirect('/chat')
```

### File: `app/[locale]/(app)/error.tsx`

Line 39 — change link href and label text:
```tsx
// OLD:
<Link href="/dashboard" ...>Dashboard</Link>
// NEW:
<Link href="/chat" ...>Career Coach</Link>
```

### File: `app/components/layout/navbar.tsx`

Line 65 — change logo link:
```tsx
// OLD:
<Link href="/dashboard" className="flex items-center gap-2">
// NEW:
<Link href="/chat" className="flex items-center gap-2">
```

### File: `app/robots.ts`

Line 10 — add cover-letter to disallow list:
```typescript
// After the existing '/*/dashboard' line, add:
'/*/cover-letter',
```

---

## STEP 2: Kill Dashboard (Make It Redirect to Chat)

### File: `app/[locale]/(app)/dashboard/page.tsx`

Replace the ENTIRE file with:

```tsx
import { redirect } from 'next/navigation'

export default function DashboardPage() {
  redirect('/chat')
}
```

### File: `app/[locale]/(app)/dashboard/layout.tsx`

Read this file. If it contains anything other than a pass-through children render, replace the ENTIRE file with:

```tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

### File: `app/components/dashboard/dashboard-view.tsx`

DO NOT DELETE. Leave it untouched. It's no longer imported by anything.

---

## STEP 3: Rebuild Sidebar

### File: `app/components/layout/sidebar.tsx`

Replace the ENTIRE file. Key changes:
1. NAV structure: HOME > MY RESUMES > TOOLS > JOBS > ACCOUNT
2. "Chat" renamed to "Career Coach" (labelKey: `careerCoach`)
3. Dashboard removed from nav entirely
4. Resume list gets `max-h-[160px] overflow-y-auto` scroll container
5. "+ New Resume" button opens UploadModal instead of redirecting to /chat
6. Old "Tailor & Apply" and "Prepare" merged into single "TOOLS" section
7. Account section pushed to bottom with `mt-auto`

```tsx
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
}: {
  items: readonly NavItem[]
  collapsed: boolean
  label: string
  pathname: string
  t: (key: string) => string
  totalPipeline: number
}) {
  return (
    <div className="flex flex-col gap-0.5 p-1">
      <div className={cn('label-mono px-2.5 pt-3 pb-1', collapsed && 'opacity-0')}>
        {label}
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
                'flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-active text-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground',
                collapsed && 'justify-center px-0 mx-2',
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

      {/* Upload Modal — opens from "+ New Resume" */}
      <UploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
      />
    </>
  )
}
```

---

## STEP 4: Create Upload Modal Component

### File: `app/components/layout/upload-modal.tsx` (NEW FILE)

This modal reuses the EXISTING upload logic from `chat-view.tsx`.
Two actions:
1. **Upload**: File input → POST `/api/parse-resume` → `addResume()` → close modal → navigate to `/resume/[id]`
2. **Build with AI**: Opens `BuildWizard` → on complete, store build data in sessionStorage, clear old chat, navigate to `/chat`

```tsx
'use client'

import { useState, useRef } from 'react'
import { useRouter } from '~/i18n/routing'
import { X, Upload, FileText, Loader2 } from 'lucide-react'
import { useAppStore } from '~/lib/store'
import { createResume } from '~/lib/company-data'
import { notify } from '~/lib/toast'
import { BuildWizard, type WizardData } from '~/components/chat/build-wizard'
import { cn } from '~/lib/utils'

interface UploadModalProps {
  open: boolean
  onClose: () => void
}

export function UploadModal({ open, onClose }: UploadModalProps) {
  const router = useRouter()
  const { addResume, setActiveResumeId } = useAppStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsing, setParsing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)

  if (!open) return null

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const MAX_FILE_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      notify({ message: 'File too large. Maximum size is 5MB.', type: 'error' })
      return
    }

    setParsing(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to parse resume')
      }

      const parsed = await res.json()

      const resume = createResume({
        name: file.name.replace(/\.(pdf|docx|txt|md)$/i, ''),
        role: parsed.role || '',
        persona: parsed.name || 'Your Name',
        email: parsed.email,
        phone: parsed.phone,
        location: parsed.location,
        github: parsed.github,
        summary: parsed.summary,
        skills: parsed.skills?.length > 0 ? parsed.skills : [],
        experience: parsed.experience?.map((exp: any) => ({
          company: exp.company || '',
          role: exp.role || '',
          dates: exp.dates || '',
          bullets: exp.bullets || [],
        })),
        education: parsed.education?.map((ed: any) => ({
          institution: ed.institution || '',
          degree: ed.degree || '',
          field: ed.field || '',
          dates: ed.dates || '',
        })),
        projects: parsed.projects?.map((p: any) => ({
          name: p.name || '',
          description: p.description || '',
          techStack: p.techStack || [],
          link: p.link || '',
        })),
        certifications: parsed.certifications?.map((cert: any) => ({
          name: cert.name || '',
          issuer: cert.issuer || '',
          date: cert.date || '',
        })),
        languages: parsed.languages?.map((l: any) => ({
          name: l.name || '',
          proficiency: l.proficiency || '',
        })),
        customSections: parsed.customSections?.map((cs: any) => ({
          title: cs.title || '',
          bullets: cs.bullets || [],
        })),
      })

      addResume(resume)
      setActiveResumeId(resume.id)

      notify({ message: 'Resume uploaded!', type: 'success' })
      onClose()

      router.push(`/resume/${resume.id}`)
    } catch (err) {
      console.error(err)
      notify({ message: err instanceof Error ? err.message : 'Failed to process resume.', type: 'error' })
    } finally {
      setParsing(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      const dt = new DataTransfer()
      dt.items.add(file)
      if (fileRef.current) {
        fileRef.current.files = dt.files
        fileRef.current.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }
  }

  const handleWizardComplete = (data: WizardData) => {
    sessionStorage.setItem('jfs-build-data', JSON.stringify(data))
    sessionStorage.removeItem('jfs-chat-messages')
    setWizardOpen(false)
    onClose()
    if (typeof window !== 'undefined' && window.location.pathname.includes('/chat')) {
      window.location.reload()
    } else {
      router.push('/chat')
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={() => !parsing && onClose()}
      >
        <div
          className="w-full max-w-lg rounded-lg border border-border bg-card shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <span className="text-sm font-semibold text-foreground">Add a Resume</span>
            <button
              onClick={() => !parsing && onClose()}
              className="cursor-pointer rounded-sm p-1 text-muted-foreground hover:bg-muted"
              disabled={parsing}
            >
              <X size={14} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Drag & drop zone */}
            <button
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              disabled={parsing}
              className={cn(
                'w-full cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors',
                dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40 hover:bg-muted/30',
                parsing && 'opacity-60 cursor-not-allowed',
              )}
            >
              {parsing ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 size={24} className="animate-spin text-primary" />
                  <span className="text-xs font-mono text-muted-foreground">Parsing your resume…</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-soft text-primary">
                    <Upload size={18} />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Drop your file here or click to browse</span>
                  <span className="text-[11px] text-muted-foreground">PDF · DOCX · TXT · MD (max 5MB)</span>
                </div>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-mono text-muted-foreground">OR</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Build with AI button */}
            <button
              onClick={() => setWizardOpen(true)}
              disabled={parsing}
              className="w-full cursor-pointer flex items-center gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/30 disabled:opacity-60"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-success-soft text-success shrink-0">
                <FileText size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">Build with AI</div>
                <div className="text-[11px] text-muted-foreground">Answer questions · Takes 5 min</div>
              </div>
            </button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.text,.pdf,.docx"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Build Wizard */}
      <BuildWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={handleWizardComplete}
      />
    </>
  )
}
```

---

## STEP 5: De-Bias Landing Page i18n

### File: `app/messages/en.json`

In the `"landing"` section, replace these specific keys:

**featuresChatMsg1** (line ~63):
```json
"featuresChatMsg1": "Your resume matches <strong>3 of 5</strong> key requirements for <strong>Marketing Manager</strong>.",
```

**featuresChatMsg2** (line ~64):
```json
"featuresChatMsg2": "Missing keywords: <span class=\"text-warn\">Budget Planning</span>, <span class=\"text-warn\">Campaign Analytics</span>. Let's tailor them.",
```

**interviewMockupTitle** (line ~78):
```json
"interviewMockupTitle": "Mock Interview — Acme Corp",
```

**interviewTechnical** (line ~80):
```json
"interviewTechnical": "Behavioral",
```

**interviewTags** (line ~81):
```json
"interviewTags": "#leadership #communication",
```

**interviewQuestion** (line ~82):
```json
"interviewQuestion": "Tell me about a time you had to manage a conflict between two team members. How did you resolve it, and what was the outcome?",
```

**interviewUserAnswer** (line ~83):
```json
"interviewUserAnswer": "In my previous role, two designers disagreed on the direction of a campaign. I scheduled a meeting with both, listened to their concerns, and helped them find common ground by focusing on our shared KPI. We ended up combining elements from both proposals...",
```

**interviewStrength1** (line ~88):
```json
"interviewStrength1": "Used a clear real-world example with a specific situation",
```

**interviewStrength2** (line ~89):
```json
"interviewStrength2": "Showed leadership by facilitating rather than taking sides",
```

**interviewImprove1** (line ~90):
```json
"interviewImprove1": "Could quantify the outcome (e.g., campaign performance metrics)",
```

**interviewImprove2** (line ~91):
```json
"interviewImprove2": "Consider mentioning how you followed up to prevent future conflicts",
```

### File: `app/messages/th.json`

Same keys, Thai translations:

**featuresChatMsg1**:
```json
"featuresChatMsg1": "เรซูเม่คุณตรงกับคุณสมบัติ <strong>3 ใน 5</strong> ข้อของตำแหน่ง <strong>ผู้จัดการการตลาด</strong>",
```

**featuresChatMsg2**:
```json
"featuresChatMsg2": "คำสำคัญที่ขาด: <span class=\"text-warn\">การวางแผนงบประมาณ</span>, <span class=\"text-warn\">วิเคราะห์แคมเปญ</span> มาปรับเพิ่มกันเลย",
```

**interviewMockupTitle**:
```json
"interviewMockupTitle": "ฝึกสัมภาษณ์ — Acme Corp",
```

**interviewTechnical**:
```json
"interviewTechnical": "พฤติกรรม",
```

**interviewTags**:
```json
"interviewTags": "#ความเป็นผู้นำ #การสื่อสาร",
```

**interviewQuestion**:
```json
"interviewQuestion": "เล่าให้ฟังหน่อยได้ไหม เรื่องที่คุณต้องจัดการความขัดแย้งระหว่างสมาชิกในทีม คุณแก้ปัญหายังไง และผลเป็นอย่างไร",
```

**interviewUserAnswer**:
```json
"interviewUserAnswer": "ตอนที่ทำงานที่เก่า ดีไซเนอร์สองคนไม่เห็นด้วยกับทิศทางแคมเปญ ผมเลยนัดประชุมทั้งสองคน ฟังความกังวลของแต่ละคน แล้วช่วยหาจุดร่วมโดยโฟกัสที่ KPI ที่เราต้องทำด้วยกัน สุดท้ายเราเลยรวมไอเดียจากทั้งสองฝั่งเข้าด้วยกัน...",
```

**interviewStrength1**:
```json
"interviewStrength1": "ยกตัวอย่างจริงจากประสบการณ์พร้อมสถานการณ์ที่ชัดเจน",
```

**interviewStrength2**:
```json
"interviewStrength2": "แสดงความเป็นผู้นำโดยเป็นคนกลางแทนที่จะเข้าข้างฝ่ายใด",
```

**interviewImprove1**:
```json
"interviewImprove1": "ควรเพิ่มตัวเลขผลลัพธ์ (เช่น ผลลัพธ์ของแคมเปญ)",
```

**interviewImprove2**:
```json
"interviewImprove2": "อาจพูดถึงวิธีติดตามผลเพื่อป้องกันความขัดแย้งในอนาคต",
```

---

## STEP 6: Update Sidebar i18n Keys

### File: `app/messages/en.json`

In the `"common"` section (lines 2-18), ADD these new keys (keep all existing keys intact):

```json
"careerCoach": "Career Coach",
"home": "Home",
"tools": "Tools",
"jobs": "Jobs",
```

Also CHANGE these existing keys:
```json
"interviewPrep": "Interview Practice",
"resumes": "My Resumes",
```

### File: `app/messages/th.json`

In the `"common"` section, ADD:
```json
"careerCoach": "โค้ชอาชีพ",
"home": "หน้าแรก",
"tools": "เครื่องมือ",
"jobs": "งาน",
```

Also CHANGE:
```json
"interviewPrep": "ฝึกสัมภาษณ์",
"resumes": "เรซูเม่ของฉัน",
```

---

## STEP 7: Fix Tests

### File: `tests/unit/proxy.test.ts`

**Line 96** — change test description:
```typescript
// OLD:
it('redirects authenticated user away from /en/login to dashboard', async () => {
// NEW:
it('redirects authenticated user away from /en/login to chat', async () => {
```

**Line 104** — change assertion:
```typescript
// OLD:
expect(location).toContain('/dashboard')
// NEW:
expect(location).toContain('/chat')
```

**Line 116** — change assertion:
```typescript
// OLD:
expect(res.headers.get('location')).not.toContain('/dashboard')
// NEW:
expect(res.headers.get('location')).not.toContain('/chat')
```

### File: `tests/e2e/protected-routes.spec.ts`

NO CHANGES NEEDED. The /dashboard test still works because:
- Unauthenticated users hitting /dashboard → still redirected to login (it's in protectedRoutes)
- Authenticated users hitting /dashboard → redirected to /chat by the page.tsx redirect

### File: `tests/e2e/auth-flow.spec.ts`

**Line 57** — change assertion:
```typescript
// OLD:
expect(page.url()).not.toMatch(/\/dashboard/)
// NEW:
expect(page.url()).not.toMatch(/\/chat/)
```

---

## VERIFICATION CHECKLIST

After making ALL changes, run:

```bash
npx tsc --noEmit
pnpm test:unit
```

Then test manually with `pnpm dev`:

```
[ ] Login → lands on /chat (not /dashboard)
[ ] Logo click → goes to /chat
[ ] Visit /dashboard → redirects to /chat
[ ] Sidebar shows: Home > My Resumes > Tools > Jobs > Account
[ ] "Career Coach" nav item → goes to /chat
[ ] No "Dashboard" in sidebar
[ ] Upload 5+ resumes → resume list scrolls, tools stay pinned below
[ ] Click "+ New Resume" from /interview → modal opens (no redirect)
[ ] Upload PDF in modal → parsed → navigates to /resume/[id]
[ ] Click "Build with AI" in modal → wizard → goes to /chat in build mode
[ ] Error page link → goes to /chat
[ ] Landing page shows Marketing Manager (not Senior Frontend Engineer)
[ ] Landing interview mockup shows behavioral question (not React reconciliation)
```

---

## ARCHITECTURE DIAGRAM

```
USER SIGNS UP / LOGS IN
       │
       ▼
  /chat (HOME = Career Coach)
       │
       ├─ NEW USER (0 resumes, 0 messages):
       │     Sees 3 entry cards (Upload / Build / Paste JD)
       │
       ├─ RETURNING USER (has messages):
       │     Sees chat conversation with coach
       │
       └─ ANY USER clicks "+ New Resume" in sidebar:
             UploadModal opens IN PLACE (no page redirect)
             ├─ Upload file → parsed → resume added → navigate to /resume/[id]
             └─ Build with AI → wizard → navigate to /chat in build mode

SIDEBAR:
  HOME
    Career Coach (/chat)
  MY RESUMES
    [scrollable list, max-h-160px]
    + New Resume (opens modal)
  TOOLS
    ATS Optimizer (/ats)
    Cover Letter (/cover-letter)
    Interview Practice (/interview)
  JOBS
    Job Tracker (/applications)
  ACCOUNT
    Settings (/settings)
    Admin (/admin) [admin only]
```

---

## ANTI-PATTERNS (DO NOT DO THESE)

1. DO NOT delete `app/components/dashboard/dashboard-view.tsx`
2. DO NOT remove `/dashboard` from `protectedRoutes` in proxy.ts
3. DO NOT modify `chat-view.tsx`, `build-wizard.tsx`, or `paste-jd-modal.tsx`
4. DO NOT add a stat bar to the sidebar
5. DO NOT add numbered steps to the sidebar
6. DO NOT modify `app/lib/ai-providers.ts`, `app/lib/schema.ts`, `app/lib/with-auth.ts`
7. DO NOT create any new files except `app/components/layout/upload-modal.tsx`
8. DO NOT forget to render `<UploadModal>` OUTSIDE the `<aside>` element (in a Fragment wrapper)
9. DO NOT remove the old `navigate`, `tailorApply`, `prepare` i18n keys — just stop using them
10. DO NOT change the `NAV_WORKSPACE`, `NAV_TAILOR`, `NAV_PREPARE` pattern — replace with `NAV_HOME`, `NAV_TOOLS`, `NAV_JOBS`
