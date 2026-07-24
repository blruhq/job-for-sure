# Implementation Spec & Plan: Kanban Board Spacing & Typography Calibration

### 0. Architectural Decision Record (ADR) & Scaling Tradeoffs

- **Context & Constraints**: The Kanban board in `/en/applications` has cramped spacing and undersized typography that hurts readability. The job cards use `p-2.5` (10px) padding, `gap-1.5` (6px) between cards, and `text-[9px]` meta text — all too tight for comfortable use. Production neumorphism research (see `docs/research/neumorphism-production-best-practices.md`) recommends generous spacing to prevent shadow collision and improve eye comfort.
- **Chosen Architecture**: Direct Tailwind class value updates in a single file. No new components, no CSS changes, no abstraction. The neumorphic shadow system (`.neuro-card`, `.neuro-inset`) stays untouched — only the spacing and font-size utility classes change.
- **Discarded Alternatives**:
  - *Alternative A: Extract spacing to CSS variables.* Rejected — overkill for a single view; Tailwind utilities are the project convention.
  - *Alternative B: Also recalibrate shadow opacities.* Rejected for this task — the reference app data (Apple Vision Pro 0.15-0.20, Tesla 0.04-0.08, Revolut 0.70/0.15) is informational context only. No Current→Target values were specified for shadows. Shadow calibration is a separate task if needed.

### 1. Target Files & Folder Structure

#### MODIFY (1 file):
```
src/app/components/pipeline/applications-view.tsx    # Kanban board spacing + typography
```

No new files. No other files affected.

### 2. Import Definitions & Dependencies

No import changes. All existing imports remain valid.

### 3. Database Schema Changes

**N/A** — Pure visual change.

### 4. Step-by-Step Edits

All edits are in `src/app/components/pipeline/applications-view.tsx`.

---

#### ✅ STEP 1: Job card padding `p-2.5` → `p-4` (3 occurrences)

**1a.** Line 75 — `DraggableJobCard` className:

Before:
```
'group cursor-grab rounded-sm neuro-card p-2.5 active:cursor-grabbing hover:-translate-y-0.5 min-w-0 overflow-hidden',
```
After:
```
'group cursor-grab rounded-sm neuro-card p-4 active:cursor-grabbing hover:-translate-y-0.5 min-w-0 overflow-hidden',
```

**1b.** Line 189 — `InlineAddForm` container (must match card padding for visual consistency):

Before:
```
<div className="mt-1.5 flex flex-col gap-2 rounded-xs neuro-card p-2.5">
```
After:
```
<div className="mt-1.5 flex flex-col gap-2 rounded-xs neuro-card p-4">
```

**1c.** Line 578 — `DragOverlay` card:

Before:
```
<div className="w-72 rounded-sm neuro-card p-2.5">
```
After:
```
<div className="w-72 rounded-sm neuro-card p-4">
```

---

#### ✅ STEP 2: Gap between columns `gap-3` → `gap-5`

Line 494 — columns container:

Before:
```
<div className="flex flex-1 gap-3 overflow-x-auto p-4">
```
After:
```
<div className="flex flex-1 gap-5 overflow-x-auto p-4">
```

---

#### ✅ STEP 3: Gap between cards in column `gap-1.5` → `gap-3` AND column padding `px-3 pb-2 pt-3` → `px-4 pb-3 pt-4`

Line 513 — cards scroll container (both changes in same className):

Before:
```
<div className="flex flex-1 min-h-0 min-w-0 flex-col gap-1.5 overflow-y-auto overflow-x-hidden px-3 pb-2 pt-3">
```
After:
```
<div className="flex flex-1 min-h-0 min-w-0 flex-col gap-3 overflow-y-auto overflow-x-hidden px-4 pb-3 pt-4">
```

Also update the comment on lines 510-512 to reflect new padding values:

Before:
```
{/* Job Cards — overflow-x-hidden prevents horizontal clip/scrollbar while
     overflow-y-auto enables vertical scroll. px-3/pb-2 padding gives 12px
     room for the -6px/-8px neumorphic card shadows. */}
```
After:
```
{/* Job Cards — overflow-x-hidden prevents horizontal clip/scrollbar while
     overflow-y-auto enables vertical scroll. px-4/pb-3 padding gives 16px
     room for the -6px/-8px neumorphic card shadows. */}
```

---

#### ✅ STEP 4: Card title text `text-[11px]` → `text-xs` (12px)

Line 107 — job title in `JobCardContent`:

Before:
```
<div className="text-[11px] font-semibold text-foreground line-clamp-2 break-words leading-snug">
```
After:
```
<div className="text-xs font-semibold text-foreground line-clamp-2 break-words leading-snug">
```

---

#### ✅ STEP 5: Meta text `text-[9px]` → `text-[11px]` (5 occurrences)

**5a.** Line 116 — score badge:

Before:
```
'shrink-0 rounded-xs px-1 py-px text-[9px] font-mono font-semibold',
```
After:
```
'shrink-0 rounded-xs px-1 py-px text-[11px] font-mono font-semibold',
```

**5b.** Line 125 — location/salary meta row:

Before:
```
<div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-muted-foreground">
```
After:
```
<div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
```

**5c.** Line 136 — date text:

Before:
```
<div className="mt-1 text-[9px] text-muted-foreground/60 whitespace-nowrap">
```
After:
```
<div className="mt-1 text-[11px] text-muted-foreground/60 whitespace-nowrap">
```

**5d.** Line 535 — "Open" action link:

Before:
```
className="flex items-center gap-0.5 rounded-xs px-1.5 py-0.5 text-[9px] text-muted-foreground hover:text-primary transition-colors"
```
After:
```
className="flex items-center gap-0.5 rounded-xs px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-primary transition-colors"
```

**5e.** Line 544 — "Remove" action button:

Before:
```
className="flex items-center gap-0.5 rounded-xs px-1.5 py-0.5 text-[9px] text-muted-foreground hover:text-destructive h-auto">
```
After:
```
className="flex items-center gap-0.5 rounded-xs px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-destructive h-auto">
```

---

### 4.5 Vertical-Slice Order

Single file, single slice. All 5 steps can be applied in one pass. The change is immediately testable by navigating to `/en/applications` and visually inspecting the Kanban board.

### 5. Assertion & Testing Requirements

**N/A — no behavior change.** Pure CSS class value updates. No logic, API, data, auth, or user-visible flow changes.

### 6. Verification Commands & Log Files

- **TypeScript check**: `npx tsc --noEmit` — must pass with zero errors
- **Lint**: `pnpm lint` — must pass with zero errors
- **Build**: `pnpm build` — must succeed
- **Visual verification**: Run `pnpm dev`, navigate to `/en/applications`:
  1. Job cards should have visibly more internal padding (16px vs 10px)
  2. Columns should be more spaced apart (20px vs 12px)
  3. Cards within a column should have more gap (12px vs 6px)
  4. Card titles should be slightly larger (12px vs 11px)
  5. All meta text (score, location, salary, date, actions) should be more readable (11px vs 9px)
- **Server Log Location**: stderr/console output during `pnpm dev` or `pnpm build`

### Summary of Changes

| Element | Current | Target | Lines |
|---------|---------|--------|-------|
| Job card padding | `p-2.5` (10px) | `p-4` (16px) | 75, 189, 578 |
| Gap between columns | `gap-3` (12px) | `gap-5` (20px) | 494 |
| Gap between cards | `gap-1.5` (6px) | `gap-3` (12px) | 513 |
| Column padding | `px-3 pb-2 pt-3` | `px-4 pb-3 pt-4` | 513 |
| Card title text | `text-[11px]` | `text-xs` (12px) | 107 |
| Meta text | `text-[9px]` | `text-[11px]` | 116, 125, 136, 535, 544 |
