# Implementation Spec & Plan: UX/UI Polish Review

### 0. Architectural Decision Record (ADR) & Scaling Tradeoffs

- **Context & Constraints**: Full-app UX/UI audit revealed 6 confirmed P0 bugs on `/en/resumes`, plus systemic issues across all pages: design-token violations (raw Tailwind colors instead of semantic tokens), broken hover/focus states, inline styles that bypass the Tailwind system, `text-[9px]` below the 10px floor, `text-[11px]`/`text-[13px]` odd values, and missing ARIA attributes. Design tokens, neumorphic shadow values, and the teal/bronze/ivory color system are LOCKED — no changes to `globals.css` token definitions.
- **Chosen Architecture**: Surgical fixes per-file, grouped into vertical slices by issue category. Each batch is independently testable (build + visual check). No new dependencies, no token changes, no new components.
- **Discarded Alternatives**:
  - *Alternative A*: Bulk `text-[10px]` → `text-xs` conversion across all files. Rejected — `text-[10px]` is AT the 10px floor and the user's constraint says tokens are locked. Only `text-[9px]` (below floor) and `text-[11px]`/`text-[13px]` (odd values) are in scope.
  - *Alternative B*: Refactor neumorphic input focus handling globally. Rejected — the `neuro-inset:focus-within` CSS in globals.css is intentional. Only explicit `focus-visible:ring-0` / `focus:ring-0` overrides on non-textarea inputs are in scope.

---

### 1. Target Files & Folder Structure

**P0 — Confirmed Bugs (resumes/page.tsx):**
- `src/app/[locale]/(app)/resumes/page.tsx` — 6 fixes

**P0 — Other Critical Bugs:**
- `src/app/[locale]/(app)/cover-letter/page.tsx` — `text-[9px]`, inline styles
- `src/app/[locale]/(marketing)/pricing/page.tsx` — `bg-green-600` token violation
- `src/app/components/chat/chat-view.tsx` — entry card keyboard accessibility, broken hovers

**P1 — Design Token Violations:**
- `src/app/components/resume/resume-detail.tsx` — `bg-green-500`, `text-green-600`, `text-red-500`
- `src/app/components/resume/resume-preview.tsx` — `text-red-500`, inline styles
- `src/app/components/resume/job-search-panel.tsx` — `text-[var(--warn)]`, emerald palette
- `src/app/components/resume/cover-letter-editor.tsx` — inline styles, `focus:ring-0`
- `src/app/components/resume/templates/render-sections.tsx` — hardcoded hex `#8B6F47`
- `src/app/components/chat/job-preview.tsx` — emerald palette, `text-[var(--warn)]`
- `src/app/components/chat/paste-jd-modal.tsx` — `text-[var(--warn)]`
- `src/app/components/pipeline/timeline.tsx` — `text-blue-500`, `text-amber-500`, `text-green-500`, `text-red-500`
- `src/app/components/pipeline/job-detail-panel.tsx` — emerald palette, `text-[var(--warn)]`
- `src/app/components/pipeline/area-intelligence.tsx` — `hover:bg-sidebar-hover`
- `src/app/components/pipeline/company-intelligence.tsx` — `hover:bg-sidebar-hover`
- `src/app/components/ats/ats-view.tsx` — inline styles on keyword buttons, `label-mono text-[10px]` redundancy
- `src/app/[locale]/(marketing)/page.tsx` — inline gradient style
- `src/app/[locale]/(auth)/login/page.tsx` — inline font-family, `text-[10px]` labels
- `src/app/[locale]/(auth)/register/page.tsx` — inline font-family, `text-[10px]` labels
- `src/app/[locale]/(auth)/forgot-password/page.tsx` — inline font-family, `text-[11px]`
- `src/app/[locale]/(auth)/reset-password/page.tsx` — inline font-family
- `src/app/[locale]/(auth)/layout.tsx` — `text-[13px]`
- `src/app/components/marketing/marketing-nav.tsx` — `text-[13px]`
- `src/app/components/marketing/interview-section.tsx` — `text-[11px]`

**P1 — Inline Styles → Tailwind:**
- `src/app/[locale]/(app)/settings/page.tsx` — `style={{ maxWidth: '600px' }}`, `text-[11px]`
- `src/app/components/layout/upload-modal.tsx` — `rounded-2xl`
- `src/app/components/chat/build-wizard.tsx` — `rounded-2xl`, `text-[11px]`

**P1 — Accessibility:**
- `src/app/[locale]/(app)/settings/page.tsx` — toggle `role="switch"`, `aria-checked`

**File size rule**: All target files already exist and are under 500 lines except `resume-detail.tsx` (1418 lines) and `job-search-panel.tsx` (1008 lines). No new files created — all changes are edits to existing files.

---

### 2. Import Definitions & Dependencies

No new imports needed. All fixes use existing utilities:
- `cn()` from `~/lib/utils` — already imported in all target files
- `useRouter` from `~/i18n/routing` — already imported in `resumes/page.tsx`
- `useUIStore` from `~/hooks/use-ui` — already imported in `resumes/page.tsx`
- Design tokens are CSS variables consumed via Tailwind v4 `@theme inline` mapping — no JS imports

---

### 3. Database Schema Changes

**N/A** — No database changes. Pure frontend CSS/JSX fixes.

---

### 4. Step-by-Step Edits

✅ #### BATCH 1 — P0: Tailor Button Fix + 5 Confirmed Bugs on `/en/resumes`

**File: `src/app/[locale]/(app)/resumes/page.tsx`**

**Fix 1 — Tailor button navigates to ATS instead of duplicating Open:**

Add a new `handleTailor` function after `handleOpen` (after line 37):
```tsx
  const handleTailor = (id: string) => {
    setActiveResumeId(id)
    router.push('/ats')
  }
```

Change line 184 from:
```tsx
                        onClick={() => handleOpen(resume.id)}
```
to:
```tsx
                        onClick={() => handleTailor(resume.id)}
```

**Fix 2 — `text-[9px]` below 10px floor (line 148):**
Change:
```tsx
<span className="text-[9px]">└</span>
```
to:
```tsx
<span className="text-[10px]">└</span>
```

**Fix 3 — `hover:shadow-none` removes card shadow (line 102):**
Change:
```tsx
className="group relative flex flex-col rounded-lg neuro-card transition-all hover:shadow-none"
```
to:
```tsx
className="group relative flex flex-col rounded-lg neuro-card transition-all hover:-translate-y-0.5"
```
(Rationale: `hover:shadow-none` removes the neumorphic dual-shadow entirely, making the card vanish. `hover:-translate-y-0.5` adds a subtle lift that works WITH the existing `.neuro-card:hover` shadow enhancement defined in globals.css.)

**Fix 4 — Low score badge uses wrong color tokens (line 124):**
Change:
```tsx
: 'bg-muted text-muted-foreground',
```
to:
```tsx
: 'bg-danger-soft text-destructive',
```

**Fix 5 — `hover:border-brand/50` should be `hover:border-primary/50` (line 211):**
Change:
```tsx
hover:border-brand/50 hover:bg-accent-soft hover:text-primary
```
to:
```tsx
hover:border-primary/50 hover:bg-accent-soft hover:text-primary
```
(Note: `brand` IS technically a valid token in `@theme inline`, but the user explicitly wants `primary` here for hover-border consistency across all ghost buttons.)

**Fix 6 — Inline `style={{ fontSize: '11px' }}` on lines 53 and 82:**

Line 53 — change:
```tsx
<div className="label-mono mb-1" style={{ fontSize: '11px' }}>[ 02 // RESUME COLLECTION ]</div>
```
to:
```tsx
<div className="label-mono mb-1 text-xs">[ 02 // RESUME COLLECTION ]</div>
```

Line 82 — change:
```tsx
<div className="label-mono mb-1" style={{ fontSize: '11px' }}>[ STATUS: EMPTY ]</div>
```
to:
```tsx
<div className="label-mono mb-1 text-xs">[ STATUS: EMPTY ]</div>
```

---

✅ #### BATCH 2 — P0: Other Critical Bugs

**File: `src/app/[locale]/(app)/cover-letter/page.tsx`**

- Lines 417, 508: Change all `text-[9px]` → `text-[10px]` (below 10px floor)
- Line 503: Change `style={{ boxShadow: 'var(--shadow-paper)' }}` → add class `shadow-[0_0_0_1px_var(--border)]` and remove the inline style
- Line 521: Change `style={{ fontSize: '11px' }}` → remove inline style, the parent already has `text-xs` context

**File: `src/app/components/resume/cover-letter-editor.tsx`**

- Line 305: Change `style={{ boxShadow: 'var(--shadow-paper)' }}` → add class `shadow-[0_0_0_1px_var(--border)]` and remove inline style
- Line 323: Change `style={{ fontSize: '11px' }}` → remove inline style (parent has text sizing)

**File: `src/app/[locale]/(marketing)/pricing/page.tsx`**

- Line 115: Change `bg-green-600` → `bg-success`
  ```tsx
  // Before:
  <span className="rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-semibold text-white">
  // After:
  <span className="rounded-full bg-success px-2 py-0.5 text-[10px] font-semibold text-white">
  ```

**File: `src/app/components/chat/chat-view.tsx`**

- Lines 585, 593, 601: Remove `hover:bg-transparent` from ghost pill buttons (keeps `hover:-translate-y-0.5`):
  ```tsx
  // Before: hover:bg-transparent hover:-translate-y-0.5
  // After:  hover:-translate-y-0.5
  ```

- Lines 716-751: Add keyboard accessibility to the 3 entry card divs. For EACH entry card `<div>`:
  - Add `role="button"`
  - Add `tabIndex={0}`
  - Add `onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); /* same handler as onClick */ } }}`
  - Add `focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2` to className

---

✅ #### BATCH 3 — P1: Design Token Violations (Systemic)

**Rule**: Replace ALL raw Tailwind palette colors with design system semantic tokens.

| File | Line(s) | Before | After |
|------|---------|--------|-------|
| `resume-detail.tsx` | 1281 | `bg-green-500` | `bg-success` |
| `resume-detail.tsx` | 1282 | `text-green-600` | `text-success` |
| `resume-detail.tsx` | 1342 | `text-green-600` | `text-success` |
| `resume-detail.tsx` | 117 | `focus-visible:ring-0` | Remove `focus-visible:ring-0` (restore keyboard focus ring on TagInput) |
| `resume-preview.tsx` | 111 | `text-red-500` | `text-destructive` |
| `resume-preview.tsx` | 128 | `style={{ width: '100%', height: '100%', border: 'none', minHeight: '600px' }}` | `className="w-full h-full border-0 min-h-[600px]"` (remove inline style) |
| `job-search-panel.tsx` | 847 | `text-[var(--warn)]` | `text-warn` |
| `job-search-panel.tsx` | 877 | `border-emerald-500/30 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400` | `border-success/30 bg-success-soft text-success dark:bg-success/10 dark:text-success` |
| `job-preview.tsx` | 182 | `text-[var(--warn)]` | `text-warn` |
| `job-preview.tsx` | 195 | `bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400` | `bg-success-soft text-success dark:bg-success/10 dark:text-success` |
| `paste-jd-modal.tsx` | 59 | `text-[var(--warn)]` | `text-warn` |
| `chat-view.tsx` | 623 | `text-neutral-400 dark:text-neutral-600` | `text-muted-foreground` |
| `chat-view.tsx` | 746 | `text-[var(--warn)]` | `text-warn` |
| `timeline.tsx` | 34 | `color: 'text-blue-500'` | `color: 'text-primary'` |
| `timeline.tsx` | 43 | `color: 'text-amber-500'` | `color: 'text-warn'` |
| `timeline.tsx` | 52 | `color: 'text-green-500'` | `color: 'text-success'` |
| `timeline.tsx` | 61 | `color: 'text-red-500'` | `color: 'text-destructive'` |
| `job-detail-panel.tsx` | 216 | `text-[var(--warn)]` | `text-warn` |
| `job-detail-panel.tsx` | 223 | `text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400` | `text-success dark:bg-success/10 dark:text-success` |
| `job-detail-panel.tsx` | 352 | `text-[var(--warn)]` | `text-warn` |
| `area-intelligence.tsx` | 233 | `hover:bg-sidebar-hover` | `hover:bg-accent-soft` |
| `company-intelligence.tsx` | 44 | `hover:bg-sidebar-hover` | `hover:bg-accent-soft` |
| `render-sections.tsx` | 245 | `color: '#8B6F47'` | `color: COLORS.primary` |
| `render-sections.tsx` | 375 | `color: '#8B6F47'` | `color: COLORS.primary` |

**File: `src/app/components/ats/ats-view.tsx`**

- Lines 404, 426: Replace inline `style={{ background: ..., color: ..., borderColor: ... }}` on keyword buttons with Tailwind classes:
  - Line 404 (missing keywords button): `style={{ background: 'var(--danger-soft)', color: 'var(--destructive)', borderColor: 'rgba(220,38,38,0.2)' }}` → `className="... bg-danger-soft text-destructive border-destructive/20"` (remove inline style)
  - Line 426 (matched keywords span): `style={{ background: 'var(--success-soft)', color: 'var(--success)', borderColor: 'rgba(43,95,69,0.2)' }}` → `className="... bg-success-soft text-success border-success/20"` (remove inline style)

---

✅ #### BATCH 4 — P1: Inline Styles → Tailwind Classes

**File: `src/app/[locale]/(app)/settings/page.tsx`**

- Line 274: Change `style={{ maxWidth: '600px' }}` → `max-w-2xl` (aligns with billing page)
- Lines 393, 463, 465, 474, 501, 527, 530: Change all `text-[11px]` → `text-xs`

**File: `src/app/[locale]/(marketing)/page.tsx`**

- Lines 33-36: Move inline gradient `style={{ backgroundImage: '...' }}` to a CSS class. Add to `globals.css` after `.bg-grid-blueprint`:
  ```css
  .hero-glow {
    background-image:
      radial-gradient(circle at 70% 40%, rgba(139,111,71,0.4) 0%, transparent 50%),
      radial-gradient(circle at 30% 80%, rgba(139,111,71,0.15) 0%, transparent 40%);
  }
  .dark .hero-glow {
    background-image:
      radial-gradient(circle at 70% 40%, rgba(184,148,114,0.25) 0%, transparent 50%),
      radial-gradient(circle at 30% 80%, rgba(184,148,114,0.10) 0%, transparent 40%);
  }
  ```
  Then replace `style={{...}}` with `className="hero-glow"` on the hero section.

- Line 83: Change `style={{ transformOrigin: 'left' }}` → `[transform-origin:left]`

**Auth pages — inline `style={{ fontFamily: 'var(--font-instrument-serif), serif' }}` → `font-display` class:**

| File | Line(s) | Change |
|------|---------|--------|
| `login/page.tsx` | 83 | Remove `style={{ fontFamily: ... }}`, add `font-display` to className |
| `register/page.tsx` | ~90 (h1) | Same |
| `forgot-password/page.tsx` | ~68 (h1) | Same |
| `reset-password/page.tsx` | h1 element | Same |

**File: `src/app/[locale]/(auth)/layout.tsx`**

- Line 16: Change `text-[13px]` → `text-sm`

**File: `src/app/components/marketing/marketing-nav.tsx`**

- Lines 38, 46, 60, 66, 94, 103, 113, 120: Change all `text-[13px]` → `text-sm`

**File: `src/app/components/marketing/interview-section.tsx`**

- Lines 84, 94, 97, 111, 126, 134, 147: Change all `text-[11px]` → `text-xs`

**File: `src/app/components/chat/build-wizard.tsx`**

- Lines 57, 84, 92, 101, 113, 123: Change all `text-[11px]` → `text-xs`
- Lines 53, 108, 120: Change `rounded-2xl` → `rounded-lg`

**File: `src/app/components/layout/upload-modal.tsx`**

- Lines 105, 120, 153: Change `rounded-2xl` → `rounded-lg`

---

✅ #### BATCH 5 — P1: `text-[9px]` Below Floor + Odd `text-[11px]` Values

**Global sweep** — Find ALL remaining instances of `text-[9px]` and `text-[11px]` across the entire `src/` directory and fix:

- `text-[9px]` → `text-[10px]` (10px is the floor)
- `text-[11px]` → `text-xs` (12px, the smallest rem token)

**Files known to have these (from audit):**
- `cover-letter/page.tsx` — `text-[9px]` (lines 417, 508), `text-[11px]` (lines 262, 392, 414, 466, 474, 483, 491)
- `tailor-review-panel.tsx` — `text-[11px]` (lines 170, 203, 204, 215, 222)
- `template-gallery.tsx` — `text-[11px]` (line 124)
- `settings/page.tsx` — `text-[11px]` (lines 393, 463, 465, 474, 501, 527, 530)
- `build-wizard.tsx` — `text-[11px]` (lines 57, 84, 92, 101, 113, 123)
- `marketing-nav.tsx` — `text-[13px]` → `text-sm`
- `auth/layout.tsx` — `text-[13px]` → `text-sm`
- `forgot-password/page.tsx` — `text-[11px]` (line 68)

**IMPORTANT**: Run `rg "text-\[9px\]" src/` and `rg "text-\[11px\]" src/` and `rg "text-\[13px\]" src/` to find ALL instances. Fix every match.

---

✅ #### BATCH 6 — P1: Accessibility Quick Wins

**File: `src/app/[locale]/(app)/settings/page.tsx`**

- Lines 503-514: Add `role="switch"` and `aria-checked` to notification toggle buttons:
  ```tsx
  // Before:
  <button onClick={() => handleTogglePref(item.key)} ...>
  // After:
  <button role="switch" aria-checked={prefs?.[item.key] ?? false} onClick={() => handleTogglePref(item.key)} ...>
  ```

---

### 4.5 Vertical-Slice Order

Execute in this order (each batch is independently verifiable):

1. **Slice 1 (P0)**: BATCH 1 — resumes/page.tsx (6 fixes) → verify Tailor button navigates to `/ats`, visual check of card hover/score badge
2. **Slice 2 (P0)**: BATCH 2 — cover-letter page, pricing page, chat-view entry cards → verify build passes
3. **Slice 3 (P1)**: BATCH 3 — Design token violations across all files → verify build passes, no raw Tailwind colors remain
4. **Slice 4 (P1)**: BATCH 4 — Inline styles → Tailwind classes → verify build passes
5. **Slice 5 (P1)**: BATCH 5 — Global `text-[9px]`/`text-[11px]`/`text-[13px]` sweep → verify with `rg`
6. **Slice 6 (P1)**: BATCH 6 — Accessibility quick wins → verify build passes

After all slices: run `pnpm build` to verify no TypeScript errors, then `pnpm lint`.

---

### 5. Assertion & Testing Requirements

- **Unit Tests**: N/A — no behavioral logic changes. The Tailor button handler is a one-liner navigation call.
- **Integration Tests**: N/A — no API or data flow changes.
- **E2E UI Tests**: N/A — visual changes only, no new user-visible flow (except Tailor button destination change, which is a simple route push).
- **Manual Verification**:
  1. Navigate to `/en/resumes`, click "Tailor" on any resume → should land on `/en/ats` with that resume pre-selected in the dropdown
  2. Hover a resume card → should lift slightly (`-translate-y-0.5`), NOT lose shadow
  3. Check score badges: low score (<50) should show `bg-danger-soft text-destructive`
  4. Check pricing page "SAVE" badge → should use `bg-success` (green), not raw Tailwind green
  5. Tab through chat entry cards → should be focusable and activatable with Enter/Space

---

### 6. Verification Commands & Log Files

- **Build Command**: `pnpm build`
- **Lint Command**: `pnpm lint`
- **TypeScript Check**: `npx tsc --noEmit`
- **Search for remaining violations**:
  - `rg "text-\[9px\]" src/` → should return 0 results
  - `rg "text-\[11px\]" src/` → should return 0 results
  - `rg "text-\[13px\]" src/` → should return 0 results
  - `rg "bg-green-|text-green-|bg-red-|text-red-|bg-emerald-|text-emerald-|text-blue-|text-amber-|text-neutral-" src/ --include="*.tsx"` → should return 0 results (excluding PDF template files which use StyleSheet.create)
  - `rg "hover:shadow-none" src/` → should return 0 results
  - `rg "hover:bg-transparent" src/` → should return 0 results
  - `rg "hover:bg-sidebar-hover" src/app/components/pipeline/` → should return 0 results
  - `rg "text-\[var\(--warn\)\]" src/` → should return 0 results
- **Server Log Location**: Build output in terminal stderr/stdout. If build fails, check for TypeScript errors in the failing file.

---

### Appendix A: P2 Issues (Deferred — Not in Implementation Scope)

These are documented for future polish passes. Do NOT implement now:

| Category | Count | Description |
|----------|-------|-------------|
| `text-[10px]` on `label-mono` elements | ~50+ | Redundant — `label-mono` already sets 10px via CSS. Removing would reduce className bloat but no visual change. |
| `text-[10px]` on non-label elements | ~80+ | At the 10px floor, acceptable. Could be promoted to `text-xs` for readability but not required. |
| `rounded-2xl` in chat/dialogs | ~9 | Not in design system radius scale. Should be `rounded-lg`. Some instances already fixed in BATCH 4. |
| Card padding inconsistency (settings vs billing) | ~5 | Settings uses `p-4`, billing uses `p-5`. Standardize in a future pass. |
| Button radius inconsistency | ~14 | Mix of `rounded-xs`/`rounded-sm`/`rounded-md`/`rounded-lg` across pages. Needs a design decision on canonical radius per element type. |
| Missing `aria-label` on icon-only buttons | ~15 | Most have `title` but not `aria-label`. WCAG 4.1.2 compliance. |
| Empty state design inconsistency | ~8 | No unified pattern (some icons, some text-only, some 50% opacity). Needs a design spec. |
| Skeleton/loading state inconsistency | ~6 | Mix of spinners and skeleton cards. Needs a loading pattern spec. |
| i18n hardcoded strings in interview-summary | ~10 | English strings not using translation keys. |
| `backdrop-blur-[2px]` in interview-view | 1 | Imperceptible blur, likely a typo. Should be `backdrop-blur-sm`. |
| Color contrast `muted-foreground` on neuro-card | Systemic | ~3.8:1 ratio fails WCAG AA. Needs token adjustment (LOCKED for now). |

---

### Appendix B: P0/P1 Issue Summary Table

| # | Sev | File | Issue | Fix |
|---|-----|------|-------|-----|
| 1 | P0 | resumes/page.tsx:184 | Tailor button calls `handleOpen` (same as Open) | New `handleTailor` → `setActiveResumeId` + `router.push('/ats')` |
| 2 | P0 | resumes/page.tsx:148 | `text-[9px]` below 10px floor | → `text-[10px]` |
| 3 | P0 | resumes/page.tsx:102 | `hover:shadow-none` removes card shadow | → `hover:-translate-y-0.5` |
| 4 | P0 | resumes/page.tsx:124 | Low score badge `bg-muted text-muted-foreground` | → `bg-danger-soft text-destructive` |
| 5 | P0 | resumes/page.tsx:211 | `hover:border-brand/50` | → `hover:border-primary/50` |
| 6 | P0 | resumes/page.tsx:53,82 | Inline `style={{ fontSize: '11px' }}` | → `text-xs` class |
| 7 | P0 | cover-letter/page.tsx:417,508 | `text-[9px]` below floor | → `text-[10px]` |
| 8 | P0 | pricing/page.tsx:115 | `bg-green-600` raw Tailwind color | → `bg-success` |
| 9 | P0 | chat-view.tsx:716-751 | Entry cards not keyboard accessible | Add `role`/`tabIndex`/`onKeyDown`/`focus-visible` |
| 10 | P0 | chat-view.tsx:585,593,601 | `hover:bg-transparent` removes hover feedback | Remove `hover:bg-transparent` |
| 11 | P1 | resume-detail.tsx:1281,1282,1342 | `bg-green-500`/`text-green-600` | → `bg-success`/`text-success` |
| 12 | P1 | resume-detail.tsx:117 | `focus-visible:ring-0` removes keyboard focus | Remove `focus-visible:ring-0` |
| 13 | P1 | resume-preview.tsx:111 | `text-red-500` | → `text-destructive` |
| 14 | P1 | resume-preview.tsx:128 | Inline style for width/height/border | → Tailwind classes |
| 15 | P1 | job-search-panel.tsx:847 | `text-[var(--warn)]` | → `text-warn` |
| 16 | P1 | job-search-panel.tsx:877 | Emerald palette | → `success`/`success-soft` tokens |
| 17 | P1 | job-preview.tsx:182,195 | `text-[var(--warn)]`, emerald | → `text-warn`, `success` tokens |
| 18 | P1 | paste-jd-modal.tsx:59 | `text-[var(--warn)]` | → `text-warn` |
| 19 | P1 | chat-view.tsx:623,746 | `text-neutral-*`, `text-[var(--warn)]` | → `text-muted-foreground`, `text-warn` |
| 20 | P1 | timeline.tsx:34,43,52,61 | `text-blue/amber/green/red-500` | → `text-primary`/`text-warn`/`text-success`/`text-destructive` |
| 21 | P1 | job-detail-panel.tsx:216,223,352 | `text-[var(--warn)]`, emerald | → `text-warn`, `success` tokens |
| 22 | P1 | area-intelligence.tsx:233 | `hover:bg-sidebar-hover` | → `hover:bg-accent-soft` |
| 23 | P1 | company-intelligence.tsx:44 | `hover:bg-sidebar-hover` | → `hover:bg-accent-soft` |
| 24 | P1 | render-sections.tsx:245,375 | Hardcoded `#8B6F47` | → `COLORS.primary` |
| 25 | P1 | ats-view.tsx:404,426 | Inline styles on keyword buttons | → Tailwind token classes |
| 26 | P1 | cover-letter-editor.tsx:305,323 | Inline `boxShadow`/`fontSize` styles | → Tailwind classes / remove |
| 27 | P1 | settings/page.tsx:274 | Inline `maxWidth: '600px'` | → `max-w-2xl` |
| 28 | P1 | settings/page.tsx (7 lines) | `text-[11px]` | → `text-xs` |
| 29 | P1 | marketing/page.tsx:33-36 | Inline gradient style | → `.hero-glow` CSS class |
| 30 | P1 | marketing/page.tsx:83 | Inline `transformOrigin` | → `[transform-origin:left]` |
| 31 | P1 | login/register/forgot/reset pages | Inline `fontFamily` style | → `font-display` class |
| 32 | P1 | auth/layout.tsx:16 | `text-[13px]` | → `text-sm` |
| 33 | P1 | marketing-nav.tsx (8 lines) | `text-[13px]` | → `text-sm` |
| 34 | P1 | interview-section.tsx (7 lines) | `text-[11px]` | → `text-xs` |
| 35 | P1 | build-wizard.tsx (6 lines) | `text-[11px]` | → `text-xs` |
| 36 | P1 | build-wizard.tsx (3 lines) | `rounded-2xl` | → `rounded-lg` |
| 37 | P1 | upload-modal.tsx (3 lines) | `rounded-2xl` | → `rounded-lg` |
| 38 | P1 | cover-letter/page.tsx (7 lines) | `text-[11px]` | → `text-xs` |
| 39 | P1 | tailor-review-panel.tsx (5 lines) | `text-[11px]` | → `text-xs` |
| 40 | P1 | template-gallery.tsx:124 | `text-[11px]` | → `text-xs` |
| 41 | P1 | forgot-password/page.tsx:68 | `text-[11px]` | → `text-xs` |
| 42 | P1 | settings/page.tsx:503-514 | Toggle missing `role="switch"`/`aria-checked` | Add ARIA attributes |
