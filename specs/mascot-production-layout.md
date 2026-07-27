# Implementation Spec & Plan: Mascot Production Layout Alignment

### 0. Architectural Decision Record (ADR) & Scaling Tradeoffs
- **Context & Constraints**: Mascot images are 850×1270px portrait WebP files. Three structural issues: (1) Hero Jobby hidden on mobile breaks brand visibility, (2) Scrappy in bento card can overlap text, (3) portrait images lack max-height guard rails causing layout overflow.
- **Chosen Architecture**: CSS-only responsive class changes. No JS logic, no new components, no new dependencies. Single source of truth (SIZE_MAP) for height constraints.
- **Discarded Alternatives**:
  - *Two separate Mascot instances (mobile/desktop)*: Rejected — duplicate DOM, unnecessary image requests, harder to maintain.
  - *JS-based responsive switching*: Rejected — CSS responsive classes already solve this with zero runtime cost.

### 1. Target Files & Folder Structure
1. **`src/app/components/marketing/mascot.tsx`** — Add max-h to SIZE_MAP, add `object-contain` to Image.
2. **`src/app/[locale]/(marketing)/page.tsx`** — Hero Jobby: visible on mobile, stacked below mockup card.
3. **`src/app/components/marketing/features-bento.tsx`** — Scrappy containment: card overflow-hidden, text max-width, reposition mascot.

No new files. No file exceeds 300 lines.

### 2. Import Definitions & Dependencies
No new imports needed. All changes use existing Tailwind CSS utility classes and existing component props.

### 3. Database Schema Changes
None.

### 4. Step-by-Step Edits

#### Step 1: mascot.tsx — Add height constraints to SIZE_MAP

**File**: `src/app/components/marketing/mascot.tsx`

**Edit 1 — SIZE_MAP (lines 4-11)**: Add `max-h-[Xpx]` to each size entry. The width classes stay unchanged; the max-h is a guard rail preventing portrait images from growing too tall.

Replace the entire SIZE_MAP constant:
```typescript
const SIZE_MAP = {
  avatar: 'w-12 max-h-[48px]',
  step: 'w-16 sm:w-20 md:w-24 max-h-[150px]',
  xs: 'w-24 sm:w-28 md:w-32 max-h-[200px]',
  sm: 'w-28 sm:w-36 md:w-44 max-h-[280px]',
  md: 'w-40 sm:w-52 md:w-64 max-h-[400px]',
  lg: 'w-56 sm:w-72 md:w-80 max-h-[500px]',
} as const
```

Rationale for values: Each max-h is ~1.5× the largest width in that size tier (portrait aspect ratio ~1.49:1). This prevents overflow without clipping at normal sizes.

**Edit 2 — Image className (line 56-61)**: Add `object-contain` to the Image className string. This ensures images letterbox within their constraint box rather than distorting.

Current (line 56-61):
```typescript
        className={cn(
          'h-auto drop-shadow-xl',
          SIZE_MAP[size],
          isFloating && 'animate-mascot-float',
          circular && 'rounded-full object-cover aspect-square',
        )}
```

Change `'h-auto drop-shadow-xl'` to `'h-auto w-auto max-w-full object-contain drop-shadow-xl'`.

The `circular` variant already has `object-cover` which will override `object-contain` when applied (both can't coexist — Tailwind's later class in the string wins via CSS specificity, but since `circular` is conditionally appended after, it will take precedence in the cn() merge).

#### Step 2: page.tsx — Hero Jobby visible on mobile

**File**: `src/app/[locale]/(marketing)/page.tsx`

The hero section has this structure (lines 61-148):
```
<div className="relative flex justify-center md:justify-end">    ← parent container
  <Mascot ... className="absolute -bottom-6 -left-6 z-20 hidden md:block md:-bottom-10 md:-left-10" />  ← Jobby
  <div className="relative z-10 w-full max-w-lg">                ← mockup card
    ...
  </div>
</div>
```

**Edit 1 — Parent container (line 61)**: Make it a flex column on mobile so children stack vertically.

Current (line 61):
```tsx
            <div className="relative flex justify-center md:justify-end">
```

Change to:
```tsx
            <div className="relative flex flex-col-reverse items-center gap-4 md:flex-row md:justify-end">
```

Why `flex-col-reverse`: Jobby is the first DOM child. `flex-col-reverse` reverses visual order, placing the mockup card on top and Jobby below it on mobile. On desktop, `md:flex-row` restores horizontal layout (Jobby is absolute on desktop so it doesn't affect layout).

**Edit 2 — Jobby Mascot className (line 69)**: Remove `hidden`, make mobile-visible with relative positioning, keep desktop absolute.

Current (line 69):
```tsx
              className="absolute -bottom-6 -left-6 z-20 hidden md:block md:-bottom-10 md:-left-10"
```

Change to:
```tsx
              className="relative md:absolute md:-bottom-10 md:-left-10 z-20"
```

On mobile: `relative` (in-flow, sits below mockup via flex-col-reverse). On desktop: `md:absolute` (peeks from bottom-left). Removed `md:block` since element is now always displayed.

#### Step 3: features-bento.tsx — Scrappy containment

**File**: `src/app/components/marketing/features-bento.tsx`

**Edit 1 — Card overflow (line 137)**: Add `overflow-hidden` to prevent Scrappy from spilling outside card bounds.

Current (line 137):
```tsx
                className={`${f.bgAccent} ${f.borderAccent} relative flex flex-col justify-between rounded-2xl border p-5 sm:p-8 shadow-lg shadow-primary/5 transition-shadow hover:shadow-xl hover:shadow-primary/10`}
```

Change to (add `overflow-hidden` after `relative`):
```tsx
                className={`${f.bgAccent} ${f.borderAccent} relative overflow-hidden flex flex-col justify-between rounded-2xl border p-5 sm:p-8 shadow-lg shadow-primary/5 transition-shadow hover:shadow-xl hover:shadow-primary/10`}
```

**Edit 2 — Scrappy position (line 146)**: Move from top-right to bottom-right (Notion pattern). Increase opacity slightly.

Current (line 146):
```tsx
                    className="absolute right-3 top-3 opacity-90"
```

Change to:
```tsx
                    className="absolute bottom-0 right-0 opacity-95"
```

**Edit 3 — Text max-width (line 149)**: Constrain text to 70% width on the job-search card so it never overlaps Scrappy.

Current (line 149):
```tsx
                <div className="relative z-10">
```

Change to:
```tsx
                <div className={cn('relative z-10', isJobSearch && 'max-w-[70%]')}>
```

**Important**: This requires importing `cn` at the top of the file. Add this import:

Current imports (lines 1-5):
```typescript
import { MessageSquare, ShieldCheck, KanbanSquare } from 'lucide-react'
import { Link } from '~/i18n/routing'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Mascot } from '~/components/marketing/mascot'
```

Add after line 5:
```typescript
import { cn } from '~/lib/utils'
```

### 4.5 Vertical-Slice Order
This is a single vertical slice: all CSS changes ship together. Each step is independently testable via visual inspection at mobile and desktop breakpoints. No multi-layer dependency chain.

### 5. Assertion & Testing Requirements
- **Unit Tests**: N/A — no behavior change, pure CSS class adjustments.
- **Integration Tests**: N/A.
- **E2E UI Tests**: N/A — visual-only change. Manual visual verification at 375px (mobile) and 1280px (desktop) breakpoints is sufficient.

### 6. Verification Commands & Log Files
- **TypeScript check**: `npx tsc --noEmit`
- **Build**: `pnpm build`
- **Lint**: `pnpm lint`
- **Commit message**: `fix(landing): align mascot layout with production standards (mobile visibility, height constraints, bento containment)`
- **Worklog**: Append entry to `.worklog.md`
