# Implementation Spec & Plan: Landing Page Typography + Mascot Integration

### 0. Architectural Decision Record (ADR) & Scaling Tradeoffs

**Context & Constraints:**
- Landing page is the highest-traffic page. Performance is critical (LCP, CLS).
- Mascots are transparent WebP (56–93KB each, 850×1270px portrait). Total payload ~298KB across 4 images.
- Animations must be CSS-only (no JS animation libraries, no GIFs, no videos) to keep the page lightweight and GPU-accelerated.
- `prefers-reduced-motion` must disable floating for accessibility.
- Next.js `next/image` handles optimization (responsive `srcset`, lazy loading, WebP/AVIC conversion).
- No `'use client'` needed — CSS keyframe animation works in server components.

**Chosen Architecture:**
- Single reusable `<Mascot>` server component with CSS-only `@keyframes` float animation.
- Mascots positioned with Tailwind absolute/floating utilities inside existing section containers.
- Typography upgrades are pure Tailwind class swaps — no new dependencies.
- Ambient glow via existing `blur-3xl` + `bg-primary/10` utility combination.
- All i18n strings added to `messages/en.json` and `messages/th.json` under `landing` namespace.

**Discarded Alternatives:**
- *Framer Motion / motion components*: Rejected. Adds JS runtime weight for a simple float. CSS keyframe is 0KB JS, GPU-accelerated, and respects `prefers-reduced-motion` natively.
- *Animated WebP/GIF*: Rejected. File sizes 5–10× larger, no transparent control, frame artifacts. Static WebP + CSS animation is sharper and lighter.
- *Lottie JSON animation*: Rejected. Adds `lottie-react` runtime + JSON asset for a simple up-down float. Overkill.

---

### 1. Target Files & Folder Structure

**Files to CREATE:**
| File | Purpose | Max Lines |
|------|---------|-----------|
| `src/app/components/marketing/mascot.tsx` | Reusable floating mascot component | ~80 lines |

**Files to MODIFY:**
| File | Changes |
|------|---------|
| `src/app/globals.css` | Add `@keyframes mascot-float` + `.animate-mascot-float` + reduced-motion guard (~12 lines) |
| `src/app/[locale]/(marketing)/page.tsx` | Hero typography + Jobby mascot + CTA label (~15 lines changed) |
| `src/app/components/marketing/how-it-works.tsx` | Section label + Resuby mascot (~8 lines changed) |
| `src/app/components/marketing/features-bento.tsx` | Section label + card glow + Scrappy mascot (~10 lines changed) |
| `src/app/components/marketing/interview-section.tsx` | Preppy mascot (~6 lines changed) |
| `messages/en.json` | Add 5 new i18n keys under `landing` |
| `messages/th.json` | Add 5 new i18n keys under `landing` (Thai translations) |

**No files deleted. No DB changes. No new dependencies.**

---

### 2. Import Definitions & Dependencies

**Mascot component imports:**
```tsx
import Image from 'next/image'
import { cn } from '~/lib/utils'
```

**Page/section imports (add to each section that uses a mascot):**
```tsx
import { Mascot } from '~/components/marketing/mascot'
```

**Existing fonts already loaded (no changes needed):**
- `Inter` → `--font-sans` (body, headings)
- `JetBrains Mono` → `--font-mono` (monospace labels, badges)
- `Instrument Serif` → `--font-display` (available but not used on landing — we keep Inter for consistency)

**Existing CSS utilities available for reuse:**
- `.label-mono` — `font-mono text-xs uppercase tracking-wider text-muted-foreground`
- `.label-bracket` — Greptile-style `[ label ]` brackets
- `--ease: cubic-bezier(0.2, 0, 0, 1)` — use for float animation timing
- `.neuro-card` — card with neumorphic shadow (already on feature cards)
- `.hero-glow` — radial gradient glow (already on hero)

---

### 3. Database Schema Changes

**N/A — No database changes. Pure frontend/UI work.**

---

### 4. Step-by-Step Edits

#### Step 1: Add Float Keyframe to `globals.css`

**File:** `src/app/globals.css`
**Location:** After the existing `@keyframes typing-dot` block (around line 450), before the `.animate-fade-up` declarations.

**Add:**
```css
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

**Rationale:** 3s ease-in-out infinite float, 12px amplitude (subtle but visible). Reduced-motion users see static image. Uses existing `--ease` token for consistency.

---

#### Step 2: Create `mascot.tsx` Component

**File:** `src/app/components/marketing/mascot.tsx`
**Full file content:**

```tsx
import Image from 'next/image'
import { cn } from '~/lib/utils'

const SIZE_MAP = {
  sm: 'w-28 sm:w-36 md:w-44',
  md: 'w-40 sm:w-52 md:w-64',
  lg: 'w-56 sm:w-72 md:w-80',
} as const

interface MascotProps {
  src: string
  alt: string
  size?: keyof typeof SIZE_MAP
  className?: string
  /** Glow color CSS. Defaults to primary amber. Use 'var(--gold-glow)' for gold tint. */
  glowColor?: string
  /** Set true for above-the-fold mascots (hero). Adds priority loading. */
  priority?: boolean
}

export function Mascot({
  src,
  alt,
  size = 'md',
  className,
  glowColor = 'var(--accent-soft)',
  priority = false,
}: MascotProps) {
  return (
    <div className={cn('relative pointer-events-none select-none', className)}>
      {/* Ambient glow — sits behind the mascot image */}
      <div
        className="absolute inset-0 -z-10 blur-3xl opacity-60"
        style={{ backgroundColor: glowColor }}
        aria-hidden="true"
      />
      {/* Mascot image — floats via CSS keyframe */}
      <Image
        src={src}
        alt={alt}
        width={850}
        height={1270}
        priority={priority}
        className={cn(
          'h-auto animate-mascot-float drop-shadow-xl',
          SIZE_MAP[size],
        )}
      />
    </div>
  )
}
```

**Key decisions:**
- `pointer-events-none` — mascot is decorative, never blocks clicks.
- `select-none` — prevent text selection drag on the image.
- `drop-shadow-xl` — gives the transparent mascot a subtle depth shadow so it doesn't look flat-floating.
- Glow div uses `blur-3xl opacity-60` for a soft ambient halo. Color configurable per mascot.
- `width={850} height={1270}` — intrinsic aspect ratio for `next/image` (prevents CLS). Display size controlled by Tailwind `w-*` classes + `h-auto`.
- `priority` prop for hero mascot (above-the-fold, preloaded).

---

#### Step 3: Add i18n Keys

**File:** `messages/en.json` — inside the `"landing"` object (after `"footerGetStarted"` or anywhere within the block):

```json
"heroAccentTag": "AI-Powered Job Search",
"sectionLabelHow": "HOW IT WORKS",
"sectionLabelFeatures": "FEATURES",
"sectionLabelInterview": "INTERVIEW PREP",
"sectionLabelCta": "READY TO START",
```

**File:** `messages/th.json` — same keys, Thai translations:

```json
"heroAccentTag": "AI ช่วยหางาน",
"sectionLabelHow": "วิธีการใช้งาน",
"sectionLabelFeatures": "ฟีเจอร์",
"sectionLabelInterview": "ฝึกสัมภาษณ์",
"sectionLabelCta": "พร้อมเริ่มต้น",
```

---

#### Step 4: Hero Typography Upgrade + Jobby Mascot

**File:** `src/app/[locale]/(marketing)/page.tsx`

**4a. Add Mascot import** (line 7, after the InterviewSection import):
```tsx
import { Mascot } from '~/components/marketing/mascot'
```

**4b. Add monospace accent tag above hero h1** (before line 36, inside the `<div className="max-w-lg">`):

Current:
```tsx
<div className="max-w-lg">
  <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl md:text-[3.5rem] md:leading-[1.05]">
```

Change to:
```tsx
<div className="max-w-lg">
  <span className="mb-4 block font-mono text-xs font-medium uppercase tracking-[0.2em] text-primary">
    {t('heroAccentTag')}
  </span>
  <h1 className="text-4xl font-bold leading-[1.08] tracking-tighter text-foreground sm:text-5xl md:text-[3.5rem] md:leading-[1.05]">
```

Changes: `tracking-tight` → `tracking-tighter`, `font-semibold` → `font-bold`.

**4c. Place Jobby mascot in hero** (inside the right column, the `<div className="flex justify-center md:justify-end">` block):

Current:
```tsx
<div className="flex justify-center md:justify-end">
  <div className="relative w-full max-w-lg">
    {/* ATS mockup card */}
```

Change to:
```tsx
<div className="relative flex justify-center md:justify-end">
  {/* Jobby mascot — floats behind/beside the mockup card */}
  <Mascot
    src="/mascot/jobby-hero.webp"
    alt="Jobby — your AI career assistant"
    size="lg"
    priority
    glowColor="var(--amber-glow)"
    className="absolute -top-16 -left-4 z-0 hidden sm:block md:-left-16 lg:-left-20"
  />
  <div className="relative z-10 w-full max-w-lg">
    {/* ATS mockup card — unchanged */}
```

The mockup card div gets `z-10` to sit above Jobby at `z-0`. Jobby is `hidden sm:block` so it doesn't crowd very small screens. Positioned `-top-16 -left-4` to peek from behind the top-left edge of the mockup.

---

#### Step 5: How It Works — Section Label + Resuby Mascot

**File:** `src/app/components/marketing/how-it-works.tsx`

**5a. Add imports** (top of file):
```tsx
import { Mascot } from '~/components/marketing/mascot'
```

**5b. Add monospace section label** (before the `<h2>` in the header area):

Current (around line 35–38):
```tsx
<div className="max-w-xl">
  <h2 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
    {t('howTitle')}
  </h2>
```

Change to:
```tsx
<div className="max-w-xl">
  <span className="mb-3 block font-mono text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
    {t('sectionLabelHow')}
  </span>
  <h2 className="text-4xl font-semibold tracking-tighter text-foreground md:text-5xl">
    {t('howTitle')}
  </h2>
```

Change: `tracking-tight` → `tracking-tighter` on h2.

**5c. Place Resuby mascot** — Add as a floating element positioned at the right edge of the section header area, peeking from behind:

After the closing `</div>` of `<div className="max-w-xl">` (the header text block), before the steps grid, add:

```tsx
{/* Resuby mascot — firefighter robot, resume builder companion */}
<Mascot
  src="/mascot/resuby.webp"
  alt="Resuby — AI resume builder robot"
  size="md"
  glowColor="var(--gold-glow)"
  className="absolute -top-8 right-0 z-0 hidden lg:block opacity-90"
/>
```

The parent `<div className="mx-auto max-w-[1120px] px-6">` needs `relative` added to its className for absolute positioning to work:

Change:
```tsx
<div className="mx-auto max-w-[1120px] px-6">
```
To:
```tsx
<div className="relative mx-auto max-w-[1120px] px-6">
```

---

#### Step 6: Features Bento — Section Label + Card Glow + Scrappy Mascot

**File:** `src/app/components/marketing/features-bento.tsx`

**6a. Add imports** (top of file):
```tsx
import { Mascot } from '~/components/marketing/mascot'
```

**6b. Add monospace section label + tighter tracking** (header area, around line 42–44):

Current:
```tsx
<div className="max-w-xl">
  <h2 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
    {t('featuresTitle')}
  </h2>
```

Change to:
```tsx
<div className="max-w-xl">
  <span className="mb-3 block font-mono text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
    {t('sectionLabelFeatures')}
  </span>
  <h2 className="text-4xl font-semibold tracking-tighter text-foreground md:text-5xl">
    {t('featuresTitle')}
  </h2>
```

**6c. Add border-glow to feature cards** — Enhance the card shadow classes:

For the large card (line ~54), change:
```tsx
className={`${large.bgAccent} ${large.borderAccent} row-span-2 flex flex-col justify-between rounded-2xl border p-5 sm:p-8 md:p-10 shadow-sm`}
```
To:
```tsx
className={`${large.bgAccent} ${large.borderAccent} row-span-2 flex flex-col justify-between rounded-2xl border p-5 sm:p-8 md:p-10 shadow-lg shadow-primary/5 transition-shadow hover:shadow-xl hover:shadow-primary/10`}
```

For the small cards (line ~130), change:
```tsx
className={`${f.bgAccent} ${f.borderAccent} flex flex-col justify-between rounded-2xl border p-5 sm:p-8 shadow-sm`}
```
To:
```tsx
className={`${f.bgAccent} ${f.borderAccent} flex flex-col justify-between rounded-2xl border p-5 sm:p-8 shadow-lg shadow-primary/5 transition-shadow hover:shadow-xl hover:shadow-primary/10`}
```

**6d. Place Scrappy mascot** — Add after the header block, before the grid:

After the closing `</div>` of the header text block (after the `<p>` with `featuresSubtitle`), add:

```tsx
{/* Scrappy mascot — scavenger robot, job search companion */}
<Mascot
  src="/mascot/scrappy.webp"
  alt="Scrappy — AI job search robot"
  size="md"
  glowColor="var(--accent-soft)"
  className="absolute top-0 right-0 z-0 hidden lg:block opacity-90"
/>
```

The parent `<div className="mx-auto max-w-[1120px] px-6">` needs `relative`:

Change:
```tsx
<div className="mx-auto max-w-[1120px] px-6">
```
To:
```tsx
<div className="relative mx-auto max-w-[1120px] px-6">
```

---

#### Step 7: Interview Section — Preppy Mascot

**File:** `src/app/components/marketing/interview-section.tsx`

**7a. Add import** (top of file):
```tsx
import { Mascot } from '~/components/marketing/mascot'
```

**7b. Add monospace section label** — The interview section already has a badge. Add a section label above the badge for consistency with other sections:

Before the badge div (line ~25), add:
```tsx
<span className="mb-3 block font-mono text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
  {t('sectionLabelInterview')}
</span>
```

Also change h2 tracking: `tracking-tight` → `tracking-tighter` (line ~33).

**7c. Place Preppy mascot** — In the right column (mockup area), position Preppy as a floating companion behind the mockup card:

The right column is `<div className="relative w-full max-w-lg justify-self-end">`. Add Preppy as the first child:

```tsx
<div className="relative w-full max-w-lg justify-self-end">
  {/* Preppy mascot — interview prep robot with headset */}
  <Mascot
    src="/mascot/preppy.webp"
    alt="Preppy — AI interview prep robot"
    size="md"
    glowColor="var(--accent-soft)"
    className="absolute -top-12 -right-4 z-0 hidden md:block md:-right-12 lg:-right-16"
  />
  <div className="relative z-10 overflow-hidden rounded-2xl neuro-card">
    {/* Window chrome — existing content */}
```

The mockup card gets `z-10` (add `relative z-10` to the card's className).

---

#### Step 8: CTA Section — Section Label

**File:** `src/app/[locale]/(marketing)/page.tsx`

In the CTA section (line ~150–153), add a monospace label before the h2:

Current:
```tsx
<div className="max-w-2xl">
  <h2 className="text-3xl font-semibold tracking-tight text-brand-foreground md:text-4xl">
```

Change to:
```tsx
<div className="max-w-2xl">
  <span className="mb-3 block font-mono text-xs font-medium uppercase tracking-[0.2em] text-brand-foreground/60">
    {t('sectionLabelCta')}
  </span>
  <h2 className="text-3xl font-bold tracking-tighter text-brand-foreground md:text-4xl">
```

Change: `tracking-tight` → `tracking-tighter`, `font-semibold` → `font-bold`.

---

### 4.5 Vertical-Slice Order

Each slice is independently testable — build + visual check after each.

**Slice 1: Foundation (Mascot component + CSS)** ✅
- Create `mascot.tsx`
- Add `@keyframes mascot-float` + `.animate-mascot-float` + reduced-motion guard to `globals.css`
- Add i18n keys to both `en.json` and `th.json`
- **Verify:** `pnpm build` passes. Import Mascot in any section, confirm it renders with float animation.

**Slice 2: Hero typography + Jobby mascot** ✅
- Apply Step 4 (hero accent tag, tighter tracking, font-bold, Jobby placement)
- **Verify:** Hero shows monospace tag above headline, tighter tracking, Jobby floating behind mockup card. Check mobile (Jobby hidden on `< sm`).

**Slice 3: Section labels + card glow** ✅
- Apply Steps 5b, 6b, 6c, 7b, 8 (monospace labels on all sections, tighter tracking on all h2s, card glow on feature cards)
- **Verify:** Each section has a monospace label above its h2. Feature cards have subtle primary glow shadow with hover intensification.

**Slice 4: Remaining mascots (Resuby, Scrappy, Preppy)** ✅
- Apply Steps 5c, 6d, 7c (place mascots in How It Works, Features, Interview sections)
- **Verify:** Each mascot floats gently, positioned at section edges without overlapping content. Check responsive breakpoints (mascots hidden on small screens where specified).

---

### 5. Assertion & Testing Requirements

**No behavioral logic changes.** This is a visual/UI-only change. Tests focus on build success and visual correctness.

**Build Verification:**
- `pnpm build` must succeed with zero TypeScript errors
- `npx tsc --noEmit` must pass
- No new ESLint warnings from `pnpm lint`

**Visual Verification (manual):**
- [ ] Hero: monospace accent tag visible above h1, `tracking-tighter` applied, Jobby floats behind mockup
- [ ] Jobby hidden on screens `< 640px` (sm breakpoint)
- [ ] How It Works: "HOW IT WORKS" monospace label above h2, Resuby floats at section edge (lg screens only)
- [ ] Features: "FEATURES" label above h2, cards have subtle primary glow + hover intensification, Scrappy floats at edge
- [ ] Interview: "INTERVIEW PREP" label, Preppy floats behind mockup (md+ screens)
- [ ] CTA: "READY TO START" label, `font-bold tracking-tighter`
- [ ] All mascots: gentle 3s float animation, ambient glow visible behind each
- [ ] `prefers-reduced-motion: reduce` → mascots are static (no float)
- [ ] Dark mode: mascots visible, glow adapts, typography readable
- [ ] No layout shift (CLS) on page load — mascot dimensions reserved by `next/image` width/height

**Unit Tests:** N/A — no behavior change, pure visual.
**Integration Tests:** N/A — no API or data changes.
**E2E Tests:** N/A — visual-only, not worth Playwright overhead.

---

### 6. Verification Commands & Log Files

| Check | Command |
|-------|---------|
| TypeScript | `npx tsc --noEmit` |
| Build | `pnpm build` |
| Lint | `pnpm lint` |
| Dev server | `pnpm dev` → visit `http://localhost:3000/en` |

**If build fails:** Check `next build` output in terminal. Common issues:
- Missing i18n key → add to both `messages/en.json` and `messages/th.json`
- Import path error → verify `~/components/marketing/mascot` resolves (alias `~/` = `./src/app/`)
- Image not found → verify `/mascot/*.webp` files exist in `public/mascot/`

**Dev server logs:** Console output in terminal running `pnpm dev`. Browser console for runtime errors.

---

### Appendix: Reference Design Principles Applied

| Reference | Principle | Applied As |
|-----------|-----------|------------|
| Zen Browser | Tight tracking, high contrast | `tracking-tighter` on all landing h1/h2s |
| Greptile / Mercor | Monospace micro-badges | `font-mono text-xs uppercase tracking-[0.2em]` section labels |
| Duolingo / GitHub Octocat | Mascot as floating companion | `<Mascot>` with CSS float, positioned at section edges |
| Sentry | Ambient glow behind mascot | `blur-3xl opacity-60` glow div |
| Qodo AI | Subtle border-glow on cards | `shadow-lg shadow-primary/5` + hover intensification |
| Cloudflare | Clean hierarchy, tight line-height | `leading-[1.05]` on display sizes (already present) |
