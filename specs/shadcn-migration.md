# Implementation Spec & Plan: shadcn/ui Migration (Finish Remaining Raw Elements)

---

### 0. Architectural Decision Record (ADR) & Scaling Tradeoffs

- **Context & Constraints**: The ui/ component suite in `src/app/components/ui/` already exists — built on `@base-ui/react` primitives with shadcn-style CVA variants. All Phase 2 variants (button), Phase 3D (Sheet/Dialog), and Phase 3E (DropdownMenu) are already done. 28 app files already import these components. The task's Phase 1 (`shadcn add`) would overwrite the working Base UI wrappers with Radix-based ones, breaking all importers (different APIs for Select, Dialog, Tabs, etc.). Decision: skip overwrite, proceed with **finishing the remaining raw elements** only.

- **Chosen Architecture**: Swap remaining raw `<button>`, `<input>`, `<textarea>`, and `<select>` HTML elements in page/component files to the existing `~/components/ui/Button`, `~/components/ui/Input`, `~/components/ui/Textarea`, and native `<select>` (Select ui component uses a complex Base UI Popup API — not a drop-in for simple `<select>` usage; migrate only where the Select component is a clear fit, leave styled `<select>` elements alone if they're in autocomplete/custom-combo contexts).

- **Discarded Alternatives**:
  - *Run `shadcn add`*: Overwrites all 19 working ui/ files with Radix-based versions. Would require fixing all 28 importers with different prop APIs (especially Select with `defaultValue`/`onValueChange`, Dialog `open`/`onOpenChange`, Tabs `value`/`onValueChange`). Huge risk, no user benefit.
  - *Migrate raw `<select>` to `<Select>` component*: The Base UI Select uses `SelectPrimitive.Root`, `SelectTrigger`, `SelectContent`, `SelectItem` etc. — a fundamentally different API from native `<select>`. The cover-letter page's `<select>` has simple `onChange={(e) => setSelectedResumeId(e.target.value)}` — refactoring would be disproportionate. **Keep styled native `<select>` elements intact; they are not hand-rolled buttons/inputs.**

---

### 1. Target Files & Folder Structure

Files to modify (raw `<button>`/`<input>`/`<textarea>` → ui components):

**Primary targets (high count):**
- `src/app/[locale]/(app)/settings/page.tsx` — 12 `<button>`, 7 `<input>`
- `src/app/[locale]/(app)/cover-letter/page.tsx` — 11 `<button>`, 3 `<input>`, 3 `<textarea>`
- `src/app/[locale]/(app)/resumes/page.tsx` — 7 `<button>`

**Auth pages (low count, consistent pattern):**
- `src/app/[locale]/(auth)/login/page.tsx` — 2 `<button>`, 2 `<input>`
- `src/app/[locale]/(auth)/register/page.tsx` — 2 `<button>`, 3 `<input>`
- `src/app/[locale]/(auth)/forgot-password/page.tsx` — 1 `<button>`, 1 `<input>`
- `src/app/[locale]/(auth)/reset-password/page.tsx` — 1 `<button>`, 2 `<input>`

**Component files (small / contextual):**
- `src/app/components/search/RoleAutocomplete.tsx` — 2 `<button>`, 1 `<input>` (careful: input needs `ref` / onKeyDown preserved; clear-button is icon-only ghost)
- `src/app/components/search/LocationAutocomplete.tsx` — 2 `<button>`, 1 `<input>`
- `src/app/components/interview/interview-summary.tsx` — 2 `<button>`
- `src/app/components/pipeline/job-notes.tsx` — 1 `<textarea>`
- `src/app/components/resume/templates/template-gallery.tsx` — 1 `<button>`
- `src/app/components/interview/interview-view.tsx` — 1 `<button>`
- `src/app/components/admin/source-health.tsx` — 1 `<button>`
- `src/app/[locale]/error.tsx` — 1 `<button>`
- `src/app/[locale]/(app)/error.tsx` — 1 `<button>`
- `src/app/[locale]/(app)/admin/error.tsx` — 1 `<button>`
- `src/app/global-error.tsx` — 1 `<button>`

**Skip (intentional):**
- `src/app/[locale]/(marketing)/pricing/page.tsx` — 3 `<button>` in pricing cards; these are `role="button"` link-style elements inside anchor wrappers — SKIP unless they're pure `<button>` not wrapping links (verify first before touching)
- `src/app/[locale]/(app)/settings/billing/page.tsx` — 3 `<button>` in billing; verify before touching
- `src/app/components/ui/textarea.tsx` — 1 `<textarea>` inside the Textarea ui component itself; do NOT touch

---

### 2. Import Definitions & Dependencies

All ui components are imported from their `~/components/ui/` paths:

```tsx
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
```

**Button component signature:**
```tsx
function Button({
  className, variant = "default", size = "default", ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>)
```
- Props are fully spread from `@base-ui/react/button` — accepts `onClick`, `disabled`, `type`, `aria-label`, `title`, all standard button attributes.
- `className` is merged with `cn(buttonVariants(...))` so any utility overrides still apply.

**Input component signature:**
```tsx
function Input({ className, type, ...props }: React.ComponentProps<"input">)
```
- Wraps `@base-ui/react/input`. Accepts `value`, `onChange`, `onKeyDown`, `onFocus`, `ref`, `placeholder`, `required`, `minLength`, `type`, `accept`, `readOnly` etc.
- Use `className` to add local overrides on top.

**Textarea component signature:**
```tsx
function Textarea({ className, ...props }: React.ComponentProps<"textarea">)
```
- Wraps native `<textarea>`. Accepts `value`, `onChange`, `rows`, `placeholder`, `readOnly` etc.

---

### 3. Database Schema Changes

None. This is a UI-only migration.

---

### 4. Step-by-Step Edits

> **Golden Rule**: Keep every `onClick`, `disabled`, `type`, `onChange`, `onKeyDown`, `value`, `placeholder`, `aria-label`, `title`, `ref` prop **exactly as-is**. Only the element tag + import changes.

> **Variant mapping guide**:
> - `bg-primary text-primary-foreground` → `variant="default"`
> - `border border-border bg-card hover:bg-muted` / `border border-border bg-background` → `variant="outline"`
> - `hover:bg-muted` / `hover:bg-accent-soft` / icon-only clear buttons / dismiss buttons → `variant="ghost"`
> - `bg-red-600` / `bg-destructive` → `variant="destructive"`
> - Toggle-style buttons in bg-border/30 pill (tab switcher pills, mode switchers) → Keep as raw `<button>` — they are **intentional styled tab pills**, NOT generic buttons. Do NOT convert them.
> - Saved letter list items that look like buttons → Keep as raw `<button>` since they have complex active-state className logic tied to `activeLetterId` state. Converting would add noise without benefit.
> - `size` hints: use `size="sm"` for px-2/py-1 patterns, `size="icon"` for h-10 w-10 icon-only buttons, `size="default"` for px-4 py-2+ patterns.

#### Step 1 — `settings/page.tsx`

Add to imports at top:
```tsx
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
```

**Toast dismiss button (line 44-50):** Replace `<button onClick={onClose} className="ml-2 cursor-pointer ...">` with:
```tsx
<Button variant="ghost" size="icon" onClick={onClose} className="ml-2 h-5 w-5 p-0 opacity-60 hover:opacity-100" aria-label="Dismiss">
```

**Tab nav buttons (lines 280-303):** These are deliberate tab underline pills (`border-b-2`). **Leave as raw `<button>` — they are nav tabs, not actions.**

**Profile tab — "Save" (name) button (line 320-326):**
```tsx
<Button
  onClick={handleUpdateName}
  disabled={savingName || name === user?.name}
  size="sm"
  className="rounded-sm text-xs px-3"
>
  {savingName ? <Loader2 size={13} className="animate-spin" /> : 'Save'}
</Button>
```

**Profile tab — "Update" (email) button (line 341-347):**
```tsx
<Button
  onClick={handleUpdateEmail}
  disabled={savingEmail || email === user?.email || !email.trim()}
  size="sm"
  className="rounded-sm text-xs px-3"
>
  {savingEmail ? <Loader2 size={13} className="animate-spin" /> : 'Update'}
</Button>
```

**Profile tab — "Save" (home location) button (line 371-377):**
```tsx
<Button
  onClick={handleSaveHomeLocation}
  disabled={savingHomeLocation}
  size="sm"
  className="shrink-0 rounded-sm text-xs px-3"
>
  {savingHomeLocation ? <Loader2 size={13} className="animate-spin" /> : 'Save'}
</Button>
```

**Profile tab — "Use my current location" link-button (line 379-386):**
```tsx
<Button
  variant="link"
  onClick={handleDetectLocation}
  disabled={detectingLocation}
  className="mt-2 flex items-center gap-1.5 text-[11px] h-auto p-0 disabled:opacity-50"
>
  {detectingLocation ? <Loader2 size={12} className="animate-spin" /> : <LocateFixed size={12} />}
  {detectingLocation ? 'Detecting…' : 'Use my current location'}
</Button>
```

**Password — Show/hide eye buttons (lines 401-406 and 416-421):** These are icon toggles inside `<div className="relative">`. Use ghost icon buttons:
```tsx
<Button
  variant="ghost"
  size="icon"
  onClick={() => setShowCurrent(!showCurrent)}
  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
  type="button"
>
  {showCurrent ? <EyeOff size={13} /> : <Eye size={13} />}
</Button>
```
Same pattern for the "new password" eye toggle.

**Password — "Change Password" submit button (line 430-436):**
```tsx
<Button
  onClick={handleChangePassword}
  disabled={changingPassword}
  size="sm"
  className="rounded-sm text-xs px-3"
>
  {changingPassword ? <Loader2 size={13} className="animate-spin" /> : 'Change Password'}
</Button>
```

**Theme toggle button (lines 455-461):**
```tsx
<Button
  variant="outline"
  onClick={toggle}
  size="sm"
  className="flex items-center gap-1.5 rounded-sm text-xs"
>
  {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
  Toggle
</Button>
```

**Notifications tab — toggle switches (lines 480-491):** These are CSS toggle-switch buttons (h-5 w-9 rounded-full). **Leave as raw `<button>` — they are styled toggle switches, not action buttons.**

**Danger zone — "Delete Account" button (lines 515-521):**
```tsx
<Button
  variant="destructive"
  onClick={handleDeleteAccount}
  disabled={confirmDelete !== 'DELETE' || deleting}
  size="sm"
  className="rounded-sm text-xs px-3"
>
  {deleting ? <Loader2 size={13} className="animate-spin" /> : 'Delete Account'}
</Button>
```

**Inputs (lines 314, 334, 364, 394, 409, 423, 509):** Replace all `<input className="...">` with `<Input className="...">` — preserve all attributes (`value`, `onChange`, `type`, `placeholder`, `onKeyDown`). Keep any className overrides for local sizing (`flex-1`, `rounded-sm`, `text-xs`) since `Input` component merges with `cn()`. For the danger zone input with `border-red-500/30` className, keep that too.

> IMPORTANT: The input at line 509 (danger zone "Type DELETE") has `border-red-500/30 bg-background focus:border-red-500/50` — keep these classNames on the `Input` component.

#### Step 2 — `cover-letter/page.tsx`

Add to imports:
```tsx
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
```

**Hidden file input (line 246-252):** Keep as `<input type="file" className="hidden" ...>` — do NOT wrap in `Input` component (file inputs need specific native behavior; `Input` uses `@base-ui/react/input` which may not forward file events properly).

**Resume selector `<select>` (lines 266-280):** Keep as native `<select>` — the shadcn `Select` component uses a completely different API (`SelectRoot`, `SelectTrigger`, `SelectContent`, `SelectItem`) and would require significant refactoring for minimal gain. **Skip this one.**

**Upload PDF `<button>` (lines 281-293):** → `variant="outline"` with same content:
```tsx
<Button
  variant="outline"
  onClick={() => fileInputRef.current?.click()}
  disabled={parsing}
  className="flex items-center gap-1 rounded-xs border-border text-[11px] font-medium text-muted-foreground disabled:opacity-50"
>
  {parsing ? <Loader2 size={12} className="animate-spin text-primary" /> : (<><Upload size={12} /> {t('uploadPdf')}</>)}
</Button>
```

**Mode selector buttons (lines 301-316) and Language selector buttons (lines 324-339):** These are **segmented control tab pills** (bg-border/30 container, conditional bg-card active state). **Leave as raw `<button>` — intentional tab pill UI, not generic actions.**

**Saved letters list buttons (lines 396-424):** These are styled list items with conditional border-primary active state. The inner Trash2 delete button (line 414-423) is a ghost icon. **Leave the outer list-item `<button>` as raw** (complex conditional classNames). **Convert the inner Trash2 button** to:
```tsx
<Button
  variant="ghost"
  size="icon"
  onClick={(e) => { e.stopPropagation(); setDeleteTarget(letter.id) }}
  className="shrink-0 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
  title="Delete"
>
  <Trash2 size={12} />
</Button>
```

**"Generate Cover Letter" main CTA button (lines 430-449):** → `variant="default"`:
```tsx
<Button
  onClick={handleGenerate}
  disabled={generating || selectedResumeId === 'none' || (mode === 'quick' && (!company || !role)) || (mode === 'jd' && !jdText)}
  className="w-full rounded-sm py-2 text-xs font-semibold tracking-wide uppercase active:scale-[0.98] shadow-sm mt-6"
>
  {generating ? (<><Loader2 size={13} className="animate-spin" /> Generating...</>) : (<><Wand2 size={13} /> Generate Cover Letter</>)}
</Button>
```

**"Save Letter" button (lines 460-466):** → `variant="outline"`:
```tsx
<Button
  variant="outline"
  onClick={handleSave}
  disabled={!letterText || selectedResumeId === 'none'}
  size="sm"
  className="flex items-center gap-1 rounded-sm text-[11px]"
>
  <Save size={11} /> Save Letter
</Button>
```

**"Copy Text" button (lines 467-473):** → `variant="outline"`:
```tsx
<Button
  variant="outline"
  onClick={handleCopy}
  disabled={!letterText}
  size="sm"
  className="flex items-center gap-1 rounded-sm text-[11px]"
>
  <Copy size={11} /> Copy Text
</Button>
```

**"Export PDF" button (lines 474-480):** → `variant="default"`:
```tsx
<Button
  onClick={() => window.open(`/api/export/pdf?id=${selectedResumeId}&type=cover-letter`, '_blank')}
  disabled={!letterText || selectedResumeId === 'none'}
  size="sm"
  className="flex items-center gap-1 rounded-sm text-[11px] font-medium"
>
  <Download size={11} /> Export PDF
</Button>
```

**Inputs (lines 348, 358) — company + role fields:** → `<Input>` with same className overrides.

**Textareas (lines 368-374, 380-386) — focus + jd fields:** → `<Textarea>` with `rows` and `className` preserved. Keep `resize-none`, `font-sans` classNames.

**Textarea (line 502-508) — cover letter editing area (inside paper):** This is a transparent, borderless editing textarea embedded in the paper card. Use `<Textarea>` but keep `bg-transparent border-0 outline-none resize-none focus:ring-0` classNames — these will override the component's base styles via `cn()`.

#### Step 3 — `resumes/page.tsx`

Add to imports:
```tsx
import { Button } from '~/components/ui/button'
```

**"New Resume" header button (lines 55-61):** → `variant="default"`:
```tsx
<Button
  onClick={() => setUploadModalOpen(true)}
  className="flex items-center gap-2 rounded-sm text-sm font-semibold active:scale-[0.98]"
>
  <Plus size={15} strokeWidth={2.5} />
  New Resume
</Button>
```

**"Create Resume" empty state button (lines 84-90):** → `variant="default"`:
```tsx
<Button
  onClick={() => setUploadModalOpen(true)}
  className="flex items-center gap-2 rounded-sm text-sm font-semibold"
>
  <Plus size={14} strokeWidth={2.5} />
  Create Resume
</Button>
```

**Variant list item buttons (lines 141-151):** These are `text-left text-xs text-muted-foreground hover:text-primary` nav-like buttons. → `variant="ghost"` with explicit size override:
```tsx
<Button
  key={v.id}
  variant="ghost"
  onClick={() => handleOpen(v.id)}
  className="flex items-center gap-1.5 text-left text-xs text-muted-foreground hover:text-primary h-auto p-0 w-full justify-start"
>
  <span className="text-[9px]">└</span>
  <span className="truncate">{v.variantLabel || v.name}</span>
  {v.score > 0 && <span className="ml-auto font-mono text-[10px] text-success shrink-0">{v.score}%</span>}
</Button>
```

**"Open" card footer button (lines 171-177):** → `variant="default"`:
```tsx
<Button
  onClick={() => handleOpen(resume.id)}
  size="sm"
  className="flex items-center gap-1.5 rounded-xs text-xs font-semibold active:scale-[0.98]"
>
  <ExternalLink size={11} />
  Open
</Button>
```

**"Tailor" ghost button (lines 179-186):** → `variant="ghost"`:
```tsx
<Button
  variant="ghost"
  onClick={() => handleOpen(resume.id)}
  size="sm"
  className="flex items-center gap-1 rounded-xs text-xs text-muted-foreground hover:bg-accent-soft hover:text-primary"
  title="Tailor this resume"
>
  <Zap size={11} />
  Tailor
</Button>
```

**Delete icon button (lines 187-193):** → `variant="ghost" size="icon"`:
```tsx
<Button
  variant="ghost"
  size="icon"
  onClick={() => setDeleteTarget({ id: resume.id, name: resume.name })}
  className="rounded-xs p-1.5 h-auto w-auto text-muted-foreground hover:bg-danger-soft hover:text-destructive"
  title="Delete resume"
>
  <Trash2 size={13} />
</Button>
```

**"New Resume" card button (lines 201-209):** This is a full-card dashed add button. → `variant="ghost"`:
```tsx
<Button
  variant="ghost"
  onClick={() => setUploadModalOpen(true)}
  className="flex min-h-[180px] w-full flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-border bg-card/50 text-muted-foreground hover:border-primary/50 hover:bg-accent-soft hover:text-primary h-auto"
>
  <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-border bg-background">
    <Plus size={18} strokeWidth={2} />
  </div>
  <span className="text-sm font-medium">New Resume</span>
</Button>
```

#### Step 4 — Auth pages (login, register, forgot-password, reset-password)

These four files follow the same pattern. For each:

Add imports:
```tsx
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
```

**Inputs** (`<input type="text/email/password">`) → `<Input type="...">` keeping `value`, `onChange`, `placeholder`, `required`, `minLength`, and `className`. Auth inputs use `rounded-md border border-border bg-background px-3 py-2 text-sm` — keep these as className overrides.

**Submit button** (type="submit") → `<Button type="submit" disabled={loading} className="w-full rounded-md text-sm font-medium active:scale-[0.98]">...</Button>`

**Google OAuth button** (type="button") → `<Button type="button" variant="outline" onClick={handleGoogle} className="w-full rounded-md border-border text-sm font-medium active:scale-[0.98]">...</Button>`

**forgot-password/page.tsx**: Check if it has a `handleResend` button too — convert same way.

**reset-password/page.tsx**: Has a password-visibility toggle button if present → `variant="ghost" size="icon"`.

#### Step 5 — Small component files

**`search/RoleAutocomplete.tsx`:**
- `<input>` at line 87 → `<Input>` keeping `type`, `value`, `onChange`, `onFocus`, `onKeyDown`, `placeholder`, `className`
- Clear button (line 101, absolute right-2) → `<Button variant="ghost" size="icon" onClick={...} className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 p-0 text-muted-foreground hover:text-foreground">` 
- Suggestion dropdown buttons (line 116-126): These are `block w-full px-3 py-1.5 text-left text-[11px]` list items → `<Button variant="ghost" onClick={...} className="block w-full px-3 py-1.5 text-left text-[11px] h-auto justify-start rounded-none">`

**`search/LocationAutocomplete.tsx`:** Same pattern as RoleAutocomplete.

**`components/interview/interview-summary.tsx`:** Inspect and convert 2 `<button>` to appropriate `<Button>` variants based on their look.

**`components/pipeline/job-notes.tsx`:** 1 `<textarea>` → `<Textarea>` with same className.

**`components/resume/templates/template-gallery.tsx`:** 1 `<button>` → `<Button variant="ghost">` or appropriate variant.

**`components/interview/interview-view.tsx`:** 1 `<button>` → `<Button>` appropriate variant.

**`components/admin/source-health.tsx`:** 1 `<button>` → `<Button>` appropriate variant.

**Error pages (`error.tsx`, `(app)/error.tsx`, `(app)/admin/error.tsx`, `global-error.tsx`):** Each has a "Try again" / "Reload" button → `<Button>` `variant="outline"` or `variant="default"`.

---

### 4.5 Vertical-Slice Order

Work file-by-file in this order (highest-impact first, minimizing intermediate broken states):
1. `settings/page.tsx` (12 buttons, 7 inputs) — self-contained, no shared state with other files
2. `cover-letter/page.tsx` (11 buttons, 3 inputs, 3 textareas)
3. `resumes/page.tsx` (7 buttons)
4. Auth pages batch: `login`, `register`, `forgot-password`, `reset-password` (small, identical patterns)
5. Small components batch: autocomplete, interview-summary, job-notes, template-gallery, interview-view, source-health, error pages

Run `npx tsc --noEmit && pnpm lint` after steps 1-3 complete, and again after step 5 completes.

---

### 5. Assertion & Testing Requirements

- **Unit Tests**: N/A — no behavior change. All onClick, state, props identical.
- **Integration Tests**: N/A — no API or multi-module contract changes.
- **E2E UI Tests**: N/A — markup swap only. Visual regression acceptable per task spec.

---

### 6. Verification Commands & Log Files

- **TypeScript check**: `npx tsc --noEmit` → 0 errors
- **Lint**: `pnpm lint` → 0 errors (or warnings only; no new errors)
- **Build**: `pnpm build` → exit 0
- **Server Log Location**: `pnpm build` output to stdout/stderr. If build fails, error appears in terminal with file + line.
- **Commit messages**: `chore: migrate raw buttons/inputs/textareas to shadcn ui components` per commit

---

### Additional Notes for Engineer

1. **DO NOT run `pnpm dlx shadcn@latest add ...`** — components already exist and are correctly configured. Running shadcn add would overwrite them.

2. **Import path is `~/components/ui/button`** (resolves to `src/app/components/ui/button`), NOT `@/components/ui/button`.

3. **className is always safe to add** — both `Button` and `Input` use `cn(baseVariants, className)` so your utility overrides take effect via tailwind-merge.

4. **`<button type="submit">` inside `<form>`**: The `Button` component uses `@base-ui/react/button` which renders as `<button>` by default — `type="submit"` works correctly.

5. **Do NOT push** per task rules.

6. **Append `.worklog.md`** after finishing.

7. **Selective non-conversions (intentional keeps)**:
   - CSS toggle-switch buttons (h-5 w-9 rounded-full) in Notifications tab
   - Tab-underline nav buttons (border-b-2) in Settings tab nav
   - Segmented control pills (bg-border/30 container) in cover-letter mode/language selectors
   - Saved letters list-item buttons with complex conditional className
   - The `<select>` in cover-letter (native select — too complex to convert to Base UI Select)
   - `<input type="file" className="hidden">` (file input — keep native)
   - The `<textarea>` inside `src/app/components/ui/textarea.tsx` itself
