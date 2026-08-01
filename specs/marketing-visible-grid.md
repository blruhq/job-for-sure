# Spec: Visible Structural Grid on Marketing Page

## Section 1 — Product

### Goal & Scope
Add a **visible structural grid** (exposed hairline dividers) to the marketing/landing page ONLY. Swiss-style blueprint aesthetic — thin light-grey 1px lines that expose the layout skeleton, boxing content into clean rectangular cells.

This is a **purely visual/CSS change**. No behavior changes, no new components, no new dependencies.

### What "visible grid" means
Thin 1px lines using the existing `--border` token (`#E4E7EC` light / `rgba(255,255,255,0.15)` dark) that:
- Run **horizontally** between sections (most already exist via `border-t border-border`)
- Run **vertically** at the content-column edges (page-edge framing lines)
- Run **vertically** between grid columns within sections (column dividers)
- Make the page read like an architect's blueprint — structured, precise, transparent

### Out of Scope (NOT building)
- ❌ NO changes to `hero-section.tsx` (hero stays exactly as-is)
- ❌ NO color changes (`--primary` stays `#D97706`, no new palette)
- ❌ NO font changes (no Geist Sans, no new fonts)
- ❌ NO monospace numbered labels or section numbers
- ❌ NO wiring-diagram connectors / SVG connector lines
- ❌ NO changes to app shell, navbar, sidebar, authenticated pages, pricing page
- ❌ NO new dependencies
- ❌ NO behavior/logic changes
- ❌ NO changes to the existing `GridPattern` decorative SVG behind hero

### Acceptance Criteria
1. Marketing landing page (`/` route, `(marketing)/page.tsx`) shows visible thin vertical lines framing the content column on HowItWorks, FeaturesBento, InterviewSection sections.
2. HowItWorks section has vertical dividers between the 4 step columns (desktop only, `md:` breakpoint).
3. InterviewSection has a vertical divider between the copy column and mockup column (desktop only).
4. All lines use `border-border` utility (existing token) — 1px, light-grey.
5. Mobile (`< md`): vertical column dividers hidden (would look cluttered); only section dividers + content framing remain.
6. Dark mode: lines adapt via `--border` token (already handled by the token system).
7. `hero-section.tsx` has ZERO diff in `git diff`.
8. No color variable values changed in `globals.css`.
9. `pnpm build`, `npx tsc --noEmit`, `pnpm lint` all pass.

---

## Section 2 — Engineering Handoff

### Target Files (4 files, all ≤300 lines)
1. `src/app/components/marketing/how-it-works.tsx` (78 lines)
2. `src/app/components/marketing/features-bento.tsx` (194 lines)
3. `src/app/components/marketing/interview-section.tsx` (187 lines)
4. `src/app/[locale]/(marketing)/page.tsx` (134 lines)

**DO NOT TOUCH**: `src/app/components/marketing/hero-section.tsx`, `src/app/components/marketing/grid-pattern.tsx`, `src/app/components/marketing/mascot.tsx`, `src/app/components/marketing/marketing-nav.tsx`, `src/app/globals.css` (no CSS changes needed — all via Tailwind utilities using existing tokens).

### Imports & Dependencies
No new imports. All changes use existing Tailwind utilities (`border-x`, `border-l`, `border-border`, `md:` breakpoint prefix). No new packages.

### Schema Changes
None. Pure presentation.

### Design Rationale — Why These Specific Edits

The page already has horizontal section dividers (`border-t border-border` on each `<section>`). What's missing for the "blueprint" feel is:
1. **Vertical page-edge framing**: Two vertical lines at the `max-w-[1120px]` content edges, running through all sections.
2. **Column dividers**: Vertical lines between grid columns within multi-column sections.

We achieve this by adding `border-x border-border` to the inner content containers and `md:border-l md:border-border` to grid children. This exposes the layout skeleton without adding any decorative elements.

**Color**: `border-border` maps to `--border: #E4E7EC` (light) / `rgba(255,255,255,0.15)` (dark). This is the "thin light-grey 1px line" the user requested. It already adapts to dark mode automatically.

### Step-by-Step Edits

#### Step 1: `how-it-works.tsx` — Add content framing + column dividers

**Edit 1a** — Content container framing (line 34):
```
BEFORE: <div className="relative mx-auto max-w-[1120px] overflow-x-clip px-6">
AFTER:  <div className="relative mx-auto max-w-[1120px] overflow-x-clip border-x border-border px-6">
```

**Edit 1b** — Step column dividers (lines 51, the `<div key={step.title} className="relative">`):
```
BEFORE: <div key={step.title} className="relative">
AFTER:  <div key={step.title} className="relative md:pl-10 md:border-l md:border-border md:first:border-l-0 md:first:pl-0">
```
This adds a left border to steps 2–4 on desktop, creating 4 distinct cells. The `first:` variant removes the border on the first step. The `md:pl-10` adds breathing room before the divider line.

Note: the existing dashed connector (line 52-54, `absolute -right-5 ... border-dashed`) can stay — it's a subtle decorative element, not a wiring diagram. It does not conflict with the new column borders. **Leave it as-is.**

#### Step 2: `features-bento.tsx` — Add content framing

**Edit 2a** — Content container framing (line 43):
```
BEFORE: <div className="relative mx-auto max-w-[1120px] overflow-x-clip px-6">
AFTER:  <div className="relative mx-auto max-w-[1120px] overflow-x-clip border-x border-border px-6">
```

The bento cards already have their own borders (`border` + `borderAccent` classes). No column dividers needed here — the cards ARE the cells. Adding `border-x` to the container frames the whole section content.

#### Step 3: `interview-section.tsx` — Add content framing + column divider

**Edit 3a** — Content container framing (line 21):
```
BEFORE: <div className="mx-auto max-w-[1120px] overflow-x-clip px-6">
AFTER:  <div className="mx-auto max-w-[1120px] overflow-x-clip border-x border-border px-6">
```

**Edit 3b** — Column divider between copy and mockup (line 24, the left copy column):
```
BEFORE: <div className="relative z-10 max-w-lg">
AFTER:  <div className="relative z-10 max-w-lg md:pr-12 md:border-r md:border-border">
```
Wait — this would put the border on the left column but the grid is `[1fr_1.2fr]`. Better approach: add border to the RIGHT column instead, or use a center divider. 

**Revised Edit 3b** — Add a border to the right column (mockup), line 73:
```
BEFORE: <div className="relative w-full max-w-lg justify-self-end">
AFTER:  <div className="relative w-full max-w-lg justify-self-end md:pl-12 md:border-l md:border-border">
```
This adds a vertical line on the LEFT edge of the mockup column, creating a clean divider between copy and mockup. The `md:pl-12` adds space between the line and the mockup content.

#### Step 4: `page.tsx` — Frame the CTA and Footer for consistency

The CTA and Footer use `bg-brand` (amber). We want the grid to continue through them for structural consistency, but light-grey lines on amber look wrong. Instead, use `border-brand-foreground/15` for a subtle line that works on the amber background.

**Edit 4a** — CTA section content container (line 68):
```
BEFORE: <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28">
AFTER:  <div className="mx-auto max-w-[1120px] border-x border-brand-foreground/15 px-6 py-20 md:py-28">
```
Note: Also normalizing the max-width from `max-w-7xl` to `max-w-[1120px]` so the vertical lines align with the sections above. This is a minor alignment improvement that makes the grid read as one continuous structure.

**Edit 4b** — Footer content container (line 91):
```
BEFORE: <div className="mx-auto flex max-w-[1120px] flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
AFTER:  <div className="mx-auto flex max-w-[1120px] border-x border-brand-foreground/15 flex-col items-center justify-between gap-4 px-6 text-center sm:flex-row sm:text-left">
```
Adds `px-6` (was missing — content was flush to edges) and the framing borders.

### Component States
Not applicable — no interactive states. Pure static layout.

### Edge Cases
- **Mobile (`< md`)**: Column dividers hidden via `md:` prefix. Content framing (`border-x`) still shows — this is fine, it frames content on all viewports. The `overflow-x-clip` on containers prevents the borders from causing horizontal scroll.
- **Dark mode**: `border-border` auto-adapts via `--border` token. `border-brand-foreground/15` works in both modes (brand-foreground is dark in light mode, light in dark mode).
- **Thai locale**: No impact — fonts/layout unchanged.
- **Reduced motion**: No animations involved.

### Vertical Slices
1. Edit how-it-works.tsx → build → verify section shows framing + column dividers.
2. Edit features-bento.tsx → build → verify framing.
3. Edit interview-section.tsx → build → verify framing + column divider.
4. Edit page.tsx → build → verify CTA/footer framing.
5. Final full build + tsc + lint.

### Verification Exit Criteria

- [ ] `pnpm build` completes with exit code 0 — run `pnpm build` and check no errors.
- [ ] `npx tsc --noEmit` passes — run command, exit code 0.
- [ ] `pnpm lint` passes — run command, no new warnings/errors.
- [ ] `git diff --name-only` shows ONLY these 4 files: `how-it-works.tsx`, `features-bento.tsx`, `interview-section.tsx`, `page.tsx`. Hero file NOT in diff.
- [ ] `git diff src/app/components/marketing/hero-section.tsx` returns empty output (zero changes to hero).
- [ ] `git diff src/app/globals.css` returns empty output (no CSS token changes).
- [ ] Grep confirms no new color values: `git diff | grep -i "#[0-9a-fA-F]\{6\}"` returns nothing new (no new hex colors introduced).
- [ ] Screenshot of marketing page (desktop, light mode) shows visible thin vertical lines framing content column on HowItWorks, FeaturesBento, InterviewSection.
- [ ] Screenshot of marketing page (desktop, light mode) shows vertical dividers between the 4 step columns in HowItWorks.
- [ ] Screenshot of marketing page (desktop, light mode) shows vertical divider between copy and mockup in InterviewSection.
- [ ] Screenshot of marketing page (mobile viewport ~375px) shows NO column dividers (only section dividers + framing).
- [ ] Hero section looks identical to before (no visual change).
