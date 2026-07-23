# Implementation Spec & Plan: Neumorphism UX Polish

> **Branch:** `blueprint-ux-full-neumorphism` (already checked out)
> **Surface:** `#E9ECEF` light / dark neutralizes to flat shadows
> **Module aliases:** `~/` → `./src/app/`, `@/` → `./src/`

## 0. ADR & Tradeoffs

**Context:** The neumorphism design system is visually complete but has UX-breaking issues: focus states destroy the inset shadow (Tailwind `ring` = `box-shadow` replacement), hard borders clash with soft shadows, the ⌘K palette is unwanted, and only 1 of ~30 inputs uses the `neumorphic` prop.

**Chosen approach:** Stack box-shadows in CSS (inset + focus ring in one declaration) instead of Tailwind's `ring` utility. Remove ring utilities from neumorphic variants. Replace hard `border-border` lines with shadow/separation or a `.neuro-divider` utility that's transparent in light mode.

**Discarded alternatives:**
- *Keep ring utility, add `!important` to neuro-inset:* Fragile, breaks dark mode overrides.
- *Remove focus indicators entirely:* Accessibility violation.

---

## CRITICAL CSS CONFLICT (discovered during planning)

**globals.css line 396-399:**
```css
textarea:focus-visible {
  outline: none !important;
  box-shadow: none !important;   /* ← THIS kills neuro-inset on ALL textareas */
}
```
This `!important` rule will override ANY `.neuro-inset:focus-visible` box-shadow. **The fix must scope this rule to exclude neumorphic textareas.** Change to:
```css
textarea:focus-visible:not(.neuro-inset) {
  outline: none !important;
  box-shadow: none !important;
}
```
This keeps the chat input textarea (which has no `.neuro-inset` class) unaffected while allowing neumorphic textareas to show their stacked focus shadow.

---

## Phase 1: Critical UX Fixes

### Step 1.1 — Fix focus state CSS in `src/app/globals.css` ✅

**Edit the textarea global rule (line 396-399)** — scope to exclude neuro-inset:
```css
/* old */
textarea:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}
/* new */
textarea:focus-visible:not(.neuro-inset) {
  outline: none !important;
  box-shadow: none !important;
}
```

**Add `.neuro-inset:focus-visible` / `:focus-within` rule** — insert AFTER the `.neuro-inset` block (after line 433), BEFORE `.neuro-icon-well`:
```css
/* Focus state — stacks inset shadow + focus ring (light mode) */
.neuro-inset:focus-visible,
.neuro-inset:focus-within {
  box-shadow:
    inset 4px 4px 8px rgba(0, 0, 0, 0.10),
    inset -4px -4px 8px rgba(255, 255, 255, 0.9),
    0 0 0 2px rgba(99, 102, 241, 0.35);
}
```

**Add `.neuro-divider` utility** — insert right after `.neuro-surface` block (after line 418):
```css
/* Divider — transparent in light mode, visible in dark mode */
.neuro-divider {
  background-color: transparent;
}
.dark .neuro-divider {
  background-color: var(--border);
}
```

**Dark mode focus for neuro-inset** — add after the existing `.dark .neuro-inset` block (around line 500-506):
```css
.dark .neuro-inset:focus-visible,
.dark .neuro-inset:focus-within {
  box-shadow: var(--shadow-md), 0 0 0 2px rgba(139, 152, 224, 0.4);
}
```

### Step 1.2 — Remove ring utilities from neumorphic Input variant ✅

**File:** `src/app/components/ui/input.tsx` (line 13)

In the `neumorphic` branch of the `cn()`, **remove** `focus-visible:ring-3 focus-visible:ring-ring/50`. Keep `aria-invalid:ring-3 aria-invalid:ring-destructive/20` for error states.

**Before:**
```
...neuro-inset px-2.5 py-1 text-base transition-shadow outline-none ...focus-visible:ring-3 focus-visible:ring-ring/50 disabled:...
```
**After:**
```
...neuro-inset px-2.5 py-1 text-base transition-shadow outline-none ...disabled:...
```
(Remove ONLY `focus-visible:ring-3 focus-visible:ring-ring/50` — the CSS `.neuro-inset:focus-visible` handles it now.)

### Step 1.3 — Remove ring utilities from neumorphic Textarea variant ✅

**File:** `src/app/components/ui/textarea.tsx` (line 11)

Same change as Input. In the `neumorphic` branch, **remove** `focus-visible:ring-3 focus-visible:ring-ring/50`.

### Step 1.4 — Remove ⌘K Command Palette from layout ✅

**File:** `src/app/[locale]/(app)/layout.tsx`
- **Line 8:** Remove `import { CommandPalette } from '~/components/layout/command-palette'`
- **Line 149-150:** Remove the comment `{/* Global ⌘K Command Palette */}` and `<CommandPalette />`
- Do NOT delete `command-palette.tsx` file itself — just disconnect it.

### Step 1.5 — Remove ⌘K button from navbar ✅

**File:** `src/app/components/layout/navbar.tsx`
- **Line 4:** Remove `Search` from the lucide-react import: `import { PanelLeft, Sun, Moon, Globe } from 'lucide-react'`
- **Lines 85-97:** Remove the entire ⌘K search button block (the `<Button variant="outline" ...>` with Search icon and ⌘K kbd).
- **Line 49:** Remove `border-b border-border` from the header className → just `neuro-surface` remains.

### Step 1.6 — Remove hard borders from navbar brand area ✅

**File:** `src/app/components/layout/navbar.tsx`
- **Line 53:** In the brand area div className, change `border-r border-border` → remove these two classes. The brand area keeps its width transition. Replace with nothing (rely on surface color + the topbar being a separate surface from the sidebar).

### Step 1.7 — Remove hard borders from sidebar ✅

**File:** `src/app/components/layout/sidebar.tsx`
- **Line 129:** In the `<aside>` className, remove `border-r border-border`. Keep `neuro-surface`.

### Step 1.8 — Remove hard borders from resume-detail header ✅

**File:** `src/app/components/resume/resume-detail.tsx`
- **Line 1122:** Header div: remove `border-b border-border`, keep `neuro-surface`.
- **Line 1166:** Template gallery bar: remove `border-b border-border`, keep `neuro-surface`.
- **Line 1209:** Review mode left panel: `border-r border-border` → `border-r border-border dark:border-border` (keep for dark mode, use `.neuro-divider` or just remove and rely on shadow). **Simplest:** remove `border-r border-border`, add subtle shadow `shadow-[1px_0_2px_rgba(0,0,0,0.04)]`.
- **Line 1219:** Mobile fallback: `border-t border-border` → same treatment.
- **Line 1225:** Inner border: `border-t border-border` → remove.
- **Line 1237:** Mobile tab toggle: `border-b border-border` → remove.
- **Line 1369:** Co-Pilot drawer header: `border-b border-border` → remove.

**General rule for all border removals:** If the element also has `neuro-surface`, removing the border is safe — surface color difference provides separation. If structural separation is needed, use `shadow-[0_1px_2px_rgba(0,0,0,0.04)]` for horizontal or `shadow-[1px_0_2px_rgba(0,0,0,0.04)]` for vertical.

---

## Phase 2: Resume Detail Editor Polish

### Step 2.1 — Convert SortableItem to neumorphic ✅

**File:** `src/app/components/resume/resume-detail.tsx`
- **Line 142:** `className="relative rounded-xs border border-border bg-background p-3"` → `className="relative rounded-xs neuro-inset p-3"`

### Step 2.2 — Convert TagInput to neumorphic ✅

**File:** `src/app/components/resume/resume-detail.tsx`
- **Line 93:** `className="flex min-h-[34px] flex-wrap items-center gap-1 rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] focus-within:border-primary"` → `className="flex min-h-[34px] flex-wrap items-center gap-1 rounded-xs neuro-inset px-2.5 py-1.5 text-[11px]"`
  - Remove `focus-within:border-primary` — the `.neuro-inset:focus-within` CSS handles focus.
  - The inner `<Input>` at line 102 already has `border-none bg-transparent ... focus-visible:ring-0` — keep as-is (it's inside the inset container).

### Step 2.3 — Convert DragOverlay to neumorphic ✅

**File:** `src/app/components/resume/resume-detail.tsx`
- **Line 254:** `className="rounded-xs border border-border bg-background p-3 shadow-[0_4px_16px_rgba(0,0,0,0.1)]"` → `className="rounded-xs neuro-card p-3 shadow-[0_4px_16px_rgba(0,0,0,0.1)]"`

### Step 2.4 — Convert custom section input container to neumorphic ✅

**File:** `src/app/components/resume/resume-detail.tsx`
- **Line 834:** `className="flex flex-col gap-2 rounded-xs border border-border bg-background p-3"` → `className="flex flex-col gap-2 rounded-xs neuro-inset p-3"`

### Step 2.5 — Add `neumorphic` prop to ALL editor form inputs ✅

**File:** `src/app/components/resume/resume-detail.tsx`

Add `neumorphic` prop to every `<Input>` and `<Textarea>` in the `renderEditorSection` callback and inline sections. The `neumorphic` prop goes as a boolean attribute. **Keep the existing className** (it overrides sizing/typography).

Specific lines (all in `renderEditorSection`):
- **Line 503:** `<Input value={name} ...>` → add `neumorphic`
- **Line 507:** `<Input value={persona} ...>` → add `neumorphic`
- **Line 513:** `<Input value={email} ...>` → add `neumorphic`
- **Line 517:** `<Input value={phone} ...>` → add `neumorphic`
- **Line 523:** `<Input value={location} ...>` → add `neumorphic`
- **Line 527:** `<Input value={github} ...>` → add `neumorphic`
- **Line 533:** `<Input value={role} ...>` → add `neumorphic`
- **Line 542:** `<Textarea value={summary} ...>` → add `neumorphic`
- **Line 564:** `<Input value={exp.company} ...>` → add `neumorphic`
- **Line 568:** `<Input value={exp.role} ...>` → add `neumorphic`
- **Line 573:** `<Input value={exp.dates} ...>` → add `neumorphic`
- **Line 577-582:** `<Textarea value={exp.bullets...} ...>` → add `neumorphic`
- **Line 600:** `<Input value={edu.institution} ...>` → add `neumorphic`
- **Line 604:** `<Input value={edu.degree} ...>` → add `neumorphic`
- **Line 610:** `<Input value={edu.field} ...>` → add `neumorphic`
- **Line 614:** `<Input value={edu.dates} ...>` → add `neumorphic`
- **Line 632:** `<Input value={proj.name} ...>` → add `neumorphic`
- **Line 636-641:** `<Textarea value={proj.description} ...>` → add `neumorphic`
- **Line 654:** `<Input value={proj.link} ...>` → add `neumorphic`
- **Line 673:** `<Input value={cert.name} ...>` → add `neumorphic`
- **Line 677:** `<Input value={cert.issuer} ...>` → add `neumorphic`
- **Line 682:** `<Input value={cert.date} ...>` → add `neumorphic`
- **Line 699:** `<Input value={lang.name} ...>` → add `neumorphic`
- **Line 729:** `<Input data-cs-id={csId} value={sec.title} ...>` → add `neumorphic`
- **Line 739-744:** `<Textarea placeholder="Enter each bullet..." ...>` → add `neumorphic`
- **Line 837:** `<Input ref={newCustomInputRef} ...>` → add `neumorphic`

### Step 2.6 — Clean up borders in resume-detail form area ✅

**File:** `src/app/components/resume/resume-detail.tsx`
- **Line 213:** `className="border-t border-border/50 pt-3"` → `className="pt-3"` (or use a subtle top shadow). The EditableList divider.
- **Line 805:** `className="relative border-t border-border/50 pt-3"` → `className="relative pt-3"`. The Add Section divider.
- **Line 833:** `className="border-t border-border/50 pt-3"` → `className="pt-3"`. Custom section divider.

---

## Phase 3: Rest of App — Neumorphic Consistency

### Step 3.1 — Cover Letter Editor inputs ✅

**File:** `src/app/components/resume/cover-letter-editor.tsx`
- **Line 201:** `<Input value={company} ...>` → add `neumorphic`
- **Line 210:** `<Input value={role} ...>` → add `neumorphic`
- **Line 219:** `<Textarea value={focus} ...>` → add `neumorphic`
- **Line 234:** `<Textarea value={jdText} ...>` → add `neumorphic`
- **Line 314:** `<Textarea value={letterText} ...>` → **DO NOT add neumorphic** (this is the paper content area with `border-0 bg-transparent`, it should stay flat as paper).
- **Line 150:** Panel border `border-b lg:border-b-0 lg:border-r border-border` → remove `border-border`, keep responsive border classes with `.neuro-divider` or remove entirely.
- **Line 257:** Actions bar `border-b border-border` → remove.
- **Line 311:** `border-b border-border/50` → remove (decorative divider on paper).

### Step 3.2 — ATS view borders ✅

**File:** `src/app/components/ats/ats-view.tsx`
- **Line 209:** `border-b md:border-b-0 md:border-r border-border` → remove `border-border`. The Textarea already has `neumorphic` (line 256) — good.
- **Line 366:** `border border-border/50` → remove or use shadow.

### Step 3.3 — Settings page inputs ✅

**File:** `src/app/[locale]/(app)/settings/page.tsx`
- Add `neumorphic` to all 7 `<Input>` components (lines 318, 339, 370, 402, 420, 437, 526).

### Step 3.4 — Interview setup inputs ✅

**File:** `src/app/components/interview/interview-setup.tsx`
- Add `neumorphic` to both `<Input>` components (lines 208, 216).

### Step 3.5 — Auth page inputs ✅

**Files:**
- `src/app/[locale]/(auth)/login/page.tsx` — 2 Inputs (lines 107, 129)
- `src/app/[locale]/(auth)/register/page.tsx` — 3 Inputs (lines 111, 125, 139)
- `src/app/[locale]/(auth)/forgot-password/page.tsx` — 1 Input (line 103)
- `src/app/[locale]/(auth)/reset-password/page.tsx` — 2 Inputs (lines 125, 140)

Add `neumorphic` to all of them. These auth pages should also have `neuro-surface` on their outer container if not already (check — most auth pages likely already use it or a similar surface).

### Step 3.6 — Logo enhancement (nice-to-have, low priority) ✅

**File:** `src/app/components/layout/navbar.tsx`
- **Lines 58-65:** Wrap the `<Image>` in a neumorphic icon well container:
```tsx
<div className="neuro-icon-well rounded-[3px] p-0.5">
  <Image src="/logo.png" alt="Job For Sure" width={sidebarCollapsed ? 20 : 24} height={sidebarCollapsed ? 20 : 24} className="shrink-0 transition-all duration-200" priority />
</div>
```
This makes the logo feel integrated with the neumorphic shell.

---

## Verification

```bash
# TypeScript check — must pass
npx tsc --noEmit

# Lint — must pass (warnings OK)
pnpm lint

# Build — must succeed
pnpm build
```

**Manual checks:**
1. Focus an input on the ATS page → neumorphic inset shadow STAYS VISIBLE with a purple focus ring stacked on top.
2. Focus a textarea with `neumorphic` prop → same behavior (inset stays + ring appears).
3. Focus the chat input textarea (NOT neumorphic) → no outline, no box-shadow (unchanged behavior).
4. No ⌘K palette button in navbar, no palette on ⌘K keypress.
5. No hard border lines between topbar/sidebar/main in light mode.
6. Toggle dark mode → borders reappear subtly, inputs look flat/elegant.
7. Resume editor: SortableItem cards look recessed (inset), inputs have neumorphic styling.

## File Size Compliance
All files being edited are existing components. No file exceeds 500 lines after edits (resume-detail.tsx is already ~1410 lines but we are only modifying className strings and adding `neumorphic` props — no new logic). No new files created.
