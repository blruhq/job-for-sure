# Swiss / International Typographic Style Design System Implementation

## Section 1 — Product

### Goal
Apply the Swiss / International Typographic Style aesthetic defined in `docs/design-system.md` to the Job For Sure codebase. Transform the current amber/neumorphic design into a precise, engineered visual language: near-monochrome palette + Swiss Sapphire accent, Geist Sans throughout (no monospace), visible 1px hairline dividers, and a signature wiring-diagram motif on the landing page only.

### Scope
1. **Global styles** — CSS variables, fonts, Tailwind theme mappings
2. **Landing page** — hero, how-it-works, features bento, interview section, CTA, footer
3. **App shell** — navbar, sidebar, layout container

### Out of Scope
- Functional app screens (resume editor, ATS match, interview prep, billing, settings, cover letter) — visual changes cascade via CSS variables only, no component rewrites
- Backend/API changes
- New pages or routes
- i18n string changes (except minor label adjustments)
- Mascot removal (mascots stay, just repositioned/recolored)

### User Stories
- As a visitor, the landing page should feel like a precision-engineered career platform — Linear/Vercel-grade structure with visible grid, hairline dividers, and an animated wiring motif showing the data pipeline.
- As an authenticated user, the app shell should be clean, monochrome with hairline dividers — no heavy shadows or neumorphic effects.
- As any user, NO monospace fonts should appear anywhere in the UI.

---

## Section 2 — Engineering Handoff

### Strategy: CSS Variable Cascade

The current codebase uses semantic CSS variables (`--background`, `--foreground`, `--primary`, `--border`, etc.) mapped to Tailwind utilities (`bg-background`, `text-foreground`, `bg-primary`, `border-border`). It also uses `neuro-*` CSS classes for neumorphic effects.

**The key strategy**: By updating CSS variable values + redefining `neuro-*` classes in `globals.css`, ~70% of the visual transformation cascades automatically to every component. The remaining 30% is targeted component edits (hero rewrite, sidebar labels, button variants, new wiring-diagram component).

---

### Target Files

| # | File | Action | Lines (est.) |
|---|------|--------|-------------|
| 1 | `src/app/globals.css` | **Major rewrite** — Swiss tokens, flat neuro redefinitions, wiring CSS | ~600 |
| 2 | `src/app/[locale]/layout.tsx` | **Edit** — Swap fonts to Geist Sans | ~147 |
| 3 | `src/app/components/marketing/hero-section.tsx` | **Major rewrite** — Swiss hero + wiring motif | ~400 |
| 4 | `src/app/components/marketing/how-it-works.tsx` | **Rewrite** — Swiss 3-column with wiring trace | ~120 |
| 5 | `src/app/components/marketing/features-bento.tsx` | **Edit** — Swiss grid treatment | ~194 |
| 6 | `src/app/components/marketing/interview-section.tsx` | **Edit** — Swiss treatment | ~187 |
| 7 | `src/app/[locale]/(marketing)/page.tsx` | **Edit** — Swiss CTA + footer | ~134 |
| 8 | `src/app/components/marketing/marketing-nav.tsx` | **Edit** — Swiss navbar | ~146 |
| 9 | `src/app/components/marketing/grid-pattern.tsx` | **Edit** — Swiss colors | ~75 |
| 10 | `src/app/components/marketing/wiring-diagram.tsx` | **NEW** — Animated SVG wiring motif | ~150 |
| 11 | `src/app/components/layout/sidebar.tsx` | **Edit** — Swiss eyebrow labels | ~267 |
| 12 | `src/app/components/layout/navbar.tsx` | **Edit** — Swiss topbar | ~98 |
| 13 | `src/app/[locale]/(app)/app-provider.tsx` | **Edit** — Remove neuro-surface | ~162 |
| 14 | `src/app/components/ui/button.tsx` | **Edit** — Swiss button variants | ~48 |
| 15 | `src/app/lib/neuro-variants.ts` | **Edit** — Update transition class | ~25 |
| 16 | `package.json` | **Edit** — Add `geist` dependency | — |

---

### Step-by-Step Edits

#### STEP 1: Install Geist font package

```bash
pnpm add geist
```

This provides `GeistSans` localFont for Next.js. The `geist` package is maintained by Vercel and provides optimized Geist Sans font files.

#### STEP 2: Update `src/app/[locale]/layout.tsx` — Font swap

**Replace** the font imports and definitions:

```ts
// REMOVE these imports:
import { Inter, JetBrains_Mono, Instrument_Serif, Kanit } from 'next/font/google'

// REMOVE these font definitions:
const inter = Inter(...)
const jetbrainsMono = JetBrains_Mono(...)
const instrumentSerif = Instrument_Serif(...)

// ADD this import:
import { GeistSans } from 'geist/font/sans'

// KEEP Kanit for Thai:
import { Kanit } from 'next/font/google'
const kanit = Kanit({
  variable: '--font-kanit',
  subsets: ['thai', 'latin-ext'],
  weight: ['400', '500', '600'],
  display: 'swap',
  preload: false,
})
```

**Update** the `<html>` className:
```tsx
// BEFORE:
className={`${inter.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable}${locale === 'th' ? ` ${kanit.variable}` : ''}`}

// AFTER:
className={`${GeistSans.variable}${locale === 'th' ? ` ${kanit.variable}` : ''}`}
```

The `GeistSans` package sets `--font-geist-sans` CSS variable. We'll map `--font-sans` to it in globals.css.

#### STEP 3: Rewrite `src/app/globals.css` — Swiss design tokens

This is the foundation. All other changes cascade from here.

##### 3a. Replace `:root` color tokens

Replace ALL color variables in `:root` with Swiss palette:

```css
:root {
  /* ── Swiss semantic tokens (mapped to Tailwind utilities) ── */
  --background: #FFFFFF;          /* --bg-app: canvas */
  --foreground: #09090B;          /* --text-primary: headings, body */
  --card: #FAFAFA;               /* --bg-surface: card/panel */
  --card-foreground: #09090B;
  --popover: #FFFFFF;
  --popover-foreground: #09090B;
  --primary: #2563EB;            /* --accent-primary: Swiss Sapphire */
  --primary-foreground: #FFFFFF;
  --primary-hover: #1D4ED8;      /* --accent-hover */
  --brand: #2563EB;              /* same as primary — Swiss Sapphire */
  --brand-foreground: #FFFFFF;

  --secondary: #F4F4F5;          /* --bg-subtle: inputs, hovered rows */
  --secondary-foreground: #09090B;
  --muted: #F4F4F5;              /* same as secondary */
  --muted-foreground: #71717A;   /* --text-secondary */
  --accent: #EFF6FF;             /* --accent-subtle: selected bg, badge fills */
  --accent-foreground: #2563EB;
  --destructive: #DC2626;
  --destructive-foreground: #FFFFFF;
  --border: #E4E4E7;            /* --border-hairline: 1px visible dividers */
  --input: #E4E4E7;
  --ring: #2563EB;              /* focus ring = accent */
  --radius: 0.375rem;           /* 6px — Swiss button radius */

  /* ── Chart/status tokens (monochrome + accent) ── */
  --chart-1: #2563EB;
  --chart-2: #71717A;
  --chart-3: #A1A1AA;
  --chart-4: #DC2626;
  --chart-5: #E4E4E7;

  /* ── Sidebar tokens ── */
  --sidebar: #FFFFFF;
  --sidebar-foreground: #09090B;
  --sidebar-hover: #F4F4F5;
  --sidebar-active: #EFF6FF;
  --sidebar-border: #E4E4E7;
  --sidebar-accent: #2563EB;

  /* ── Status tokens ── */
  --success: #16A34A;
  --success-soft: rgba(22, 163, 74, 0.08);
  --warn: #CA8A04;
  --warn-soft: rgba(202, 138, 4, 0.08);
  --danger-soft: rgba(220, 38, 38, 0.08);
  --accent-soft: #EFF6FF;       /* solid, not rgba — cleaner Swiss look */
  --accent-blueprint: rgba(37, 99, 235, 0.04);

  /* ── Swiss-specific tokens (for wiring motif + direct use) ── */
  --bg-app: #FFFFFF;
  --bg-surface: #FAFAFA;
  --bg-subtle: #F4F4F5;
  --border-hairline: #E4E4E7;
  --border-strong: #A1A1AA;
  --text-primary: #09090B;
  --text-secondary: #71717A;
  --text-tertiary: #A1A1AA;
  --accent-primary: #2563EB;
  --accent-hover: #1D4ED8;
  --accent-subtle: #EFF6FF;
  --signal-dot: #2563EB;
  --signal-line: #93C5FD;

  /* ── REMOVE all amber/gold/navy/lemon/cream tokens ── */
  /* Delete: --gold, --gold-hover, --gold-deep, --gold-soft, --gold-glow,
     --lemon, --lemon-glow, --cream, --navy, --navy-deep, --navy-soft,
     --amber, --amber-hover, --amber-deep, --amber-soft, --amber-glow,
     --pale-glow, --pale-glow-soft,
     ALL --neuro-* tokens (surface, dark, light, etc.),
     --input-border, --input-border-soft, --input-border-focus */

  /* ── Typography ── */
  --font-sans: var(--font-geist-sans, 'Inter'), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  --font-display: var(--font-geist-sans, 'Inter'), ui-sans-serif, system-ui, sans-serif;  /* Geist for display too — NO serif */
  --font-mono: var(--font-geist-sans, 'Inter'), ui-sans-serif, system-ui, sans-serif;  /* NO monospace — Geist everywhere */

  /* ── Text scale (keep existing) ── */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-md: 1.125rem;
  --text-lg: 1.25rem;
  --text-xl: 1.5rem;
  --text-2xl: 1.875rem;

  /* ── Radius ── */
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* ── Layout (keep existing) ── */
  --sidebar-width: 220px;
  --sidebar-collapsed-width: 56px;
  --topbar-height: 48px;

  /* ── Motion (keep existing) ── */
  --motion-fast: 120ms;
  --motion-base: 200ms;
  --ease: cubic-bezier(0.16, 1, 0.3, 1);  /* Swiss: precise ease-out */

  /* ── Shadows — minimal, flat ── */
  --shadow-sm: none;              /* Swiss: no shadows */
  --shadow-md: 0 0 0 1px var(--border);  /* hairline ring only */
  --shadow-lg: 0 0 0 1px var(--border);
  --shadow-paper: 0 0 0 1px var(--border);

  /* ── Agent Elements overrides — Swiss ── */
  --an-border-radius: 6px;
  --an-message-border-radius: 6px;
  --an-input-border-radius: 6px;
  --an-tool-border-radius: 6px;
  --an-message-radius-inner-offset: 2px;
  --an-max-width: 680px;
  --an-background: var(--background);
  --an-background-secondary: var(--secondary);
  --an-background-tertiary: var(--muted);
  --an-foreground: var(--foreground);
  --an-foreground-muted: var(--muted-foreground);
  --an-foreground-subtle: var(--text-tertiary);
  --an-border-color: var(--border);
  --an-primary-color: var(--primary);
  --an-user-message-bg: var(--accent-soft);
  --an-user-message-text: var(--foreground);
  --an-input-background: var(--card);
  --an-input-border-color: var(--border);
  --an-input-color: var(--foreground);
  --an-input-placeholder-color: var(--muted-foreground);
  --an-input-focus-outline: transparent;
  --an-context-padding: 10px;
  --an-send-button-bg: var(--primary);
  --an-send-button-color: #ffffff;
  --an-tool-background: var(--card);
  --an-tool-border-color: var(--border);
  --an-tool-color: var(--foreground);
  --an-tool-color-muted: var(--muted-foreground);
}
```

##### 3b. Replace `.dark` color tokens

```css
.dark {
  --background: #09090B;          /* --bg-app dark */
  --foreground: #F4F4F5;          /* --text-primary dark */
  --card: #121215;               /* --bg-surface dark */
  --card-foreground: #F4F4F5;
  --popover: #121215;
  --popover-foreground: #F4F4F5;
  --primary: #3B82F6;            /* --accent-primary dark */
  --primary-foreground: #FFFFFF;
  --primary-hover: #60A5FA;      /* --accent-hover dark */
  --brand: #3B82F6;
  --brand-foreground: #FFFFFF;
  --secondary: #18181B;          /* --bg-subtle dark */
  --secondary-foreground: #F4F4F5;
  --muted: #18181B;
  --muted-foreground: #A1A1AA;   /* --text-secondary dark */
  --accent: #1E293B;             /* --accent-subtle dark */
  --accent-foreground: #60A5FA;
  --destructive: #F85149;
  --destructive-foreground: #FFFFFF;
  --border: #27272A;            /* --border-hairline dark */
  --input: #27272A;
  --ring: #3B82F6;

  --chart-1: #3B82F6;
  --chart-2: #A1A1AA;
  --chart-3: #71717A;
  --chart-4: #F85149;
  --chart-5: #27272A;

  --sidebar: #09090B;
  --sidebar-foreground: #F4F4F5;
  --sidebar-hover: #18181B;
  --sidebar-active: #1E293B;
  --sidebar-border: #27272A;
  --sidebar-accent: #3B82F6;

  --success: #3FB950;
  --success-soft: rgba(63, 185, 80, 0.12);
  --warn: #F5A623;
  --warn-soft: rgba(245, 166, 35, 0.12);
  --danger-soft: rgba(248, 81, 73, 0.12);
  --accent-soft: #1E293B;
  --accent-blueprint: rgba(59, 130, 246, 0.04);

  /* Swiss-specific dark tokens */
  --bg-app: #09090B;
  --bg-surface: #121215;
  --bg-subtle: #18181B;
  --border-hairline: #27272A;
  --border-strong: #52525B;
  --text-primary: #F4F4F5;
  --text-secondary: #A1A1AA;
  --text-tertiary: #71717A;
  --accent-primary: #3B82F6;
  --accent-hover: #60A5FA;
  --accent-subtle: #1E293B;
  --signal-dot: #60A5FA;
  --signal-line: #1D4ED8;

  --shadow-sm: none;
  --shadow-md: 0 0 0 1px var(--border);
  --shadow-lg: 0 0 0 1px var(--border);
  --shadow-paper: 0 0 0 1px var(--border);

  /* Agent Elements dark */
  --an-background: #09090B;
  --an-background-secondary: #18181B;
  --an-background-tertiary: #121215;
  --an-foreground: #F4F4F5;
  --an-foreground-muted: #A1A1AA;
  --an-foreground-subtle: #71717A;
  --an-border-color: #27272A;
  --an-primary-color: #3B82F6;
  --an-user-message-bg: #1E293B;
  --an-user-message-text: #F4F4F5;
  --an-input-background: #121215;
  --an-input-border-color: #27272A;
  --an-input-color: #F4F4F5;
  --an-input-placeholder-color: #71717A;
  --an-send-button-bg: #3B82F6;
  --an-send-button-color: #09090B;
  --an-tool-background: #121215;
  --an-tool-border-color: #27272A;
  --an-tool-color: #F4F4F5;
  --an-tool-color-muted: #A1A1AA;
}
```

##### 3c. Update Thai locale font

```css
html[lang="th"] {
  --font-sans: var(--font-kanit, 'Kanit'), var(--font-geist-sans, 'Inter'), ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--font-kanit, 'Kanit'), var(--font-geist-sans, 'Inter'), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-kanit, 'Kanit'), var(--font-geist-sans, 'Inter'), ui-sans-serif, system-ui, sans-serif;
}
```

##### 3d. Redefine `label-mono` and `label-bracket` to Geist Sans uppercase tracking

```css
/* Swiss eyebrow label — replaces both .label-mono and .label-bracket */
/* NO monospace. Uses Geist Sans with uppercase tracking. */
.label-mono,
.label-bracket {
  font-family: var(--font-sans);
  font-size: 0.6875rem;          /* 11px */
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--muted-foreground);
  font-weight: 500;
}

/* Remove bracket pseudo-elements — Swiss style is clean, no [ ] decorations */
.label-bracket::before { content: none; }
.label-bracket::after { content: none; }
```

##### 3e. Redefine ALL `neuro-*` classes to flat Swiss equivalents

**Replace** every neuro-* class definition. The goal: same class names, flat Swiss rendering. This cascades to every component without touching them.

```css
/* ══ SWISS FLAT SURFACES (replaces neumorphic system) ══ */

/* Surface — transparent, inherits parent bg */
.neuro-surface {
  background-color: transparent;
}

/* Divider — visible 1px hairline */
.neuro-divider {
  background-color: var(--border);
}

/* Card — flat with 1px hairline border, NO shadow */
.neuro-card {
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: none;
  transition: border-color 150ms ease-out;
}
.neuro-card:hover {
  border-color: var(--border-strong);
  box-shadow: none;
}

/* Inset — subtle bg for pressed/recessed areas */
.neuro-inset {
  background-color: var(--secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: none;
}
.neuro-inset:focus-visible,
.neuro-inset:focus-within {
  box-shadow: none;
  border-color: var(--ring);
}

.neuro-inset-container:focus-visible,
.neuro-inset-container:focus-within {
  box-shadow: none;
}

/* Input — Swiss form control: bg-subtle, hairline border, focus accent */
.neuro-input {
  background-color: var(--secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: none;
  transition: border-color var(--motion-fast) var(--ease);
}
.neuro-input::placeholder { color: var(--muted-foreground); }
.neuro-input:hover { border-color: var(--border-strong); }
.neuro-input:focus-visible {
  border-color: var(--ring);
  box-shadow: none;
}
.neuro-input:focus-within {
  border-color: var(--ring);
  box-shadow: none;
}
.neuro-input:disabled { opacity: 0.5; cursor: not-allowed; }
.neuro-input[aria-invalid="true"] { border-color: var(--destructive); }

/* Dark mode — same flat treatment */
.dark .neuro-input {
  background-color: var(--card);
  border-color: var(--border);
  box-shadow: none;
}
.dark .neuro-input:focus-visible { border-color: var(--ring); }
.dark .neuro-input:focus-within { border-color: var(--ring); }

/* Icon well — subtle bg circle/square for icons */
.neuro-icon-well {
  background-color: var(--secondary);
  border: 1px solid var(--border);
  box-shadow: none;
}

/* Pill — becomes Swiss secondary button (NOT rounded-full) */
.neuro-pill {
  background-color: var(--secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: none;
  transition: border-color 150ms ease-out, background-color 150ms ease-out;
}
.neuro-pill:hover {
  background-color: var(--muted);
  border-color: var(--border-strong);
  box-shadow: none;
}
.neuro-pill:active {
  transform: scale(0.98);
  box-shadow: none;
}

/* Modal — flat with hairline border */
.neuro-modal {
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: none;
}

/* Title text — uses --text-primary */
.neuro-title {
  color: var(--foreground);
}

/* ── Scoped overrides for agent-elements InputBar ── */
.neuro-chat {
  background-color: var(--background);
  --an-input-background: var(--card);
  --an-input-border-color: var(--border);
  --an-input-border-radius: 6px;
  --an-border-radius: 6px;
  --an-message-border-radius: 6px;
  --an-background: var(--background);
}
.neuro-chat .bg-an-input-background {
  background-color: var(--card);
  border: 1px solid var(--border);
  box-shadow: none;
}
.neuro-chat .bg-an-send-button-bg {
  box-shadow: none;
}
.neuro-chat .neuro-card {
  background-color: var(--card);
  border: 1px solid var(--border);
  box-shadow: none;
}
.neuro-chat .neuro-card:hover {
  border-color: var(--border-strong);
  box-shadow: none;
}
.neuro-chat .bg-an-background-secondary {
  background-color: var(--secondary);
}

/* Nested cards inside insets */
.neuro-inset .neuro-card,
.neuro-inset-container .neuro-card {
  background-color: var(--card);
  border: 1px solid var(--border);
  box-shadow: none;
}
.neuro-inset .neuro-card:hover,
.neuro-inset-container .neuro-card:hover {
  border-color: var(--border-strong);
  box-shadow: none;
}

/* Dark mode — all flat */
.dark .neuro-surface,
.dark .neuro-chat {
  background-color: var(--background);
}
.dark .neuro-card,
.dark .neuro-inset,
.dark .neuro-icon-well,
.dark .neuro-pill {
  background-color: var(--card);
  border: 1px solid var(--border);
  box-shadow: none;
}
.dark .neuro-modal {
  background-color: var(--popover);
  box-shadow: none;
}
.dark .neuro-card:hover,
.dark .neuro-pill:hover {
  border-color: var(--border-strong);
  box-shadow: none;
}
.dark .neuro-pill:active {
  box-shadow: none;
}
.dark .neuro-inset:focus-visible,
.dark .neuro-inset:focus-within {
  box-shadow: none;
}
.dark .neuro-title {
  color: var(--foreground);
}
.dark .neuro-chat {
  --an-input-background: var(--card);
  --an-input-border-color: var(--border);
  --an-input-border-radius: 6px;
  --an-border-radius: 6px;
  --an-message-border-radius: 6px;
  --an-background: var(--background);
}
.dark .neuro-chat .bg-an-input-background {
  background-color: var(--card);
  border-color: var(--border);
  box-shadow: none;
}
.dark .neuro-chat .bg-an-send-button-bg {
  box-shadow: none;
}
.dark .neuro-chat .bg-an-background-secondary {
  background-color: var(--secondary);
}
```

##### 3f. Remove blueprint grid backgrounds, hero-glow

**Delete** these CSS blocks entirely:
- `.bg-grid-blueprint` and `.dark .bg-grid-blueprint`
- `.bg-grid-card` and `.dark .bg-grid-card`
- `.hero-glow` and `.dark .hero-glow`

These are amber-tinted effects incompatible with the Swiss aesthetic.

##### 3g. Update body letter-spacing

```css
/* BEFORE: */
letter-spacing: -0.005em;

/* AFTER: */
letter-spacing: -0.01em;  /* Swiss: slightly tighter */
```

##### 3h. Remove `.font-display` serif rule

```css
/* DELETE this block: */
h1.display, h2.display, .font-display {
  font-family: var(--font-display);
  font-weight: 400;
  letter-spacing: -0.01em;
}

/* REPLACE with: */
h1.display, h2.display, .font-display {
  font-family: var(--font-sans);
  font-weight: 600;
  letter-spacing: -0.03em;
}
```

##### 3i. Add wiring-diagram animation CSS

Add new keyframes and utility classes at the end of the animations section:

```css
/* ══ WIRING DIAGRAM MOTIF ══ */

@keyframes signal-flow {
  0% { stroke-dashoffset: 144; }
  100% { stroke-dashoffset: 0; }
}

@keyframes node-pulse {
  0%, 100% { opacity: 1; r: 2; }
  50% { opacity: 0.7; r: 2.5; }
}

.wiring-trace {
  stroke-dasharray: 24 120;
  animation: signal-flow 3s ease-in-out infinite;
}

.wiring-node-core {
  animation: node-pulse 3s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .wiring-trace { animation: none; stroke-dasharray: none; }
  .wiring-node-core { animation: none; }
}
```

##### 3j. Update scrollbar

```css
/* Keep scrollbar but use Swiss border color */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-tertiary); }
```

##### 3k. Update `@theme inline` block

Update the `--font-mono` mapping:
```css
/* In @theme inline, the --font-mono already maps to var(--font-mono).
   Since we set --font-mono to Geist Sans in :root, this works automatically.
   No changes needed here. */
```

#### STEP 4: Create `src/app/components/marketing/wiring-diagram.tsx` — NEW FILE

This is the signature animated SVG wiring motif component. Used ONLY on landing page hero + how-it-works.

```tsx
/**
 * WiringDiagram — Animated SVG wiring-diagram motif.
 * Swiss design system signature element.
 * 
 * Visual specs (from docs/design-system.md §5):
 * - Line weight: 1.5px stroke
 * - Node dot: outer ring r=4 (1.5px stroke signal-line, fill bg-app),
 *             inner core r=2 (fill accent-primary)
 * - Trace signal: 24px glowing pulse, stroke-dasharray="24 120", 3s ease-in-out infinite
 * 
 * @param variant - "horizontal" (hero: connects 3 stage cards)
 *                   "bridge" (how-it-works: links step headers between cards)
 * @param className - additional classes
 */

interface WiringDiagramProps {
  variant?: 'horizontal' | 'bridge'
  className?: string
}

export function WiringDiagram({ variant = 'horizontal', className }: WiringDiagramProps) {
  // ... implementation with SVG paths, node dots, animated traces
  // See detailed SVG structure below
}
```

**SVG structure for `horizontal` variant** (hero):
- Width: 100% of container, height: 80px
- 3 node pairs (left, center, right) connected by horizontal traces
- Each node: outer ring `<circle r="4" stroke="var(--signal-line)" stroke-width="1.5" fill="var(--bg-app)" />` + inner core `<circle r="2" fill="var(--signal-dot)" class="wiring-node-core" />`
- Trace line: `<line stroke="var(--signal-line)" stroke-width="1.5" />`
- Animated pulse: `<line stroke="var(--signal-dot)" stroke-width="1.5" class="wiring-trace" />`

**SVG structure for `bridge` variant** (how-it-works):
- Width: ~40px, height: 1.5px (horizontal bridge between cards)
- Simple trace + pulse

The component should use CSS variables `var(--signal-dot)` and `var(--signal-line)` so it adapts to light/dark mode automatically.

#### STEP 5: Rewrite `src/app/components/marketing/hero-section.tsx`

**Major rewrite.** The current hero is 664 lines of complex tab-based browser mockup with neumorphic styling. The new Swiss hero is simpler:

**New structure:**
1. Eyebrow badge: `text-xs uppercase tracking-[0.1em] text-muted-foreground` — "AI CAREER PLATFORM"
2. H1 Display: `text-5xl md:text-7xl font-semibold tracking-[-0.04em] leading-[1.05]` — max 2 lines
3. Body Large: `text-lg text-muted-foreground` — max 2 lines
4. Dual CTA buttons: Primary (accent bg) + Secondary (border + subtle bg)
5. **Wiring motif**: Below CTAs, 3 stage cards connected by animated wiring traces:
   - Card 1: "RESUME INPUT" — icon + brief text
   - Card 2: "AI MATCH ENGINE" — icon + brief text  
   - Card 3: "INTERVIEW READY" — icon + brief text
   - WiringDiagram component bridges between cards

**Key styling changes:**
- Remove `hero-glow`, `neuro-card`, `neuro-inset`, `neuro-pill`, `neuro-input` inline usage
- Remove all `font-mono` classes → use `label-mono` class (now Geist Sans) or plain `text-xs uppercase tracking-[0.1em]`
- Remove macOS browser dots, tab switching, complex mockups
- Remove mascot from hero (keep it clean — Swiss aesthetic)
- Use `border border-border rounded-lg` for cards
- Buttons: `rounded-md` not `rounded-lg` or `rounded-full`
- CTA primary: `bg-primary text-primary-foreground hover:bg-primary-hover active:scale-[0.98]`
- CTA secondary: `border border-border bg-secondary text-foreground hover:border-border-strong active:scale-[0.98]`

**IMPORTANT**: This is a 'use client' component currently because of tab state. The new version can be a server component (no interactivity needed). Remove `'use client'` directive.

**i18n**: Keep using `useTranslations('landing')` for text. The existing translation keys (`title`, `subtitle`, `startChat`, `createAccount`, `heroTrustText`) remain. Add new keys for stage card labels if needed (or hardcode the English labels since they're short and universal).

Actually — since we're removing `'use client'`, we need to switch from `useTranslations` (client hook) to `getTranslations` (server). BUT the parent `page.tsx` already calls `getTranslations('landing')` and could pass strings as props. Simpler: keep the hero as a server component and pass translations as props from page.tsx. OR: just make it a client component that still uses `useTranslations`.

**Decision**: Keep hero as client component with `useTranslations` — it's simpler and avoids prop drilling. The `'use client'` directive stays.

#### STEP 6: Rewrite `src/app/components/marketing/how-it-works.tsx`

**Changes:**
- Section label: `font-mono text-xs uppercase tracking-[0.2em]` → `text-xs uppercase tracking-[0.1em] text-muted-foreground` (Geist Sans eyebrow)
- Step labels: `font-mono text-xs uppercase tracking-widest` → same Swiss eyebrow
- Grid: `md:grid-cols-4` → `md:grid-cols-3` (design system says 3-column bento; but current has 4 steps — KEEP 4 steps but make it `md:grid-cols-4` with Swiss styling)
- Actually: design system says "3-Column Bento" for How It Works. But we have 4 steps. **Decision**: Keep 4 steps, apply Swiss styling. The 3-column spec is aspirational; 4 steps is the content reality.
- Icon wells: `neuro-icon-well` → already redefined to flat Swiss via CSS
- Dashed connectors: `border-dashed border-border/40` → solid `border-border` hairline + add `WiringDiagram variant="bridge"` between cards
- Remove `font-mono` from step counters
- Cards get `border border-border rounded-lg` treatment

#### STEP 7: Edit `src/app/components/marketing/features-bento.tsx`

**Changes:**
- Section label: `font-mono text-xs uppercase tracking-[0.2em]` → Swiss eyebrow
- Remove `shadow-lg shadow-primary/5`, `hover:shadow-xl` → flat with `border` + `hover:border-strong`
- Color accents: `bg-primary/5 border-primary/20` → keep (these use the new Sapphire accent via CSS vars)
- `font-mono font-bold text-primary` → `font-bold text-primary tabular-nums` (Geist Sans, no mono)
- `rounded-2xl` → `rounded-lg` (8px Swiss radius)
- macOS dots in chat mockup: keep (they're decorative, not font-related)
- Mascot: keep in job-search card
- `neuro-icon-well` → already flat via CSS redefinition

#### STEP 8: Edit `src/app/components/marketing/interview-section.tsx`

**Changes:**
- Section label: `font-mono text-xs uppercase tracking-[0.2em]` → Swiss eyebrow
- Badge: `rounded-full border border-primary/15 bg-primary/5` → keep rounded-full for this badge (it's a pill badge, not a button — acceptable)
- `font-mono uppercase` labels inside mockup → Swiss eyebrow or plain uppercase tracking
- `shadow-lg shadow-primary/20` on CTA → remove shadow, use `bg-primary hover:bg-primary-hover`
- `neuro-pill` on secondary CTA → already redefined
- `neuro-card` → already redefined
- `font-mono uppercase text-success` → `uppercase tracking-[0.1em] text-success` (Geist Sans)

#### STEP 9: Edit `src/app/[locale]/(marketing)/page.tsx` — CTA + Footer

**CTA section changes:**
- `bg-brand` → keep (now Sapphire via CSS var)
- `font-mono text-xs uppercase tracking-[0.2em]` → Swiss eyebrow
- `shadow-lg shadow-black/10` on CTA button → remove
- `rounded-lg` on CTA button → `rounded-md`
- `hover:-translate-y-0.5` → remove (Swiss: no transform hover, just bg shift)

**Footer changes:**
- `border-t border-brand-foreground/10 bg-brand` → `border-t border-border bg-background` (Swiss footer: monochrome, top hairline)
- Footer text: `text-brand-foreground/80` → `text-muted-foreground`
- Footer links hover: `hover:text-brand-foreground` → `hover:text-foreground`
- Add uppercase tracking to copyright: `text-xs uppercase tracking-[0.1em] text-muted-foreground`
- `bg-brand` footer → white/dark bg with hairline top border

#### STEP 10: Edit `src/app/components/marketing/marketing-nav.tsx`

**Changes:**
- `neuro-surface` → already transparent via CSS redefinition. Add explicit `bg-background` to ensure solid bg.
- `neuro-icon-well` → already flat via CSS
- `bg-primary` on register button → now Sapphire via CSS var
- `hover-visible` → keep (uses `--accent-soft` which is now Sapphire-tinted)
- Text colors: `text-slate-600 dark:text-slate-300` → `text-muted-foreground` (use semantic token)
- Height: already `h-14` ✓

#### STEP 11: Edit `src/app/components/marketing/grid-pattern.tsx`

**Changes:**
- `fill="var(--brand)"` → `fill="var(--primary)"` (same value now, but explicit)
- `opacity="0.07"` → `opacity="0.04"` (subtler with Sapphire)
- `stroke="var(--border)"` → keep (now Swiss hairline color)

#### STEP 12: Edit `src/app/components/layout/sidebar.tsx`

**Changes:**
- `label-bracket` → already redefined to Swiss uppercase tracking via CSS. But the bracket pseudo-elements are removed. The visual will change from `[ HOME ]` to `HOME` in uppercase tracking Geist Sans. ✓
- `neuro-inset` on active items → already redefined to flat `bg-secondary border-border`. Active items get subtle bg + border. ✓
- `neuro-surface` on aside → already transparent. Add `bg-sidebar` to ensure proper bg.
- `font-mono text-[10px]` badge → `text-[10px]` (Geist Sans, no mono). Remove `font-mono`.
- `text-brand` → now Sapphire via CSS var ✓
- `bg-muted-foreground/30` separator → `bg-border` (Swiss hairline)

**Specific edits in sidebar.tsx:**

1. Line ~57: `<span className={cn('label-bracket absolute inset-0 flex items-center px-2.5 transition-opacity duration-150'...` → keep (label-bracket redefined)

2. Line ~61: separator `<span className={cn('absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-0.5 w-5 bg-muted-foreground/30...` → change `bg-muted-foreground/30` to `bg-border`

3. Line ~93: badge `<span className={cn('ml-auto rounded-xs bg-accent-soft px-1.5 py-px font-mono text-[10px] font-semibold text-brand...` → remove `font-mono`

4. Line ~134: aside className `'flex h-full flex-col neuro-surface overflow-hidden...'` → change `neuro-surface` to `bg-sidebar`

5. All `font-mono` instances → remove the `font-mono` class

#### STEP 13: Edit `src/app/components/layout/navbar.tsx`

**Changes:**
- `neuro-surface` on header → `bg-background` (explicit Swiss bg)
- `neuro-icon-well` on logo container → already flat via CSS
- Add `border-b border-border` to header (Swiss: 1px bottom hairline)

**Specific edit:**
Line 23: `<header className="relative flex h-[var(--topbar-height)] shrink-0 items-center neuro-surface z-50">` → change `neuro-surface` to `bg-background border-b border-border`

#### STEP 14: Edit `src/app/[locale]/(app)/app-provider.tsx`

**Changes:**
- Line 68: `neuro-surface` in loading skeleton → `bg-background`
- Line 78: `font-mono text-[10px]` → `text-[10px]` (remove font-mono)
- Line 117: `neuro-surface` in AppShell → `bg-background`

#### STEP 15: Edit `src/app/components/ui/button.tsx`

**Changes:**
- `neumorphic` variant: `"neuro-pill text-foreground border-transparent"` → `"neuro-pill text-foreground"` (neuro-pill now has border)
- `outline` variant: `"border border-border neuro-surface hover:bg-accent-soft hover:text-accent-foreground"` → `"border border-border bg-background hover:bg-secondary hover:text-foreground"`
- Keep `default`, `destructive`, `secondary`, `ghost`, `link` variants — they use CSS vars that now point to Swiss colors
- Add `active:scale-[0.98]` to base class string for Swiss button micro-interaction
- Sizes are close to spec: `default: h-10 px-4`, `sm: h-8 px-3 text-xs`, `lg: h-11 px-8` → update lg to `h-12 px-6 text-base font-semibold` per spec

**Updated button base:**
```ts
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer touch-target active:scale-[0.98]",
  // ... variants
)
```

#### STEP 16: Edit `src/app/lib/neuro-variants.ts`

**Change:**
- `"transition-shadow duration-200"` → `"transition-[border-color,box-shadow] duration-150 ease-out"` (Swiss: border color transition, not shadow)

---

### Component States

- **Loading**: App shell loading skeleton already uses `neuro-surface` → redefined to `bg-background` via CSS. Bounce dots use `bg-primary/60` → Sapphire automatically.
- **Error**: No visual error states in scope (landing page is static).
- **Empty**: N/A for landing page.
- **Dark mode**: All tokens have dark variants defined. Wiring diagram uses CSS variables that adapt. Neuro-* classes have dark redefinitions.

### Edge Cases

- **Thai locale**: Kanit font loads for Thai, Geist Sans for Latin. Both are sans-serif. No mono fallback needed.
- **Reduced motion**: `prefers-reduced-motion: reduce` disables wiring trace animation and node pulse.
- **Mobile**: Wiring diagram horizontal variant should hide on mobile (<768px) or simplify to vertical stack. Stage cards stack vertically on mobile.
- **Existing `font-mono` utility usage**: Since `--font-mono` now maps to Geist Sans, any `font-mono` class produces Geist Sans. No breakage, just wrong semantic — acceptable for this phase.

### Integration Notes

- **i18n**: Hero section needs new translation keys for stage card labels. Add to `messages/en.json` and `messages/th.json` under `landing`:
  - `stageResumeInput`, `stageAiEngine`, `stageInterviewReady`
- **No API changes**: Pure visual/styling.
- **No schema changes**: No DB impact.

---

### Vertical Slices

1. **Slice 1**: globals.css + layout.tsx font swap → Build passes, app loads with Geist Sans + Swiss colors. Verify: `pnpm build` succeeds, visual spot-check.
2. **Slice 2**: neuro-variants.ts + button.tsx → Buttons render flat Swiss style.
3. **Slice 3**: wiring-diagram.tsx → New component renders animated SVG.
4. **Slice 4**: hero-section.tsx rewrite → Landing page hero shows Swiss design + wiring motif.
5. **Slice 5**: how-it-works.tsx → Swiss 3/4-column with wiring bridges.
6. **Slice 6**: Remaining marketing components (features-bento, interview-section, page.tsx, marketing-nav, grid-pattern) → Full landing page Swiss.
7. **Slice 7**: App shell (sidebar, navbar, app-provider) → App shell Swiss.

---

### Verification Exit Criteria

- [ ] `pnpm build` completes without errors — run `pnpm build` and verify exit code 0
- [ ] `npx tsc --noEmit` passes with no type errors — run and verify exit code 0
- [ ] `pnpm lint` passes — run and verify exit code 0
- [ ] Geist Sans font is loaded — inspect `<html>` element in browser DevTools, verify `--font-geist-sans` CSS variable is present
- [ ] NO monospace fonts in UI — search compiled CSS for `JetBrains`, `Menlo`, `Monaco`, `Consolas` and verify none appear in font-family declarations (only in `--font-mono` fallback chain which maps to Geist)
- [ ] Swiss Sapphire accent (#2563EB) is the primary action color — screenshot landing page, verify CTA buttons are blue not amber
- [ ] Visible 1px hairline dividers on landing page — screenshot, verify borders between sections are visible 1px lines
- [ ] Wiring-diagram motif renders on hero section — screenshot, verify animated SVG traces + node dots visible below CTA buttons
- [ ] Wiring-diagram motif renders in how-it-works section — screenshot, verify trace bridges between step cards
- [ ] NO neumorphic shadows anywhere — screenshot landing page + app shell, verify no dual-direction box-shadows on cards
- [ ] Sidebar labels show uppercase tracking (not `[ BRACKETS ]`) — screenshot app shell sidebar, verify labels like "HOME", "RESUMES" without brackets
- [ ] NO `label-bracket` bracket decorations — visual inspection, verify `[ ]` pseudo-elements are gone
- [ ] Footer is monochrome with top hairline border — screenshot, verify white/dark bg (not amber), 1px top border
- [ ] Dark mode renders correctly — toggle theme, screenshot, verify Swiss dark palette (#09090B bg, #3B82F6 accent)
- [ ] Landing page mobile responsive — resize to 375px width, verify hero stacks, wiring motif adapts or hides
- [ ] No console errors on landing page — open DevTools console, navigate landing page, verify zero errors
- [ ] No console errors on app dashboard — login, navigate to /chat, verify zero console errors
