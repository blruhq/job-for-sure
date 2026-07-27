# Implementation Spec & Plan — Logo → Navbar (Jobby Rebrand Prep)

### 0. Architectural Decision Record (ADR) & Scaling Tradeoffs
- **Context & Constraints**: The marketing landing page currently renders the brand logo TWICE: (a) once in the sticky `MarketingNav` as a plain CSS square (no image), and (b) again as an absolute-positioned `/logo.png` image block inside the hero section. The user sees the orange square logo floating in the hero and is confused why it isn't in the navbar. Separately, the user wants to swap the square orange logo for a future "Jobby" logo — but **that asset does not exist yet** (only `/public/logo.png` is present). User confirmed: fix placement NOW using existing `logo.png`, and leave a single swap point for the Jobby file later.
- **Chosen Architecture**: Introduce ONE shared logo-path constant (`BRAND_LOGO_SRC`) in `src/app/lib/constants.ts`. All three brand renderings (marketing nav, marketing hero, app topbar) reference this constant. Today the constant = `/logo.png`. When the Jobby asset arrives, changing that one line updates every surface. Move the real logo image into `MarketingNav` (replacing the CSS square) and DELETE the hero's absolute logo block so branding lives only in the navbar.
- **Discarded Alternatives**:
  - *Alternative A*: Keep logo in hero AND add to navbar → rejected. User explicitly wants it OUT of the hero ("should be in navbar not in the hero page"). Duplicate branding is the bug.
  - *Alternative B*: Hardcode `/logo.png` in each component (status quo) → rejected. No single swap point; the Jobby rebrand would require hunting down every occurrence (currently 2 image usages + 1 CSS square).
  - *Alternative C*: Wait for the Jobby asset before doing anything → rejected by user. They want the placement fixed immediately.

### 1. Target Files & Folder Structure
All paths relative to repo root. Match existing conventions (`~/` = `./src/app/`).

- **MODIFY** `src/app/lib/constants.ts` — add `BRAND_LOGO_SRC` constant (single swap point).
- **MODIFY** `src/app/components/marketing/marketing-nav.tsx` — replace CSS square with real logo image using the constant.
- **MODIFY** `src/app/[locale]/(marketing)/page.tsx` — DELETE the hero logo/brand block (lines ~32–50).
- **MODIFY** `src/app/components/layout/navbar.tsx` — replace hardcoded `src="/logo.png"` with the constant (consistency; completes the single-swap-point goal).

No new files. No DB. No API. All files stay well under the 300-line cap.

### 2. Import Definitions & Dependencies
- `next/image` `Image` component — already used in `page.tsx` and `navbar.tsx`; MUST be newly imported in `marketing-nav.tsx`.
- `BRAND_LOGO_SRC` from `~/lib/constants` — import in all three component files.
- No new packages. No AI/DB/auth imports. Pure presentational change.

### 3. Database Schema Changes
None.

### 4. Step-by-Step Edits

#### Step 1 — Add the logo swap-point constant
File: `src/app/lib/constants.ts`
After the existing `MAX_RESUME_JSON_BYTES` export (line 19), append:

```ts
/**
 * Brand logo asset path (single swap point).
 * Currently the square orange logo. When the "Jobby" logo asset is added
 * to /public, change ONLY this value (e.g. '/jobby-logo.svg') to rebrand
 * every surface: marketing navbar, marketing hero (removed), app topbar.
 */
export const BRAND_LOGO_SRC = '/logo.png'
```

#### Step 2 — Put the real logo in the marketing navbar
File: `src/app/components/marketing/marketing-nav.tsx`

2a. Add imports at top (after existing imports, keep `'use client'` as line 1):
```ts
import Image from 'next/image'
import { BRAND_LOGO_SRC } from '~/lib/constants'
```

2b. Replace the Brand block (currently lines 26–29):
```tsx
{/* Brand */}
<Link href="/" className="flex cursor-pointer items-center gap-2 no-underline">
  <div className="h-3.5 w-3.5 rounded-[3px] bg-primary" />
  <span className="text-sm font-semibold tracking-tight text-foreground">JOB FOR SURE</span>
</Link>
```
with:
```tsx
{/* Brand — logo lives in the navbar, not the hero */}
<Link href="/" className="flex cursor-pointer items-center gap-2 no-underline">
  <div className="neuro-icon-well rounded-[3px] p-0.5">
    <Image
      src={BRAND_LOGO_SRC}
      alt="Job For Sure"
      width={24}
      height={24}
      className="shrink-0"
      priority
    />
  </div>
  <span className="text-sm font-semibold tracking-tight text-foreground">JOB FOR SURE</span>
</Link>
```
Notes: `neuro-icon-well` + `rounded-[3px] p-0.5` matches the app `Topbar` styling exactly (see `navbar.tsx` lines 59–68) for visual consistency across surfaces. Keep `priority` so the logo loads eagerly above the fold.

#### Step 3 — Remove the logo from the hero
File: `src/app/[locale]/(marketing)/page.tsx`

3a. The `Image` import on line 2 (`import Image from 'next/image'`) becomes UNUSED after this edit — REMOVE it to satisfy `pnpm lint` / strict TS.

3b. Add the constant import. Replace line 3 (`import { Link } from '~/i18n/routing'`) region — add a new import line. Concretely, ensure this import exists near the top:
```ts
import { BRAND_LOGO_SRC } from '~/lib/constants'
```
(Only needed if any remaining reference uses it; since the hero logo block is fully removed and no other hero element uses the logo, you may OMIT this import in page.tsx if unused. Decision: OMIT — the hero no longer references the logo at all. Do NOT add an unused import.)

3c. DELETE the entire absolute-positioned logo/brand block — currently lines 32–50 inclusive:
```tsx
          {/* ── Logo / Brand Header ── */}
          <Link
            href="/chat"
            className="absolute left-6 top-6 z-20 flex items-center gap-2.5"
          >
            <div className="neuro-icon-well rounded-[3px] p-0.5">
              <Image
                src="/logo.png"
                alt="Job For Sure"
                width={28}
                height={28}
                className="shrink-0"
                priority
              />
            </div>
            <span className="text-sm font-semibold tracking-[-0.02em] text-foreground">
              Job For Sure
            </span>
          </Link>
```
After deletion, the hero `<section>` (line 31) should directly be followed by the `hero-glow` div (the `pointer-events-none absolute inset-0 hero-glow...` block). Do NOT touch anything else in the hero.

#### Step 4 — Wire the app topbar to the same constant
File: `src/app/components/layout/navbar.tsx`

4a. Add import (near other `~/` imports, e.g. after `import { cn } from '~/lib/utils'`):
```ts
import { BRAND_LOGO_SRC } from '~/lib/constants'
```

4b. In the `Topbar` logo `<Image>` (currently line 61), change:
```tsx
            src="/logo.png"
```
to:
```tsx
            src={BRAND_LOGO_SRC}
```
Leave width/height/alt/priority unchanged.

### 4.5 Vertical-Slice Order
This is a single vertical slice (brand presentation). All four edits ship together — they are tightly coupled (the constant must exist before the components import it). Testable e2e path after all edits: run `pnpm dev`, open `/` (marketing landing) → confirm logo appears ONLY in the sticky top navbar (with the `neuro-icon-well` frame) and is GONE from the hero; open any authenticated page (e.g. `/chat`) → confirm the app topbar logo still renders identically.

### 5. Assertion & Testing Requirements
No behavior, API, data, or auth change — pure presentational (logo placement + one string constant). Per policy, mandatory tests are NOT required for visual-only/CSS edits.
- **Unit Tests**: N/A — no behavior change.
- **Integration Tests**: N/A.
- **E2E UI Tests**: N/A (optional manual smoke — see 4.5).
Manual verification checklist (Engineer must confirm in final report):
1. `pnpm lint` passes (no unused `Image` import in `page.tsx`, no unused `BRAND_LOGO_SRC`).
2. `npx tsc --noEmit` passes.
3. Marketing landing `/`: logo visible in navbar, NOT in hero.
4. App topbar `/chat`: logo unchanged visually.

### 6. Verification Commands & Log Files
- Build: `pnpm build`
- Lint: `pnpm lint`
- Type check: `npx tsc --noEmit`
- Dev server: `pnpm dev` (smoke-test the two surfaces above)
- If build/lint fails, inspect stderr in terminal; dev server log writes to `.dev-server.log` (gitignored) when run with output redirection.

### Open Item (NOT a blocker — user acknowledged)
The "Jobby" logo asset does not exist in the repo. `BRAND_LOGO_SRC` currently points to `/logo.png`. When the Jobby file is added to `/public/`, update ONLY the constant in `src/app/lib/constants.ts`. Do not invent or download a logo.
