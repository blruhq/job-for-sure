# Spec: Landing Page Redesign — Mascot Integration & Visual Polish

## Section 1 — Product

### Goal & Scope
Redesign the landing page mascot integration and overall visual quality to feel production-grade, not AI-generated. The mascot "Jobby" should feel like a character in the design — not a bouncing 2D sticker. Animation, positioning, glow effects, and mascot density all need refinement based on modern SaaS mascot patterns (Duolingo, Sentry, Notion).

### Why
User explicitly flagged: mascot "jumping up down" looks cheap/distracting, interview section mascot head doesn't fit the composition, too many mascots on page = cluttered, overall page should feel "modern, artistic, stylish, unique — no AI slop." Research confirms current patterns are anti-patterns.

### Out of Scope
- Redesigning the product UI (dashboard, chat, resume editor) — landing page only
- Changing the mascot artwork itself (the .webp files stay)
- Changing the nav bar or footer structure
- Changing i18n copy/translations
- Adding new page sections
- Performance optimization (separate concern)
- Dark mode redesign (dark mode already neutralizes neuro shadows)

### User Stories / Acceptance Criteria
1. **As a visitor**, the hero mascot (Jobby) should look like it belongs in the composition — subtle breathing, not bouncing. No distracting glow blob.
2. **As a visitor**, the interview section should not have a mascot clipping/overlapping the mockup card. Either removed or repositioned to peek naturally.
3. **As a visitor**, the page should not feel cluttered with mascots. Maximum 2 prominent mascot appearances (hero + one other).
4. **As a visitor**, the page should feel cohesive, modern, and intentional — like a real product, not AI-generated.
5. **As a mobile user**, all sections render correctly without clipping or overflow.
6. **As a user with reduced motion preference**, all mascot animations are disabled.

---

## Section 2 — Engineering Handoff

### Target Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/app/globals.css` | 843 | Replace `mascot-float` keyframe → `mascot-breathe` |
| `src/app/components/marketing/mascot.tsx` | 65 | Remove glow blob, update variant logic |
| `src/app/[locale]/(marketing)/page.tsx` | 260 | Hero mascot positioning fix |
| `src/app/components/marketing/interview-section.tsx` | 193 | Remove/reposition Preppy mascot, fix composition |
| `src/app/components/marketing/how-it-works.tsx` | 95 | Evaluate mascot reduction (4 → fewer) |
| `src/app/components/marketing/features-bento.tsx` | 195 | Evaluate Scrappy mascot positioning |

### Imports & Dependencies
- No new dependencies needed
- Uses existing: `next/image`, `cn` from `~/lib/utils`, `lucide-react` icons
- CSS animations defined in `globals.css`, consumed via Tailwind utility classes

### Step-by-Step Edits

---

#### Step 1: Replace Float Animation with Breathing (globals.css)

**File**: `src/app/globals.css`

**Replace** lines 452-465 (the `mascot-float` keyframe + `.animate-mascot-float` + reduced-motion rule):

```css
/* OLD — DELETE */
@keyframes mascot-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-12px); }
}

.animate-mascot-float {
  animation: mascot-float 3s var(--ease) infinite;
}

@media (prefers-reduced-motion: reduce) {
  .animate-mascot-float {
    animation: none;
  }
}
```

**With**:
```css
/* NEW — Breathing animation (subtle scale, not bounce) */
@keyframes mascot-breathe {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.02); }
}

.animate-mascot-breathe {
  animation: mascot-breathe 5s var(--ease) infinite;
}

@media (prefers-reduced-motion: reduce) {
  .animate-mascot-breathe {
    animation: none;
  }
}
```

**Why**: 5s duration + scale(1.02) is barely perceptible but adds life. No translateY means no "jumping". Matches Duolingo/Headspace idle animation pattern.

---

#### Step 2: Update Mascot Component — Remove Glow Blob, Add Breathe Variant

**File**: `src/app/components/marketing/mascot.tsx`

**Change 1**: Update `variant` prop type and default behavior.

Current variant type: `'floating' | 'static'`

New variant type: `'breathe' | 'static'`

- `'breathe'`: Uses `animate-mascot-breathe` class. No glow blob. For hero/feature mascots that need subtle life.
- `'static'`: No animation, no glow. For inline step markers, avatars inside mockups.

**Change 2**: Remove the glow blob `<div>` entirely (lines 42-48). Delete:
```tsx
{isFloating && (
  <div
    className="absolute inset-0 -z-10 blur-3xl opacity-60"
    style={{ backgroundColor: glowColor }}
    aria-hidden="true"
  />
)}
```

**Change 3**: Update the Image className from `isFloating && 'animate-mascot-float'` to `isBreathe && 'animate-mascot-breathe'`.

**Change 4**: Remove `glowColor` prop entirely — no longer needed since glow blob is removed. Clean up prop interface.

**Full replacement for mascot.tsx**:
```tsx
import Image from 'next/image'
import { cn } from '~/lib/utils'

const SIZE_MAP = {
  avatar: 'w-12 max-h-[48px]',
  step: 'w-16 sm:w-20 md:w-24 max-h-[150px]',
  xs: 'w-24 sm:w-28 md:w-32 max-h-[200px]',
  sm: 'w-28 sm:w-36 md:w-44 max-h-[280px]',
  md: 'w-40 sm:w-52 md:w-64 max-h-[400px]',
  lg: 'w-56 sm:w-72 md:w-80 max-h-[500px]',
} as const

interface MascotProps {
  src: string
  alt: string
  size?: keyof typeof SIZE_MAP
  className?: string
  /** Set true for above-the-fold mascots (hero). Adds priority loading. */
  priority?: boolean
  /** "breathe" (default): subtle breathing animation. "static": no animation — for inline/inside-mockup use. */
  variant?: 'breathe' | 'static'
  /** Circular crop — for avatar use inside mockups. */
  circular?: boolean
}

export function Mascot({
  src,
  alt,
  size = 'md',
  className,
  priority = false,
  variant = 'breathe',
  circular = false,
}: MascotProps) {
  const isBreathing = variant === 'breathe'
  return (
    <div className={cn('relative pointer-events-none select-none', className)}>
      <Image
        src={src}
        alt={alt}
        width={850}
        height={1270}
        priority={priority}
        className={cn(
          'h-auto w-auto max-w-full object-contain drop-shadow-xl',
          SIZE_MAP[size],
          isBreathing && 'animate-mascot-breathe',
          circular && 'rounded-full object-cover aspect-square',
        )}
      />
    </div>
  )
}
```

---

#### Step 3: Update Hero Mascot Positioning (page.tsx)

**File**: `src/app/[locale]/(marketing)/page.tsx`

**Current** (lines 91-100):
```tsx
<div className="relative flex flex-col-reverse items-center gap-4 md:flex-row md:justify-end">
  <Mascot
    src="/mascot/jobby-hero.webp"
    alt={t('mascotAltHero')}
    size="sm"
    priority
    glowColor="var(--amber-glow)"
    className="relative md:absolute md:-bottom-10 md:-left-10 z-20"
  />
```

**Replace with**:
```tsx
<div className="relative flex flex-col-reverse items-center gap-4 md:flex-row md:justify-end">
  <Mascot
    src="/mascot/jobby-hero.webp"
    alt={t('mascotAltHero')}
    size="sm"
    priority
    variant="breathe"
    className="relative md:absolute md:-bottom-8 md:-left-6 z-20 drop-shadow-2xl"
  />
```

**Changes**:
- Remove `glowColor` prop (deleted from component)
- Add `variant="breathe"` explicitly (was default `"floating"` before, now `"breathe"`)
- Adjust position: `-bottom-8 -left-6` (was `-bottom-10 -left-10`) — slightly less aggressive offset so mascot overlaps less with card
- Add `drop-shadow-2xl` for depth without glow blob

---

#### Step 4: Fix Interview Section — Remove External Preppy Mascot

**File**: `src/app/components/marketing/interview-section.tsx`

**Problem**: The external Preppy mascot (lines 75-81) at `absolute -bottom-8 -left-8 z-20` overlaps the mockup card awkwardly. User reports "picture not fit, head more".

**Decision**: Remove the external Preppy mascot entirely. The interview section already has a Preppy avatar INSIDE the mockup card (lines 103-111, circular avatar in the AI question card). That's the "Embedded in Product Mockup" pattern (Notion style) and is sufficient.

**Delete** lines 74-81 (the external Preppy mascot):
```tsx
{/* Preppy mascot — peeks from bottom-left of the mockup card (Sentry-style) */}
<Mascot
  src="/mascot/preppy.webp"
  alt={t('mascotAltInterviewer')}
  size="step"
  glowColor="var(--accent-soft)"
  className="absolute -bottom-8 -left-8 z-20 hidden md:block md:-bottom-12 md:-left-12"
/>
```

**Why**: Two Preppy mascots in the same section is redundant. The internal avatar (circular, inside the question card) is the correct pattern — it shows the mascot as a character IN the product, not a decoration floating beside it.

---

#### Step 5: Reduce Mascot Density in HowItWorks

**File**: `src/app/components/marketing/how-it-works.tsx`

**Current**: 4 mascots (one per step), all `size="step"` `variant="static"`.

**Problem**: 4 mascots in one section is visual noise. Each is small and indistinguishable from far away.

**Decision**: Remove mascots from step cards entirely. Replace with a single, larger Jobby mascot positioned at the section header level (like a section "guide"). OR keep just the first step's mascot (Jobby) as a visual anchor and remove the other three.

**Recommended approach** — Remove all 4 step mascots. The icons (Upload, Search, FileCheck, LayoutDashboard) already provide visual differentiation per step. Mascots here add clutter without value.

**Delete** from the STEPS map entries: remove `mascot` and `mascotAlt` fields from each step object (lines 15-16, 22-23, 29-30, 36-37).

**Delete** the `<Mascot>` component usage (lines 61-68):
```tsx
<Mascot
  src={step.mascot}
  alt={step.mascotAlt}
  size="step"
  variant="static"
  glowColor="transparent"
  className="mb-3"
/>
```

**Remove** the `Mascot` import at top of file (line 5):
```tsx
import { Mascot } from '~/components/marketing/mascot'
```

**Alternative** (if Co-Founder wants some mascot presence): Keep ONLY Jobby on step 1, remove mascots from steps 2-4. But default spec removes all — cleaner.

---

#### Step 6: Evaluate Scrappy in FeaturesBento

**File**: `src/app/components/marketing/features-bento.tsx`

**Current** (lines 140-148): Scrappy mascot in the job-search bento card, `size="step"`, `variant="static"`, `absolute bottom-0 right-0 opacity-95`.

**Decision**: Keep as-is. This is the correct "Embedded in Product Mockup" pattern (Notion style). The mascot sits inside a feature card, not floating randomly. The `static` variant means no animation.

**No changes needed** for this file. But ensure the `glowColor` prop is removed from the call if it exists (it doesn't currently — already `glowColor="transparent"`). Since we're removing `glowColor` from the component, this call doesn't use it anyway.

Wait — actually, the FeaturesBento currently passes `glowColor="transparent"`. Since we're removing the prop entirely from MascotProps, we need to remove it from all call sites. Let me check:

- `page.tsx` line 98: `glowColor="var(--amber-glow)"` → remove
- `interview-section.tsx` line 79: `glowColor="var(--accent-soft)"` → being deleted entirely
- `interview-section.tsx` line 109: `glowColor="transparent"` → remove prop
- `how-it-works.tsx` line 66: `glowColor="transparent"` → being deleted entirely
- `features-bento.tsx` line 146: `glowColor="transparent"` → remove prop

**Action**: Remove all `glowColor` props from every `<Mascot>` call site across all files. The prop no longer exists.

---

#### Step 7: Update All Remaining Call Sites for Prop Changes

Search for all `<Mascot` usages and update:

1. **`interview-section.tsx` line 103-111** (internal avatar): Remove `glowColor="transparent"`, change `variant="static"` stays as-is (no change needed beyond glowColor removal).

2. **`features-bento.tsx` line 140-148** (Scrappy): Remove `glowColor="transparent"`. `variant="static"` stays.

3. **Any other files**: Search for `glowColor` and `variant="floating"` across the codebase and update.

```bash
# Verification command
grep -rn "glowColor\|variant=\"floating\"\|animate-mascot-float" src/
```
Should return zero results after all edits.

---

### Component States

| State | Behavior |
|-------|----------|
| **Default (hero mascot)** | Breathing animation (scale 1→1.02, 5s loop). drop-shadow-2xl for depth. |
| **Static (step/avatar/mocked)** | No animation. No glow. Sits naturally in layout. |
| **Reduced motion** | All breathing animations disabled via `prefers-reduced-motion: reduce`. |
| **Mobile** | Hero mascot uses `flex-col-reverse` stacking. No absolute positioning on mobile (only `md:absolute`). |
| **Dark mode** | Neuro shadows neutralized (existing behavior). Mascot images render same. drop-shadow still works. |

### Edge Cases

| Case | Handling |
|------|----------|
| **Mascot image fails to load** | `next/image` shows blur placeholder. `alt` text provides context. |
| **Very narrow viewport (<360px)** | Hero mascot stacks below text via `flex-col-reverse`. Mockup card max-width constrains. |
| **Reduced motion** | CSS `@media (prefers-reduced-motion: reduce)` disables `animate-mascot-breathe`. Mascot is static. |
| **Print/export** | Animations don't affect print. Mascot renders as static image. |
| **Rapid scroll past sections** | No scroll-triggered animations to cause jank. Breathing is GPU-composited (transform only). |

### API Contracts
No API changes. All changes are client-side CSS + component props.

### Vertical Slices

1. **Slice 1 — CSS animation** (globals.css): Replace float → breathe. Test: view hero, confirm subtle scale not bounce.
2. **Slice 2 — Mascot component** (mascot.tsx): Remove glow blob, update variant prop. Test: no blur-3xl div rendered.
3. **Slice 3 — All call sites**: Remove glowColor props, update variant names. Test: `grep` returns zero `glowColor`/`floating`/`mascot-float` references.
4. **Slice 4 — Hero positioning**: Adjust hero mascot offset. Test: mascot sits naturally beside mockup card.
5. **Slice 5 — Interview section**: Remove external Preppy. Test: only internal avatar remains, no clipping.
6. **Slice 6 — HowItWorks**: Remove step mascots. Test: section renders with icons only, cleaner.
7. **Slice 7 — Full page review**: Screenshot entire page, compare density/flow.

---

### Verification Exit Criteria

**Engineer MUST self-verify ALL of these before reporting DONE:**

- [x] `grep -rn "glowColor" src/` returns zero results — all glowColor props removed
- [x] `grep -rn "variant=\"floating\"" src/` returns zero results — no floating variant references remain
- [x] `grep -rn "animate-mascot-float" src/` returns zero results — old animation class gone
- [x] `grep -rn "mascot-float" src/app/globals.css` returns zero results — old keyframe deleted
- [x] `grep -rn "mascot-breathe" src/app/globals.css` returns the new keyframe + class + reduced-motion rule (3 matches)
- [x] `npx tsc --noEmit` passes with zero errors — no broken prop types
- [x] `pnpm lint` passes with zero errors
- [x] `pnpm build` succeeds — no build errors
- [x] Dev server (`pnpm dev`) starts without errors — check terminal output
- [x] Hero section: mascot shows subtle breathing (scale), NOT up-down bounce — visual check at `http://localhost:3000/en`
- [x] Hero section: NO blurred glow blob behind mascot — inspect DOM, no `blur-3xl` div inside mascot wrapper
- [x] Interview section: NO external Preppy mascot floating beside the mockup card — only the circular avatar inside the question card
- [x] HowItWorks section: NO mascots on step cards — only icons (Upload, Search, FileCheck, LayoutDashboard)
- [x] FeaturesBento: Scrappy mascot still present inside job-search card, no glowColor prop
- [x] Mobile viewport (375px width): hero mascot stacks below text, no horizontal overflow
- [x] Mobile viewport: all sections render without clipping
- [x] `prefers-reduced-motion: reduce` (DevTools → Rendering): mascot is completely static, no animation
- [x] Dark mode: mascot renders correctly, no glow artifacts, neuro shadows neutralized
- [x] Full page screenshot taken at desktop (1440px) and mobile (375px) for Co-Founder review

---

### Co-Founder Audit Checklist (Post-Implementation)

The Co-Founder agent should evaluate these specific aspects:

**Mascot Integration Quality:**
- [ ] Does Jobby in the hero feel like part of the composition, or like a pasted sticker?
- [ ] Is the breathing animation perceptible but not distracting?
- [ ] Is there any residual "AI slop" feeling from glow effects or positioning?
- [ ] Are there too many or too few mascot appearances? (Target: hero + Scrappy in bento = 2 prominent)

**Interview Section:**
- [ ] Does the section feel complete without the external Preppy mascot?
- [ ] Is the internal avatar (circular Preppy in question card) sufficient character presence?
- [ ] No clipping or overlap issues on desktop or mobile?

**Overall Page Flow:**
- [ ] Hero → HowItWorks → Features → Interview → CTA: does each section feel distinct?
- [ ] Is visual hierarchy clear? (headlines > body > captions)
- [ ] Is the neuro design language consistent across all sections?
- [ ] Are animations tasteful? (not too many, not too few)
- [ ] Does the page feel like a real product (Duolingo/Sentry quality) or AI-generated?

**Responsive:**
- [ ] Mobile (375px): all sections readable, no overflow, touch targets ≥44px
- [ ] Tablet (768px): grid layouts collapse correctly
- [ ] Desktop (1440px): composition balanced, whitespace generous

**Before/After:**
- [ ] Co-Founder takes screenshots of current state (before) for comparison
- [ ] Co-Founder takes screenshots after implementation
- [ ] Side-by-side comparison shows clear improvement
