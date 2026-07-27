# Dark Theme Audit — Full Diagnosis

> **Branch**: `feat/theme-navy-gold` (worktree `blueprint-ux-full-neumorphism`)
> **Date**: 2026-07-26
> **Scope**: Why the dark theme looks bad — token-level root-cause analysis with contrast math
> **Method**: Full CSS token audit (`globals.css` 752 lines), WCAG contrast computation (Python sRGB),
> CSS specificity tracing, production dark-theme research (Material 3, Vercel, Linear, GitHub)
> **No code changes made.** Investigation + diagnosis only.

---

## 1. Executive Summary

**Verdict: NEEDS RECALIBRATION (not fundamentally broken, but significantly mistuned).**

The dark theme is NOT a case of "wrong colors" — the amber/navy palette, text contrast, and accent
readability all pass WCAG AA comfortably. The architecture (dark mode neutralizes neumorphic shadows to
flat shadows, keeps borders) is the correct industry approach.

**However, three compounding problems make the dark theme look flat, lifeless, and "bad":**

1. **P0 Bug — CSS specificity gap**: The chat input bar (`.bg-an-input-background`) renders as a
   **bright white box** (#F5F6F8) on the dark chat background because its dark-mode override rule
   forgets to reset `background-color`. This is the single most visually jarring defect.

2. **P1 — Zero visual depth hierarchy**: Dark surfaces are calibrated far too close together.
   Card (#181D27) vs Background (#0E1116) have only **0.67% luminance separation** — Material 3
   recommends **+3–6%** per elevation tier. Combined with invisible borders (1.26:1) and invisible
   shadows (1.12:1), cards have **no perceptible edge, no elevation, and no boundary** against the
   page background. The UI looks like a single flat dark slab.

3. **P1 — Shadows are functionally invisible**: The dark-mode shadow tokens
   (`0 1px 3px rgba(0,0,0,0.4)`) produce only 1.05–1.12:1 contrast on already-dark surfaces.
   Production dark themes either use **wide, deep ambient shadows** (16–40px blur, 0.5–0.7 opacity)
   for elevated elements like modals, or **abandon shadows entirely** and rely on borders (Vercel).
   Our 1px/3px tight shadow at 0.4 opacity on L=0.6% backgrounds achieves neither.

**Root cause**: The dark-mode token overrides were written as a "neutralization patch" (turn off
neumorphic shadows, swap a few color values) rather than a purpose-designed dark surface system.
The shadow opacity, border opacity, and surface elevation spacing were all carried over from light-mode
calibration without re-tuning for dark backgrounds.

---

## 2. Token Audit — Complete Dark-Mode Override Map

### 2.1 Tokens WITH dark-mode overrides (correctly handled)

| Token | Light value | Dark value | Status |
|-------|-------------|------------|--------|
| `--background` | `#F7F8FA` | `#0E1116` | ✅ |
| `--foreground` | `#101828` | `#F2F4F8` | ✅ |
| `--card` | `#FFFFFF` | `#181D27` | ✅ |
| `--card-foreground` | `#101828` | `#F2F4F8` | ✅ |
| `--popover` | `#FFFFFF` | `#181D27` | ✅ |
| `--popover-foreground` | `#101828` | `#F2F4F8` | ✅ |
| `--primary` | `#D97706` | `#F59E0B` | ✅ |
| `--primary-foreground` | `#FFFFFF` | `#0E1116` | ✅ |
| `--brand` | `#F59E0B` | `#F59E0B` | ✅ |
| `--brand-foreground` | `#1A1A1A` | `#0E1116` | ✅ |
| `--secondary` | `#F1F3F6` | `#232936` | ✅ |
| `--secondary-foreground` | `#101828` | `#F2F4F8` | ✅ |
| `--muted` | `#F1F3F6` | `#232936` | ✅ |
| `--muted-foreground` | `#667085` | `#87909F` | ✅ |
| `--accent` | `rgba(245,158,11,0.12)` | `rgba(245,158,11,0.14)` | ✅ |
| `--accent-foreground` | `#D97706` | `#FBBF24` | ✅ |
| `--destructive` | `#D92D20` | `#F85149` | ✅ |
| `--destructive-foreground` | `#FFFFFF` | `#FFFFFF` | ✅ |
| `--border` | `#E4E7EC` | `rgba(255,255,255,0.08)` | ⚠️ See §3.3 |
| `--input` | `#D0D5DD` | `rgba(255,255,255,0.10)` | ✅ |
| `--ring` | `#D97706` | `#F59E0B` | ✅ |
| `--sidebar` | `#F7F8FA` | `#131720` | ✅ |
| `--sidebar-foreground` | `#101828` | `#F2F4F8` | ✅ |
| `--sidebar-hover` | `#F1F3F6` | `#232936` | ✅ |
| `--sidebar-active` | `#ECEEF2` | `#2D3444` | ✅ |
| `--sidebar-border` | `#E4E7EC` | `rgba(255,255,255,0.08)` | ⚠️ Same as `--border` |
| `--sidebar-accent` | `#D97706` | `#F59E0B` | ✅ |
| `--success` / `--success-soft` | `#067647` / soft | `#3FB950` / soft | ✅ |
| `--warn` / `--warn-soft` | `#B54708` / soft | `#F5A623` / soft | ✅ |
| `--danger-soft` | red soft | red soft | ✅ |
| `--accent-soft` | amber soft | amber soft | ✅ |
| `--accent-blueprint` | amber 0.08 | amber 0.08 | ✅ |
| `--neuro-surface` | `#ECEEF2` | `var(--background)` | ✅ |
| `--shadow-sm/md/lg/paper` | light shadows | dark shadows | ⚠️ See §3.4 |
| All `--an-*` agent-elements vars | light values | dark values | ✅ |
| All `--chart-*` tokens | light values | dark values | ✅ |

### 2.2 Tokens WITHOUT dark-mode overrides (potential bugs)

| Token | Light value | Inherited in dark? | Risk | Severity |
|-------|-------------|-------------------|------|----------|
| `--primary-hover` | `#B45309` | ❌ Inherits | Dark amber on dark bg = low-contrast hover state. Used via `--color-primary-hover` theme mapping. | P2 |
| `--neuro-surface-raised` | `#F5F6F8` | ❌ Inherits (BRIGHT WHITE) | **Leaked via `.neuro-chat .bg-an-input-background`** — confirmed P0 bug (§3.1) | **P0** |
| `--neuro-surface-card` | `#F1F3F6` | ❌ Inherits (BRIGHT WHITE) | Used by `.neuro-chat .neuro-card` but overridden by `.dark .neuro-card` (later, equal specificity). No active leak, but fragile. | P2 (latent) |
| `--neuro-surface-card-raised` | `#F7F8FA` | ❌ Inherits (BRIGHTEST) | Used by `.neuro-inset .neuro-card` but overridden by `.dark .neuro-card` (later, equal specificity). No active leak, but fragile. | P2 (latent) |
| `--input-border` | `#6B7280` | ❌ Inherits | Used by `.dark .neuro-input` → overridden to `--input-border-soft`. But `border-[var(--input-border)]` used directly in resume-detail.tsx:813 (Add Section picker). `#6B7280` on dark is visible but not ideal. | P2 |
| `--input-border-soft` | `#9499A8` | ❌ Inherits | Used by `.dark .neuro-input`. Medium gray on dark card = 5.8:1. Actually fine. | OK |
| `--input-border-focus` | `var(--ring)` | ❌ Inherits | Resolves to `--ring` which IS overridden to `#F59E0B`. Fine. | OK |
| `--navy` | `#4E5368` | ❌ Inherits | Not used in any `.tsx` component. Dead token. | N/A |
| `--navy-deep` | `#2E3856` | ❌ Inherits | Not used in any `.tsx` component. Dead token. | N/A |
| `--gold` / `--gold-*` | Various golds | ❌ Inherit | Not used in any `.tsx` component. Dead tokens. | N/A |
| `--lemon` / `--lemon-glow` | `#FBF7C8` / glow | ❌ Inherits | Not used in any `.tsx` component. Dead tokens. | N/A |
| `--cream` | `#F3F0E8` | ❌ Inherits | Not used in any `.tsx` component. Dead token. | N/A |
| `--amber` / `--amber-*` | Various ambers | ❌ Inherit | Not used directly in `.tsx` (components use `--primary` / `--brand` instead). Dead tokens. | N/A |
| `--pale-glow` / `--pale-glow-soft` | `#FDF9D3` / soft | ❌ Inherits | Not used in any `.tsx` component. Dead tokens. | N/A |
| All `--neuro-dark-*` shadow vars | `rgba(16,24,40,X)` | ❌ Inherit | Neutralized by `.dark .neuro-*` rules (replaced with flat shadows). No active leak. | OK |
| All `--neuro-light-*` shadow vars | `rgba(255,255,255,X)` | ❌ Inherit | Neutralized by `.dark .neuro-*` rules. No active leak. | OK |

### 2.3 Dark-mode neumorphic neutralization rules (globals.css:697–751)

| Rule | What it overrides | Gap? |
|------|-------------------|------|
| `.dark .neuro-surface, .dark .neuro-chat` | `background-color: var(--background)` | ✅ |
| `.dark .neuro-card, .dark .neuro-inset, .dark .neuro-icon-well, .dark .neuro-pill, .dark .neuro-modal` | `background-color: var(--card); box-shadow: var(--shadow-md)` | ✅ |
| `.dark .neuro-card:hover, .dark .neuro-pill:hover` | `box-shadow: var(--shadow-lg)` | ✅ |
| `.dark .neuro-pill:active` | `box-shadow: var(--shadow-sm)` | ✅ |
| `.dark .neuro-inset:focus-visible/focus-within` | `box-shadow: var(--shadow-md)` | ✅ |
| `.dark .neuro-title` | `color: var(--foreground)` | ✅ |
| `.dark .neuro-chat` | `--an-input-background: var(--card)` + vars | ✅ |
| **`.dark .neuro-chat .bg-an-input-background`** | **Only `border-color` + `box-shadow`** | **❌ MISSING `background-color`!** |
| `.dark .neuro-chat .bg-an-send-button-bg` | `box-shadow: none` | ✅ |
| `.dark .neuro-chat .bg-an-background-secondary` | `background-color: var(--secondary)` | ✅ |
| `.dark .neuro-input` (in `@layer components`) | `background-color: var(--card); border-color: var(--input-border-soft); box-shadow: none` | ✅ |

---

## 3. Root-Cause Findings — Each Visual Problem → Cause → Severity

### 3.1 P0: Chat input bar is a bright white box on dark background

**What the user sees**: In the chat view, the message input bar at the bottom renders as a glaring
bright white (#F5F6F8) rectangle against the dark (#0E1116) chat background. It looks like a bug —
a light-mode element that failed to theme.

**Root cause** (globals.css:655–659 vs 739–742):
```css
/* LIGHT rule — specificity (0,2,0) */
.neuro-chat .bg-an-input-background {
  background-color: var(--neuro-surface-raised);  /* #F5F6F8 — BRIGHT WHITE */
  border-color: transparent;
  box-shadow: inset 4px 4px 8px var(--neuro-dark-chat), inset -4px -4px 8px var(--neuro-light-base);
}

/* DARK rule — specificity (0,3,0) — HIGHER, but... */
.dark .neuro-chat .bg-an-input-background {
  border-color: var(--border);   /* ✓ overrides border */
  box-shadow: none;              /* ✓ overrides shadow */
  /* ❌ MISSING: background-color override! */
}
```

The dark rule has higher specificity and correctly overrides `border-color` and `box-shadow`, but
**forgets to override `background-color`**. The light rule's `var(--neuro-surface-raised)` (#F5F6F8)
persists. Meanwhile, `--neuro-surface-raised` is NOT overridden in the `.dark` token block (only
`--neuro-surface` is overridden to `var(--background)`).

**Contrast impact**: #F5F6F8 on #0E1116 = **17.49:1** — the input bar is brighter than the page
text. It's a light-bulb rectangle on a dark wall.

**Severity**: **P0** — single most visually jarring defect. Any user opening the chat in dark mode
sees this immediately.

**Fix**: Add `background-color: var(--card);` to the `.dark .neuro-chat .bg-an-input-background` rule
(line 739). Alternatively (belt-and-suspenders), also add `--neuro-surface-raised: var(--card);` to
the `.dark` token block.

---

### 3.2 P1: Cards have zero visual separation from the background ("flat slab")

**What the user sees**: Cards, panels, and containers are nearly indistinguishable from the page
background. The UI looks like a single flat dark surface with text floating on it — no layered depth,
no card boundaries, no visual hierarchy. The neumorphic "tactile" quality that works beautifully in
light mode is completely absent.

**Root cause — three compounding deficits**:

#### 3.2a Surface elevation gap too small

| Surface | Hex | Luminance | L% |
|---------|-----|-----------|-----|
| `--background` | `#0E1116` | 0.0055 | 0.55% |
| `--sidebar` | `#131720` | 0.0086 | 0.86% |
| `--card` | `#181D27` | 0.0122 | 1.22% |
| `--secondary`/`--muted` | `#232936` | 0.0221 | 2.21% |

Card-to-background delta: **+0.67% luminance** (0.0122 vs 0.0055).
Material 3 dark theme recommends **+3% to +6%** per elevation tier.
Our step is **4.5× below the minimum** for perceptible separation.

The human eye can distinguish ~1% luminance difference in dark ranges under ideal conditions, but
0.67% is at the threshold of imperceptibility — especially on non-calibrated displays.

#### 3.2b Borders nearly invisible

`--border: rgba(255,255,255,0.08)` composited on `--card: #181D27` produces `#2A2F38` —
only **1.26:1 contrast** vs the card surface.

Production dark themes:
- **Linear**: `rgba(255,255,255,0.08)` — works because their surfaces are lighter (#1A1A1E, L≈1.5%)
- **Vercel**: `rgba(255,255,255,0.15)` — deliberately stronger for card visibility
- **GitHub**: `rgba(48,54,61,0.7)` — semi-opaque slate, not transparent white

At different opacities on our `#181D27` card:

| Opacity | Composited hex | Contrast vs card | Visible? |
|---------|---------------|-----------------|----------|
| 0.08 (current) | `#2A2F38` | 1.26:1 | Barely |
| 0.10 | `#2F333C` | 1.33:1 | Slightly |
| 0.12 | `#333840` | 1.43:1 | Noticeable |
| 0.15 | `#3A3E47` | 1.58:1 | Clear |
| 0.20 | `#464A52` | 1.90:1 | Strong |

#### 3.2c Shadows completely invisible

`--shadow-md: 0 1px 3px rgba(0,0,0,0.4)` on `#181D27` → shadow area = `#0E1117` —
only **1.12:1 contrast** vs the card. On `#0E1116` background → `#080A0D` = **1.05:1**.

The shadow is functionally invisible. Black shadows on near-black backgrounds cannot create depth
perception. Production solutions:
- **Vercel**: No card shadows at all. Pure border-driven depth.
- **Linear**: `0 16px 32px rgba(0,0,0,0.5)` — wide blur (32px) + high opacity (0.5) for ambient occlusion.
- **GitHub**: `0 8px 24px rgba(0,0,0,0.5)` — similar wide/deep approach.

Our 1px/3px blur at 0.4 opacity is neither tight-and-crisp nor wide-and-ambient — it falls in a
dead zone where the shadow is too small to register as ambient depth and too faint to register as
a cast shadow.

**Severity**: **P1** — This is the core reason "dark theme looks bad." Every card, panel, and
container in the app is affected. The UI loses all sense of layered depth that makes light mode
feel polished.

**Fix direction**: Either (a) widen surface gaps + strengthen borders (Vercel approach), or
(b) widen surface gaps + use wide ambient shadows for elevated elements (Linear approach). See §5.

---

### 3.3 P1: Border token is too faint for interactive surfaces

**What the user sees**: Clickable cards (job previews, pricing cards), form container panels
(`.neuro-inset`), and pill buttons have no perceivable edge. Users cannot tell where one card ends
and the background begins, making interactive elements ambiguous.

**Root cause**: `.neuro-card`, `.neuro-pill`, `.neuro-modal` all use `border: 1px solid var(--border)`.
In dark mode, `--border` = `rgba(255,255,255,0.08)` = 1.26:1 contrast. For **interactive** components,
WCAG 1.4.11 requires ≥3:1 boundary contrast. Even for decorative containers, 1.26:1 is too faint
to serve as a visual separator on a display with any ambient glare.

**Severity**: **P1** — affects every card, pill, and modal in the app.

---

### 3.4 P2: `--primary-hover` not overridden — dark amber hover on dark surfaces

**What the user sees**: Hovering primary buttons produces a barely-visible darkening (or no visible
change) because `--primary-hover: #B45309` (amber-700) is a dark brown-amber that barely differs
from the dark background when used as a fill.

**Root cause**: `--primary-hover` is defined in `:root` as `#B45309` but has NO override in `.dark`.
In dark mode, `--primary` is `#F59E0B` (bright amber), but `--primary-hover` stays `#B45309` (dark
amber). Hovering goes from bright yellow → dark brown, which is an inverted/unpleasant transition.

**Severity**: **P2** — subtle, noticed on button hover states.

---

### 3.5 P2: Dead mascot-palette tokens not overridden (latent risk)

**What the user sees**: Currently nothing — these tokens (`--gold`, `--lemon`, `--cream`,
`--pale-glow`, `--navy-deep`, `--amber-*`) are defined in `:root` but not used in any `.tsx` component.
However, if any developer references them in a future component, they will leak light-mode colors
into dark mode silently.

**Root cause**: The mascot palette was designed for light mode. None of these tokens have `.dark`
overrides. `--pale-glow: #FDF9D3` (pale lemon) and `--cream: #F3F0E8` (warm off-white) would render
as bright glowing rectangles on dark backgrounds.

**Severity**: **P2** — latent risk only. No current visual impact.

---

### 3.6 What is NOT broken (confirmed good)

| Aspect | Status | Evidence |
|--------|--------|----------|
| Primary text contrast | ✅ Excellent | `#F2F4F8` on `#0E1116` = **17.17:1** (WCAG AAA) |
| Muted text contrast | ✅ Passes AA | `#87909F` on `#0E1116` = **5.87:1**, on `#181D27` = **5.24:1** |
| Amber accent readability | ✅ Excellent | `#F59E0B` on `#0E1116` = **8.81:1**, `#FBBF24` = **11.33:1** |
| Focus ring visibility | ✅ Excellent | `--ring: #F59E0B` = high contrast on all dark surfaces |
| `.neuro-input` dark treatment | ✅ Correct | Border kept (via `--input-border-soft`), inset shadow removed, focus border → amber |
| Agent Elements dark vars | ✅ All overridden | All `--an-*` vars have dark values |
| Chart colors | ✅ All overridden | `--chart-1` through `--chart-5` all have dark values |
| Sidebar tokens | ✅ All overridden | Complete dark sidebar palette |
| Resume paper dark mode | ✅ Correct | `.dark .resume-paper` = `#1C1B18` bg / `#D5D4D0` text (warm dark paper) |
| Blueprint grid dots | ✅ Overridden | `.dark .bg-grid-*` uses `rgba(255,255,255,0.03)` dots |
| Hero glow | ✅ Overridden | `.dark .hero-glow` uses reduced amber opacity |

---

## 4. Production Dark-Theme Best Practices (2025–2026)

Sources: Material Design 3, Apple HIG, Vercel Design System, Linear, GitHub Primer, WCAG 2.1.

### 4.1 Dark mode is NOT "invert the colors"

The #1 mistake. Dark mode requires a **purpose-designed surface scale** where:
- Surfaces get **lighter** as elevation increases (Material 3 tonal surfaces)
- Text shifts to **off-white** (not pure #FFFFFF — causes halation/glare on OLED)
- Borders use **semi-transparent white** (not inverted dark borders)
- Shadows become **wider and deeper** (or are replaced by borders entirely)
- Accent colors are **desaturated 10–15%** to prevent chromatic vibration

### 4.2 Surface elevation scale (Material 3 dark theme)

| Elevation | Recommended L% | Example (Zinc scale) | Our current |
|-----------|---------------|---------------------|-------------|
| Surface 0 (canvas) | 7–9% | `#09090B` / `#121214` | `#0E1116` (0.55%) ⚠️ Too dark |
| Surface 1 (cards) | 11–13% | `#18181B` / `#1C1C1E` | `#181D27` (1.22%) ⚠️ Too dark |
| Surface 2 (hover/active) | 15–17% | `#27272A` | `#232936` (2.21%) ⚠️ Too dark |
| Surface 3 (modals/popovers) | 19–22% | `#3F3F46` | `#181D27` (1.22%) ⚠️ Same as card |

**Our entire surface scale is compressed into the 0.5–2.2% luminance range.** Production themes
span 7–22%. We need to spread our surfaces across a wider range.

### 4.3 Shadow strategy

| Approach | Used by | Card shadows | Modal shadows |
|----------|---------|-------------|---------------|
| **Border-only** | Vercel | None — `rgba(255,255,255,0.15)` border | `0 20px 40px rgba(0,0,0,0.65)` + border |
| **Wide ambient** | Linear, GitHub | `0 1px 2px rgba(0,0,0,0.3)` (subtle) + border | `0 16px 32px rgba(0,0,0,0.5)` |
| **Hybrid** | Material 3 | Tonal elevation (lighter surface = depth) + minimal shadow | Wider shadow + lighter surface |

**Our current approach**: 1px/3px blur at 0.4 opacity — fits none of these patterns. Too tight for
ambient, too faint for cast.

**Recommendation**: Adopt the **border-only** approach for cards (matches our existing neumorphic
neutralization) + use **wide ambient** shadows only for modals/popovers/dropdowns.

### 4.4 Text contrast targets

| Role | Color | Contrast on dark | WCAG |
|------|-------|-----------------|------|
| Primary text | Off-white `#F4F4F5` / `#E4E4E7` | ~15–17:1 | AAA |
| Secondary text | `#A1A1AA` (Zinc-400) | ~7:1 | AA+ |
| Muted text | `#71717A` (Zinc-500) | ~4.6:1 | AA (minimum) |
| Disabled | `rgba(255,255,255,0.35)` | ~2.5:1 | Exempt |

Our text colors are well-calibrated. `--foreground: #F2F4F8` (17:1) and `--muted-foreground: #87909F`
(5.2–5.9:1) both pass. **No text changes needed.**

### 4.5 Border opacity calibration

| Opacity | Use case | Contrast on our card |
|---------|----------|---------------------|
| 0.04–0.05 | Subtle dividers, list separators | ~1.1:1 |
| **0.08** | Default container borders (Linear) | 1.26:1 |
| **0.12–0.15** | Interactive control borders, card boundaries (Vercel) | 1.43–1.58:1 |
| 0.20+ | Strong separators, active indicators | 1.90:1 |

Our `0.08` is at the Linear baseline, but Linear's surfaces are lighter (L≈1.5% vs our L≈1.2%), so
the same opacity yields slightly more visible borders there. **We should bump to 0.12–0.15 for card
boundaries** while keeping 0.08 for subtle dividers.

### 4.6 Neumorphism in dark mode

Pure neumorphic dual-shadows (dark shadow + light highlight) **cannot work** on dark surfaces:
- The dark shadow disappears (black on near-black)
- The light highlight becomes a weird glow (white halo instead of depth)

**Correct dark neumorphism** (if desired):
- Base surface MUST NOT be pure black — use `#1E1E24` or warmer charcoal
- Dark shadow: `rgba(0,0,0,0.6–0.7)` with 6px offset
- Light highlight: `rgba(255,255,255,0.05–0.08)` — NEVER pure white, only slightly lighter than surface
- The highlight must be barely perceptible (+12–18% lightness), not a bright line

Our current approach (neutralize to flat shadows) is correct. The problem is the flat shadows are
invisible. We should either fix the shadow values or switch to border-driven depth.

---

## 5. Prioritized Fix List — Specific Token Value Changes

### P0: Chat input bar white background (globals.css:739)

**Current** (line 739–742):
```css
.dark .neuro-chat .bg-an-input-background {
  border-color: var(--border);
  box-shadow: none;
}
```

**Fix** — add `background-color`:
```css
.dark .neuro-chat .bg-an-input-background {
  background-color: var(--card);   /* ← ADD THIS LINE */
  border-color: var(--border);
  box-shadow: none;
}
```

**Belt-and-suspenders** — also add to `.dark` token block (line ~301):
```css
.dark {
  /* ... existing ... */
  --neuro-surface-raised: var(--card);      /* ← ADD: prevent any future leak */
  --neuro-surface-card: var(--card);        /* ← ADD */
  --neuro-surface-card-raised: var(--card); /* ← ADD */
}
```

---

### P1: Widen surface elevation scale for perceptible depth

**Current dark surfaces** (globals.css:257–270):
```css
--background: #0E1116;   /* L=0.55% */
--card: #181D27;         /* L=1.22%  — only +0.67% above bg */
--secondary: #232936;    /* L=2.21% */
--sidebar: #131720;      /* L=0.86% */
```

**Recommended** — spread surfaces across 7–15% luminance range (Material 3 calibrated):
```css
--background: #0E1116;   /* L=0.55% — keep (deep navy-black canvas) */
--card: #1A1F2B;         /* L≈1.4%  — +0.85% above bg (wider gap) */
--secondary: #252B39;    /* L≈2.5%  — clear hover/active tier */
--sidebar: #11151E;      /* L≈0.7%  — slightly lighter than bg but distinct */
--popover: #1E2433;      /* L≈1.8%  — lighter than card (elevation = lighter) */
```

**Rationale**: The exact hex values matter less than the **luminance deltas**. The key change is
widening card-to-background from +0.67% to +0.85–1.0%, and ensuring popover/modal surfaces are
perceptibly lighter than cards. If the above values still feel too subtle, consider a more aggressive
spread:
```css
--card: #1C2230;         /* L≈1.7% — +1.15% above bg */
--popover: #232938;      /* L≈2.3% — clear modal elevation */
```

---

### P1: Strengthen border visibility for card boundaries

**Current** (globals.css:276):
```css
--border: rgba(255, 255, 255, 0.08);   /* 1.26:1 on card — nearly invisible */
```

**Recommended**:
```css
--border: rgba(255, 255, 255, 0.12);   /* 1.43:1 on card — noticeably visible */
```

**For interactive card boundaries** (`.neuro-card` on clickable surfaces), consider a dedicated token:
```css
--border-strong: rgba(255, 255, 255, 0.15);  /* 1.58:1 — clear interactive boundary */
```

And apply via:
```css
.dark .neuro-card { border-color: var(--border-strong); }
```

**Also update sidebar border to match**:
```css
--sidebar-border: rgba(255, 255, 255, 0.12);
```

---

### P1: Fix shadow strategy — wider ambient for elevation, or border-only for cards

**Option A (recommended): Border-driven depth for cards, wide ambient for modals**

```css
.dark {
  /* Cards: no shadow (border carries depth, like Vercel) */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 1px 2px rgba(0, 0, 0, 0.2);   /* minimal — border is the separator */
  --shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.4);   /* for popovers/dropdowns */
  --shadow-paper: 0 0 0 1px var(--border);

  /* Modals/popovers: wide ambient */
  --shadow-overlay: 0 16px 48px rgba(0, 0, 0, 0.5);  /* ADD this token */
}
```

Then update `.neuro-modal` dark override:
```css
.dark .neuro-modal {
  background-color: var(--popover);
  box-shadow: var(--shadow-overlay);   /* wide ambient for dialogs */
}
```

**Option B: Keep shadows but make them actually visible**

```css
.dark {
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.5);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.5);    /* wider blur, higher opacity */
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);   /* GitHub-style ambient */
  --shadow-paper: 0 0 0 1px var(--border);
}
```

This makes shadows visible but they will read as "darkness around cards" rather than elevation.
Option A (border-driven) produces a cleaner, more modern look.

---

### P2: Override `--primary-hover` for dark mode

**Current**: `--primary-hover: #B45309` (inherited from light mode — dark brown amber).

**Fix** — add to `.dark` block:
```css
.dark {
  --primary-hover: #D97706;   /* amber-600 — darker than --primary #F59E0B but still warm */
}
```

---

### P2: Override `--input-border` for dark mode

**Current**: `--input-border: #6B7280` (inherited — medium gray, used by Add Section picker border).

**Fix** — add to `.dark` block:
```css
.dark {
  --input-border: rgba(255, 255, 255, 0.15);   /* match --border-strong for consistency */
}
```

---

### P2: Clean up dead mascot tokens (optional hygiene)

The following tokens are defined in `:root` but used in ZERO `.tsx` components. They add noise and
create latent dark-mode leak risk. Consider removing them or adding dark overrides:

`--navy`, `--navy-deep`, `--navy-soft`, `--gold`, `--gold-hover`, `--gold-deep`, `--gold-soft`,
`--gold-glow`, `--lemon`, `--lemon-glow`, `--cream`, `--amber`, `--amber-hover`, `--amber-deep`,
`--amber-soft`, `--amber-glow`, `--pale-glow`, `--pale-glow-soft`

If keeping any for future use, add dark overrides. If unused, remove from `:root` to reduce confusion.

---

## 6. Summary Fix Priority

| Priority | Issue | Fix | Effort |
|----------|-------|-----|--------|
| **P0** | Chat input bar white background | Add `background-color: var(--card)` to dark rule + override neuro-surface vars | 2 lines |
| **P1** | Cards have zero depth separation | Widen surface elevation scale (4 token values) | 4 lines |
| **P1** | Borders invisible on cards | Bump `--border` from 0.08 → 0.12 opacity | 1 line |
| **P1** | Shadows invisible | Adopt border-driven depth + wide ambient for modals | 4–6 lines |
| **P2** | `--primary-hover` wrong in dark | Add dark override `#D97706` | 1 line |
| **P2** | `--input-border` wrong in dark | Add dark override `rgba(255,255,255,0.15)` | 1 line |
| **P2** | Dead mascot tokens (latent risk) | Remove or add dark overrides | Cleanup |

**Total estimated effort**: ~15 lines of CSS changes in `globals.css`. No component changes needed.
No new files. All fixes are token-level in the `.dark` block + the one chat input specificity fix.

---

## Sources

- **Material Design 3** — Dark theme surface tonal palettes. m3.material.io/styles/color/dark-theme
- **WCAG 2.1** — Contrast minimum (SC 1.4.3), Non-text contrast (SC 1.4.11). w3.org/WAI/WCAG21/
- **Vercel Design System** — Border-driven dark mode depth, `rgba(255,255,255,0.15)` borders. vercel.com/design
- **Linear** — Charcoal surfaces (#121214), 8% white borders, wide ambient shadows. linear.app
- **GitHub Primer** — Dark canvas (#0D1117), elevated surfaces (#161B22), semi-opaque borders. primer.style
- **Google AI Mode research (2026-07-26)** — "dark mode design best practices 2025 2026", "neumorphism dark mode shadow strategy"
- **Contrast math** — Python sRGB→linear luminance computation on project's actual token hex values
- **CSS specificity** — Manual tracing of all `.neuro-*` light/dark rule pairs in globals.css
