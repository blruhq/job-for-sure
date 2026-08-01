# Implementation Spec & Plan: Mascot Z-Index & Layering Fix

### 0. Architectural Decision Record (ADR) & Scaling Tradeoffs

- **Context & Constraints**: 4 character mascots (Jobby, Resuby, Scrappy, Preppy) are placed on the landing page as decorative elements using `position: absolute`. Users report inconsistent layering: sometimes mascot hidden behind content, sometimes mascot covers text, unpredictable per section/viewport.
- **Root Cause**: CSS stacking spec states that **positioned elements paint above non-positioned siblings**, regardless of `z-index` value. Mascots use `absolute z-0`. Heading/text divs use `position: static` (no `relative`, no `z-index`). Per spec, `z-0` positioned mascot paints OVER `static` text — this is the bug in HowItWorks and FeaturesBento. Additionally, no section uses `overflow-x-clip`, so mascots offset with negative left/right (`-left-20`, `-right-16`) can extend past the viewport and cause horizontal scroll on certain breakpoints.
- **Chosen Architecture**: **Two-layer stacking model** (industry standard, used by Linear/Stripe/Vercel for decorative layers):
  1. **Background layer**: Decorative mascots stay `absolute z-0 pointer-events-none` — they remain in the section but sit below content.
  2. **Content layer**: ALL text/headings/cards/grid wrappers get `relative z-10` — this establishes a stacking context that guarantees content paints above decorative mascots.
  3. **Containment**: Section containers get `overflow-x-clip` to prevent mascots from causing horizontal scroll.
  - This satisfies YAGNI: no layout restructure, no new components, no grid-cell conversion. Just z-index + overflow hygiene. Mascots remain decorative peek-behind elements (the intended visual).
- **Discarded Alternatives**:
  - *Alternative A — Convert mascots to flex/grid layout items*: Safest (zero overlap risk) but requires restructuring all 4 section layouts, adjusting grid templates, and repositioning content. High diff for no visual improvement over the z-index fix. Rejected: YAGNI, the peek-behind decorative look is the intended design.
  - *Alternative B — Give mascots negative z-index (`-z-10`)*: Would push mascots below the section background, making them invisible on sections with a solid/opaque background. Also requires the section itself to establish a stacking context with a background. Fragile, section-dependent. Rejected.
  - *Alternative C — Remove mascots entirely*: Defeats the purpose of the character design. Rejected.

### 1. Target Files & Folder Structure

All edits are to existing files. No new files.

| File | Change |
|------|--------|
| `src/app/[locale]/(marketing)/page.tsx` | Hero section — add `relative z-10` to text column; add `overflow-x-clip` to hero section |
| `src/app/components/marketing/how-it-works.tsx` | Add `relative z-10` to heading block + steps grid; add `overflow-x-clip` to container |
| `src/app/components/marketing/features-bento.tsx` | Add `relative z-10` to heading block + bento grid; add `overflow-x-clip` to container |
| `src/app/components/marketing/interview-section.tsx` | Add `relative z-10` to left copy column; add `overflow-x-clip` to container |

No changes to `mascot.tsx` — the component itself is correct (`pointer-events-none select-none`, glow at `-z-10` relative to wrapper).

### 2. Import Definitions & Dependencies

No new imports. All changes are Tailwind utility class additions on existing `div`/`section` elements.

### 3. Database Schema Changes

None.

### 4. Step-by-Step Edits

#### Step 1 — Hero (page.tsx): Protect text column + contain mascot

**Edit 1a**: Hero section element (line 31). Add `overflow-x-clip` to prevent Jobby (`-left-20` on lg) from causing horizontal scroll.

Current:
```tsx
<section className="relative flex min-h-screen flex-col items-center px-4 sm:px-6 pt-[12vh] md:pt-[15vh]">
```
Change to:
```tsx
<section className="relative flex min-h-screen flex-col items-center overflow-x-clip px-4 sm:px-6 pt-[12vh] md:pt-[15vh]">
```

**Edit 1b**: Left text column (line 36). Add `relative z-10` so headline/subtitle/CTA always paint above the Jobby mascot if it visually extends into the text column.

Current:
```tsx
<div className="max-w-lg">
```
Change to:
```tsx
<div className="relative z-10 max-w-lg">
```

Note: The right column mockup card (line 71) already has `relative z-10` — no change needed there. Jobby mascot (line 69) stays `z-0` — correct, it peeks behind the mockup.

#### Step 2 — HowItWorks (how-it-works.tsx): Fix mascot-over-heading bug

**Edit 2a**: Container div (line 35). Add `overflow-x-clip`.

Current:
```tsx
<div className="relative mx-auto max-w-[1120px] px-6">
```
Change to:
```tsx
<div className="relative mx-auto max-w-[1120px] overflow-x-clip px-6">
```

**Edit 2b**: Heading block (line 36). Add `relative z-10`. This is the critical fix — currently the `absolute z-0` Resuby mascot paints OVER this static heading block per CSS spec.

Current:
```tsx
<div className="max-w-xl">
```
Change to:
```tsx
<div className="relative z-10 max-w-xl">
```

**Edit 2c**: Steps grid (line 55). Add `relative z-10` so step cards paint above mascot.

Current:
```tsx
<div className="mt-20 grid gap-10 md:grid-cols-4">
```
Change to:
```tsx
<div className="relative z-10 mt-20 grid gap-10 md:grid-cols-4">
```

**Edit 2d**: CTA link wrapper (line 75). Add `relative z-10`.

Current:
```tsx
<div className="mt-16">
```
Change to:
```tsx
<div className="relative z-10 mt-16">
```

#### Step 3 — FeaturesBento (features-bento.tsx): Fix mascot-over-heading bug

**Edit 3a**: Container div (line 42, the `relative mx-auto max-w-[1120px] px-6`). Add `overflow-x-clip`.

Current:
```tsx
<div className="relative mx-auto max-w-[1120px] px-6">
```
Change to:
```tsx
<div className="relative mx-auto max-w-[1120px] overflow-x-clip px-6">
```

**Edit 3b**: Heading block (line 44, the `max-w-xl` div). Add `relative z-10`. Critical fix — Scrappy mascot paints over this heading currently.

Current:
```tsx
<div className="max-w-xl">
```
Change to:
```tsx
<div className="relative z-10 max-w-xl">
```

**Edit 3c**: Bento grid (line 64). Add `relative z-10` so all feature cards paint above mascot.

Current:
```tsx
<div className="mt-20 grid gap-5 md:grid-cols-[1.6fr_1fr] md:grid-rows-[1fr_1fr]">
```
Change to:
```tsx
<div className="relative z-10 mt-20 grid gap-5 md:grid-cols-[1.6fr_1fr] md:grid-rows-[1fr_1fr]">
```

#### Step 4 — InterviewSection (interview-section.tsx): Protect copy column + contain

**Edit 4a**: Container div (line 21). Add `overflow-x-clip`.

Current:
```tsx
<div className="mx-auto max-w-[1120px] px-6">
```
Change to:
```tsx
<div className="mx-auto max-w-[1120px] overflow-x-clip px-6">
```

**Edit 4b**: Left copy column (line 24). Add `relative z-10` so heading/bullets/CTA paint above Preppy mascot.

Current:
```tsx
<div className="max-w-lg">
```
Change to:
```tsx
<div className="relative z-10 max-w-lg">
```

Note: The right mockup card (line 82) already has `relative z-10` — no change needed. Preppy mascot (line 80) stays `z-0` — correct.

#### Step 5 — Verify no horizontal scroll regression

After all edits, verify that `overflow-x-clip` doesn't clip any intentional content. The mascots are decorative and `pointer-events-none`, so clipping their off-screen portions is acceptable. All actual content (headings, cards, CTAs) is within `max-w-[1120px] px-6` containers and will not be clipped.

### 4.5 Vertical-Slice Order

All edits are CSS class changes — they can be applied in a single pass (Steps 1-4), then verified together (Step 5). Each section fix is independently testable by visual inspection at breakpoints: mobile (sm), tablet (md), desktop (lg).

**Test per section after all edits**:
- Hero: Jobby peeks behind mockup card, never covers headline. No horizontal scroll at any breakpoint.
- HowItWorks: Resuby peeks at top-right, heading text fully visible above mascot.
- FeaturesBento: Scrappy peeks at top-right, heading + bento cards fully visible above mascot.
- Interview: Preppy peeks behind mockup card, copy column text fully visible. No horizontal scroll.

### 5. Assertion & Testing Requirements

- **Unit Tests**: N/A — no behavior/logic change, CSS class additions only.
- **Integration Tests**: N/A.
- **E2E UI Tests**: N/A — visual-only change. Manual visual verification at 3 breakpoints (375px, 768px, 1280px) is sufficient.
- **Manual verification checklist**:
  - [ ] No mascot covers any heading text at any breakpoint
  - [ ] No mascot covers any button/CTA at any breakpoint
  - [ ] No horizontal scrollbar appears on the landing page at any breakpoint
  - [ ] Mascots still visible (peeking behind cards/content) at lg breakpoint
  - [ ] Mascots hidden on mobile (already `hidden sm:block` / `hidden md:block` / `hidden lg:block` — no change needed)

### 6. Verification Commands & Log Files

- **Build Command**: `pnpm build`
- **Lint Command**: `pnpm lint`
- **TypeScript Check**: `npx tsc --noEmit`
- **Dev Server**: `pnpm dev` then visit `/en` (landing page) at 375px, 768px, 1280px viewport widths
- **Log Location**: Terminal stdout/stderr for build/lint errors. Browser DevTools Console for runtime errors.

### Research Summary: Production Mascot Positioning Patterns

| Site | Approach | z-index Strategy |
|------|----------|-----------------|
| **Duolingo** | Mascot is a **flex/grid layout item** (takes its own space) | N/A — no overlap possible, no z-index needed |
| **Linear / Stripe** | Decorative gradients/blobs as **background layer** (`absolute inset-0 overflow-hidden pointer-events-none`) | Content wrapper is `relative z-10`; decorative layer is `z-0` or no z-index |
| **Vercel** | Two-layer model: decorative elements in background layer, content in `relative z-10` wrapper | Content always above decorative |
| **General best practice** | If decorative → `absolute` + content gets `relative z-10` + section gets `overflow-x-clip`. If content → flex/grid item. | Never let `absolute` decorative elements be siblings of `static` text without the text having a higher stacking context. |

**The CSS spec rule that caused this bug**: In a stacking context, the paint order is: (1) background/borders of the element forming the stacking context, (2) child stacking contexts with negative z-index, (3) **in-flow non-positioned descendants**, (4) floats, (5) in-flow positioned descendants with `z-index: auto`/`0`... Actually more precisely: positioned elements with `z-index: 0` create a new stacking context at level 0, which paints above non-positioned (static) in-flow descendants. This is why `absolute z-0` mascot paints over `static` heading text. The fix: give heading text `relative z-10` so it forms a stacking context that paints above the `z-0` mascot.
