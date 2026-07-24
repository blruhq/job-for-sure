# Implementation Spec & Plan: Neumorphic Tonal Consistency Audit

### 0. Architectural Decision Record (ADR) & Scaling Tradeoffs
- **Context & Constraints**: The app uses a 4-tier neumorphic tonal system (light mode only; dark mode neutralizes). Many components were written before the system was locked, resulting in tonal inversions (cards darker than parents), flat `bg-background`/`bg-card` surfaces breaking the neumorphic illusion, and shared UI primitives (Sheet, Select, AlertDialog) not participating in the system at all.
- **Chosen Architecture**: Fix at two levels: (1) **Shared UI primitives** (`sheet.tsx`, `select.tsx`, `alert-dialog.tsx`, `skeleton.tsx`, `button.tsx`) — add neuro classes to their default variant so every consumer inherits consistency automatically. (2) **Page/component-level** — replace hardcoded `bg-background`, `bg-card`, `bg-muted/30`, `bg-border/30`, and incorrect `neuro-surface`-inside-`neuro-card` patterns with the correct tier. This two-level approach minimizes total edits (shared primitive fixes cascade to all consumers).
- **Discarded Alternatives**:
  - *Alternative A*: Per-component overrides only (not touching shared primitives). Rejected — would require ~50+ individual edits vs ~8 shared + ~30 component edits, and future components would repeat the same mistakes.
  - *Alternative B*: Global CSS overrides for `bg-background`/`bg-card`. Rejected — these tokens are used in dark mode and non-neuro contexts (code blocks, spinners). Overriding globally would break dark mode.

### 1. Target Files & Folder Structure

**Shared UI Primitives (fix once, cascade everywhere):**
- `src/app/components/ui/sheet.tsx` — SheetContent: add `neuro-surface`
- `src/app/components/ui/select.tsx` — SelectContent: add `neuro-card`
- `src/app/components/ui/alert-dialog.tsx` — AlertDialogContent: add `neuro-modal`
- `src/app/components/ui/skeleton.tsx` — SkeletonCard/Gauge/Column: replace `bg-card` with `neuro-card`
- `src/app/components/ui/button.tsx` — outline variant: replace `bg-card` with `neuro-surface` base

**Component-Level Fixes (P0 — Tonal Violations):**
- `src/app/components/interview/interview-summary.tsx` — 4 instances
- `src/app/components/interview/interview-view.tsx` — 2 instances
- `src/app/components/resume/tailor-review-panel.tsx` — 2 instances
- `src/app/components/resume/cover-letter-editor.tsx` — 4 instances
- `src/app/components/resume/resume-copilot.tsx` — 1 instance
- `src/app/components/resume/resume-detail.tsx` — 5 instances
- `src/app/[locale]/(app)/settings/page.tsx` — 1 instance (root surface)
- `src/app/[locale]/(app)/settings/billing/page.tsx` — 1 instance (root surface)
- `src/app/[locale]/(app)/loading.tsx` — 1 instance
- `src/app/[locale]/(app)/ats/loading.tsx` — 1 instance
- `src/app/[locale]/(app)/applications/loading.tsx` — 1 instance
- `src/app/[locale]/error.tsx` — 1 instance
- `src/app/[locale]/(app)/error.tsx` — 1 instance
- `src/components/billing/upgrade-wall.tsx` — 1 instance

**Component-Level Fixes (P1 — Missing Neumorphic Styling):**
- `src/app/[locale]/not-found.tsx` — 1 instance
- `src/app/[locale]/(marketing)/page.tsx` — 2 instances (marketing buttons)
- `src/app/components/marketing/interview-section.tsx` — 2 instances
- `src/app/components/marketing/features-bento.tsx` — 1 instance
- `src/app/components/pipeline/job-detail-panel.tsx` — 1 instance (SheetContent already fixed via shared)

**No new files created. All edits are className string replacements.**

### 2. Import Definitions & Dependencies
- No new imports needed. All changes are className string edits within existing TSX files.
- The CSS classes (`.neuro-surface`, `.neuro-card`, `.neuro-inset`, `.neuro-modal`, `.neuro-pill`, `.neuro-icon-well`) are already defined in `src/app/globals.css`.
- The `cn()` utility from `~/lib/utils` is already imported in all affected files.

### 3. Database Schema Changes
- N/A — pure CSS className changes, no data model impact.

### 4. Step-by-Step Edits

---

#### STEP 1: Shared UI Primitives (fix once → cascade to all consumers)

##### ✅ 1a. `src/app/components/ui/sheet.tsx` — SheetContent
**Line 54**: Replace `bg-popover bg-clip-padding` with `neuro-surface bg-clip-padding`.

**Before:**
```
"fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition ..."
```
**After:**
```
"fixed z-50 flex flex-col gap-4 neuro-surface bg-clip-padding text-sm text-popover-foreground shadow-lg transition ..."
```

##### ✅ 1b. `src/app/components/ui/select.tsx` — SelectContent
**Line 84**: Replace `bg-popover` with `neuro-card` in the Popup className.

**Before:**
```
"... rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 ..."
```
**After:**
```
"... rounded-lg neuro-card text-popover-foreground shadow-md ring-1 ring-foreground/10 ..."
```

##### ✅ 1c. `src/app/components/ui/alert-dialog.tsx` — AlertDialogContent
**Line 54**: Replace `bg-popover` with `neuro-modal`.

**Before:**
```
"... rounded-xl bg-popover p-4 text-popover-foreground ring-1 ring-foreground/10 ..."
```
**After:**
```
"... rounded-xl neuro-modal p-4 text-popover-foreground ring-1 ring-foreground/10 ..."
```

##### ✅ 1d. `src/app/components/ui/skeleton.tsx` — SkeletonCard, SkeletonGauge, SkeletonColumn
**Line 24** (SkeletonCard): Replace `border border-border bg-card p-4` with `neuro-card p-4`.
**Line 45** (SkeletonGauge): Replace `border border-border bg-card p-4` with `neuro-card p-4`.
**Line 60** (SkeletonColumn): Replace `border border-border bg-card p-2.5` with `neuro-inset p-2.5`.

##### ✅ 1e. `src/app/components/ui/button.tsx` — outline variant
**Line 13**: Replace `border border-border bg-card hover:bg-accent-soft` with `neuro-surface border border-border hover:bg-accent-soft`.

This makes outline buttons use the base surface tone instead of a flat `bg-card`, so they blend with the neumorphic surface they sit on.

---

#### STEP 2: P0 — Tonal Violations (cards darker than parents)

##### ✅ 2a. `src/app/components/interview/interview-summary.tsx`

The parent container at **line 81** is `rounded-lg neuro-card p-6` (Tier 2). All children using `neuro-surface` (Tier 1, darker) must switch to `neuro-inset` (Tier 3, lighter).

**Line 92** — stat card 1:
- Before: `rounded-md border border-border neuro-surface p-3 text-center`
- After: `rounded-md neuro-inset p-3 text-center`

**Line 98** — stat card 2:
- Before: `rounded-md border border-border neuro-surface p-3 text-center`
- After: `rounded-md neuro-inset p-3 text-center`

**Line 104** — stat card 3:
- Before: `rounded-md border border-border neuro-surface p-3 text-center flex flex-col justify-between items-center`
- After: `rounded-md neuro-inset p-3 text-center flex flex-col justify-between items-center`

**Line 170** — question breakdown card:
- Before: `rounded-md border border-border neuro-surface p-3.5 space-y-2`
- After: `rounded-md neuro-inset p-3.5 space-y-2`

##### ✅ 2b. `src/app/components/interview/interview-view.tsx`

The modal at **line 118** is `neuro-card shadow-lg` (Tier 2). Children using `neuro-surface` are darker.

**Line 120** — modal header:
- Before: `border-b border-border bg-muted/20 px-5 py-4`
- After: `border-b border-border neuro-inset px-5 py-4`

**Line 154** — question card inside modal:
- Before: `rounded-md border border-border neuro-surface p-3.5`
- After: `rounded-md neuro-inset p-3.5`

**Line 175** — feedback card inside modal (neuro-card inside neuro-card = no depth):
- Before: `rounded-md neuro-card p-3.5 space-y-2.5`
- After: `rounded-md neuro-inset p-3.5 space-y-2.5`

##### ✅ 2c. `src/app/components/resume/tailor-review-panel.tsx`

**Line 113** — panel root (missing surface):
- Before: `flex h-full flex-col bg-background`
- After: `flex h-full flex-col neuro-surface`

**Line 115** — header border:
- Before: `border-b border-border px-4 py-3`
- After: `neuro-divider px-4 py-3`

**Line 149** — unaccepted change items (neuro-surface inside neuro-surface = no contrast; should be inset):
- Before: `isAccepted ? 'border-primary/30 bg-primary/5' : 'border-border neuro-surface opacity-60'`
- After: `isAccepted ? 'border-primary/30 bg-primary/5' : 'neuro-inset opacity-60'`

**Line 210** — footer border:
- Before: `border-t border-border p-3`
- After: `neuro-divider p-3`

##### ✅ 2d. `src/app/components/resume/cover-letter-editor.tsx`

**Line 148** — root container:
- Before: `flex w-full flex-col lg:flex-row overflow-hidden h-full`
- After: `flex w-full flex-col lg:flex-row overflow-hidden h-full neuro-surface`

**Line 151** — mode selector container:
- Before: `flex gap-1.5 rounded-sm bg-border/30 p-0.5 mb-1 shrink-0`
- After: `flex gap-1.5 rounded-sm neuro-inset p-0.5 mb-1 shrink-0`

**Line 175** — language selector container:
- Before: `flex gap-1.5 rounded-sm bg-border/30 p-0.5 shrink-0`
- After: `flex gap-1.5 rounded-sm neuro-inset p-0.5 shrink-0`

**Line 259** — preview panel:
- Before: `flex-1 flex flex-col overflow-hidden bg-background`
- After: `flex-1 flex flex-col overflow-hidden neuro-surface`

##### ✅ 2e. `src/app/components/resume/resume-copilot.tsx`

**Line 71** — messages scroll area:
- Before: `flex-1 overflow-y-auto bg-background p-4`
- After: `flex-1 overflow-y-auto neuro-surface p-4`

##### ✅ 2f. `src/app/components/resume/resume-detail.tsx`

**Line 1131** — tab selector container:
- Before: `ml-3 flex gap-1 overflow-x-auto rounded-sm bg-border/30 p-0.5`
- After: `ml-3 flex gap-1 overflow-x-auto rounded-sm neuro-inset p-0.5`

**Line 1207** — PDF preview area (view tab):
- Before: `min-h-0 flex-1 bg-muted/30`
- After: `min-h-0 flex-1 neuro-surface`

**Line 1221** — PDF preview area (review tab):
- Before: `hidden lg:flex w-[55%] min-w-[350px] flex-col bg-muted/30`
- After: `hidden lg:flex w-[55%] min-w-[350px] flex-col neuro-surface`

**Line 1327** — PDF preview area (editor right panel):
- Before: `h-full bg-muted/30`
- After: `h-full neuro-surface`

**Line 1357** — mobile PDF preview:
- Before: `h-full bg-muted/30 min-h-[600px]`
- After: `h-full neuro-surface min-h-[600px]`

##### ✅ 2g. Settings pages — missing root surface

**`src/app/[locale]/(app)/settings/page.tsx` line 273**:
- Before: `flex-1 overflow-y-auto p-6`
- After: `flex-1 overflow-y-auto p-6 neuro-surface`

**`src/app/[locale]/(app)/settings/billing/page.tsx` line 101**:
- Before: `mx-auto max-w-2xl space-y-8 p-6`
- After: The parent page div at line 100: `mx-auto max-w-2xl space-y-8 p-6` → wrap with neuro-surface by changing line 100 to add `neuro-surface` to the outermost container. Actually the billing page root at line 100 is `<div className="mx-auto max-w-2xl space-y-8 p-6">`. Change to: `<div className="flex-1 overflow-y-auto neuro-surface">` wrapper, or simpler: add `neuro-surface` to existing: `<div className="mx-auto max-w-2xl space-y-8 p-6 neuro-surface">`. **Note:** This page is rendered inside the settings layout. Check if settings layout already has neuro-surface. If not, add it there.

**`src/app/[locale]/(app)/settings/layout.tsx`** — Check if it wraps children in `neuro-surface`. If not, add it so both settings and billing pages inherit.

##### ✅ 2h. Loading/error pages — `bg-background` → `neuro-surface`

**`src/app/[locale]/(app)/loading.tsx` line 3**:
- Before: `flex flex-1 items-center justify-center bg-background`
- After: `flex flex-1 items-center justify-center neuro-surface`

**`src/app/[locale]/(app)/ats/loading.tsx` line 3**:
- Before: `flex flex-1 items-center justify-center bg-background`
- After: `flex flex-1 items-center justify-center neuro-surface`

**`src/app/[locale]/(app)/applications/loading.tsx` line 3**:
- Before: `flex flex-1 items-center justify-center bg-background`
- After: `flex flex-1 items-center justify-center neuro-surface`

**`src/app/[locale]/error.tsx` line 19**:
- Before: `flex flex-1 flex-col items-center justify-center bg-background px-6 text-center`
- After: `flex flex-1 flex-col items-center justify-center neuro-surface px-6 text-center`

**`src/app/[locale]/(app)/error.tsx` line 19**:
- Before: `flex flex-1 flex-col items-center justify-center bg-background px-6 text-center`
- After: `flex flex-1 flex-col items-center justify-center neuro-surface px-6 text-center`

##### ✅ 2i. `src/components/billing/upgrade-wall.tsx`

**Line 47** — modal card:
- Before: `mx-4 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl`
- After: `mx-4 w-full max-w-sm rounded-xl neuro-modal p-6`

**Line 74** — secondary button:
- Before: `w-full rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer`
- After: `w-full rounded-lg neuro-inset px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer`

---

#### STEP 3: P1 — Missing Neumorphic Styling on Interactive Elements

##### ✅ 3a. `src/app/[locale]/not-found.tsx`

**Line 23** — home button:
- Before: `cursor-pointer rounded-md border border-border bg-background px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted`
- After: `cursor-pointer rounded-md neuro-pill px-4 py-2 text-xs font-medium text-foreground transition-shadow`

##### ✅ 3b. `src/app/[locale]/error.tsx`

**Line 34** — reload button:
- Before: `cursor-pointer rounded-md border border-border bg-background px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted`
- After: `cursor-pointer rounded-md neuro-pill px-4 py-2 text-xs font-medium text-foreground transition-shadow`

##### ✅ 3c. Marketing page buttons

**`src/app/[locale]/(marketing)/page.tsx` line 55** — secondary CTA:
- Before: `inline-flex cursor-pointer items-center rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.98]`
- After: `inline-flex cursor-pointer items-center rounded-lg neuro-pill px-6 py-3 text-sm font-medium text-foreground transition-shadow active:scale-[0.98]`

**`src/app/components/marketing/interview-section.tsx` line 61** — secondary CTA:
- Before: `inline-flex cursor-pointer items-center rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.98]`
- After: `inline-flex cursor-pointer items-center rounded-lg neuro-pill px-6 py-3 text-sm font-medium text-foreground transition-shadow active:scale-[0.98]`

##### ✅ 3d. Cover letter saved letters list

**`src/app/[locale]/(app)/cover-letter/page.tsx` lines 405-409** — saved letter buttons:
- Before: `activeLetterId === letter.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'`
- After: `activeLetterId === letter.id ? 'border-primary bg-primary/5' : 'neuro-inset hover:neuro-card'`

Note: The `border` class can be removed since neuro-inset provides its own visual boundary via inset shadow.

##### ✅ 3e. Cover letter JD Textarea (missing `neumorphic` prop)

**`src/app/[locale]/(app)/cover-letter/page.tsx` line 386-392** — JD textarea in 'jd' mode:
- Before: `<Textarea value={jdText} ... className="w-full resize-none rounded-xs text-[11px] px-2.5 py-1.5 font-sans" />` (no `neumorphic` prop)
- After: Add `neumorphic` prop: `<Textarea neumorphic value={jdText} ... />`

##### ✅ 3f. Cover letter letter textarea (missing surface context) — no change needed

**`src/app/[locale]/(app)/cover-letter/page.tsx` line 515-519** — letter editor textarea:
This textarea is inside a `neuro-card` paper. The `bg-transparent` is intentional (writes on the paper). No change needed — the paper itself is the surface.

---

#### ✅ STEP 4: Settings Layout Check

**`src/app/[locale]/(app)/settings/layout.tsx`**:
Read this file. If the layout wraps children in a div without `neuro-surface`, add it. The settings pages (profile, notifications, danger, billing) all need to sit on `neuro-surface`.

---

### 4.5 Vertical-Slice Order

All 5 slices have been implemented and verified with `pnpm build` (zero TypeScript/compilation errors).

**Slice 1 — Shared Primitives** ✅ Fix `sheet.tsx`, `select.tsx`, `alert-dialog.tsx`, `skeleton.tsx`, `button.tsx`.
**Slice 2 — Interview Module** ✅ Fix `interview-summary.tsx` and `interview-view.tsx`.
**Slice 3 — Resume Module** ✅ Fix `tailor-review-panel.tsx`, `cover-letter-editor.tsx`, `resume-copilot.tsx`, `resume-detail.tsx`.
**Slice 4 — Settings & Loading/Error** ✅ Fix settings layout/pages, loading pages, error pages.
**Slice 5 — Billing & Marketing P1** ✅ Fix upgrade-wall, not-found, error buttons, marketing buttons, cover letter page.

Execute in this order (each slice is independently verifiable):

**Slice 1 — Shared Primitives** (Steps 1a-1e): Fix `sheet.tsx`, `select.tsx`, `alert-dialog.tsx`, `skeleton.tsx`, `button.tsx`. After this slice, ALL dropdowns, dialogs, sheets, skeletons, and outline buttons across the entire app are neumorphically consistent. Verify by opening any page with a dropdown or dialog.

**Slice 2 — Interview Module** (Steps 2a-2b): Fix `interview-summary.tsx` and `interview-view.tsx`. Verify by running an interview session and viewing the summary/modal.

**Slice 3 — Resume Module** (Steps 2c-2f): Fix `tailor-review-panel.tsx`, `cover-letter-editor.tsx`, `resume-copilot.tsx`, `resume-detail.tsx`. Verify by opening resume editor, co-pilot drawer, cover letter editor, and tailor review.

**Slice 4 — Settings & Loading/Error** (Steps 2g-2h): Fix settings pages, loading pages, error pages. Verify by navigating to `/settings`, `/settings/billing`, and triggering a loading state.

**Slice 5 — Billing & Marketing P1** (Steps 2i, 3a-3e): Fix upgrade-wall, not-found, error buttons, marketing buttons, cover letter saved list. Verify by visiting the 404 page, marketing landing, and cover letter page.

### 5. Assertion & Testing Requirements

- **Unit Tests**: N/A — no behavior change, pure CSS className edits.
- **Integration Tests**: N/A — no API or data flow changes.
- **E2E UI Tests**: N/A — visual-only changes, no user flow alterations.
- **Manual Verification Checklist** (engineer should spot-check after build):
  1. Open `/en/chat` → upload card, job previews render with correct tonal hierarchy
  2. Open `/en/applications` → kanban cards are lighter than inset columns
  3. Open `/en/interview` → setup, session, summary all have correct surface/card/inset hierarchy
  4. Open `/en/resume/[id]` → editor, co-pilot drawer, PDF preview areas use neuro-surface
  5. Open `/en/cover-letter` → config panel, mode/language selectors use neuro-inset
  6. Open `/en/settings` and `/en/settings/billing` → pages sit on neuro-surface
  7. Open any Select dropdown → renders as neuro-card
  8. Open any AlertDialog → renders as neuro-modal
  9. Open Job Detail Panel (Sheet) → slides over with neuro-surface background

### 6. Verification Commands & Log Files
- **Build Command**: `pnpm build`
- **Lint Command**: `pnpm lint`
- **TypeScript Check**: `npx tsc --noEmit`
- **Server Log Location**: Console output during `pnpm build` — if any className string has a syntax error (missing quote, broken template literal), the TypeScript compiler will catch it at compile time.
- **Visual Verification**: Run `pnpm dev` and manually visit the pages listed in Section 5.
