# Implementation Spec & Plan — Mascot Layout Redesign

## 0. Context & Goal

Landing page currently renders 4 mascot characters as tiny `absolute` floating badges (`size="xs"`, `z-20`) clipped to card edges. This reads as stickers, not integrated product illustration. Redesign per research patterns from Duolingo, Qodo, Sentry, GitHub, Notion.

Branch: `feat/mobile-responsiveness` (already checked out).

### Assets (confirmed present, transparent WebP, 850×1270px)
- `/mascot/jobby-hero.webp` — business suit robot (Hero)
- `/mascot/resuby.webp` — firefighter robot (How It Works, step 3)
- `/mascot/preppy.webp` — headset robot (Interview section)
- `/mascot/scrappy.webp` — scavenger robot (Features bento, job search card)

### CSS tokens confirmed in `src/app/globals.css`
- `--accent-soft` (default amber), `--gold-glow`, `--amber-glow` — all exist.
- `@keyframes mascot-float` + `.animate-mascot-float` — exist (line 452-462).

---

## 1. Target Files

| File | Action |
|------|--------|
| `src/app/components/marketing/mascot.tsx` | Add `size="step"` + `size="avatar"` + `variant` prop |
| `src/app/[locale]/(marketing)/page.tsx` | Hero: Jobby peeking from bottom-left of mockup (Sentry-style), Option C |
| `src/app/components/marketing/how-it-works.tsx` | 4 mascots as step anchors above step icons (Qodo pattern) |
| `src/app/components/marketing/features-bento.tsx` | Scrappy INSIDE job-search bento card (Notion pattern) |
| `src/app/components/marketing/interview-section.tsx` | Preppy face as AI avatar in question card + peek from bottom-left |
| `messages/en.json` | Add mascot alt-text keys |
| `messages/th.json` | Add mascot alt-text keys (Thai) |

No DB changes. No new dependencies. No new files beyond spec.

---

## 2. Step-by-Step Edits

### Step 1 — Extend `Mascot` component (`mascot.tsx`)

**Goal**: Support a small step-anchor size, a tiny circular avatar size, and a `variant` to disable float animation for inline/inside-mockup usage.

Edit the `SIZE_MAP` and props.

**New `SIZE_MAP`** (add two entries, keep existing):
```ts
const SIZE_MAP = {
  avatar: 'w-12',            // 48px — circular AI avatar inside mockups
  step: 'w-16 sm:w-20 md:w-24',  // 64-96px — step anchors
  xs: 'w-24 sm:w-28 md:w-32',
  sm: 'w-28 sm:w-36 md:w-44',
  md: 'w-40 sm:w-52 md:w-64',
  lg: 'w-56 sm:w-72 md:w-80',
} as const
```

**Add `variant` prop** to `MascotProps`:
```ts
interface MascotProps {
  src: string
  alt: string
  size?: keyof typeof SIZE_MAP
  className?: string
  glowColor?: string
  priority?: boolean
  /** "floating" (default): float animation + glow. "static": no animation, no glow — for inline/inside-mockup use. */
  variant?: 'floating' | 'static'
  /** Circular crop — for avatar use inside mockups. */
  circular?: boolean
}
```

**Render logic changes**:
- Destructure `variant = 'floating'`, `circular = false`.
- Glow div: only render when `variant === 'floating'`.
- Image className: `animate-mascot-float` only when `variant === 'floating'`. When `circular`, add `rounded-full object-cover aspect-square`.
- Keep `pointer-events-none select-none` on wrapper always.
- File must stay ≤300 lines (it's ~52 now; will be ~70).

**`size="avatar"` + `circular`** produces a 48px round mascot face usable as an AI avatar. The Engineer should set `width/height` to 48 and use `object-cover` so only the head/face region shows.

### Step 2 — Hero Jobby redesign (`page.tsx`)

**Current** (lines 61-70): `Mascot` is `size="xs"`, `absolute -top-10 -left-4 z-20`, peeking at top-left corner of mockup wrapper.

**New (Sentry peek style — Option C variant)**: Move Jobby to **bottom-left** of the mockup card, partially overlapping the card's bottom-left corner, fully visible, pointing up at the card content.

Replace the existing `<Mascot .../>` block (lines 63-70) with:
```tsx
<Mascot
  src="/mascot/jobby-hero.webp"
  alt={t('mascotAltHero')}
  size="sm"
  priority
  glowColor="var(--amber-glow)"
  className="absolute -bottom-6 -left-6 z-20 hidden md:block md:-bottom-10 md:-left-10"
/>
```

Key points for Engineer:
- Size bumps `xs` → `sm` (so Jobby is meaningfully visible, ~180px on desktop).
- Position moves from top-left to bottom-left of the mockup wrapper (`-bottom-6 -left-6`).
- `z-20` keeps it above the card (`card is z-10`). Jobby's right side overlaps the card edge; mascot body sits outside/over the border. Because `pointer-events-none`, it won't block card interaction.
- `hidden md:block` — mobile hides it (avoid clutter on small screens; hero text is priority). This matches the existing `hidden sm:block` intent but tightens to `md`.
- Keep `alt={t('mascotAltHero')}` (new i18n key, Step 6).
- The `overflow-x-clip` on the section (line 31) prevents horizontal scroll from the overhang. Verify it's still present.

### Step 3 — How It Works: 4 step anchors (`how-it-works.tsx`)

**Current**: Single `Resuby` mascot `absolute -top-4 right-0` floating over the section header (lines 48-54). 4 steps rendered in a `md:grid-cols-4` (line 55).

**New (Qodo Step Anchor)**: Remove the single floating Resuby. Add a mascot ABOVE each step's icon, inside each step's container.

**Edit STEPS array** — add `mascot` field to each step:
```ts
const STEPS = [
  { icon: Upload,         title: t('step1Title'), desc: t('step1Desc'), mascot: '/mascot/jobby-hero.webp', mascotAlt: t('mascotAltStep1') },
  { icon: Search,         title: t('step2Title'), desc: t('step2Desc'), mascot: '/mascot/scrappy.webp',    mascotAlt: t('mascotAltStep2') },
  { icon: FileCheck,      title: t('step3Title'), desc: t('step3Desc'), mascot: '/mascot/resuby.webp',    mascotAlt: t('mascotAltStep3') },
  { icon: LayoutDashboard, title: t('step4Title'), desc: t('step4Desc'), mascot: '/mascot/preppy.webp',   mascotAlt: t('mascotAltStep4') },
]
```

**Delete** the standalone `<Mascot src="/mascot/resuby.webp" .../>` block (lines 48-54).

**Edit the step render loop** (currently lines 56-73). Inside each `<div key={step.title} className="relative">`, BEFORE the icon well div, insert the mascot:
```tsx
<div key={step.title} className="relative">
  <Mascot
    src={step.mascot}
    alt={step.mascotAlt}
    size="step"
    variant="static"
    glowColor="transparent"
    className="mb-3"
  />
  {i < STEPS.length - 1 && (
    <div className="absolute -right-5 top-8 hidden h-px w-10 border-t border-dashed border-border/40 md:block" />
  )}
  <div className="flex h-14 w-14 items-center justify-center rounded-xl neuro-icon-well text-primary">
    <Icon size={24} />
  </div>
  ...rest unchanged...
</div>
```

Key points:
- `size="step"` = 64-96px. `variant="static"` = no float animation (anchors should feel grounded, not bobbing). `glowColor="transparent"` = no ambient blob (would clutter 4 in a row).
- Mascot sits in normal document flow (`mb-3`) above the icon — NOT absolute. It takes real layout space (Qodo pattern).
- Mobile: `step` size already responsive (`w-16` = 64px on mobile). No extra hiding needed; 4-up grid stacks fine.
- Import `Mascot` already present (line 5). No new import.

### Step 4 — Features Bento: Scrappy inside job-search card (`features-bento.tsx`)

**Current**: Single `Scrappy` mascot `absolute top-0 right-0` over section header (lines 55-62). The job-search feature is `FEATURES[2]` (KanbanSquare, `feature3Title`), rendered in the `smalls.map(...)` loop (lines 138-182).

**New (Notion Bento Card)**: Remove the floating Scrappy. Place Scrappy INSIDE the job-search small card, top-right of the card content area, as a contained illustration.

**Delete** the standalone `<Mascot src="/mascot/scrappy.webp" .../>` block (lines 55-62).

**Edit the `smalls.map` render** (lines 138-182). Make the card `relative` and conditionally render Scrappy when the card is the job-search card. Replace the opening card div and inner content:
```tsx
{smalls.map((f) => {
  const Icon = f.icon
  const isJobSearch = f.icon === KanbanSquare
  return (
    <div
      key={f.title}
      className={`${f.bgAccent} ${f.borderAccent} relative flex flex-col justify-between rounded-2xl border p-5 sm:p-8 shadow-lg shadow-primary/5 transition-shadow hover:shadow-xl hover:shadow-primary/10`}
    >
      {isJobSearch && (
        <Mascot
          src="/mascot/scrappy.webp"
          alt={t('mascotAltJobSearch')}
          size="step"
          variant="static"
          glowColor="transparent"
          className="absolute right-3 top-3 opacity-90"
        />
      )}
      <div className="relative z-10">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl neuro-icon-well ${f.color}`}>
          <Icon size={24} />
        </div>
        <h3 className="mt-5 text-xl font-semibold text-foreground">{f.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
      </div>
      ...mini mockup unchanged...
    </div>
  )
})}
```

Key points:
- Card gets `relative` so the absolute mascot positions against the card.
- Scrappy is `size="step"` (~96px desktop), `variant="static"`, positioned `absolute right-3 top-3` — INSIDE the card border, with padding. Does NOT overflow.
- Icon/title/desc wrapper gets `relative z-10` so text stays above the mascot visually if overlap occurs.
- Detect job-search card via `f.icon === KanbanSquare` (stable identity, no string matching).
- Import `Mascot` already present (verify line 1-5 area; the file imports it). Engineer: confirm `Mascot` is imported; if the import was only there for the now-deleted floating mascot, re-add `import { Mascot } from '~/components/marketing/mascot'`.

### Step 5 — Interview Section: Preppy as AI avatar + peek (`interview-section.tsx`)

**Current**: Single `Preppy` mascot `absolute -top-8 -right-4` over the mockup (lines 75-81). AI question card uses a generic `Brain` icon as the interviewer avatar (lines 103-105).

**New (Sentry Inside Mockup)**: Two integrations.

**(5a) Remove the floating Preppy** (delete lines 75-81).

**(5b) Replace the Brain avatar in the AI question card** with Preppy's face as a circular avatar. Find this block (around lines 102-105):
```tsx
<div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary">
  <Brain size={12} />
</div>
```
Replace with:
```tsx
<Mascot
  src="/mascot/preppy.webp"
  alt={t('mascotAltInterviewer')}
  size="avatar"
  circular
  variant="static"
  glowColor="transparent"
  className="shrink-0 ring-1 ring-primary/20"
/>
```
- `size="avatar"` = 48px, `circular` = round crop showing Preppy's face. `ring-1 ring-primary/20` gives it a subtle avatar border.
- Note: this replaces a 20px icon with a 48px avatar. The surrounding flex row (`flex items-center gap-2`) handles the size change. Engineer: verify the tag span + question text still align; adjust gap if needed.

**(5c) Add a peeking Preppy at bottom-left of the mockup card** (Sentry peek). After the floating mascot is removed and inside the mockup wrapper `<div className="relative w-full max-w-lg justify-self-end">` (line 73), add BEFORE the card div:
```tsx
<div className="relative w-full max-w-lg justify-self-end">
  <Mascot
    src="/mascot/preppy.webp"
    alt={t('mascotAltInterviewer')}
    size="step"
    glowColor="var(--accent-soft)"
    className="absolute -bottom-8 -left-8 z-20 hidden md:block md:-bottom-12 md:-left-12"
  />
  <div className="relative z-10 overflow-hidden rounded-2xl neuro-card">
    ...
```
- This Preppy KEEPS the float animation (`variant` defaults to `'floating'`) — it's a peeking companion, lively is good.
- `size="step"` (~96px), bottom-left peek. `z-20` above card. `hidden md:block` for mobile cleanliness.
- Import `Mascot` already present (verify; re-add if needed).

### Step 6 — i18n keys (`messages/en.json` + `messages/th.json`)

Add under the `landing` object in both files (find the existing `landing` block; add these keys near other landing strings).

**`messages/en.json`** — add:
```json
"mascotAltHero": "Jobby — your AI career assistant",
"mascotAltStep1": "Jobby guides you to upload your resume",
"mascotAltStep2": "Scrappy finds jobs that match your skills",
"mascotAltStep3": "Resuby optimizes your resume for each job",
"mascotAltStep4": "Preppy helps you prep and track applications",
"mascotAltJobSearch": "Scrappy — AI job search robot",
"mascotAltInterviewer": "Preppy — your AI interview coach",
```

**`messages/th.json`** — add (Thai translations):
```json
"mascotAltHero": "Jobby — ผู้ช่วยอาชีพ AI ของคุณ",
"mascotAltStep1": "Jobby ช่วยแนะนำการอัปโหลดเรซูเม่",
"mascotAltStep2": "Scrappy ค้นหางานที่ตรงกับทักษะของคุณ",
"mascotAltStep3": "Resuby ปรับแต่งเรซูเม่ให้เหมาะกับแต่ละงาน",
"mascotAltStep4": "Preppy ช่วยเตรียมสัมภาษณ์และติดตามสถานะ",
"mascotAltJobSearch": "Scrappy — หุ่นยนต์ค้นหางาน AI",
"mascotAltInterviewer": "Preppy — โค้ชสัมภาษณ์ AI ของคุณ",
```

Engineer: ensure valid JSON (trailing commas will break `next-intl` build). Place keys alphabetically or at end of `landing` block — either works as long as JSON is valid.

---

## 3. Vertical-Slice Order

Execute in this order (each step is independently verifiable):

1. **Step 1** (mascot.tsx) — foundation; all others depend on new sizes/variants. Verify: `npx tsc --noEmit`.
2. **Step 6** (i18n keys) — add keys BEFORE components reference them, or build breaks. Verify: JSON valid.
3. **Step 2** (Hero) — verify visually + tsc.
4. **Step 3** (How It Works) — verify visually + tsc.
5. **Step 4** (Features Bento) — verify visually + tsc.
6. **Step 5** (Interview) — verify visually + tsc.

---

## 4. Assertion & Testing Requirements

This is a **visual/layout-only change** — no behavior, API, data, or auth logic changes.

- **Unit Tests**: N/A — no behavior change.
- **Integration Tests**: N/A.
- **E2E Tests**: N/A — no user-visible flow change beyond cosmetics.

**Manual visual verification** (Engineer should sanity-check via `pnpm build` success + no console errors; full visual QA is human-owned post-merge):
- Hero: Jobby visible bottom-left of mockup, not clipped, not overlapping CTA text.
- How It Works: 4 mascots appear above 4 step icons, aligned, not floating.
- Features: Scrappy inside job-search card, within border, not overflowing.
- Interview: Preppy face as avatar in question card; peeking Preppy bottom-left of mockup.
- Mobile (viewport <768px): hero Jobby + interview peek hidden; step mascots shrink to 64px.

---

## 5. Verification Commands & Log Files

| Check | Command |
|-------|---------|
| TypeScript | `npx tsc --noEmit` |
| Build | `pnpm build` |
| Lint | `pnpm lint` |

All three MUST pass with zero errors before commit. If `pnpm build` fails, check:
- Invalid JSON in `messages/*.json` (most likely culprit — trailing comma).
- Missing `Mascot` import in a component after refactor.
- Wrong prop name (e.g. `variant` vs `variants`).

Server/dev logs: `pnpm dev` console output. Build errors print to stdout.

---

## 6. Commit

After all checks pass:
```
git add src/app/components/marketing/mascot.tsx \
  src/app/[locale]/\(marketing\)/page.tsx \
  src/app/components/marketing/how-it-works.tsx \
  src/app/components/marketing/features-bento.tsx \
  src/app/components/marketing/interview-section.tsx \
  messages/en.json messages/th.json

git commit -m "feat(landing): redesign mascot integration with production layout patterns"
```

Do NOT push (interactive mode — user did not request push). Do NOT open a PR.
