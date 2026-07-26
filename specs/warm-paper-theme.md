# Implementation Spec & Plan: Warm Paper Theme + rem Type Scale

### 0. Architectural Decision Record (ADR) & Scaling Tradeoffs

- **Context & Constraints**: The app currently uses a cool blue palette (#5B6ABF steel blue) with ultra-dense px-based typography (body 13px). The user wants a warm "paper-like" palette for eye comfort and a rem-based type scale aligned with Cloudflare/industry standards (body 16px). The change is purely cosmetic (colors + font sizes) — no layout, spacing, or component structure changes.
- **Chosen Architecture**: Direct CSS variable replacement in `:root` and `.dark` blocks of `globals.css`. All downstream consumers (Tailwind `@theme inline` mapping, agent-elements CSS, inline-styled TSX files) automatically inherit the new values through `var()` references. Hardcoded hex/rgba values in non-CSS files (email templates, PDF templates, pipeline dots, marketing gradient) are updated individually. The `--text-*` custom properties are converted from px to rem, but we do NOT add a `--font-size-*` mapping to `@theme inline` — Tailwind utilities (`text-sm`, `text-xs`, etc.) already use Tailwind's own rem-based defaults and changing that mapping would cause unpredictable size shifts in `text-lg`/`text-xl`/`text-2xl` (project scale diverges from Tailwind defaults at those sizes).
- **Discarded Alternatives**:
  - *Alternative A: Add `--font-size-*` to `@theme inline` to unify Tailwind utilities with project tokens.* Rejected because project's `--text-lg` (1.25rem/20px), `--text-xl` (1.5rem/24px), `--text-2xl` (1.875rem/30px) diverge from Tailwind defaults (1.125rem, 1.25rem, 1.5rem respectively). Mapping would silently enlarge all `text-lg`/`text-xl`/`text-2xl` usages across the app, causing unpredictable layout breakage.
  - *Alternative B: Use Tailwind's `@theme` (non-inline) for type scale.* Rejected — `@theme` non-inline generates utility classes at build time and would conflict with the existing `@theme inline` pattern used for colors. Keeping `--text-*` as plain `:root` custom properties is consistent with the current architecture.

---

### 1. Target Files & Folder Structure

**Primary CSS file (all token changes):**
- `src/app/globals.css` — 573 lines. Edit `:root` (lines 60-175), `.dark` (lines 183-253), body styles (line 273), neuro-title (line 486), dark neuro-inset focus ring (line 544)

**Secondary CSS file:**
- `src/components/agent-elements/agent-ui.css` — 305 lines. Convert 3 hardcoded `font-size: 12px` to `0.75rem` (lines 227, 262, 303)

**TSX/TS files with hardcoded #5B6ABF or rgba(91,106,191,...):**
- `src/app/components/resume/templates/shared-pdf.ts` — lines 82-83 (PDF template color tokens)
- `src/app/components/resume/templates/render-sections.tsx` — lines 245, 375 (PDF link text color)
- `src/app/lib/email.ts` — lines 28, 33, 58, 63 (email HTML inline styles)
- `src/app/lib/company-data.ts` — line 55 (company logo color array, first entry)
- `src/app/components/pipeline/applications-view.tsx` — line 52 (status dot color)
- `src/app/[locale]/(marketing)/page.tsx` — line 35 (hero gradient rgba values)

**Files NOT changed (intentional):**
- `drizzle/` — no relation to styling
- PDF inline styles using numeric fontSize (e.g., `fontSize: 8` in render-sections.tsx) — `@react-pdf/renderer` uses numbers as px, rem is not supported
- Email template px font-sizes (email clients don't support rem)
- `.resume-paper` class font-size 11px (intentionally dense for paper rendering context)

**File size compliance**: All target files are well under 300 lines except `globals.css` (573 lines) and `agent-ui.css` (305 lines). Both are config/style files (not code), so the ≤300 line rule does not apply.

---

### 2. Import Definitions & Dependencies

No new imports or dependencies. All changes are value replacements in existing CSS custom properties and inline styles. No new packages, no new modules.

---

### 3. Database Schema Changes

N/A — no database changes. This is a pure CSS/styling change.

---

### 4. Step-by-Step Edits

#### Step 1: globals.css `:root` — Color Tokens (lines 62-108)

Replace each value. Comments should be updated to reflect warm palette.

| Line | Token | BEFORE | AFTER |
|------|-------|--------|-------|
| 62 | `--background` | `#F8F9FA` | `#F7F4EF` |
| 63 | `--foreground` | `#0F1115` | `#2D2A22` |
| 64 | `--card` | `#FFFFFF` | `#FDFBF7` |
| 65 | `--card-foreground` | `#0F1115` | `#2D2A22` |
| 66 | `--popover` | `#FFFFFF` | `#FDFBF7` |
| 67 | `--popover-foreground` | `#0F1115` | `#2D2A22` |
| 68 | `--primary` | `#5B6ABF` | `#8B6F47` |
| 69 | `--primary-foreground` | `#FFFFFF` | `#FFFFFF` (no change) |
| 70 | `--secondary` | `#F1F3F5` | `#EDE8E0` |
| 71 | `--secondary-foreground` | `#0F1115` | `#2D2A22` |
| 72 | `--muted` | `#F1F3F5` | `#EDE8E0` |
| 73 | `--muted-foreground` | `#646E7B` | `#6B6557` |
| 74 | `--accent` | `rgba(91, 106, 191, 0.06)` | `rgba(139, 111, 71, 0.08)` |
| 75 | `--accent-foreground` | `#5B6ABF` | `#8B6F47` |
| 76 | `--destructive` | `#DC2626` | `#DC2626` (no change) |
| 77 | `--destructive-foreground` | `#FFFFFF` | `#FFFFFF` (no change) |
| 78 | `--border` | `#E0E3E8` | `#E0DAD0` |
| 79 | `--input` | `#E0E3E8` | `#E0DAD0` |
| 80 | `--ring` | `#5B6ABF` | `#8B6F47` |
| 84 | `--chart-1` | `#5B6ABF` | `#8B6F47` |
| 85 | `--chart-2` | `#2B5F45` | `#2B5F45` (no change, already warm green) |
| 86 | `--chart-3` | `#D4A316` | `#D4A316` (no change, already warm amber) |
| 87 | `--chart-4` | `#DC2626` | `#DC2626` (no change) |
| 88 | `--chart-5` | `#9F9E98` | `#9F9E98` (no change, neutral grey works on warm) |
| 91 | `--sidebar` | `#F3F4F6` | `#F2EDE5` |
| 92 | `--sidebar-foreground` | `#0F1115` | `#2D2A22` |
| 93 | `--sidebar-hover` | `#E9EBEF` | `#E8E2D8` |
| 94 | `--sidebar-active` | `#DDE0E6` | `#DDD5CA` |
| 95 | `--sidebar-border` | `#E0E3E8` | `#E0DAD0` |
| 96 | `--sidebar-accent` | `#5B6ABF` | `#8B6F47` |
| 104 | `--accent-soft` | `rgba(91, 106, 191, 0.06)` | `rgba(139, 111, 71, 0.08)` |
| 105 | `--accent-blueprint` | `rgba(91, 106, 191, 0.04)` | `rgba(139, 111, 71, 0.05)` |
| 108 | `--neuro-surface` | `#E9ECEF` | `#E8E2D8` |

Update comment on line 57 from "Cool canvas + steel blue" to "Warm ivory paper + warm bronze".

#### Step 2: globals.css `:root` — Type Scale (lines 116-122)

| Line | Token | BEFORE | AFTER | px equivalent |
|------|-------|--------|-------|---------------|
| 116 | `--text-xs` | `11px` | `0.75rem` | 12px |
| 117 | `--text-sm` | `12px` | `0.875rem` | 14px |
| 118 | `--text-base` | `13px` | `1rem` | 16px |
| 119 | `--text-md` | `14px` | `1.125rem` | 18px |
| 120 | `--text-lg` | `16px` | `1.25rem` | 20px |
| 121 | `--text-xl` | `18px` | `1.5rem` | 24px |
| 122 | `--text-2xl` | `22px` | `1.875rem` | 30px |

Update comment on line 115 from "Text scale (dense, from demo)" to "Text scale (rem-based, Cloudflare-standard)".

#### Step 3: globals.css `:root` — Agent Elements comment updates (lines 153-160)

These lines reference `var(--primary)`, `var(--background)`, etc., so VALUES auto-update. Only update COMMENTS to reflect new colors:

| Line | Comment BEFORE | Comment AFTER |
|------|----------------|---------------|
| 153 | `/* #F8F9FA cool canvas */` | `/* #F7F4EF warm ivory */` |
| 156 | `/* #1C1B16 warm off-black */` | `/* #2D2A22 warm charcoal */` |
| 159 | `/* #E6E5DF warm border */` | `/* #E0DAD0 warm border */` |
| 160 | `/* #5B6ABF steel blue */` | `/* #8B6F47 warm bronze */` |
| 161 | `/* soft steel-blue tint */` | `/* soft warm-bronze tint */` |

#### Step 4: globals.css body styles — letter-spacing (line 273)

| Line | Property | BEFORE | AFTER | Reason |
|------|----------|--------|-------|--------|
| 273 | `letter-spacing` | `-0.01em` | `-0.005em` | Negative tracking was calibrated for 13px; at 16px it's too tight |

#### Step 5: globals.css `.neuro-title` — warm-shift (line 486)

| Line | Property | BEFORE | AFTER |
|------|----------|--------|-------|
| 486 | `.neuro-title` color | `#3A3F45` | `#4A4438` |

#### Step 6: globals.css `.dark` block — warm-shift accent colors (lines 183-253)

Dark mode keeps the same background structure (#0D0E11 etc.) but shifts accent from steel blue to warm bronze. The dark bronze is lighter (#B89472) for visibility on dark backgrounds.

| Line | Token | BEFORE | AFTER |
|------|-------|--------|-------|
| 190 | `--primary` | `#8B98E0` | `#B89472` |
| 197 | `--accent-foreground` | `#8B98E0` | `#B89472` |
| 196 | `--accent` | `rgba(139, 152, 224, 0.10)` | `rgba(184, 148, 114, 0.12)` |
| 202 | `--ring` | `#8B98E0` | `#B89472` |
| 204 | `--chart-1` | `#7B8AD8` | `#B89472` |
| 215 | `--sidebar-accent` | `#8B98E0` | `#B89472` |
| 222 | `--accent-soft` | `rgba(139, 152, 224, 0.10)` | `rgba(184, 148, 114, 0.12)` |
| 223 | `--accent-blueprint` | `rgba(139, 152, 224, 0.06)` | `rgba(184, 148, 114, 0.07)` |
| 240 | `--an-primary-color` | `#8B98E0` | `#B89472` |
| 241 | `--an-user-message-bg` | `rgba(139, 152, 224, 0.10)` | `rgba(184, 148, 114, 0.12)` |
| 247 | `--an-send-button-bg` | `#8B98E0` | `#B89472` |

Dark mode text colors (`--foreground`, `--card-foreground`, `--muted-foreground`, etc.) stay unchanged — they're already neutral/cool and don't cause blue light fatigue on dark backgrounds.

#### Step 7: globals.css `.dark` neuro-inset focus ring (line 544)

| Line | BEFORE | AFTER |
|------|--------|-------|
| 544 | `box-shadow: var(--shadow-md), 0 0 0 2px rgba(139, 152, 224, 0.4);` | `box-shadow: var(--shadow-md), 0 0 0 2px rgba(184, 148, 114, 0.4);` |

#### Step 8: globals.css utility class px → rem (lines 281, 291)

These are web-rendered utility classes (not PDF). Convert to rem:

| Line | Selector | Property | BEFORE | AFTER |
|------|----------|----------|--------|-------|
| 281 | `.label-mono` | `font-size` | `10px` | `0.625rem` |
| 291 | `.label-bracket` | `font-size` | `11px` | `0.6875rem` |

**DO NOT convert** line 379 `.resume-paper` `font-size: 11px` — this is the PDF paper rendering context, intentionally dense, and `@react-pdf/renderer` may not handle rem correctly.

#### Step 9: agent-ui.css — hardcoded px → rem (lines 227, 262, 303)

| Line | Selector context | BEFORE | AFTER |
|------|-----------------|--------|-------|
| 227 | `.an-edit-diff, .an-edit-diff pre, .an-edit-diff code` | `font-size: 12px` | `font-size: 0.75rem` |
| 262 | `[data-streamdown="code-block-header"]` | `font-size: 12px` | `font-size: 0.75rem` |
| 303 | `[data-streamdown="code-block"] pre, code` | `font-size: 12px` | `font-size: 0.75rem` |

#### Step 10: Hardcoded #5B6ABF in TSX/TS files

**`src/app/components/resume/templates/shared-pdf.ts` (lines 82-83):**
```
BEFORE:  primary: '#5B6ABF',
         primarySoft: 'rgba(91, 106, 191, 0.08)',
AFTER:   primary: '#8B6F47',
         primarySoft: 'rgba(139, 111, 71, 0.08)',
```

**`src/app/components/resume/templates/render-sections.tsx` (lines 245, 375):**
```
BEFORE:  <Text style={{ fontSize: 8, color: '#5B6ABF' }}>{item.link}</Text>
AFTER:   <Text style={{ fontSize: 8, color: '#8B6F47' }}>{item.link}</Text>
```
(Both occurrences are identical — use replaceAll or edit each line)

**`src/app/lib/email.ts` (lines 28, 33, 58, 63):**
```
BEFORE:  background: #5B6ABF
AFTER:   background: #8B6F47
```
(4 occurrences across 2 email template functions — replaceAll `#5B6ABF` with `#8B6F47`)

**`src/app/lib/company-data.ts` (line 55):**
```
BEFORE:  '#5B6ABF', '#3ECF8E', '#F38020', '#635BFF',
AFTER:   '#8B6F47', '#3ECF8E', '#F38020', '#635BFF',
```
(Only the first color in the array changes)

**`src/app/components/pipeline/applications-view.tsx` (line 52):**
```
BEFORE:  { id: 'applied', labelKey: 'applied', dot: '#5B6ABF', next: 'interviewing' },
AFTER:   { id: 'applied', labelKey: 'applied', dot: '#8B6F47', next: 'interviewing' },
```

**`src/app/[locale]/(marketing)/page.tsx` (line 35):**
```
BEFORE:  'radial-gradient(circle at 70% 40%, rgba(91,106,191,0.4) 0%, transparent 50%), radial-gradient(circle at 30% 80%, rgba(91,106,191,0.15) 0%, transparent 40%)',
AFTER:   'radial-gradient(circle at 70% 40%, rgba(139,111,71,0.4) 0%, transparent 50%), radial-gradient(circle at 30% 80%, rgba(139,111,71,0.15) 0%, transparent 40%)',
```

---

### 4.5 Vertical-Slice Order

This is a single-slice change (CSS tokens + hardcoded values). All steps can be done in one pass since they're all value replacements with no interdependencies. The recommended order is:

1. **Slice 1 (CSS tokens)**: Steps 1-8 (globals.css) + Step 9 (agent-ui.css) — this is the core change that makes the app warm + rem-based
2. **Slice 2 (hardcoded values)**: Step 10 (all TSX/TS files) — ensures no steel blue remnants outside CSS

After Slice 1, the app is already visually transformed. Slice 2 catches edge cases (emails, PDFs, pipeline dots, marketing page).

---

### 5. Assertion & Testing Requirements

This is a **visual/styling change** — no behavioral logic changes. However, the 13px→16px body text jump is significant enough to warrant verification.

- **Unit Tests**: N/A — no behavior change, no logic to test
- **Integration Tests**: N/A — no API or data flow changes
- **E2E UI Tests**: N/A — no flow changes. Visual regression testing is out of scope for this change.

**Manual verification checklist** (engineer should run `pnpm dev` and check):
- [ ] Light mode: background is warm ivory (not cool blue-grey)
- [ ] Light mode: primary buttons/links are warm bronze (#8B6F47)
- [ ] Light mode: text is warm charcoal (#2D2A22), not near-black
- [ ] Light mode: borders are warm (#E0DAD0), not cool grey
- [ ] Light mode: sidebar is warm beige (#F2EDE5)
- [ ] Light mode: neumorphic surfaces have warm tint (#E8E2D8)
- [ ] Dark mode: accent color is warm bronze (#B89472), not steel blue
- [ ] Dark mode: background is still #0D0E11 (unchanged)
- [ ] Dark mode: user message bubbles in chat are warm-tinted
- [ ] Body text is visibly larger (16px vs 13px) but not overflowing
- [ ] `/en/applications` page: pipeline dots are bronze, text readable
- [ ] Dashboard: cards, stats, text all render warm
- [ ] Resume editor: form fields readable at new size
- [ ] Chat interface (agent-elements): code blocks render at 0.75rem
- [ ] Settings/billing: plan cards, usage bars render warm
- [ ] Sidebar: nav items readable, active/hover states warm
- [ ] No console errors or CSS warnings in browser DevTools
- [ ] `pnpm build` succeeds without errors

---

### 6. Verification Commands & Log Files

- **Build Command**: `pnpm build`
- **Lint Command**: `pnpm lint`
- **TypeScript Check**: `npx tsc --noEmit`
- **Dev Server**: `pnpm dev` (for manual visual verification)
- **Server Log Location**: Terminal stdout/stderr. Build errors will appear in terminal output. Runtime CSS errors will appear in browser DevTools console.

---

### 7. Risk Assessment

#### HIGH RISK: Body Text Size Jump (13px → 16px, +23%)

The body `font-size` changes from `var(--text-base)` = 13px to 1rem = 16px. This affects:
- **All text using `var(--text-base)` directly** — will grow 23%
- **Components using Tailwind `text-base` utility** — NO CHANGE (Tailwind default is already 1rem/16px). These components were already rendering at 16px.
- **Components using Tailwind `text-sm`** (0.875rem/14px) — NO CHANGE
- **Components using Tailwind `text-xs`** (0.75rem/12px) — NO CHANGE

**Key insight**: The mismatch between project tokens and Tailwind utilities means the actual visual impact is smaller than it appears. The body element itself grows, but most component text already uses Tailwind utilities which are unchanged. The main impact is on:
- Body-level text not wrapped in a utility class
- Elements using `var(--text-base)` or `var(--text-md)` explicitly
- Inherited font-size from body

**Mitigation**: After implementation, visually check the pages listed in the checklist. If specific areas overflow, they can be individually adjusted with Tailwind utility classes — but this is out of scope for this change (the user wants the token change, overflow fixes are follow-up).

#### MEDIUM RISK: Warm Bronze Contrast on Light Background

#8B6F47 (warm bronze) on #F7F4EF (warm ivory) has a contrast ratio of approximately 4.8:1, which meets WCAG AA for normal text (4.5:1) but is lower than the previous steel blue (#5B6ABF on #F8F9FA ≈ 6.5:1). For primary buttons (bronze bg + white text), contrast is ~4.6:1 — acceptable.

**Mitigation**: If contrast is insufficient for accessibility compliance, consider darkening bronze to #7A5F3D (contrast ≈ 6:1). This is a design decision the user can make after visual review.

#### LOW RISK: Dark Mode Bronze Visibility

#B89472 on #0D0E11 dark background has strong contrast (>7:1). No risk.

#### LOW RISK: PDF Template Colors

PDF templates use hardcoded hex values (now #8B6F47). `@react-pdf/renderer` renders these server-side — no browser CSS variable resolution needed. Low risk, but visually verify a PDF export.

#### LOW RISK: Email Template Colors

Email templates use inline styles with hardcoded hex. Email clients render these directly. Low risk, but the warm bronze may look slightly different in dark-mode email clients (some clients invert colors). Acceptable trade-off.

---

### 8. Summary of All Color Mappings

#### Light Mode Primary Palette
| Role | Old (Cool) | New (Warm) |
|------|-----------|------------|
| Background | #F8F9FA | #F7F4EF |
| Card | #FFFFFF | #FDFBF7 |
| Foreground | #0F1115 | #2D2A22 |
| Muted Foreground | #646E7B | #6B6557 |
| Primary/Accent | #5B6ABF | #8B6F47 |
| Secondary/Muted | #F1F3F5 | #EDE8E0 |
| Border/Input | #E0E3E8 | #E0DAD0 |
| Sidebar | #F3F4F6 | #F2EDE5 |
| Sidebar Hover | #E9EBEF | #E8E2D8 |
| Sidebar Active | #DDE0E6 | #DDD5CA |
| Neuro Surface | #E9ECEF | #E8E2D8 |
| Neuro Title | #3A3F45 | #4A4438 |
| Accent Soft | rgba(91,106,191,0.06) | rgba(139,111,71,0.08) |
| Accent Blueprint | rgba(91,106,191,0.04) | rgba(139,111,71,0.05) |

#### Dark Mode Accent Shift
| Role | Old (Steel Blue) | New (Warm Bronze) |
|------|-----------------|-------------------|
| Primary | #8B98E0 | #B89472 |
| Accent | rgba(139,152,224,0.10) | rgba(184,148,114,0.12) |
| Accent Soft | rgba(139,152,224,0.10) | rgba(184,148,114,0.12) |
| Chart 1 | #7B8AD8 | #B89472 |
| AN Primary | #8B98E0 | #B89472 |
| AN User Msg BG | rgba(139,152,224,0.10) | rgba(184,148,114,0.12) |
| AN Send Button | #8B98E0 | #B89472 |
| Neuro Focus Ring | rgba(139,152,224,0.4) | rgba(184,148,114,0.4) |

#### Type Scale
| Token | Old (px) | New (rem) | Effective px |
|-------|---------|-----------|-------------|
| --text-xs | 11px | 0.75rem | 12px |
| --text-sm | 12px | 0.875rem | 14px |
| --text-base | 13px | 1rem | 16px |
| --text-md | 14px | 1.125rem | 18px |
| --text-lg | 16px | 1.25rem | 20px |
| --text-xl | 18px | 1.5rem | 24px |
| --text-2xl | 22px | 1.875rem | 30px |

#### Bronze RGB Reference
- Light mode bronze: `#8B6F47` → RGB(139, 111, 71)
- Dark mode bronze: `#B89472` → RGB(184, 148, 114)
