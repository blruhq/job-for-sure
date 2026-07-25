# Implementation Spec & Plan — Production-Grade Neumorphic Form UX

> **Scope**: Make the resume editor forms (`/en/resume/[id]`) genuinely production-grade
> and accessible while **keeping** the neumorphism aesthetic. Inputs are currently
> borderless inset-shadow and nearly invisible; this spec reconciles "soft-UI look"
> with "actually usable, WCAG-compliant forms."
>
> **Evidence base**: `specs/research-form-ux.md`. Read it first — every decision below
> is derived from it.
>
> **Owner note**: Engineer implements; Reviewer validates against §6 (Definition of
> Done). Do not expand scope beyond the files listed in §1.

---

### 0. Architectural Decision Record (ADR) & Tradeoffs

**Context & Constraints.** The resume editor renders ~27 `neumorphic` inputs plus
repeatable sections, a skills `TagInput`, and an "Add Section" picker. The current
`neumorphic` prop swaps a bordered input for a borderless `.neuro-inset` (inset
box-shadow only). Measured against the actual surface `#ECEEF2`, the inset shadow
blends to ~`#CBCDD4` → **1.36:1 contrast**, failing WCAG 1.4.11 (needs 3:1). Worse,
fields sit *inside* `.neuro-inset` section containers (inset-on-inset), compounding
invisibility. Focus is also broken: `.neuro-inset:focus-visible` keeps only the shadow
(no ring) and `globals.css` globally strips textarea focus — failing WCAG 2.4.7.

**Chosen Architecture — "Hybrid Neumorphic" (DECISION).**
Keep the soft surface system (`.neuro-card` / `.neuro-inset`) for **containers**
(sections, panels, cards, the editor column). For **form controls** (inputs,
textareas, tag-input fields, picker triggers), switch to a *hybrid* treatment:
a crisp 1px border that provably clears 3:1, layered over a softened (lower-opacity)
inset shadow for tactile depth, plus the project's existing global 2px focus ring.

This is the only option the research supports: pure neumorphism is mathematically
incapable of passing 1.4.11 on light surfaces (a blurred shadow cannot form a
continuous 3:1 edge), and 100% of audited production form apps (LinkedIn, Indeed,
Reactive Resume, OpenResume, Linear) use bordered inputs. The hybrid keeps the
mascot/soft-UI brand intact *on the chrome* while making the actual data-entry
surfaces accessible.

**Discarded Alternatives.**
- *Alternative A — "True neumorphic inputs, just raise shadow opacity."* Rejected:
  reaching 3:1 needs ~`rgba(0,0,0,0.7)` at 0px blur, which *is* a solid border. There
  is no shadow-only path; pretending otherwise just produces a harsh, muddy edge.
- *Alternative B — "Abandon neumorphism entirely, use plain shadcn inputs everywhere."*
  Rejected by the user (they want to keep the aesthetic). Also unnecessary: the hybrid
  preserves the brand on containers while fixing only the controls.
- *Alternative C — "Floating labels to save space."* Rejected: research [4][7] shows
  floating labels add layout shift and placeholder-contrast risk in dense forms;
  top-aligned labels (already used here) are the production standard.

---

### 0. Architectural Decision Record (ADR) & Tradeoffs — ✅ Spec-complete

### 1. Target Files & Folder Structure

**Modify (exact paths):**
1. `src/app/globals.css` — token additions + fix the focus-override bugs + add a
   `.neuro-input` utility class (the hybrid control treatment). *No deletion of
   existing `.neuro-*` container classes.* ✅
2. `src/app/components/ui/input.tsx` — redefine what `neumorphic` emits (hybrid). ✅
3. `src/app/components/ui/textarea.tsx` — same redefinition as `input.tsx`. ✅
4. `src/app/components/resume/resume-detail.tsx` — `TagInput` container border;
   "Add Section" picker a11y + visibility; (call sites keep `neumorphic` prop — no
   per-site className churn needed once the prop is redefined). ✅

**Do NOT touch (out of scope, note only):**
- `src/app/components/resume/cover-letter-editor.tsx` (4 `neumorphic` usages) — will
  inherit the fix automatically via the redefined prop. No edits required.
- `src/app/components/resume/templates/template-gallery.tsx` — its `neumorphic` prop
  is a *card-selection* concern, not a form control; unrelated. Leave as-is.
- `src/app/components/ui/select.tsx` — `SelectTrigger` already uses a bordered
  treatment with a real focus ring; it is the reference pattern. No change needed
  except optionally aligning its border token to the new `--input-border` (see §3).

**File-size rule:** `input.tsx` (22 lines) and `textarea.tsx` (20 lines) stay tiny.
All visual logic lives in the `.neuro-input` CSS utility + tokens, not in JS className
strings. `resume-detail.tsx` is pre-existing at ~1418 lines; this spec adds **no** new
logic to it (only className/token-level edits inside `TagInput` and the picker), so it
does not grow meaningfully.

---

### 2. Import Definitions & Dependencies

No new dependencies. All changes use existing primitives:
- `cn` from `~/lib/utils` (already imported in `input.tsx` / `textarea.tsx`).
- Existing `@base-ui/react/input` (`InputPrimitive`) and native `<textarea>`.
- Existing `lucide-react` icons (`PlusCircle`, `X`) already imported in
  `resume-detail.tsx`.
- For the "Add Section" picker a11y (§4.4): prefer the project's existing menu/popover
  primitive. Check `src/components/ui/` for a `dropdown-menu.tsx` or use
  `@base-ui/react/menu`. If neither is wired, the minimum acceptable fix is manual
  `role="menu"` + `role="menuitem"` + `onKeyDown` (Arrow/Home/End/Escape) — see §5.

---

### 3. Token & CSS Changes (`globals.css`) ✅

This is the heart of the fix. All numbers are derived from the contrast math in
`specs/research-form-ux.md` §Q5.

#### 3.1 New / strengthened tokens (add to `:root`) ✅
```css
/* ── Form control borders — WCAG 1.4.11 compliant (≥3:1 on neuro surfaces) ── */
/* --neuro-surface #ECEEF2 has L=0.844 → border needs L ≤ 0.248 for 3:1.        */
/* #6B7280 (gray-500): L≈0.18 → ~3.8:1 ✓. Navy-tinted to match the mascot theme. */
--input-border: #6B7280;            /* REPLACES the failing #D0D5DD (~1.3:1)      */
--input-border-soft: #9499A8;       /* lighter, for non-neuro (white card) ctx;  */
                                    /* verify ≥3:1 against the surface it sits on */
--input-border-focus: var(--ring);  /* #D97706 amber-600 — L≈0.20 → ~3.5:1 ✓     */

/* Softer inset used INSIDE bordered controls (kept subtle — border does the work) */
--neuro-dark-input: rgba(16, 24, 40, 0.06);   /* was 0.15 — border now carries contrast */
--neuro-light-input: rgba(255, 255, 255, 0.10);
```
> **Note on `--input`**: the existing `--input: #D0D5DD` token (used by the *non*-
> neumorphic input branch and `SelectTrigger`) also fails 1.4.11 (~1.3:1). Rather than
> mutate `--input` (which other components may depend on for subtle dividers), introduce
> `--input-border` as the **control-boundary** token and point form controls at it.
> Engineer: grep for `border-input` usage; switch *form-control* borders to
> `--input-border`, leave decorative dividers on `--input`/`--border`.

#### 3.2 New utility class — `.neuro-input` (the hybrid control) ✅ (patch: layered + focus box-shadow removed)
Add near the existing `.neuro-inset` block. **Layered in `@layer components`** so Tailwind's `focus-visible:ring-3` utility (in `utilities` layer) can override shadow on focus. `:focus-visible`/`:focus-within` set `border-color` only — no `box-shadow` re-declaration, letting the ring utility take over. Structure:
```css
@layer components {
  .neuro-input {
    background-color: var(--neuro-surface-raised);
    border: 1px solid var(--input-border);
    box-shadow: inset 2px 2px 5px var(--neuro-dark-input),
                inset -2px -2px 5px var(--neuro-light-input);
    transition: border-color var(--motion-fast) var(--ease),
                box-shadow var(--motion-fast) var(--ease);
  }
  .neuro-input::placeholder { color: var(--muted-foreground); }
  .neuro-input:hover { border-color: var(--input-border-focus); }
  .neuro-input:focus-visible { border-color: var(--input-border-focus); } /* NO box-shadow */
  .neuro-input:focus-within { border-color: var(--input-border-focus); }  /* NO box-shadow */
  .neuro-input:disabled { opacity: 0.5; cursor: not-allowed; }
  .neuro-input[aria-invalid="true"] { border-color: var(--destructive); }

  .dark .neuro-input {
    background-color: var(--card);
    border-color: var(--input-border-soft);
    box-shadow: none;
  }
  .dark .neuro-input:focus-visible { border-color: var(--ring); }
  .dark .neuro-input:focus-within { border-color: var(--ring); }

  @media (prefers-reduced-motion: reduce) {
    .neuro-input { transition: none; }
  }
}
```

#### 3.3 Fix the focus-override bugs (REQUIRED — these are WCAG 2.4.7 violations) ✅
- **Delete / neutralize** the block at current lines ~473–476:
  ```css
  textarea:focus-visible:not(.neuro-inset) { outline: none !important; box-shadow: none !important; }
  ```
  This globally removes textarea focus. Replace with: textareas get the same
  `*:focus-visible` ring as everything else. (If the original intent was "no focus
  indicator on the *chat* textarea only", scope it to the chat inputbar via a class
  such as `.neuro-chat textarea`, not a global rule.)
- **Delete / neutralize** the `.neuro-inset:focus-visible` / `:focus-within` override
  at current lines ~526–531 **as applied to form controls**. The container variant
  (`.neuro-inset-container`) may keep its `:focus-within` shadow, but a standalone
  `.neuro-inset` used as an input must **not** suppress the global ring. Concretely:
  the new `.neuro-input` class (not `.neuro-inset`) is what form controls use, so the
  old `.neuro-inset:focus-visible` rule no longer affects inputs once §4.1 lands. Leave
  a code comment stating `.neuro-inset` is for **containers only**, never form controls.

---

### 4. Component-Level Changes

#### 4.1 `input.tsx` — redefine the `neumorphic` prop (hybrid) ✅
Keep the prop name (33 call sites — renaming is churn with no benefit). Change its
**output** from borderless `.neuro-inset` to the bordered `.neuro-input` hybrid.

Replace the `neumorphic ?` branch className with (approx):
```
"h-9 w-full min-w-0 rounded-md neuro-input px-3 py-2 text-base transition-shadow
 outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent
 file:text-sm file:font-medium file:text-foreground
 placeholder:text-muted-foreground
 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50
 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50
 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20
 md:text-sm"
```
Key changes vs. current: `neuro-inset` → `neuro-input`; add `h-9 px-3 py-2` (research
§Q4: 36–40px target height). **Focus mechanism**: mirror the existing *non-neumorphic*
branch exactly — `focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring`
(a Tailwind box-shadow ring). Do **not** rely on the global `*:focus-visible { outline }`
rule, because the `outline-none` utility's interaction with it is layer-order-dependent
and fragile. This keeps both branches consistent and unambiguous. (The `.neuro-input`
CSS in §3.2 still sets `border-color` on `:focus-visible` for the color shift; the
visible ring itself comes from these `focus-visible:ring-*` utilities.)
Add a JSDoc: `/** @deprecated name; now emits a WCAG-compliant hybrid soft input. Will be aliased to variant="soft" later. */`

#### 4.2 `textarea.tsx` — same redefinition as `input.tsx` ✅
Swap `neuro-inset` → `neuro-input`, add the same `focus-visible:border-[…]`, keep
`min-h-16` and `field-sizing-content`. Remove any reliance on the deleted global
textarea-focus-stripping rule.

#### 4.3 `resume-detail.tsx` — `TagInput` (lines ~79–121) ✅
The `TagInput` **container** (line ~93) is the field boundary; its inner `<Input>`
is (correctly) borderless/transparent. Today the container is `.neuro-inset` → fails
1.4.11.
- Change container class from `rounded-xs neuro-inset` → `rounded-md neuro-input`
  (so the container itself gets the 3:1 border + soft inset + focus-within ring).
- Add `focus-within` styling: the `.neuro-input` focus treatment should trigger when
  the inner input is focused. Add to `.neuro-input` CSS (§3.2): a
  `.neuro-input:focus-within` rule mirroring `:focus-visible` (border → amber). This
  satisfies 2.4.7 for the composite field.
- Inner `<Input>` keeps `border-none bg-transparent shadow-none` (no change) — it is
  not an independent field.

#### 4.4 `resume-detail.tsx` — "Add Section" picker (lines ~806–832) ✅
Two problems: (a) low-visibility `neuro-card` panel, (b) custom `<div>` with no
keyboard nav / ARIA.
- **Trigger button** (line ~809): `variant="outline"` + `border-dashed`. Ensure its
  border uses `--input-border` (not the failing `--border`). Keep dashed (it signals
  "add"). Verify ≥3:1.
- **Picker panel** (line ~817): replace `rounded-xs neuro-card shadow-lg` with
  `rounded-md neuro-card ring-1 ring-foreground/10 shadow-lg` (mirror the existing
  `SelectContent` treatment, which already does `ring-1 ring-foreground/10`). This
  gives a crisp menu boundary while staying on-brand soft.
- **A11y (minimum)**: add `role="menu"` to the panel and `role="menuitem"` to each
  option `<Button>`, plus `onKeyDown` handling: Arrow Up/Down to move focus,
  Home/End, Escape to close, Enter/Space to select. Auto-focus first item on open.
  **Preferred**: if `src/components/ui/dropdown-menu.tsx` (or a `@base-ui` Menu) is
  available, replace the custom div with it so roving tabindex + ARIA come free.
  Engineer: check availability first; fall back to manual roles only if no primitive
  exists.
- Close on outside-click (there is likely existing state `showAddSectionPicker`;
  add a click-away handler or an overlay).

---

### 5. Accessibility Checklist (Engineer MUST satisfy; Reviewer verifies)

- [ ] **1.4.11 Non-Text Contrast**: every input/textarea/tag-field/add-section trigger
  has a 1px boundary ≥3:1 against its actual surface. Verify with a contrast checker
  on both `--neuro-surface` (`#ECEEF2`) and `--neuro-surface-raised` (`#F5F6F8`).
- [ ] **2.4.7 Focus Visible**: tabbing through every field shows the 2px amber ring
  with 2px offset. **No** `outline:none` may suppress it on form controls. Textareas
  must show the ring (the global stripping rule is gone).
- [ ] **2.4.13 Focus Appearance (best practice)**: ring is ≥2px, ≥3:1 vs adjacent.
- [ ] **1.4.3 Text Contrast**: placeholder text uses `--muted-foreground` (`#667085`,
  ~4.6:1 on white) — already compliant; confirm it is not overridden to a lighter
  value anywhere in the editor.
- [x] **Labels**: every field has a programmatically-associated `<label>` (the code
  uses `<label className="label-mono">` siblings — confirm they reference the input
  via `htmlFor`/`id`, or wrap the input). TagInput's label must associate with the
  container (give the container `id` + label `htmlFor`). ✅ Added `id` prop to TagInput; `htmlFor="skills-input"` + `id="skills-input"` on Skills; `htmlFor="tech-stack-input"` + `id="tech-stack-input"` on Tech Stack.
- [ ] **Keyboard**: Tab order is logical; the Add Section picker is fully operable by
  keyboard (arrow/home/end/esc/enter); Enter submits tag in TagInput (already works).
- [ ] **ARIA**: invalid fields expose `aria-invalid`; the picker exposes
  `role="menu"`/`menuitem` and `aria-expanded` on the trigger.
- [ ] **Reduced motion**: the `transition` on `.neuro-input` is ≤200ms (already
  `--motion-fast`); honor `prefers-reduced-motion` by dropping transitions (add a
  `@media (prefers-reduced-motion: reduce)` guard).
- [ ] **Dark mode**: inputs render with a visible border and ring (no all-flat
  regression). Verify the `.dark .neuro-input` rules.

---

### 6. Definition of Done (Reviewer)

The implementation is **APPROVED** when **all** are true:
1. `npx tsc --noEmit` passes; `pnpm lint` passes.
2. On `/en/resume/[id]` (light mode): every input, textarea, the Skills TagInput, the
   Tech-Stack TagInput, the custom-section title field, and the "Add Section" trigger
   are **clearly visible at rest** — a crisp border defines each control. No more
   "invisible input" reports.
3. Tabbing through the editor shows a **2px amber focus ring with a 2px gap** on every
   control, including textareas and the TagInput composite field.
4. A contrast checker confirms ≥3:1 for each control's border against its surface, in
   **both** light and dark mode.
5. The "Add Section" picker opens/closes via keyboard, options are arrow-navigable,
   Escape closes it, and the panel has a visible boundary (`ring-1`).
6. The global textarea-focus-stripping rule (former lines ~473–476) is removed or
   scoped to the chat inputbar only.
7. `prefers-reduced-motion` disables the input border/shadow transitions.
8. No regression in the chat inputbar (`.neuro-chat`) styling — it is a separate,
   intentionally borderless surface and must remain unchanged.
9. `cover-letter-editor.tsx` inputs (which inherit the redefined prop) now render the
   hybrid treatment with no extra edits.

---

### 7. Verification Commands & Log Locations

- **Type check**: `npx tsc --noEmit`
- **Lint**: `pnpm lint`
- **Build**: `pnpm build`
- **Manual a11y**: `pnpm dev`, open `/en/resume/[id]`, run browser DevTools →
  Lighthouse (Accessibility ≥ 95, no "color-contrast" or "focusable" failures on form
  controls) AND axe DevTools extension (0 violations on the editor form).
- **Logs**: build/lint output to stdout/stderr; runtime errors in the browser console
  and the Next.js terminal where `pnpm dev` is running.

---

### 8. Out of Scope / Future Work (do NOT do now)

- Renaming the `neumorphic` prop to `variant="soft"` across 33 sites (YAGNI; the
  redefined output is strictly better; rename can be a later cleanup).
- Redesigning repeatable-section collapse/expand behavior (research §Q4 suggests
  collapsible summary cards, but that is a larger UX change — separate spec).
- Reworking `cover-letter-editor.tsx` beyond what the prop redefinition fixes for free.
- Touching the PDF preview / templates / chat inputbar.
