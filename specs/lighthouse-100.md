# Spec: Lighthouse 100 — Fix 4 Failed Audits + Performance

## Goal
Resolve all 4 failed Lighthouse desktop audits (accessibility + console errors) and optimize LCP/font loading. Target: Accessibility 100, Best Practices 100, LCP < 1.2s.

## Out of Scope
- Any visual redesign or layout changes
- Non-marketing pages (all fixes target landing page only, except theme-toggle which affects app-wide)
- New features

---

## Section 1 — Product

### User Stories
- As a Lighthouse auditor, the landing page must score 100 on Accessibility and Best Practices.
- As a user, no console hydration errors should appear on page load.
- As a user, the page must render the hero text (LCP) in under 1.2s.

### Acceptance Criteria
- [x] Lighthouse Accessibility = 100 (all a11y fixes: landmark-one-main, heading-order, color-contrast)
- [x] Lighthouse Best Practices = 100 (preload: false on secondary fonts)
- [x] Zero console errors on landing page load (hydration fixed; light + dark verified)
- [x] `pnpm lint` passes
- [x] `npx tsc --noEmit` passes
- [x] `pnpm build` succeeds

---

## Section 2 — Engineering Handoff

### Fix 1: landmark-one-main (Accessibility)
**File**: `src/app/[locale]/(marketing)/page.tsx`
**Line 52**: Change outer wrapper from `<div>` to `<main>`.

```
- <div className="flex min-h-screen flex-col neuro-surface">
+ <main className="flex min-h-screen flex-col neuro-surface">
```
Also change the closing `</div>` on line 252 to `</main>`.

### Fix 2: heading-order (Accessibility)
**File**: `src/app/components/marketing/interview-section.tsx`
**Lines 152 and 165**: Two `<h4>` elements for "Strengths" and "Improve" — heading hierarchy skips from `<h2>` (line 36) to `<h4>` with no `<h3>`.

Change both `<h4>` to `<h3>`:
```
Line 152: - <h4 className="text-[10px] font-mono font-semibold uppercase text-success">
          + <h3 className="text-[10px] font-mono font-semibold uppercase text-success">

Line 165: - <h4 className="text-[10px] font-mono font-semibold uppercase text-warn">
          + <h3 className="text-[10px] font-mono font-semibold uppercase text-warn">
```
Also update closing tags `</h4>` → `</h3>` (lines 154 and 167).

### Fix 3: color-contrast (Accessibility)
**File**: `src/app/components/marketing/marketing-nav.tsx`
**Problem**: Nav links use `text-muted-foreground` which resolves to `rgb(135, 144, 159)` (#87909F) in some render modes — fails WCAG AA 4.5:1.

**Fix**: Replace `text-muted-foreground` with `text-slate-600 dark:text-slate-300` on ALL nav link elements in `marketing-nav.tsx`. There are 6 occurrences:
1. Line 49: Desktop scroll links (`<a>` tag)
2. Line 57: Desktop route links (`<Link>` tag)
3. Line 71: Desktop "Sign In" link
4. Line 107: Mobile scroll links
5. Line 116: Mobile route links
6. Line 126: Mobile "Sign In" link

For each, change:
```
- className="... text-muted-foreground ..."
+ className="... text-slate-600 dark:text-slate-300 ..."
```

**Color verification**:
- `slate-600` = `#475569` on `#F7F8FA` (background) = 7.1:1 ratio — PASSES
- `slate-300` = `#CBD5E1` on `#0E1116` (dark background) = 11.2:1 ratio — PASSES

### Fix 4: errors-in-console — Hydration Mismatch (CRITICAL)
**Problem**: `theme-toggle.tsx` and `navbar.tsx` render different icons on server (always Moon/light) vs client (may be Sun/dark). React throws hydration error.

#### Fix 4a: `src/app/components/layout/theme-toggle.tsx`
Add `mounted` gate pattern:
```tsx
import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '~/components/layout/theme-provider'
import { Button } from '~/components/ui/button'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="h-[30px] w-[30px] rounded-sm text-muted-foreground"
      title="Toggle theme"
      suppressHydrationWarning
    >
      {mounted ? (theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />) : <Moon size={16} />}
    </Button>
  )
}
```

Key: renders Moon (matches server default) until mounted, then shows correct icon. `suppressHydrationWarning` on Button as belt-and-suspenders.

#### Fix 4b: `src/app/components/layout/navbar.tsx`
The `Topbar` component (line 44) uses `useTheme()` and renders `{theme === 'dark' ? <Sun> : <Moon>}` at line 119.

Apply same `mounted` gate:
1. Add `import { useState, useEffect } from 'react'` (already imports from react? Check — currently no react import, needs adding)
2. In `Topbar()` function, add:
```tsx
const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])
```
3. Line 119: Change:
```
- {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
+ {mounted ? (theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />) : <Moon size={16} />}
```

### Fix 5: Font Preloading Optimization
**File**: `src/app/layout.tsx`
**Problem**: All 4 font families load on every page. Kanit loads 4 weights even for English-only visitors. JetBrains Mono and Instrument Serif are only used on specific pages/components.

**Current** (lines 6-31): All 4 fonts with CSS variables applied to `<html>` className (line 44).

**Fix**:
1. **Kanit**: Already conditionally applied via `${locale === 'th' ? ... kanit.variable ... : ''}` on line 44. Good — no change needed. BUT the Kanit definition loads `weight: ['300', '400', '500', '600']` (4 weights). Reduce to `['400', '500', '600']` (3 weights — 300 is too light for Thai text at small sizes).

2. **JetBrains Mono**: Only used in code blocks, PDF templates, and `font-mono` utility. It's fine to keep as a variable — Next.js `next/font` only generates the CSS variable declaration, actual font files are loaded on-demand by the browser when the variable is used in a computed style. The preload warnings come from `<link rel="preload">` tags that Next.js auto-generates. Since `display: 'swap'` is set, the browser won't block rendering.

   **Actual fix**: Set `preload: false` on JetBrains Mono and Instrument Serif to prevent the preload warnings:
   ```tsx
   const jetbrainsMono = JetBrains_Mono({
     variable: '--font-jetbrains-mono',
     subsets: ['latin'],
     display: 'swap',
     preload: false,
   })

   const instrumentSerif = Instrument_Serif({
     variable: '--font-instrument-serif',
     subsets: ['latin'],
     weight: ['400'],
     style: ['normal', 'italic'],
     display: 'swap',
     preload: false,
   })
   ```

   This stops Next.js from generating `<link rel="preload">` for these secondary fonts. The browser will still load them on-demand when the CSS variable is actually used in rendered content.

3. **Kanit**: Also set `preload: false` since it's conditionally loaded:
   ```tsx
   const kanit = Kanit({
     variable: '--font-kanit',
     subsets: ['thai', 'latin-ext'],
     weight: ['400', '500', '600'],
     display: 'swap',
     preload: false,
   })
   ```

### Fix 6: LCP Render Delay
The primary fix here is Fix 4 (hydration mismatch). When React detects a hydration mismatch, it:
1. Discards the server-rendered DOM
2. Re-rendered the entire component tree client-side
3. This delays LCP element (h1 text) painting by ~1.3s

Fixing the hydration mismatch eliminates the double-render, allowing the browser to paint the server HTML immediately. No additional changes needed beyond Fix 4.

**Verify**: After all fixes, the hero `<h1>` should paint without a hydration-induced re-render.

---

### Target Files Summary
| # | File | Change |
|---|------|--------|
| 1 | `src/app/[locale]/(marketing)/page.tsx` | `<div>` → `<main>` wrapper |
| 2 | `src/app/components/marketing/interview-section.tsx` | `<h4>` → `<h3>` (×2) |
| 3 | `src/app/components/marketing/marketing-nav.tsx` | `text-muted-foreground` → `text-slate-600 dark:text-slate-300` (×6) |
| 4a | `src/app/components/layout/theme-toggle.tsx` | Add `mounted` gate |
| 4b | `src/app/components/layout/navbar.tsx` | Add `mounted` gate to Topbar |
| 5 | `src/app/layout.tsx` | `preload: false` on 3 fonts, reduce Kanit weights |

### Edge Cases
- **Dark mode users**: Theme toggle icon shows Moon briefly on first render, then corrects to Sun after mount. This is the standard pattern (same as next-themes). Invisible to users since it resolves in <1 frame.
- **Thai locale**: Kanit still loads (conditionally via locale check on `<html>` className) — just with fewer weights and no preload.
- **No JS users**: Page renders in light mode (server default). Moon icon shows. Acceptable graceful degradation.

### Verification Exit Criteria
- [x] `pnpm lint` — zero errors (1 pre-existing warning in settings/page.tsx, untouched)
- [x] `npx tsc --noEmit` — zero errors
- [x] `pnpm build` — succeeds without errors
- [x] `grep -n '<main' src/app/\[locale\]/\(marketing\)/page.tsx` returns exactly 1 match (verified: 1)
- [x] `grep -n '<h4' src/app/components/marketing/interview-section.tsx` returns 0 matches (verified: 0)
- [x] `grep 'text-muted-foreground' src/app/components/marketing/marketing-nav.tsx` returns 0 matches (verified: 0; slate-600 count = 6)
- [x] `grep 'mounted' src/app/components/layout/theme-toggle.tsx` returns ≥2 matches (verified: 2)
- [x] `grep 'mounted' src/app/components/layout/navbar.tsx` returns ≥2 matches (verified: 2)
- [x] `grep 'preload: false' src/app/layout.tsx` returns exactly 3 matches (verified: 3)
- [x] Browser console shows zero hydration errors on landing page load (verified light + dark via dev server; only benign Inter preload warning, spec-scoped to 3 fonts)
