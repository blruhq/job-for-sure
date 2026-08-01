# Implementation Spec & Plan: Mascot Visibility Fix

### 0. Architectural Decision Record (ADR) & Scaling Tradeoffs
- **Context**: 4 mascots (Jobby, Preppy, Resuby, Scrappy) are `absolute z-0` behind content cards (`z-10`). They get clipped by `overflow-x-clip` and hidden behind cards. Users cannot see them.
- **Chosen Architecture**: Change mascots to `z-20` companion badges that peek from card edges (above cards, not behind). Add `xs` size to Mascot component (w-24 to w-32, 96-128px). This matches production patterns (Duolingo, Sentry, Qodo) where decorative characters sit above content as visible companions.
- **Discarded Alternatives**:
  - *Grid sibling*: Would require restructuring every section's grid layout. Too invasive for a visibility fix.
  - *Removing mascots entirely*: Loses brand personality. Not acceptable.

### 1. Target Files & Folder Structure
1. **`src/app/components/marketing/mascot.tsx`** — Add `xs` size to SIZE_MAP
2. **`src/app/[locale]/(marketing)/page.tsx`** — Fix Jobby (line 63-70)
3. **`src/app/components/marketing/interview-section.tsx`** — Fix Preppy (line 75-81)
4. **`src/app/components/marketing/how-it-works.tsx`** — Fix Resuby (line 48-54)
5. **`src/app/components/marketing/features-bento.tsx`** — Fix Scrappy (line 56-62)

### 2. Import Definitions & Dependencies
- No new imports. `Mascot` component already imported in all 4 files.
- `cn` utility from `~/lib/utils` already used in mascot.tsx.

### 3. Database Schema Changes
- N/A — pure CSS/layout fix.

### 4. Step-by-Step Edits

#### Step 1: Add `xs` size to Mascot component
File: `src/app/components/marketing/mascot.tsx`

Add `xs` to the `SIZE_MAP` constant (before `sm`):
```typescript
const SIZE_MAP = {
  xs: 'w-24 sm:w-28 md:w-32',
  sm: 'w-28 sm:w-36 md:w-44',
  md: 'w-40 sm:w-52 md:w-64',
  lg: 'w-56 sm:w-72 md:w-80',
} as const
```

No other changes to this file. The component already has `pointer-events-none select-none` on the wrapper div.

#### Step 2: Fix Jobby (Hero) — page.tsx lines 63-70

**OLD:**
```tsx
<Mascot
  src="/mascot/jobby-hero.webp"
  alt="Jobby — your AI career assistant"
  size="lg"
  priority
  glowColor="var(--amber-glow)"
  className="absolute -top-16 -left-4 z-0 hidden sm:block md:-left-16 lg:-left-20"
/>
```

**NEW:**
```tsx
<Mascot
  src="/mascot/jobby-hero.webp"
  alt="Jobby — your AI career assistant"
  size="xs"
  priority
  glowColor="var(--amber-glow)"
  className="absolute -top-10 -left-4 z-20 hidden sm:block md:-top-12 md:-left-8"
/>
```

Changes: `size="lg"` → `size="xs"`, `z-0` → `z-20`, repositioned to peek from top-left of mockup card (small negative offsets, not extreme).

#### Step 3: Fix Preppy (Interview) — interview-section.tsx lines 75-81

**OLD:**
```tsx
<Mascot
  src="/mascot/preppy.webp"
  alt="Preppy — AI interview prep robot"
  size="md"
  glowColor="var(--accent-soft)"
  className="absolute -top-12 -right-4 z-0 hidden md:block md:-right-12 lg:-right-16"
/>
```

**NEW:**
```tsx
<Mascot
  src="/mascot/preppy.webp"
  alt="Preppy — AI interview prep robot"
  size="xs"
  glowColor="var(--accent-soft)"
  className="absolute -top-8 -right-4 z-20 hidden md:block md:-top-10 md:-right-8"
/>
```

Changes: `size="md"` → `size="xs"`, `z-0` → `z-20`, smaller offsets to peek from top-right of mockup card.

#### Step 4: Fix Resuby (How It Works) — how-it-works.tsx lines 48-54

**OLD:**
```tsx
<Mascot
  src="/mascot/resuby.webp"
  alt="Resuby — AI resume builder robot"
  size="md"
  glowColor="var(--gold-glow)"
  className="absolute -top-8 right-0 z-0 hidden lg:block opacity-90"
/>
```

**NEW:**
```tsx
<Mascot
  src="/mascot/resuby.webp"
  alt="Resuby — AI resume builder robot"
  size="xs"
  glowColor="var(--gold-glow)"
  className="absolute -top-4 right-0 z-20 hidden lg:block opacity-90"
/>
```

Changes: `size="md"` → `size="xs"`, `z-0` → `z-20`, slight reposition.

#### Step 5: Fix Scrappy (Features Bento) — features-bento.tsx lines 56-62

**OLD:**
```tsx
<Mascot
  src="/mascot/scrappy.webp"
  alt="Scrappy — AI job search robot"
  size="md"
  glowColor="var(--accent-soft)"
  className="absolute top-0 right-0 z-0 hidden lg:block opacity-90"
/>
```

**NEW:**
```tsx
<Mascot
  src="/mascot/scrappy.webp"
  alt="Scrappy — AI job search robot"
  size="xs"
  glowColor="var(--accent-soft)"
  className="absolute top-0 right-0 z-20 hidden lg:block opacity-90"
/>
```

Changes: `size="md"` → `size="xs"`, `z-0` → `z-20`, position unchanged (already good).

### 4.5 Vertical-Slice Order
Single slice — all 4 mascots + component change form one visual unit. Apply all 5 edits, then verify with build.

### 5. Assertion & Testing Requirements
- **Unit Tests**: N/A — no behavior change, pure CSS/layout.
- **Integration Tests**: N/A
- **E2E UI Tests**: N/A — visual-only change.
- **Manual verification**: Mascots should be visible at z-20 above cards on desktop breakpoints.

### 6. Verification Commands & Log Files
- TypeScript check: `npx tsc --noEmit`
- Build: `pnpm build`
- Lint: `pnpm lint`
- If build fails, check console output for compilation errors.
