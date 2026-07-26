# Implementation Spec & Plan: Component Dedup Refactor

> **Goal**: Extract repeated inline UI patterns into reusable components in `src/app/components/ui/`. Pure refactor — zero visual or behavioral changes.

---

### 0. Architectural Decision Record (ADR) & Scaling Tradeoffs

**Context & Constraints**: The codebase has 5 identified duplication patterns. The overriding constraint is **IDENTICAL visual output** — this is explicitly a pure refactor. No behavioral change, no new dependencies, no visual deviation.

**Chosen Architecture**: Create 3 new minimal UI components (`ScoreBadge`, `EmptyState`, `SegmentedControl`), each following the existing pattern in `neuro-card.tsx` (React function component + `cn()` utility + `React.ComponentProps`/explicit props). Defer 2 patterns (`NeuroCard` migration, `StatCard`) where risk of visual change exceeds dedup benefit.

**Discarded Alternatives**:

- **NeuroCard 37-file migration — DEFERRED**: The `NeuroCard` component wraps `neuroCardVariants()` whose CVA base string is `"transition-shadow duration-200"`. Raw usages write `className="... neuro-card ..."` WITHOUT these transition classes. Replacing raw usage with `<NeuroCard>` would inject `transition-shadow duration-200` into 37 files, causing subtle shadow-transition animations that don't exist today. This violates the "identical output" constraint. To make this safe, the `neuroCardVariants` base would need to drop the transition classes — but that changes existing NeuroCard consumers and is out of scope. **Decision: Do NOT migrate raw `neuro-card` usages to `<NeuroCard>`.**

- **StatCard — DEFERRED**: Only 2 structurally consistent usages exist (interview-summary.tsx cards 1 & 2). The 3rd card in that file has a different layout (trend icon + colored delta). Dashboard "stat cards" are structurally different (`<Link>` + `neuro-card p-4`, not `neuro-inset p-3 text-center`). Below the 3+ consistent usages threshold. **Decision: Do NOT create StatCard.**

- **SegmentedControl Button-based instances — DEFERRED**: 3 of 5 toggle instances use `<Button variant="ghost">` which injects base classes (`inline-flex items-center justify-center transition-colors focus-visible:ring-* cursor-pointer hover:bg-accent-soft hover:text-foreground [&_svg]:*`). A SegmentedControl rendering plain `<button>` would strip these, changing hover behavior, focus rings, cursor, and vertical centering. Converting in the other direction (plain button → Button) adds `hover:bg-accent-soft` not present today. **Decision: Create SegmentedControl for the 2 plain-`<button>` instances only; defer the 3 `<Button>` instances.**

---

### 1. Target Files & Folder Structure

#### New files to CREATE (3):

| File | Lines (est.) | Purpose |
|------|------|---------|
| `src/app/components/ui/score-badge.tsx` | ~30 | Score-colored badge span with threshold-based color |
| `src/app/components/ui/empty-state.tsx` | ~25 | Centered empty-state wrapper with icon/title/description/action slots |
| `src/app/components/ui/segmented-control.tsx` | ~35 | Generic segmented toggle control |

#### Existing files to MODIFY (8):

| File | Components Applied |
|------|-------------------|
| `src/app/components/chat/job-preview.tsx` | ScoreBadge |
| `src/app/components/resume/job-search-panel.tsx` | ScoreBadge, EmptyState (×2) |
| `src/app/[locale]/(app)/resumes/page.tsx` | ScoreBadge, EmptyState |
| `src/app/components/pipeline/job-detail-panel.tsx` | ScoreBadge |
| `src/app/[locale]/(app)/cover-letter/page.tsx` | EmptyState, SegmentedControl (×2) |
| `src/app/components/ats/ats-view.tsx` | EmptyState |
| `src/app/components/dashboard/dashboard-view.tsx` | EmptyState |
| `src/app/components/resume/tailor-review-panel.tsx` | EmptyState |

**File size rule**: All 3 new files are well under 300 lines. No existing file grows significantly (net line change is negative or neutral — replacing inline code with a component tag).

---

### 2. Import Definitions & Dependencies

All new components use only existing project utilities:

```tsx
import * as React from "react"
import { cn } from "~/lib/utils"
```

- `~/` maps to `./src/app/` (per AGENTS.md §7).
- `cn` is `clsx + twMerge` from `src/app/lib/utils.ts`.
- No new dependencies. No CVA needed for these components (simpler than neuro-card; they use direct `cn()` calls).

**Import path for consumers**: `import { ScoreBadge } from "~/components/ui/score-badge"` (matches existing `~/components/ui/button` convention).

---

### 3. Database Schema Changes

**N/A** — Pure UI refactor. No schema, migration, or data changes.

---

### 4. Step-by-Step Edits

#### ✅ STEP 1: Create `src/app/components/ui/score-badge.tsx`

**Design rationale**: The score-color ternary is the dedup target. Two low-score variants exist in the codebase: `bg-muted text-muted-foreground` (3 files) and `bg-danger-soft text-destructive` (1 file: resumes/page.tsx). The `lowTone` prop preserves both exactly. Size/padding classes vary per usage, so they're passed via `className` (twMerge-safe). The component renders `<span>` to match all existing usages.

```tsx
import * as React from "react"
import { cn } from "~/lib/utils"

/**
 * Score badge with threshold-based color.
 * - score >= 75 → success (green)
 * - score >= 50 → warn (amber)
 * - score < 50  → muted or danger (controlled by `lowTone`)
 *
 * @example
 * <ScoreBadge score={job.score} className="shrink-0 px-2 py-0.5 text-xs" />
 * <ScoreBadge score={resume.score} lowTone="danger" className="px-1.5 py-0.5 text-xs" />
 * <ScoreBadge score={job.score} className="px-2 py-0.5 text-xs">{job.score}% Match</ScoreBadge>
 */
function ScoreBadge({
  score,
  lowTone = "muted",
  className,
  children,
}: {
  score: number
  lowTone?: "muted" | "danger"
  className?: string
  children?: React.ReactNode
}) {
  const tone =
    score >= 75
      ? "bg-success-soft text-success"
      : score >= 50
        ? "bg-warn-soft text-warn"
        : lowTone === "danger"
          ? "bg-danger-soft text-destructive"
          : "bg-muted text-muted-foreground"

  return (
    <span
      className={cn("rounded-xs font-mono font-semibold", tone, className)}
    >
      {children ?? `${score}%`}
    </span>
  )
}

export { ScoreBadge }
```

**Key detail**: Base classes are `rounded-xs font-mono font-semibold` — these are present in ALL 4 existing usages. The `tone` classes are computed internally. The `className` prop supplies size-specific classes (`px-*`, `py-*`, `text-*`, `shrink-0`). `children` defaults to `"{score}%"` but can be overridden (job-detail-panel uses `"{score}% Match"`).

---

#### ✅ STEP 2: Create `src/app/components/ui/empty-state.tsx`

**Design rationale**: Empty states share a common wrapper (`flex flex-col items-center justify-center text-center`) but vary widely in padding, icon styling, title element, and action complexity. Making all slots `ReactNode` (caller controls exact markup) guarantees identical output. The component deduplicates the wrapper + establishes a discoverable `<EmptyState>` pattern.

```tsx
import * as React from "react"
import { cn } from "~/lib/utils"

/**
 * Centered empty-state layout with optional icon, title, description, and action slots.
 * All slots are ReactNode — the caller controls exact markup to preserve visual identity.
 *
 * @example
 * <EmptyState
 *   className="py-16"
 *   icon={<div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl neuro-icon-well"><FileText size={24} /></div>}
 *   title={<h3 className="mb-1 text-sm font-semibold text-foreground">No data</h3>}
 *   description={<p className="text-sm text-muted-foreground">Add something to get started.</p>}
 *   action={<Button>Add Item</Button>}
 * />
 */
function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  children,
}: {
  icon?: React.ReactNode
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center text-center", className)}
    >
      {icon}
      {title}
      {description}
      {action}
      {children}
    </div>
  )
}

export { EmptyState }
```

**Slot render order**: icon → title → description → action → children. This matches the visual order in all 6 existing usages. Callers that need a different order can pass everything via `children`.

---

#### ✅ STEP 3: Create `src/app/components/ui/segmented-control.tsx`

**Design rationale**: Only the 2 plain-`<button>` instances in cover-letter/page.tsx are refactored. The component renders `<button>` elements (NOT `<Button>`) to match. The active/inactive ternary and button base classes are deduplicated. The generic `<T extends string>` type parameter provides type-safe value/onChange.

```tsx
import * as React from "react"
import { cn } from "~/lib/utils"

/**
 * Segmented toggle control (neumorphic pill style).
 * Renders plain <button> elements inside a neuro-inset wrapper.
 *
 * @example
 * <SegmentedControl
 *   value={mode}
 *   onChange={setMode}
 *   options={[
 *     { value: "quick", label: "Quick" },
 *     { value: "jd", label: "Job Description" },
 *   ]}
 * />
 */
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: React.ReactNode }[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={cn("flex gap-1.5 rounded-sm neuro-inset p-0.5 shrink-0", className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 rounded-xs py-1.5 text-xs font-semibold transition-all cursor-pointer text-center",
            value === opt.value
              ? "neuro-card text-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export { SegmentedControl }
```

**Key detail**: `type="button"` is added to prevent form submission (best practice; these are toggle buttons, not submit buttons). This does NOT change visual output. The button base classes (`flex-1 rounded-xs py-1.5 text-xs font-semibold transition-all cursor-pointer text-center`) match exactly what cover-letter/page.tsx currently uses.

---

#### ✅ STEP 4: Refactor `src/app/components/chat/job-preview.tsx` — ScoreBadge

**Add import** (after existing `cn` import on line 9):
```tsx
import { ScoreBadge } from '~/components/ui/score-badge'
```

**Before** (lines 179–186):
```tsx
                  <span
                    className={cn(
                      'shrink-0 rounded-xs px-1.5 py-0.5 font-mono text-[10px] font-semibold',
                      job.score >= 75 ? 'bg-success-soft text-success' : job.score >= 50 ? 'bg-warn-soft text-warn' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {job.score}%
                  </span>
```

**After**:
```tsx
                  <ScoreBadge
                    score={job.score}
                    className="shrink-0 px-1.5 py-0.5 text-[10px]"
                  />
```

**Verification**: Component renders `<span class="rounded-xs font-mono font-semibold bg-success-soft text-success shrink-0 px-1.5 py-0.5 text-[10px]">75%</span>`. twMerge resolves the class list identically to the original. ✓

---

#### ✅ STEP 5: Refactor `src/app/components/resume/job-search-panel.tsx` — ScoreBadge + EmptyState (×2)

**Add imports** (after existing `cn` import on line 12):
```tsx
import { ScoreBadge } from '~/components/ui/score-badge'
import { EmptyState } from '~/components/ui/empty-state'
```

**5a. ScoreBadge — Before** (lines 844–851):
```tsx
        <span
          className={cn(
            'shrink-0 rounded-xs px-2 py-0.5 font-mono text-xs font-semibold',
            job.score >= 75 ? 'bg-success-soft text-success' : job.score >= 50 ? 'bg-warn-soft text-warn' : 'bg-muted text-muted-foreground',
          )}
        >
          {job.score}%
        </span>
```

**After**:
```tsx
        <ScoreBadge
          score={job.score}
          className="shrink-0 px-2 py-0.5 text-xs"
        />
```

**5b. EmptyState #1 — Before** (lines 708–714):
```tsx
        {!loading && !searched && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
            <Search size={24} className="text-muted-foreground/40" />
            <div className="text-sm text-muted-foreground">
              Search for real jobs matching your skills.
            </div>
          </div>
        )}
```

**After**:
```tsx
        {!loading && !searched && (
          <EmptyState
            className="py-16 gap-2"
            icon={<Search size={24} className="text-muted-foreground/40" />}
            description={
              <div className="text-sm text-muted-foreground">
                Search for real jobs matching your skills.
              </div>
            }
          />
        )}
```

**5c. EmptyState #2 — Before** (lines 717–725):
```tsx
        {!loading && searched && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
            <AlertCircle size={20} className="text-muted-foreground/40" />
            <div className="text-sm text-muted-foreground">
              {results.length === 0
                ? 'No jobs found. Try different keywords.'
                : `No jobs match your filters. ${activeFilterCount > 0 ? 'Try clearing filters.' : ''}`}
            </div>
          </div>
        )}
```

**After**:
```tsx
        {!loading && searched && filtered.length === 0 && (
          <EmptyState
            className="py-16 gap-2"
            icon={<AlertCircle size={20} className="text-muted-foreground/40" />}
            description={
              <div className="text-sm text-muted-foreground">
                {results.length === 0
                  ? 'No jobs found. Try different keywords.'
                  : `No jobs match your filters. ${activeFilterCount > 0 ? 'Try clearing filters.' : ''}`}
              </div>
            }
          />
        )}
```

---

#### ✅ STEP 6: Refactor `src/app/[locale]/(app)/resumes/page.tsx` — ScoreBadge + EmptyState

**Add imports** (after existing `cn` import on line 10):
```tsx
import { ScoreBadge } from '~/components/ui/score-badge'
import { EmptyState } from '~/components/ui/empty-state'
```

**6a. ScoreBadge — Before** (lines 121–134):
```tsx
                    {typeof resume.score === 'number' && resume.score > 0 && (
                      <span
                        className={cn(
                          'shrink-0 rounded-xs px-1.5 py-0.5 font-mono text-xs font-semibold',
                          resume.score >= 75
                            ? 'bg-success-soft text-success'
                            : resume.score >= 50
                              ? 'bg-warn-soft text-warn'
                              : 'bg-danger-soft text-destructive',
                        )}
                      >
                        {resume.score}%
                      </span>
                    )}
```

**After**:
```tsx
                    {typeof resume.score === 'number' && resume.score > 0 && (
                      <ScoreBadge
                        score={resume.score}
                        lowTone="danger"
                        className="shrink-0 px-1.5 py-0.5 text-xs"
                      />
                    )}
```

**Critical**: `lowTone="danger"` preserves the `bg-danger-soft text-destructive` low-score variant unique to this file. ✓

**6b. EmptyState — Before** (lines 81–98):
```tsx
        {!isLoading && baseResumes.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center rounded-sm neuro-inset border border-dashed border-border">
            <div className="flex h-14 w-14 items-center justify-center rounded-sm neuro-icon-well">
              <FileText size={24} className="text-muted-foreground" />
            </div>
            <div>
              <div className="label-mono mb-1 text-xs">[ STATUS: EMPTY ]</div>
              <p className="text-sm text-muted-foreground">No resumes yet. Upload or create your first one.</p>
            </div>
            <Button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-2 rounded-sm text-sm font-semibold"
            >
              <Plus size={14} strokeWidth={2.5} />
              Create Resume
            </Button>
          </div>
        )}
```

**After**:
```tsx
        {!isLoading && baseResumes.length === 0 && (
          <EmptyState
            className="gap-4 py-24 rounded-sm neuro-inset border border-dashed border-border"
            icon={
              <div className="flex h-14 w-14 items-center justify-center rounded-sm neuro-icon-well">
                <FileText size={24} className="text-muted-foreground" />
              </div>
            }
            title={
              <div>
                <div className="label-mono mb-1 text-xs">[ STATUS: EMPTY ]</div>
                <p className="text-sm text-muted-foreground">No resumes yet. Upload or create your first one.</p>
              </div>
            }
            action={
              <Button
                onClick={() => setUploadModalOpen(true)}
                className="flex items-center gap-2 rounded-sm text-sm font-semibold"
              >
                <Plus size={14} strokeWidth={2.5} />
                Create Resume
              </Button>
            }
          />
        )}
```

**Note**: The title+description are wrapped in a single `<div>` to match the original nesting exactly. ✓

---

#### ✅ STEP 7: Refactor `src/app/components/pipeline/job-detail-panel.tsx` — ScoreBadge

**Add import** (after existing `cn` import on line 7):
```tsx
import { ScoreBadge } from '~/components/ui/score-badge'
```

**Before** (lines 210–221):
```tsx
            <span
              className={cn(
                'rounded-xs px-2 py-0.5 font-mono text-xs font-semibold',
                job.score >= 75
                  ? 'bg-success-soft text-success'
                  : job.score >= 50
                    ? 'bg-warn-soft text-warn'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              {job.score}% Match
            </span>
```

**After**:
```tsx
            <ScoreBadge
              score={job.score}
              className="px-2 py-0.5 text-xs"
            >
              {job.score}% Match
            </ScoreBadge>
```

**Critical**: Uses `children` override to render `"{score}% Match"` instead of default `"{score}%"`. Note: no `shrink-0` in original (unlike other usages) — the className prop does not include it, preserving identical output. ✓

---

#### ✅ STEP 8: Refactor `src/app/[locale]/(app)/cover-letter/page.tsx` — EmptyState + SegmentedControl (×2)

**Add imports** (after line 14, the Textarea import):
```tsx
import { EmptyState } from '~/components/ui/empty-state'
import { SegmentedControl } from '~/components/ui/segmented-control'
```

**8a. SegmentedControl #1 (mode toggle) — Before** (lines 303–320):
```tsx
            <div className="flex gap-1.5 rounded-sm neuro-inset p-0.5 shrink-0">
              <button
                onClick={() => setMode('quick')}
                className={`flex-1 rounded-xs py-1.5 text-xs font-semibold transition-all cursor-pointer text-center ${
                  mode === 'quick' ? 'neuro-card text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('quickFields')}
              </button>
              <button
                onClick={() => setMode('jd')}
                className={`flex-1 rounded-xs py-1.5 text-xs font-semibold transition-all cursor-pointer text-center ${
                  mode === 'jd' ? 'neuro-card text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('fullJobDescription')}
              </button>
            </div>
```

**After**:
```tsx
            <SegmentedControl
              value={mode}
              onChange={setMode}
              options={[
                { value: 'quick', label: t('quickFields') },
                { value: 'jd', label: t('fullJobDescription') },
              ]}
            />
```

**8b. SegmentedControl #2 (language toggle) — Before** (lines 326–343):
```tsx
            <div className="flex gap-1.5 rounded-sm neuro-inset p-0.5 shrink-0">
              <button
                onClick={() => setOutputLanguage('en')}
                className={`flex-1 rounded-xs py-1.5 text-xs font-semibold transition-all cursor-pointer text-center ${
                  outputLanguage === 'en' ? 'neuro-card text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setOutputLanguage('th')}
                className={`flex-1 rounded-xs py-1.5 text-xs font-semibold transition-all cursor-pointer text-center ${
                  outputLanguage === 'th' ? 'neuro-card text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                ภาษาไทย
              </button>
            </div>
```

**After**:
```tsx
            <SegmentedControl
              value={outputLanguage}
              onChange={setOutputLanguage}
              options={[
                { value: 'en', label: 'English' },
                { value: 'th', label: 'ภาษาไทย' },
              ]}
            />
```

**Type safety**: `setMode` expects `'quick' | 'jd'` and `setOutputLanguage` expects `'en' | 'th'`. The generic `<T extends string>` infers correctly from the `options` array literal. ✓

**8c. EmptyState — Before** (lines 522–531):
```tsx
            <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl neuro-icon-well text-muted-foreground/40">
                <FileText size={24} />
              </div>
              <h3 className="mb-1 text-sm font-semibold text-foreground">No Cover Letter Generated</h3>
              <p className="text-sm text-muted-foreground">
                Select or upload a resume on the left, type the target company and position details, and click Generate to write your letter.
              </p>
            </div>
```

**After**:
```tsx
            <EmptyState
              className="py-20 max-w-sm"
              icon={
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl neuro-icon-well text-muted-foreground/40">
                  <FileText size={24} />
                </div>
              }
              title={<h3 className="mb-1 text-sm font-semibold text-foreground">No Cover Letter Generated</h3>}
              description={
                <p className="text-sm text-muted-foreground">
                  Select or upload a resume on the left, type the target company and position details, and click Generate to write your letter.
                </p>
              }
            />
```

---

#### ✅ STEP 9: Refactor `src/app/components/ats/ats-view.tsx` — EmptyState

**Add import** (near top of file, after existing imports):
```tsx
import { EmptyState } from '~/components/ui/empty-state'
```

**Before** (lines 490–516):
```tsx
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl neuro-icon-well">
              <FileText size={24} className="text-muted-foreground/50" />
            </div>
            <h3 className="mb-1 text-sm font-semibold text-foreground">No resume selected</h3>
            <p className="mb-4 max-w-xs text-sm text-muted-foreground">
              Select a resume from the dropdown or upload one in chat, then paste a job description to get an ATS match score.
            </p>
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
              <Button variant="default" size="sm" onClick={() => router.push('/chat')} className="flex items-center gap-1.5 rounded-sm px-3 py-2 text-sm">
                <Upload size={12} /> Upload Resume
              </Button>
              <span className="hidden items-center text-muted-foreground sm:flex">
                <ArrowRight size={14} />
              </span>
              <div className="flex items-center gap-1.5 rounded-sm neuro-inset px-3 py-1.5 text-xs text-muted-foreground">
                Select Profile
              </div>
              <span className="hidden items-center text-muted-foreground sm:flex">
                <ArrowRight size={14} />
              </span>
              <div className="flex items-center gap-1.5 rounded-sm neuro-inset px-3 py-1.5 text-xs text-muted-foreground">
                Paste JD
              </div>
            </div>
          </div>
```

**After**:
```tsx
          <EmptyState
            className="py-16"
            icon={
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl neuro-icon-well">
                <FileText size={24} className="text-muted-foreground/50" />
              </div>
            }
            title={<h3 className="mb-1 text-sm font-semibold text-foreground">No resume selected</h3>}
            description={
              <p className="mb-4 max-w-xs text-sm text-muted-foreground">
                Select a resume from the dropdown or upload one in chat, then paste a job description to get an ATS match score.
              </p>
            }
            action={
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                <Button variant="default" size="sm" onClick={() => router.push('/chat')} className="flex items-center gap-1.5 rounded-sm px-3 py-2 text-sm">
                  <Upload size={12} /> Upload Resume
                </Button>
                <span className="hidden items-center text-muted-foreground sm:flex">
                  <ArrowRight size={14} />
                </span>
                <div className="flex items-center gap-1.5 rounded-sm neuro-inset px-3 py-1.5 text-xs text-muted-foreground">
                  Select Profile
                </div>
                <span className="hidden items-center text-muted-foreground sm:flex">
                  <ArrowRight size={14} />
                </span>
                <div className="flex items-center gap-1.5 rounded-sm neuro-inset px-3 py-1.5 text-xs text-muted-foreground">
                  Paste JD
                </div>
              </div>
            }
          />
```

**Note**: The complex action area (buttons + arrows + inset chips) is passed wholesale as the `action` slot. No structural change. ✓

---

#### ✅ STEP 10: Refactor `src/app/components/dashboard/dashboard-view.tsx` — EmptyState

**Add import** (after existing `cn` import on line 13):
```tsx
import { EmptyState } from '~/components/ui/empty-state'
```

**Before** (lines 103–121):
```tsx
  if (resumeCount === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center neuro-surface">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-accent-soft text-brand">
          <FileText size={24} />
        </div>
        <h3 className="mb-1 text-sm font-semibold text-foreground">{t('noResumesTitle')}</h3>
        <p className="mb-6 max-w-sm text-sm text-muted-foreground">
          {t('noResumesDesc')}
        </p>
        <Button
          variant="default"
          onClick={() => router.push('/chat')}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium"
        >
          {t('getStarted')} <ArrowRight size={13} />
        </Button>
      </div>
    )
  }
```

**After**:
```tsx
  if (resumeCount === 0) {
    return (
      <EmptyState
        className="h-full w-full p-6 neuro-surface"
        icon={
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-accent-soft text-brand">
            <FileText size={24} />
          </div>
        }
        title={<h3 className="mb-1 text-sm font-semibold text-foreground">{t('noResumesTitle')}</h3>}
        description={
          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
            {t('noResumesDesc')}
          </p>
        }
        action={
          <Button
            variant="default"
            onClick={() => router.push('/chat')}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium"
          >
            {t('getStarted')} <ArrowRight size={13} />
          </Button>
        }
      />
    )
  }
```

**Note**: The original wrapper has `h-full w-full` (not just the default flex wrapper). These are passed via `className`. The `neuro-surface` is also in className. ✓

---

#### ✅ STEP 11: Refactor `src/app/components/resume/tailor-review-panel.tsx` — EmptyState

**Add import** (after existing `cn` import on line 6):
```tsx
import { EmptyState } from '~/components/ui/empty-state'
```

**Before** (lines 201–205):
```tsx
        {changes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-xs text-muted-foreground">No changes proposed by AI.</p>
            <p className="text-[10px] text-muted-foreground/50 mt-1">Your resume is already well-optimized.</p>
          </div>
        )}
```

**After**:
```tsx
        {changes.length === 0 && (
          <EmptyState className="py-8">
            <p className="text-xs text-muted-foreground">No changes proposed by AI.</p>
            <p className="text-[10px] text-muted-foreground/50 mt-1">Your resume is already well-optimized.</p>
          </EmptyState>
        )}
```

**Note**: Uses `children` slot instead of title/description since the structure is two custom `<p>` tags with no icon. ✓

---

### 4.5 Vertical-Slice Order

Each step is independently verifiable. The recommended order:

1. **Slice A** (Steps 1–3): Create all 3 new component files. Verify with `npx tsc --noEmit`.
2. **Slice B** (Step 4): Refactor job-preview.tsx (ScoreBadge). Verify `tsc`.
3. **Slice C** (Step 5): Refactor job-search-panel.tsx (ScoreBadge + EmptyState ×2). Verify `tsc`.
4. **Slice D** (Step 6): Refactor resumes/page.tsx (ScoreBadge + EmptyState). Verify `tsc`.
5. **Slice E** (Step 7): Refactor job-detail-panel.tsx (ScoreBadge). Verify `tsc`.
6. **Slice F** (Step 8): Refactor cover-letter/page.tsx (SegmentedControl ×2 + EmptyState). Verify `tsc`.
7. **Slice G** (Step 9): Refactor ats-view.tsx (EmptyState). Verify `tsc`.
8. **Slice H** (Step 10): Refactor dashboard-view.tsx (EmptyState). Verify `tsc`.
9. **Slice I** (Step 11): Refactor tailor-review-panel.tsx (EmptyState). Verify `tsc`.
10. **Final**: Run `pnpm build` to confirm production build passes.

---

### 5. Assertion & Testing Requirements

**N/A — no behavior change.** This is a pure visual refactor. No logic, API, data flow, or user-visible behavior changes. Tests are not required.

The verification gate is:
1. `npx tsc --noEmit` — TypeScript compilation passes (ensures imports, types, and JSX are correct).
2. `pnpm build` — Production build succeeds (ensures no runtime import errors, no missing exports).
3. **Code review** — Verify each before/after produces identical class strings (the Reviewer's job).

---

### 6. Verification Commands & Log Files

| Check | Command |
|-------|---------|
| TypeScript | `npx tsc --noEmit` |
| Build | `pnpm build` |
| Lint | `pnpm lint` |

**If `tsc` fails**: Check import paths (`~/components/ui/score-badge` etc.) and ensure the new files export the component correctly.

**If `build` fails**: Check for circular imports (unlikely — new components only import `react` and `cn`), or missing `"use client"` directives (not needed — these are presentational components without hooks, but they'll be imported into client components which already have `"use client"`).

**Server logs**: Dev server logs at `stdout`/`stderr` in the terminal running `pnpm dev`. Build errors appear in terminal running `pnpm build`.

---

### Appendix: Deferred Patterns (Documented for Future Reference)

#### NeuroCard Migration (37 files)
**Why deferred**: `neuroCardVariants` CVA base is `"transition-shadow duration-200"`. Raw `className="neuro-card"` usages lack these classes. Migration would inject shadow transitions into 37 files, violating "identical output." To enable: remove the transition base from `neuro-variants.ts` (breaking change for existing NeuroCard consumers — needs separate audit).

#### StatCard
**Why deferred**: Only 2 structurally consistent usages (interview-summary.tsx). Dashboard cards use a different structure (`<Link>` + `neuro-card`, not `neuro-inset`). Below 3+ threshold.

#### SegmentedControl — Button-based instances (3 instances)
**Why deferred**: `cover-letter-editor.tsx` (2) and `resume-detail.tsx` (1) use `<Button variant="ghost">` which injects base classes (`inline-flex items-center justify-center transition-colors focus-visible:ring-* cursor-pointer hover:bg-accent-soft hover:text-foreground`). Converting to plain `<button>` would strip these, changing hover behavior, focus rings, and cursor. To enable: either (a) standardize all toggles to plain `<button>` and accept the visual change, or (b) create a separate `SegmentedControlButton` variant that wraps `<Button>`.
