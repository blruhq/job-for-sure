# Implementation Spec: Teal Action/CTA Color + Bronze Brand Split

### 0. Architectural Decision Record (ADR) & Scaling Tradeoffs

**Context & Constraints:**
The app currently uses a single `--primary` CSS variable (`#8B6F47` warm bronze) for BOTH action/CTA elements AND brand identity elements. The user wants to split these into two distinct colors:
- **Teal** (`#0D9488`) for action/CTA: buttons, links, progress, scores, active tabs
- **Bronze** (`#8B6F47`) for brand identity: logo, sidebar accent, headings, card borders, focus rings

**Chosen Architecture: Variable Swap + New `--brand` Token**

Change `--primary` from bronze → teal globally. This automatically converts 80%+ of usages (all `bg-primary`, `text-primary`, `border-primary`) to teal with ZERO component-level edits. Then introduce a new `--brand` variable (bronze) and update only the ~30 usages that must stay bronze (logo squares, sidebar active icons, card hover borders, marketing bronze section).

This requires the FEWEST changes (~30 line edits across ~12 files) vs. the alternative of introducing a new `--cta` variable which would require changing 100+ `bg-primary`/`text-primary` usages.

**Decision: `--accent` stays bronze.** The `--accent`, `--accent-foreground`, `--accent-soft`, and `--accent-blueprint` variables all remain bronze (`rgba(139, 111, 71, ...)`). They control dropdown selection backgrounds, ghost/outline button hover, command palette hover, and blueprint grid dots — all subtle brand-identity textures, NOT action colors. Making them teal would create visual noise that competes with real CTAs.

**Discarded Alternatives:**
- *Alternative A: New `--cta` variable for teal, keep `--primary` as bronze.* Rejected — requires touching 100+ component lines to rename `bg-primary` → `bg-cta`. Excessive churn for the same visual result.
- *Alternative B: Change `--accent` to teal.* Rejected — `--accent` is used for hover/selection backgrounds in dropdowns/menus. Teal hover backgrounds on every menu item would be visually overwhelming.

---

### 1. Target Files & Folder Structure

**Core token file (1 file):**
- `src/app/globals.css` — Token definitions, `@theme inline` bridge, dark mode overrides

**Component files needing `primary` → `brand` rename (~12 files, ~30 line edits):**

| File | Changes | Reason |
|------|---------|--------|
| `src/app/[locale]/(auth)/login/page.tsx` | 1 | Logo square |
| `src/app/[locale]/(auth)/register/page.tsx` | 1 | Logo square |
| `src/app/[locale]/(auth)/forgot-password/page.tsx` | 1 | Logo square |
| `src/app/[locale]/(auth)/reset-password/page.tsx` | 2 | Logo squares |
| `src/app/components/layout/sidebar.tsx` | 4 | Active nav icons + badge |
| `src/app/components/layout/navbar.tsx` | 2 | Locale checkmarks |
| `src/app/components/dashboard/dashboard-view.tsx` | 9 | Section icon + 8 card hover borders |
| `src/app/components/chat/job-preview.tsx` | 1 | Card hover border |
| `src/app/components/resume/job-search-panel.tsx` | 1 | Card hover border |
| `src/app/[locale]/(app)/resumes/page.tsx` | 1 | Card hover border |
| `src/app/components/resume/templates/template-gallery.tsx` | 1 | Template card hover border |
| `src/app/[locale]/(marketing)/page.tsx` | 8 | Bronze CTA section + footer |
| `src/app/components/marketing/grid-pattern.tsx` | 1 | Decorative SVG fill |
| `src/app/lib/email.ts` | 2 | CTA buttons → teal hardcoded |

**Files explicitly NOT changed (documented decisions):**
- `src/app/components/resume/templates/shared-pdf.ts` — `primary: '#8B6F47'` stays bronze. Resume PDFs are professional documents; teal links would look unusual.
- `src/app/components/resume/templates/render-sections.tsx` — `color: '#8B6F47'` stays bronze (matches shared-pdf palette).
- `src/app/lib/company-data.ts` — `'#8B6F47'` is one color in a multi-color array for company logos. Not a theme reference.
- `src/app/components/pipeline/applications-view.tsx` — `dot: '#8B6F47'` stays bronze. "Applied" is a neutral pipeline status, not an action.
- `src/app/[locale]/(marketing)/page.tsx:35` — `rgba(139,111,71,...)` radial gradient stays bronze. Decorative brand glow.
- `src/components/agent-elements/agent-ui.css` — Default values (`#3b82f6`) are fully overridden by `globals.css` `:root` and `.dark` blocks. No change needed.
- `src/app/components/ui/button.tsx` — No change needed. The `default` variant (`bg-primary`) and `link` variant (`text-primary`) automatically become teal. The `outline`/`ghost` hover (`bg-accent-soft`) stays bronze. All correct.
- `src/app/components/ui/select.tsx` — `focus:bg-accent` stays bronze. Correct for dropdown selection.
- `src/app/components/ui/dropdown-menu.tsx` — `focus:bg-accent` stays bronze. Correct for menu selection.

---

### 2. Import Definitions & Dependencies

No new imports needed. All changes are CSS variable values and Tailwind class names. The `--brand` and `--brand-foreground` variables integrate with Tailwind v4 via the existing `@theme inline` block pattern.

---

### 3. Token Architecture (globals.css)

#### 3.1 Full Teal Scale (add to `:root`)

Add these lines AFTER the existing `--primary` declaration in `:root` (around line 69):

```css
  /* ── Teal action/CTA scale (primary action color) ── */
  --teal-50: #F0FDFA;
  --teal-100: #CCFBF1;
  --teal-200: #99F6E4;
  --teal-300: #5EEAD4;
  --teal-400: #2DD4BF;
  --teal-500: #14B8A6;
  --teal-600: #0D9488;   /* = --primary */
  --teal-700: #0F766E;   /* = --primary-hover */
  --teal-800: #115E59;
  --teal-900: #134E4A;
  --teal-950: #042F2E;
```

#### 3.2 `:root` Changes (light mode)

| Variable | Current Value | New Value | Notes |
|----------|--------------|-----------|-------|
| `--primary` | `#8B6F47` | `#0D9488` | Teal-600 — main CTA |
| `--primary-foreground` | `#FFFFFF` | `#FFFFFF` | No change (white on teal) |
| `--brand` | *(new)* | `#8B6F47` | Warm bronze — brand identity |
| `--brand-foreground` | *(new)* | `#FFFFFF` | White text on bronze bg |
| `--accent` | `rgba(139, 111, 71, 0.08)` | *(no change)* | Stays bronze soft |
| `--accent-foreground` | `#8B6F47` | *(no change)* | Stays bronze |
| `--ring` | `#8B6F47` | *(no change)* | Stays bronze (focus ring) |
| `--chart-1` | `#8B6F47` | *(no change)* | Stays bronze |
| `--sidebar-accent` | `#8B6F47` | *(no change)* | Stays bronze |
| `--accent-soft` | `rgba(139, 111, 71, 0.08)` | *(no change)* | Stays bronze |
| `--accent-blueprint` | `rgba(139, 111, 71, 0.05)` | *(no change)* | Stays bronze |
| `--an-primary-color` | `var(--primary)` | *(no change)* | Auto-follows to teal |
| `--an-send-button-bg` | `var(--primary)` | *(no change)* | Auto-follows to teal |
| `--an-user-message-bg` | `var(--accent-soft)` | *(no change)* | Stays bronze tint |

#### 3.3 `.dark` Changes (dark mode)

| Variable | Current Value | New Value | Notes |
|----------|--------------|-----------|-------|
| `--primary` | `#B89472` | `#2DD4BF` | Teal-400 — lighter for dark bg contrast |
| `--primary-foreground` | `#FFFFFF` | `#042F2E` | Teal-950 — dark text on bright teal button |
| `--brand` | *(new)* | `#B89472` | Lightened bronze (same as old dark primary) |
| `--brand-foreground` | *(new)* | `#FFFFFF` | White on bronze in dark mode |
| `--accent` | `rgba(184, 148, 114, 0.12)` | *(no change)* | Stays bronze soft |
| `--accent-foreground` | `#B89472` | *(no change)* | Stays bronze |
| `--ring` | `#B89472` | *(no change)* | Stays bronze |
| `--chart-1` | `#B89472` | *(no change)* | Stays bronze |
| `--sidebar-accent` | `#B89472` | *(no change)* | Stays bronze |
| `--accent-soft` | `rgba(184, 148, 114, 0.12)` | *(no change)* | Stays bronze |
| `--accent-blueprint` | `rgba(184, 148, 114, 0.07)` | *(no change)* | Stays bronze |
| `--an-primary-color` | `#B89472` | `#2DD4BF` | Override needed (hardcoded, not var) |
| `--an-send-button-bg` | `#B89472` | `#2DD4BF` | Override needed (hardcoded) |
| `--an-send-button-color` | `#0a0a0a` | `#042F2E` | Dark text on bright teal |
| `--an-user-message-bg` | `rgba(184, 148, 114, 0.12)` | *(no change)* | Stays bronze tint |

#### 3.4 `@theme inline` Addition

Add inside the existing `@theme inline {}` block (after line 44 `--color-accent-soft`):

```css
  --color-brand: var(--brand);
  --color-brand-foreground: var(--brand-foreground);
```

This registers `bg-brand`, `text-brand`, `border-brand`, `ring-brand`, etc. as Tailwind utilities.

#### 3.5 LOCKED — Do NOT Touch

These variables are explicitly locked per user constraints:
- `--neuro-surface`, `--neuro-surface-card`, `--neuro-surface-raised`, `--neuro-surface-card-raised`
- All `--neuro-dark-*` and `--neuro-light-*` shadow values
- `--background: #F7F4EF` (warm ivory)

---

### 4. Step-by-Step Edits

#### ✅ Step 1: globals.css — Token Definitions

**1a.** In `:root` block, change line 68:
```css
/* BEFORE */ --primary: #8B6F47;              /* warm bronze */
/* AFTER  */ --primary: #0D9488;              /* teal-600 — action/CTA */
```

**1b.** Immediately after the `--primary-foreground` line (line 69), add:
```css
  --primary-hover: #0F766E;          /* teal-700 — hover state */
  --brand: #8B6F47;                  /* warm bronze — brand identity */
  --brand-foreground: #FFFFFF;       /* white text on bronze */
```

**1c.** After the `--brand-foreground` line, add the full teal scale (from section 3.1 above).

**1d.** In `@theme inline` block, after line 44 (`--color-accent-soft`), add:
```css
  --color-brand: var(--brand);
  --color-brand-foreground: var(--brand-foreground);
  --color-primary-hover: var(--primary-hover);
```

**1e.** In `.dark` block, change line 211:
```css
/* BEFORE */ --primary: #B89472;
/* AFTER  */ --primary: #2DD4BF;     /* teal-400 — lighter for dark mode */
```

**1f.** In `.dark` block, change line 212:
```css
/* BEFORE */ --primary-foreground: #FFFFFF;
/* AFTER  */ --primary-foreground: #042F2E;  /* teal-950 — dark text on bright teal */
```

**1g.** In `.dark` block, after `--primary-foreground`, add:
```css
  --brand: #B89472;                  /* lightened bronze for dark mode */
  --brand-foreground: #FFFFFF;
```

**1h.** In `.dark` block, update Agent Elements overrides (around lines 261-269):
```css
/* BEFORE */ --an-primary-color: #B89472;
/* AFTER  */ --an-primary-color: #2DD4BF;

/* BEFORE */ --an-send-button-bg: #B89472;
/* AFTER  */ --an-send-button-bg: #2DD4BF;

/* BEFORE */ --an-send-button-color: #0a0a0a;
/* AFTER  */ --an-send-button-color: #042F2E;
```

#### ✅ Step 2: Auth Pages — Logo Squares (5 edits)

In each file, change the logo square from `bg-primary` to `bg-brand`:

**`src/app/[locale]/(auth)/login/page.tsx` line 74:**
```
bg-primary  →  bg-brand
```

**`src/app/[locale]/(auth)/register/page.tsx` line 60:**
```
bg-primary  →  bg-brand
```

**`src/app/[locale]/(auth)/forgot-password/page.tsx` line 46:**
```
bg-primary  →  bg-brand
```

**`src/app/[locale]/(auth)/reset-password/page.tsx` lines 28 and 96:**
```
bg-primary  →  bg-brand  (both occurrences)
```

#### ✅ Step 3: Sidebar — Active Nav Icons (4 edits)

**`src/app/components/layout/sidebar.tsx`:**

| Line | Current | New | Context |
|------|---------|-----|---------|
| 81 | `text-primary` | `text-brand` | Active nav icon color |
| 88 | `text-primary` | `text-brand` | Count badge text |
| 150 | `text-primary` | `text-brand` | Admin nav active |
| 187 | `text-primary` | `text-brand` | Resumes nav active |

#### ✅ Step 4: Navbar — Locale Checkmarks (2 edits)

**`src/app/components/layout/navbar.tsx`:**

| Line | Current | New |
|------|---------|-----|
| 32 | `text-primary` | `text-brand` |
| 36 | `text-primary` | `text-brand` |

#### ✅ Step 5: Dashboard — Section Icon + Card Hover Borders (9 edits)

**`src/app/components/dashboard/dashboard-view.tsx`:**

| Line | Current | New | Context |
|------|---------|-----|---------|
| 106 | `text-primary` | `text-brand` | Section header icon well |
| 150 | `hover:border-primary` | `hover:border-brand` | Stat card hover |
| 167 | `hover:border-primary` | `hover:border-brand` | Stat card hover |
| 184 | `hover:border-primary` | `hover:border-brand` | Stat card hover |
| 208 | `hover:border-primary` | `hover:border-brand` | Stat card hover |
| 276 | `hover:border-primary` | `hover:border-brand` | Quick action card hover |
| 284 | `hover:border-primary` | `hover:border-brand` | Quick action card hover |
| 292 | `hover:border-primary` | `hover:border-brand` | Quick action card hover |
| 300 | `hover:border-primary` | `hover:border-brand` | Quick action card hover |

**Note:** Lines 238 (`bg-primary` score ring), 254 (`bg-primary` status color), 278/286/294/302 (`text-primary` action icons) — **KEEP as `primary`** (teal). These are action/score contexts.

#### ✅ Step 6: Other Card Hover Borders (4 edits)

| File | Line | Current | New |
|------|------|---------|-----|
| `src/app/components/chat/job-preview.tsx` | 161 | `hover:border-primary/40` | `hover:border-brand/40` |
| `src/app/components/resume/job-search-panel.tsx` | 836 | `hover:border-primary` | `hover:border-brand` |
| `src/app/[locale]/(app)/resumes/page.tsx` | 211 | `hover:border-primary/50` | `hover:border-brand/50` |
| `src/app/components/resume/templates/template-gallery.tsx` | 116 | `hover:border-primary/40` | `hover:border-brand/40` |

#### ✅ Step 7: Marketing Bronze Section (8 edits)

**`src/app/[locale]/(marketing)/page.tsx`:**

| Line | Current | New | Context |
|------|---------|-----|---------|
| 155 | `bg-primary` | `bg-brand` | CTA section background |
| 158 | `text-primary-foreground` | `text-brand-foreground` | Section heading |
| 161 | `text-primary-foreground/80` | `text-brand-foreground/80` | Section subtext |
| 166 | `bg-primary-foreground ... text-primary` | `bg-brand-foreground ... text-brand` | Reversed CTA button on bronze |
| 175 | `bg-primary` | `bg-brand` | Footer background |
| 177 | `text-primary-foreground/60` | `text-brand-foreground/60` | Footer copyright |
| 178 | `text-primary-foreground/60` | `text-brand-foreground/60` | Footer links container |
| 179, 182, 185 | `hover:text-primary-foreground` | `hover:text-brand-foreground` | Footer link hovers (3 occurrences) |

#### ✅ Step 8: Marketing Grid Pattern (1 edit)

**`src/app/components/marketing/grid-pattern.tsx` line 66:**
```
fill="var(--primary)"  →  fill="var(--brand)"
```

#### ✅ Step 9: Email Templates — CTA Buttons (2 edits)

**`src/app/lib/email.ts`:**

There are two email template functions, each with a logo mark and a CTA button.

| Line | Current | New | Context |
|------|---------|-----|---------|
| 33 | `background: #8B6F47` | `background: #0D9488` | CTA button in email 1 |
| 63 | `background: #8B6F47` | `background: #0D9488` | CTA button in email 2 |

**Note:** Lines 28 and 58 (logo mark `background: #8B6F47`) — **KEEP BRONZE**. The logo mark is brand identity.

---

### 4.5 Vertical-Slice Order

Execute in this order to produce testable checkpoints:

1. **Slice 1 — Token swap (globals.css):** Steps 1a–1h. After this, `npx tsc --noEmit` should pass (CSS-only change). Visual: all former bronze CTAs are now teal, brand elements incorrectly teal (expected — fixed in subsequent slices).

2. **Slice 2 — Brand fixes (components):** Steps 2–8. After this, all brand elements revert to bronze. Visual: primary buttons teal, brand elements bronze, neumorphic surfaces unchanged.

3. **Slice 3 — Email templates:** Step 9. Email CTA buttons become teal.

4. **Verification:** Run `npx tsc --noEmit` and `pnpm build`.

---

### 5. Assertion & Testing Requirements

**No behavioral change** — this is a pure visual/CSS variable change. No logic, API, data flow, or auth changes.

- **Unit Tests:** N/A — no behavior change
- **Integration Tests:** N/A — no contract changes
- **E2E UI Tests:** N/A — visual-only, no flow changes
- **Manual Visual Verification (required):**
  1. Primary buttons (CTA) are teal `#0D9488` in light mode
  2. Logo squares on auth pages are bronze `#8B6F47`
  3. Sidebar active nav icons are bronze
  4. Card hover borders are bronze
  5. Neumorphic surfaces (`--neuro-surface`, etc.) are completely unchanged
  6. Dark mode: primary buttons are bright teal `#2DD4BF`, brand elements are lightened bronze `#B89472`
  7. Agent Elements chat send button is teal
  8. Focus rings (`--ring`) are bronze

---

### 6. Verification Commands & Log Files

| Check | Command | Expected |
|-------|---------|----------|
| TypeScript | `npx tsc --noEmit` | No errors |
| Build | `pnpm build` | Success |
| Lint | `pnpm lint` | No new warnings |

**If build fails:** Check for any Tailwind class that doesn't resolve (e.g., `bg-brand` if `@theme inline` mapping was missed). The error will reference an unknown utility class.

**Log location:** Build output in terminal stdout/stderr. No separate log files.
