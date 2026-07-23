# Implementation Spec & Plan: Blueprint UX Redesign

Reference: `docs/design.md`

---

### ⚠️ REMAINING GAPS (as of current branch state)

The bulk of the implementation is DONE (sidebar font bump, resumes page, job-detail-panel width/buttons, globals.css grid class, layout grid). Three small fixes remain:

1. **sidebar.tsx line 102**: Remove unused `const router = useRouter()` and the `useRouter` import from line 4 (lint warning: `'router' is assigned a value but never used`). Keep `Link`, `usePathname` from the import.

2. **sidebar.tsx line 130**: Add `bg-grid-blueprint` to the `<aside>` className so the sidebar also shows the dot-grid pattern. Current: `'flex h-full flex-col border-r border-border bg-sidebar overflow-hidden ...'`. Change to: `'flex h-full flex-col border-r border-border bg-sidebar bg-grid-blueprint overflow-hidden ...'`.

3. **job-detail-panel.tsx line 433**: Change footer `bg-card/90` → `bg-card/95` to match the spec's `bg-card/95 backdrop-blur-sm`. (The `shrink-0` flex approach already achieves the "sticky" intent — no change needed there.)

---

### 0. Architectural Decision Record (ADR) & Scaling Tradeoffs

- **Context & Constraints**: Pure CSS/JSX changes — no DB schema, no new API routes, no auth changes. All changes are client-side UI. The resumes page is a new Next.js App Router page using the existing `useResumes()` hook and `useDeleteResume()` mutation already used in the sidebar.
- **Chosen Architecture**: CSS utility classes + one new page route. No new abstractions, no new hooks, no new libraries. The blueprint grid is a CSS-only `.bg-grid-blueprint` utility class added to `globals.css`.
- **Discarded Alternatives**:
  - *SVG grid overlay*: heavier, not CSS-only, harder to theme. Rejected.
  - *Separate grid component*: adds abstraction for a one-liner CSS rule. Rejected (YAGNI).

---

### 1. Target Files & Folder Structure

Files to **modify**:
- `src/app/globals.css` — add `.bg-grid-blueprint` utility class + `--accent-blueprint` CSS var
- `src/app/components/layout/sidebar.tsx` — bump font sizes, spacing, replace resume list with single nav link
- `src/app/components/pipeline/job-detail-panel.tsx` — widen drawer, enlarge footer buttons
- `src/app/[locale]/(app)/layout.tsx` — add `bg-grid-blueprint` to the main wrapper div

Files to **create**:
- `src/app/[locale]/(app)/resumes/page.tsx` — new Resume Collection page

---

### 2. Import Definitions & Dependencies

**`resumes/page.tsx`** needs:
```ts
'use client'
import { useResumes, useDeleteResume } from '~/hooks/use-resumes'
import { useUIStore } from '~/hooks/use-ui'
import { useRouter } from '~/i18n/routing'
import { Link } from '~/i18n/routing'
import { ConfirmDialog } from '~/components/ui/confirm-dialog'
import { UploadModal } from '~/components/layout/upload-modal'
import { notify } from '~/lib/toast'
import { cn } from '~/lib/utils'
import { Plus, FileText, MoreHorizontal, Trash2, Zap, ExternalLink, Clock } from 'lucide-react'
import { useState } from 'react'
import type { Resume } from '~/types/resume'
```

All imports are from existing internal modules. No new packages.

---

### 3. Database Schema Changes

**None.** This is a pure UI change.

---

### 4. Step-by-Step Edits

#### Step 1: `globals.css` — Add blueprint grid utility + CSS var

In the `:root` block, after the `--accent-soft` line, add:
```css
--accent-blueprint: rgba(91, 106, 191, 0.06);
```

In the `.dark` block, after the `--accent-soft` line, add:
```css
--accent-blueprint: rgba(123, 138, 216, 0.08);
```

After the existing `@layer base { ... }` block (after line 292, before the ANIMATIONS section), add a new CSS block:

```css
/* ── Blueprint grid background ── */
.bg-grid-blueprint {
  background-image: radial-gradient(var(--border) 1px, transparent 1px);
  background-size: 16px 16px;
}
```

#### Step 2: `sidebar.tsx` — Font size, spacing, replace resume list

**A. NavSection component** — update nav link classes:
- Change `text-xs` → `text-sm` on the `<Link>` className (the nav link itself, line ~79)
- Change `py-1.5` → `py-2` on the `<Link>` className (both collapsed and expanded states, lines ~83)
- Change the section label height `h-[28px]` → `h-[32px]` (line ~62)
- Change `label-mono` font size: the `.label-mono` CSS class in globals.css uses `font-size: 10px`. For sidebar labels, add inline override: change `<span className="label-mono ...">` to `<span className="label-mono" style={{fontSize: '11px'}} ...>` for section labels only in NavSection (line ~63).

**B. Account section** — same py-2 update for the Settings link (lines ~411-418).

**C. Replace the resume list section** — Remove the large block between `{/* ── MY RESUMES ── */}` and `{/* ── JOBS ── */}` (lines ~199–368). Replace with a single nav link to `/resumes`, styled exactly like the other nav items. The collapsed state shows the FileText icon with a tooltip. The expanded state shows "My Resumes" text.

The replacement block (between `{/* ── HOME ── */}` NavSection and `{/* ── JOBS ── */}` NavSection) should be:

```tsx
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
```

**D. Remove unused imports** from sidebar.tsx that were only used by the resume list:
- Remove: `useResumes`, `useDeleteResume`, `useDeleteResume` (the second import on line 10), `ConfirmDialog`, `PreviewCard`, `Trash2` (still needed? check — remove if no longer used after list removal), `Plus` (check if still needed — remove if not)
- Keep: `FileText`, `Tooltip`, `UploadModal` (UploadModal is now unused too — remove it), `authClient`, `useUIStore`, `useApplications`
- Actually: After removing the resume list, the following are no longer needed: `useResumes`, `useDeleteResume`, `ConfirmDialog`, `PreviewCard`, `Trash2`, `Plus`, `UploadModal`, `deleteTarget`, `deleting`, `deleteResume`, `uploadModalOpen`, `handleNewResume`, `baseResumes`, `variantsByBase`, `useMemo`
- Remove `useMemo` from React imports if only used for `variantsByBase`
- Remove the `UploadModal` JSX at the bottom (lines ~452-456)
- Remove the `ConfirmDialog` JSX (lines ~427-449)
- Remove all the state variables: `deleteTarget`, `deleting`, `uploadModalOpen`
- Remove `handleNewResume` function
- Remove `baseResumes`, `variantsByBase` computed vars
- Keep `resumes` import if still used elsewhere — actually after removal it's not needed, remove it
- Keep `activeResumeId`, `setActiveResumeId` — NOT needed either after removal, remove them

**NOTE**: Be careful — `useResumes` and related state must only be removed if no other sidebar code uses them. After the list removal, verify no other sidebar references remain.

#### Step 3: `job-detail-panel.tsx` — Widen drawer + enlarge buttons

**A. Widen the drawer** — On line 220:
```tsx
// OLD:
className="fixed right-0 top-0 z-[101] flex h-full w-full max-w-lg flex-col border-l border-border bg-card shadow-xl animate-in slide-in-from-right"
// NEW:
className="fixed right-0 top-0 z-[101] flex h-full w-full max-w-2xl flex-col border-l border-border bg-card shadow-xl animate-in slide-in-from-right"
```

**B. Enlarge footer bottom row** — On lines ~433-488, update the footer section:

Change the footer wrapper (line 433):
```tsx
// OLD:
<div className="shrink-0 border-t border-border bg-background/50 px-5 py-3">
// NEW:
<div className="shrink-0 border-t border-border bg-card/90 backdrop-blur-sm px-5 py-4">
```

Change AI tools grid buttons (lines ~438-459) — bump from `py-2` to `py-2.5` and from `text-[12px]` to `text-sm`:
```tsx
// OLD for all 4 AI buttons:
className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xs bg-primary px-3 py-2 text-[12px] font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
// NEW:
className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xs bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
```

Change the bottom row buttons — "Save to Tracker" and "Apply" — make them `h-11` and more prominent:
```tsx
// OLD "Save to Tracker" button:
className={cn(
  'flex cursor-pointer items-center gap-1 rounded-xs border px-2.5 py-1.5 text-[11px] transition-all',
  isSaved
    ? 'border-primary bg-primary text-primary-foreground'
    : 'border-border bg-card hover:border-primary hover:text-primary',
)}
// NEW:
className={cn(
  'flex cursor-pointer items-center gap-2 rounded-xs border px-4 h-11 text-sm font-semibold transition-all',
  isSaved
    ? 'border-primary bg-primary text-primary-foreground'
    : 'border-border bg-card hover:border-primary hover:text-primary',
)}

// OLD "Apply" button:
className="flex cursor-pointer items-center gap-1 rounded-xs border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
// NEW:
className="flex cursor-pointer items-center gap-2 rounded-xs border border-primary bg-primary px-4 h-11 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
```

Also change the Bookmark icon size from `size={11}` to `size={14}` and ExternalLink from `size={10}` to `size={14}`.

Change the bottom row flex container to fill the width:
```tsx
// OLD:
<div className="flex items-center justify-between gap-2">
  <div className="flex items-center gap-2">
// NEW:
<div className="flex items-center gap-3">
  <div className="flex flex-1 items-center gap-3">
```

The Save to Tracker button should take `flex-1` so both buttons share the row:
- Add `flex-1` to the save button's className
- Add `flex-1` to the Apply button's className (or `shrink-0` — make both equal width with `flex-1`)

Full new bottom row:
```tsx
{/* Bottom row — primary actions */}
<div className="flex items-center gap-3 mt-3">
  {mode === 'search' && (
    <button
      onClick={onSaveToTracker}
      className={cn(
        'flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xs border h-11 text-sm font-semibold transition-all',
        isSaved
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card hover:border-primary hover:text-primary',
      )}
    >
      <Bookmark size={14} fill={isSaved ? 'currentColor' : 'none'} />
      {isSaved ? 'Saved to Tracker' : 'Save to Tracker'}
    </button>
  )}
  {job.url && (
    <button
      onClick={handleApply}
      className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xs border border-primary bg-primary h-11 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
    >
      Apply <ExternalLink size={14} />
    </button>
  )}
</div>
```

#### Step 4: `app/[locale]/(app)/layout.tsx` — Add grid to main wrapper

In `AppShell`, update the outer `<div>` wrapper:
```tsx
// OLD:
<div className="flex h-screen flex-col">
// NEW:
<div className="flex h-screen flex-col bg-grid-blueprint">
```

#### Step 5: Create `src/app/[locale]/(app)/resumes/page.tsx`

Create a new file with the Resume Collection page. This is a 'use client' page.

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from '~/i18n/routing'
import { useResumes, useDeleteResume } from '~/hooks/use-resumes'
import { useUIStore } from '~/hooks/use-ui'
import { ConfirmDialog } from '~/components/ui/confirm-dialog'
import { UploadModal } from '~/components/layout/upload-modal'
import { notify } from '~/lib/toast'
import { cn } from '~/lib/utils'
import { Plus, FileText, Trash2, ExternalLink, Clock, Zap } from 'lucide-react'
import type { Resume } from '~/types/resume'

export default function ResumesPage() {
  const router = useRouter()
  const { data: resumes = [], isLoading } = useResumes()
  const setActiveResumeId = useUIStore((s) => s.setActiveResumeId)
  const { mutateAsync: deleteResume } = useDeleteResume()

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

  const baseResumes = resumes.filter((r) => !r.isVariant)
  const variantsByBase: Record<string, Resume[]> = {}
  for (const r of resumes) {
    if (r.isVariant && r.baseResumeId) {
      if (!variantsByBase[r.baseResumeId]) variantsByBase[r.baseResumeId] = []
      variantsByBase[r.baseResumeId].push(r)
    }
  }

  const handleOpen = (id: string) => {
    setActiveResumeId(id)
    router.push(`/resume/${id}`)
  }

  const formatDate = (iso?: string) => {
    if (!iso) return ''
    try {
      const d = new Date(iso)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch { return '' }
  }

  return (
    <div className="flex h-full flex-col overflow-auto">
      {/* Page header */}
      <div className="shrink-0 border-b border-border bg-card/60 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="label-mono mb-1" style={{ fontSize: '11px' }}>[ 02 // RESUME COLLECTION ]</div>
            <h1 className="text-lg font-semibold text-foreground">My Resumes</h1>
          </div>
          <button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
          >
            <Plus size={15} strokeWidth={2.5} />
            New Resume
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6">
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-sm border border-border bg-card" />
            ))}
          </div>
        )}

        {!isLoading && baseResumes.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-sm border border-border bg-card">
              <FileText size={24} className="text-muted-foreground" />
            </div>
            <div>
              <div className="label-mono mb-1" style={{ fontSize: '11px' }}>[ STATUS: EMPTY ]</div>
              <p className="text-sm text-muted-foreground">No resumes yet. Upload or create your first one.</p>
            </div>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
            >
              <Plus size={14} strokeWidth={2.5} />
              Create Resume
            </button>
          </div>
        )}

        {!isLoading && baseResumes.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {baseResumes.map((resume) => {
              const variants = variantsByBase[resume.id] || []
              return (
                <div
                  key={resume.id}
                  className="group relative flex flex-col rounded-sm border border-border bg-card transition-all hover:border-primary/40 hover:shadow-md"
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="shrink-0 text-primary" />
                        <span className="truncate text-sm font-semibold text-foreground">{resume.name}</span>
                      </div>
                      {resume.role && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{resume.role}</p>
                      )}
                    </div>
                    {/* Score badge */}
                    {typeof resume.score === 'number' && resume.score > 0 && (
                      <span
                        className={cn(
                          'shrink-0 rounded-xs px-1.5 py-0.5 font-mono text-xs font-semibold',
                          resume.score >= 75
                            ? 'bg-success-soft text-success'
                            : resume.score >= 50
                              ? 'bg-warn-soft text-[var(--warn)]'
                              : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {resume.score}%
                      </span>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="flex-1 px-4 py-3">
                    {/* Variants count */}
                    {variants.length > 0 && (
                      <div className="mb-2">
                        <span className="label-mono text-muted-foreground">
                          {variants.length} tailored variant{variants.length > 1 ? 's' : ''}
                        </span>
                        <div className="mt-1 flex flex-col gap-0.5">
                          {variants.slice(0, 2).map((v) => (
                            <button
                              key={v.id}
                              onClick={() => handleOpen(v.id)}
                              className="flex items-center gap-1.5 text-left text-xs text-muted-foreground hover:text-primary transition-colors"
                            >
                              <span className="text-[9px]">└</span>
                              <span className="truncate">{v.variantLabel || v.name}</span>
                              {v.score > 0 && (
                                <span className="ml-auto font-mono text-[10px] text-success shrink-0">{v.score}%</span>
                              )}
                            </button>
                          ))}
                          {variants.length > 2 && (
                            <span className="text-xs text-muted-foreground pl-3">+{variants.length - 2} more</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Updated date */}
                    {resume.updatedAt && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock size={10} />
                        <span>Updated {formatDate(resume.updatedAt)}</span>
                      </div>
                    )}
                  </div>

                  {/* Card footer — actions */}
                  <div className="flex items-center justify-between border-t border-border px-3 py-2">
                    <button
                      onClick={() => handleOpen(resume.id)}
                      className="flex items-center gap-1.5 rounded-xs bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
                    >
                      <ExternalLink size={11} />
                      Open
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpen(resume.id)}
                        className="flex items-center gap-1 rounded-xs px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent-soft hover:text-primary"
                        title="Tailor this resume"
                      >
                        <Zap size={11} />
                        Tailor
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: resume.id, name: resume.name })}
                        className="rounded-xs p-1.5 text-muted-foreground transition-all hover:bg-danger-soft hover:text-destructive"
                        title="Delete resume"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* "+ New Resume" card */}
            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-border bg-card/50 text-muted-foreground transition-all hover:border-primary/50 hover:bg-accent-soft hover:text-primary"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-border bg-background">
                <Plus size={18} strokeWidth={2} />
              </div>
              <span className="text-sm font-medium">New Resume</span>
            </button>
          </div>
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

      <UploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
      />
    </div>
  )
}
```

**Note**: The `Resume` type may not have `updatedAt` or `isVariant` or `baseResumeId` or `variantLabel` — check `src/app/types/resume.ts` and only use fields that actually exist. If `updatedAt` doesn't exist, omit that section. If `isVariant`/`baseResumeId` don't exist, just show all resumes flat.

---

### 4.5 Vertical-Slice Order

1. `globals.css` — CSS var + utility class (no deps, pure CSS, immediately testable)
2. `layout.tsx` — add `bg-grid-blueprint` to AppShell (verifiable on any page)
3. `sidebar.tsx` — font bump + replace resume list (verifiable by opening the app sidebar)
4. `resumes/page.tsx` — new page (verifiable by navigating to `/resumes`)
5. `job-detail-panel.tsx` — widen drawer + enlarge buttons (verifiable by opening any job card)

---

### 5. Assertion & Testing Requirements

No behavior changes to auth, data, or API contracts. This is pure UI.

- **Unit Tests**: N/A — no behavior change, pure CSS/JSX layout
- **Integration Tests**: N/A
- **E2E UI Tests**: N/A — visual-only changes, no user flow changes

---

### 6. Verification Commands & Log Files

- **TypeScript check**: `npx tsc --noEmit` (run from project root)
- **Lint**: `pnpm lint`
- **Build**: `pnpm build`
- **Dev server**: `pnpm dev` — visually verify:
  1. Sidebar nav links are visibly larger (14px vs previous 12px)
  2. Sidebar shows "My Resumes" as a single nav link, not a list
  3. Navigating to `/resumes` shows the collection page
  4. Opening a job detail panel shows `max-w-2xl` width
  5. "Save to Tracker" and "Apply" buttons are `h-11` with high-contrast styling
  6. Faint dot-grid pattern is visible in the app background
- **Log location**: `pnpm build` stderr / `.next/` build output

---

### Important Notes for Engineer

1. **Check `Resume` type fields**: Before using `updatedAt`, `isVariant`, `baseResumeId`, `variantLabel` in the new resumes page, read `src/app/types/resume.ts` to confirm these fields exist. They are referenced in sidebar.tsx (lines 141-150) so they should exist, but verify.

2. **Do NOT add `bg-grid-blueprint` behind resume templates** — only in the app shell wrapper. The `resume-paper` class already overrides with a white background.

3. **Admin sidebar**: The sidebar has an admin mode that renders a completely different nav. The resume list removal only applies to the non-admin `else` branch — the admin block is untouched.

4. **i18n**: The `t('resumes')` translation key already exists in `messages/en.json` as `"My Resumes"`. The `/resumes` route does not need its own i18n strings beyond what's already available.

5. **After removing resume list from sidebar**: `useResumes`, `useDeleteResume`, `ConfirmDialog`, `PreviewCard`, `useMemo`, `Plus`, `Trash2`, `UploadModal` imports may all become unused. Clean them up to avoid lint errors. Keep `FileText` (used for the new nav link icon).

6. **Module path alias**: Use `~/` for imports from `src/app/`, and `@/` for imports from the project root. Follow the pattern seen in existing files.
