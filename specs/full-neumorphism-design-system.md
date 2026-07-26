# Implementation Spec & Plan: Full Neumorphism Design System

### 0. Architectural Decision Record (ADR) & Scaling Tradeoffs

- **Context & Constraints**: Neumorphism (soft-UI) is currently applied to only 5 files (chat page + 3 modals + template gallery). The remaining ~40 files use a flat `bg-card border-border` card pattern with a dotted `bg-grid-blueprint` background. The user wants full-app neumorphism consistency. This is a **visual-only refactoring** — zero behavior, API, data, or logic changes.

- **Chosen Architecture**: **CSS-as-source-of-truth + Thin React component wrappers + CVA variants**.
  - The existing `.neuro-*` CSS utility classes in `globals.css` (lines 404-538) remain the single source of truth for shadow values, colors, and dark-mode neutralization.
  - A new `NeuroCard` component provides a typed, variant-driven wrapper for canonical new usage.
  - The existing `Button` CVA gains a `neumorphic` variant (maps to `.neuro-pill`).
  - `Input` and `Textarea` gain an optional `neumorphic` prop (maps to `.neuro-inset`).
  - `DialogContent` gains `.neuro-modal` styling.
  - All existing pages get systematic class replacements (`bg-card border-border` → `neuro-card`, `bg-grid-blueprint` → `neuro-surface`).
  - Dark mode neutralization is already fully handled in globals.css lines 488-536 — **do not touch dark mode rules**.

- **Discarded Alternatives**:
  - *Alternative A: Replace every card div with `<NeuroCard>` JSX wrapper.* Rejected — would require restructuring JSX in 40 files, high risk of breaking layout, and the `cn()` merge already handles class composition cleanly.
  - *Alternative B: Move all neumorphic shadows into Tailwind utility classes via `@theme`.* Rejected — Tailwind v4 `@theme` doesn't support multi-shadow box-shadow tokens cleanly, and the existing CSS classes already work perfectly with dark-mode overrides.

### 1. Target Files & Folder Structure

#### NEW files to create (2):
```
src/app/components/ui/neuro-card.tsx       # NeuroCard wrapper component (~50 lines)
src/app/lib/neuro-variants.ts              # Shared CVA variant definition for neuro styles (~30 lines)
```

#### MODIFY — Phase 1: Design System Foundation (5 files):
```
src/app/globals.css                        # Add --neuro-surface variable, refactor hardcoded #E9ECEF
src/app/components/ui/button.tsx           # Add neumorphic variant to CVA
src/app/components/ui/input.tsx            # Add neumorphic prop
src/app/components/ui/textarea.tsx         # Add neumorphic prop
src/app/components/ui/dialog.tsx           # Add neuro-modal to DialogContent
```

#### MODIFY — Phase 2: App Shell (3 files):
```
src/app/[locale]/(app)/layout.tsx          # bg-grid-blueprint → neuro-surface
src/app/components/layout/sidebar.tsx      # bg-sidebar bg-grid-blueprint → neuro-surface, nav active → neuro-inset
src/app/components/layout/navbar.tsx       # bg-card → neuro-surface
```

#### MODIFY — Phase 3: App Pages & Views (20 files):
```
src/app/[locale]/(app)/settings/page.tsx
src/app/[locale]/(app)/settings/billing/page.tsx
src/app/[locale]/(app)/resumes/page.tsx
src/app/[locale]/(app)/cover-letter/page.tsx
src/app/[locale]/(app)/admin/page.tsx
src/app/components/dashboard/dashboard-view.tsx
src/app/components/ats/ats-view.tsx
src/app/components/pipeline/applications-view.tsx
src/app/components/pipeline/job-detail-panel.tsx
src/app/components/pipeline/smart-overview.tsx
src/app/components/pipeline/company-intelligence.tsx
src/app/components/pipeline/area-intelligence.tsx
src/app/components/interview/interview-view.tsx
src/app/components/interview/interview-setup.tsx
src/app/components/interview/interview-session.tsx
src/app/components/interview/interview-summary.tsx
src/app/components/resume/resume-detail.tsx
src/app/components/resume/resume-copilot.tsx
src/app/components/resume/job-search-panel.tsx
src/app/components/resume/cover-letter-editor.tsx
src/app/components/resume/tailor-review-panel.tsx
src/app/components/chat/job-preview.tsx
src/app/components/chat/upload-card-message.tsx
src/app/components/search/RoleAutocomplete.tsx
src/app/components/search/LocationAutocomplete.tsx
src/app/components/ui/upgrade-modal.tsx
src/app/components/ui/skeleton.tsx
```

#### MODIFY — Phase 4: Auth & Marketing (9 files):
```
src/app/[locale]/(auth)/layout.tsx
src/app/[locale]/(auth)/login/page.tsx
src/app/[locale]/(auth)/register/page.tsx
src/app/[locale]/(auth)/forgot-password/page.tsx
src/app/[locale]/(auth)/reset-password/page.tsx
src/app/[locale]/(marketing)/page.tsx
src/app/[locale]/(marketing)/pricing/page.tsx
src/app/components/marketing/features-bento.tsx
src/app/components/marketing/how-it-works.tsx
src/app/components/marketing/interview-section.tsx
```

#### DO NOT TOUCH (already neumorphic or special):
```
src/app/components/chat/chat-view.tsx          # Already uses neuro-chat
src/app/components/layout/upload-modal.tsx     # Already uses neuro-modal
src/app/components/chat/build-wizard.tsx       # Already uses neuro classes
src/app/components/chat/paste-jd-modal.tsx     # Already uses neuro classes
src/app/components/resume/templates/template-gallery.tsx  # Has neumorphic prop flag
```

**File size rule**: Each file stays well under 300 lines. NeuroCard ~50 lines, neuro-variants ~30 lines.

### 2. Import Definitions & Dependencies

- `cn` from `~/lib/utils` (existing, path alias `~/` → `./src/app/`)
- `cva`, `VariantProps` from `class-variance-authority` (existing dependency)
- `Button as ButtonPrimitive` from `@base-ui/react/button` (existing)
- `Input as InputPrimitive` from `@base-ui/react/input` (existing)
- No new npm dependencies required.

### 3. Database Schema Changes

**N/A** — No database changes. Pure visual refactoring.

### 4. Step-by-Step Edits

---

#### STEP 1: globals.css — Add `--neuro-surface` variable & refactor hardcoded colors

**File**: `src/app/globals.css`

**1a.** In the `:root` block (after line ~104, near `--accent-blueprint`), add:
```css
  /* ── Neumorphic surface (light mode only; dark mode neutralizes via .dark .neuro-* rules) ── */
  --neuro-surface: #E9ECEF;
```

**1b.** In the `.dark` block (after line ~220, near `--accent-blueprint` dark override), add:
```css
  --neuro-surface: var(--background);
```

**1c.** In the neumorphism section (lines 404-538), replace every hardcoded `#E9ECEF` with `var(--neuro-surface)`. There are exactly 8 occurrences in the light-mode rules (lines 412, 417, 426, 432, 438, 449, 463, 485). Do NOT touch the `.dark` override section (lines 488-536) — those reference `var(--background)`, `var(--card)` etc. and are correct.

**Before** (example, line 411-413):
```css
.neuro-surface {
  background-color: #E9ECEF;
}
```
**After**:
```css
.neuro-surface {
  background-color: var(--neuro-surface);
}
```

Apply this replacement to ALL 8 light-mode occurrences. The `.neuro-chat` section (lines 462-486) also has `#E9ECEF` — replace those too (lines 463, 469, 485).

---

#### STEP 2: Create `src/app/lib/neuro-variants.ts`

**File**: `src/app/lib/neuro-variants.ts` (NEW)

```typescript
import { cva, type VariantProps } from "class-variance-authority"

/**
 * Neumorphic card/surface variant definitions.
 * Maps to CSS utility classes in globals.css (.neuro-*).
 * Dark mode neutralization is handled in globals.css — no JS needed.
 */
export const neuroCardVariants = cva(
  "transition-shadow duration-200",
  {
    variants: {
      variant: {
        surface: "neuro-surface",
        card: "neuro-card",
        inset: "neuro-inset",
        iconWell: "neuro-icon-well",
        modal: "neuro-modal",
      },
    },
    defaultVariants: {
      variant: "card",
    },
  }
)

export type NeuroCardVariantProps = VariantProps<typeof neuroCardVariants>
```

---

#### STEP 3: Create `src/app/components/ui/neuro-card.tsx`

**File**: `src/app/components/ui/neuro-card.tsx` (NEW)

```tsx
import * as React from "react"
import { cn } from "~/lib/utils"
import { neuroCardVariants, type NeuroCardVariantProps } from "~/lib/neuro-variants"

/**
 * Neumorphic card/surface wrapper.
 * Uses CSS utility classes (.neuro-*) defined in globals.css.
 * In dark mode, all neumorphic effects are automatically neutralized to flat shadows.
 *
 * @example
 * <NeuroCard variant="card" className="rounded-lg p-4">Content</NeuroCard>
 * <NeuroCard variant="inset">Pressed-in content</NeuroCard>
 */
function NeuroCard({
  className,
  variant = "card",
  ...props
}: React.ComponentProps<"div"> & NeuroCardVariantProps) {
  return (
    <div
      data-slot="neuro-card"
      className={cn(neuroCardVariants({ variant }), className)}
      {...props}
    />
  )
}

export { NeuroCard, neuroCardVariants }
```

---

#### STEP 4: button.tsx — Add `neumorphic` variant

**File**: `src/app/components/ui/button.tsx`

Add a `neumorphic` entry to the `variant` object inside `buttonVariants`:

**Before** (line 16):
```tsx
        link: "text-primary underline-offset-4 hover:underline",
```
**After**:
```tsx
        link: "text-primary underline-offset-4 hover:underline",
        neumorphic: "neuro-pill text-foreground border-transparent",
```

This maps to `.neuro-pill` which has its own hover (line 441) and active press-down (line 444) states already defined in globals.css. No other changes needed in button.tsx.

---

#### STEP 5: input.tsx — Add `neumorphic` prop

**File**: `src/app/components/ui/input.tsx`

**Before** (full file):
```tsx
import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "~/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
```

**After** (add `neumorphic` prop that swaps border for inset shadow):
```tsx
import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "~/lib/utils"

function Input({ className, type, neumorphic = false, ...props }: React.ComponentProps<"input"> & { neumorphic?: boolean }) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        neumorphic
          ? "h-8 w-full min-w-0 rounded-lg neuro-inset px-2.5 py-1 text-base transition-shadow outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm"
          : "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
```

Key difference: When `neumorphic` is true, `border border-input bg-transparent` is replaced with `neuro-inset`, and `transition-colors` becomes `transition-shadow`. The dark mode fallback is handled by the `.dark .neuro-inset` rule in globals.css.

---

#### STEP 6: textarea.tsx — Add `neumorphic` prop

**File**: `src/app/components/ui/textarea.tsx`

Same pattern as Input. Add `neumorphic` prop:

**Before**:
```tsx
function Textarea({ className, ...props }: React.ComponentProps<"textarea"> {
```
**After**:
```tsx
function Textarea({ className, neumorphic = false, ...props }: React.ComponentProps<"textarea"> & { neumorphic?: boolean }) {
```

And in the className, use the same conditional:
```tsx
      className={cn(
        neumorphic
          ? "flex field-sizing-content min-h-16 w-full rounded-lg neuro-inset px-2.5 py-2 text-base transition-shadow outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm"
          : "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
```

---

#### STEP 7: dialog.tsx — Add neuro-modal to DialogContent

**File**: `src/app/components/ui/dialog.tsx`

In the `DialogContent` function, the `DialogPrimitive.Popup` has this className (line 55-57):

**Before**:
```tsx
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
```

**After** — replace `bg-popover` and `ring-1 ring-foreground/10` with `neuro-modal`:
```tsx
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl neuro-modal p-4 text-sm text-popover-foreground duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
```

Key: `bg-popover ring-1 ring-foreground/10` → `neuro-modal`. The `.neuro-modal` class provides the background color and neumorphic shadow. Dark mode neutralizes via `.dark .neuro-modal`.

---

#### STEP 8: App Shell — `(app)/layout.tsx`

**File**: `src/app/[locale]/(app)/layout.tsx`

**8a.** Line 120 — the root AppShell div:

**Before**:
```tsx
    <div className="flex h-screen flex-col bg-grid-blueprint">
```
**After**:
```tsx
    <div className="flex h-screen flex-col neuro-surface">
```

**8b.** Line 78 — the AuthGuard loading state:

**Before**:
```tsx
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
```
**After**:
```tsx
      <div className="flex h-screen flex-col items-center justify-center gap-4 neuro-surface">
```

---

#### STEP 9: Sidebar — `sidebar.tsx`

**File**: `src/app/components/layout/sidebar.tsx`

**9a.** Line 128-131 — the `<aside>` element:

**Before**:
```tsx
      <aside
        className={cn(
          'flex h-full flex-col border-r border-border bg-sidebar bg-grid-blueprint overflow-hidden transition-[width] duration-200 ease-[cubic-bezier(0.2,0,0,1)]',
          c ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]',
        )}
      >
```
**After**:
```tsx
      <aside
        className={cn(
          'flex h-full flex-col border-r border-border neuro-surface overflow-hidden transition-[width] duration-200 ease-[cubic-bezier(0.2,0,0,1)]',
          c ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]',
        )}
      >
```

Key: `bg-sidebar bg-grid-blueprint` → `neuro-surface`.

**9b.** Nav item active states — there are multiple occurrences of the pattern:
```tsx
isActive
  ? 'bg-sidebar-active text-foreground font-semibold'
  : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground',
```

Replace ALL occurrences (there are 4: lines 75-76, 145-146, 182-183, 239-240) with:
```tsx
isActive
  ? 'neuro-inset text-foreground font-semibold'
  : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground',
```

Key: Active nav items get `neuro-inset` (pressed-in look). Hover state stays as `bg-sidebar-hover` (subtle).

---

#### STEP 10: Topbar — `navbar.tsx`

**File**: `src/app/components/layout/navbar.tsx`

Line 49 — the `<header>`:

**Before**:
```tsx
    <header className="flex h-[var(--topbar-height)] shrink-0 items-center border-b border-border bg-card z-50">
```
**After**:
```tsx
    <header className="flex h-[var(--topbar-height)] shrink-0 items-center border-b border-border neuro-surface z-50">
```

Key: `bg-card` → `neuro-surface`.

---

#### STEP 11-30: Page & View Pattern Replacements

The following pattern replacements apply across ALL remaining files. Apply them file-by-file. The engineer should process each file listed in Section 1 ("Phase 3" and "Phase 4" file lists).

##### Master Replacement Rules (apply in order):

**Rule A — Card containers** (most common):
- `border border-border bg-card` → `neuro-card` (remove `border` and `border-border`, the shadow replaces the border)
- `border border-border bg-card p-X` → `neuro-card p-X`
- `border border-border bg-card shadow-sm` → `neuro-card` (remove `shadow-sm`, neuro-card has its own shadow)
- `border border-border bg-card/60 backdrop-blur-sm` → `neuro-surface` (headers with blur)

**Rule B — Panels & sidebars within pages**:
- `bg-card p-X` (without border) → `neuro-card p-X` if it's a raised card, or `neuro-surface p-X` if it's a flat panel
- `bg-background` (page-level containers inside app shell) → `neuro-surface` (the shell already provides this, but inner panels may override)

**Rule C — Inset elements** (textareas inside cards, search bars):
- Any `<Textarea>` or `<Input>` that sits inside a neuro-card and currently has `bg-transparent border border-input` → add `neumorphic` prop to use inset shadow instead

**Rule D — Empty states & icon containers**:
- `border border-border bg-card` icon wells → `neuro-icon-well`
- `border border-dashed border-border bg-grid-card` → `neuro-inset border-dashed border-border` (keep the dashed border for empty-state affordance, add inset shadow)

**Rule E — Table containers** (admin page):
- `overflow-hidden rounded-lg border border-border` table wrappers → `neuro-card overflow-hidden`
- `bg-muted/30` table headers → `neuro-inset` (subtle pressed-in look)

**Rule F — Keep as-is** (do NOT change):
- `bg-primary` (branded buttons, CTA sections)
- `bg-destructive` / `bg-red-500` (danger zones)
- `bg-success` / `bg-emerald-500` (success states)
- `bg-muted` (toggle switches, progress bars — these are functional, not cards)
- `bg-white` on the Google logo SVG paths
- `.resume-paper` class (PDF preview paper — always white)
- `shadow-paper` / `shadow-lg shadow-primary/20` on hero elements (marketing)

##### File-by-File Instructions:

**STEP 11: `settings/page.tsx`**
- All `rounded-sm border border-border bg-card p-4` → `rounded-sm neuro-card p-4` (there are ~8 occurrences)
- The notifications tab container: `rounded-sm border border-border bg-card` → `rounded-sm neuro-card`
- The danger zone: `rounded-sm border border-red-500/30 bg-red-500/5 p-4` → keep as-is (danger styling is intentional)
- Loading spinner container: `bg-background` not present (uses default)

**STEP 12: `settings/billing/page.tsx`**
- `rounded-lg border border-border bg-card p-5` → `rounded-lg neuro-card p-5` (2 occurrences: current plan + usage)

**STEP 13: `resumes/page.tsx`**
- Line 50: `border-b border-border bg-card/60 backdrop-blur-sm` → `border-b border-border neuro-surface`
- Line 72: `animate-pulse rounded-sm border border-border bg-card` → `animate-pulse rounded-sm neuro-card`
- Line 77: `rounded-sm border border-dashed border-border bg-grid-card` → `rounded-sm neuro-inset border border-dashed border-border`
- Line 78: `rounded-sm border border-border bg-card` (icon well) → `rounded-sm neuro-icon-well`
- Line 102: `rounded-lg border border-border bg-card shadow-sm transition-all hover:border-foreground/15 hover:shadow-md` → `rounded-lg neuro-card transition-all hover:shadow-none`
- Line 211: `border border-dashed border-border bg-card/50` (new resume card) → `neuro-inset border border-dashed border-border`
- Line 213: `border border-border bg-background` (icon inside) → `neuro-icon-well`

**STEP 14: `cover-letter/page.tsx`**
- Line 258: `border-b lg:border-b-0 lg:border-r border-border bg-card p-5` → `border-b lg:border-b-0 lg:border-r border-border neuro-surface p-5`
- Line 461: `border-b border-border bg-card px-4 md:px-6 py-2.5` → `border-b border-border neuro-surface px-4 md:px-6 py-2.5`
- Line 499: `rounded-xs p-10 bg-card border border-border flex flex-col shadow-sm` → `rounded-xs p-10 neuro-card flex flex-col` (keep as resume paper - but give it neuro-card treatment)
- Line 523: `rounded-xl border border-border bg-card` (empty state icon) → `rounded-xl neuro-icon-well`
- Mode selector buttons (lines 305-316): `bg-border/30 p-0.5` container → `neuro-inset p-0.5`; active button `bg-card text-foreground shadow-sm` → `neuro-card text-foreground`; inactive stays `text-muted-foreground`
- Language selector buttons: same treatment as mode selector

**STEP 15: `admin/page.tsx`**
- StatCard (line 185): `rounded-lg border border-border bg-card p-4` → `rounded-lg neuro-card p-4`
- Table wrappers (lines 95, 136): `overflow-hidden rounded-lg border border-border` → `overflow-hidden rounded-lg neuro-card`
- Table headers: `bg-muted/30` → `neuro-inset`
- Outer container (line 70): `bg-background` → `neuro-surface`

**STEP 16: `dashboard/dashboard-view.tsx`**
- Apply Rule A to all `border border-border bg-card` patterns (~10 occurrences)
- Any `bg-background` page container → `neuro-surface`

**STEP 17: `ats/ats-view.tsx`**
- Apply Rule A to all card containers (~6 occurrences of `bg-card`)
- JD textarea: consider adding `neumorphic` prop

**STEP 18: `pipeline/applications-view.tsx`**
- Column headers and card containers: apply Rule A
- Job cards in kanban: `border border-border bg-card` → `neuro-card`

**STEP 19-22: Remaining pipeline components** (`job-detail-panel.tsx`, `smart-overview.tsx`, `company-intelligence.tsx`, `area-intelligence.tsx`)
- Apply Rule A to all `border border-border bg-card` patterns

**STEP 23-26: Interview components** (`interview-view.tsx`, `interview-setup.tsx`, `interview-session.tsx`, `interview-summary.tsx`)
- Apply Rule A to all card containers

**STEP 27-31: Resume components** (`resume-detail.tsx`, `resume-copilot.tsx`, `job-search-panel.tsx`, `cover-letter-editor.tsx`, `tailor-review-panel.tsx`)
- Apply Rule A to all card containers
- Resume co-pilot chat panel: apply `neuro-surface` to the panel background

**STEP 32-33: Chat sub-components** (`job-preview.tsx`, `upload-card-message.tsx`)
- Apply Rule A to any `border border-border bg-card` patterns

**STEP 34-35: Search components** (`RoleAutocomplete.tsx`, `LocationAutocomplete.tsx`)
- Apply Rule A to dropdown containers if they use `bg-card`

**STEP 36: `ui/upgrade-modal.tsx`**
- Apply `neuro-modal` to the modal content if it doesn't already use it

**STEP 37: `ui/skeleton.tsx`**
- `bg-card` in skeleton → keep as-is (skeletons are placeholders, neuro-card would be confusing)

---

#### Phase 4: Auth & Marketing Pages

**STEP 38: `(auth)/layout.tsx`**
- Line 12: `bg-background` → `neuro-surface`

**STEP 39: `(auth)/login/page.tsx`**
- Line 69: `bg-background px-6` → `neuro-surface px-6`
- Line 79: `rounded-lg border border-border bg-card p-8 shadow-sm` → `rounded-lg neuro-card p-8`
- Line 154: `bg-card px-2` (divider text) → `neuro-surface px-2`
- Inputs: add `neumorphic` prop to email/password inputs for inset look

**STEP 40: `(auth)/register/page.tsx`**
- Same pattern as login: `bg-background` → `neuro-surface`, `border border-border bg-card` → `neuro-card`

**STEP 41: `(auth)/forgot-password/page.tsx`**
- Same pattern as login

**STEP 42: `(auth)/reset-password/page.tsx`**
- Same pattern as login

**STEP 43: `(marketing)/page.tsx`** (landing page)
- Line 27: `bg-background` → `neuro-surface`
- Line 63: `rounded-2xl border border-border bg-card shadow-paper` (hero mockup) → `rounded-2xl neuro-card`
- Line 90: `rounded-lg border border-border/60 bg-muted/30 p-2.5` (stat cards) → `rounded-lg neuro-inset p-2.5`
- Line 99: `rounded-xl border border-border/60 bg-muted/20 p-3` (chat preview) → `rounded-xl neuro-inset p-3`
- Keep `bg-primary` CTA section and footer as-is (branded color)

**STEP 44: `(marketing)/pricing/page.tsx`**
- Card containers: apply Rule A
- `bg-primary/10 text-primary` badges → keep as-is (semantic color)

**STEP 45-47: Marketing components** (`features-bento.tsx`, `how-it-works.tsx`, `interview-section.tsx`)
- Apply Rule A to card containers
- `bg-muted/30` backgrounds → `neuro-inset`

---

### 4.5 Vertical-Slice Order

Execute steps in this order for fastest visible consistency:

1. **Steps 1-7** (Foundation): CSS + components — creates the building blocks
2. **Steps 8-10** (Shell): App shell, sidebar, topbar — immediately visible on every page
3. **Steps 11-15** (Core pages): Settings, billing, resumes, cover-letter, admin — most user-facing
4. **Steps 16-37** (Feature views & components): All remaining app components
5. **Steps 38-47** (Auth & marketing): External-facing pages

After Steps 1-10, the dev server will show immediate neumorphic consistency on the app shell. Steps 11+ fill in the content.

### 5. Assertion & Testing Requirements

**N/A — no behavior change.** This is a pure CSS class substitution. No logic, API, data, auth, or user-visible flow changes. The only verification is visual + build/lint/type check.

### 6. Verification Commands & Log Files

- **TypeScript check**: `npx tsc --noEmit` — must pass with zero errors
- **Lint**: `pnpm lint` — must pass with zero errors
- **Build**: `pnpm build` — must succeed without errors
- **Visual verification**: Run `pnpm dev`, then:
  1. Navigate to `/en/chat` — app shell (sidebar + topbar) should show neumorphic surface
  2. Toggle to dark mode — all neumorphic shadows should neutralize to flat
  3. Navigate to `/en/settings` — cards should have raised neumorphic shadows
  4. Navigate to `/en/login` — auth card should be neumorphic
  5. Navigate to `/en` (landing) — hero mockup card should be neumorphic
- **Server Log Location**: stderr/console output during `pnpm dev` or `pnpm build`

### Summary of Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Component strategy | CSS classes stay in globals.css + thin NeuroCard wrapper + CVA variants | Source of truth stays in CSS; components provide type-safe usage |
| Dark mode | Preserve existing neutralization (globals.css lines 488-536) | Already works perfectly — no changes needed |
| Grid pattern (`bg-grid-blueprint`) | Replace with `neuro-surface` in app shell | Conflicts with neumorphism's clean aesthetic |
| Sidebar active state | `neuro-inset` (pressed-in) | Natural neumorphic affordance for "current location" |
| Auth page inputs | Add `neumorphic` prop for inset look | Consistent with neumorphic design language |
| Marketing CTA sections | Keep `bg-primary` branded color | Brand identity overrides design system |
| Danger/success/warn zones | Keep semantic colors | Functional color must not be overridden by design system |
| `.neuro-*` utility classes | Remain available for one-off use | Components are canonical, but CSS classes offer flexibility |
