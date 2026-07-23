# Implementation Spec & Plan: Migrate Hand-Rolled UI to shadcn/ui

### 0. Architectural Decision Record (ADR) & Scaling Tradeoffs

- **Context & Constraints**: The project has a `components.json` configured for shadcn (style: `base-nova`, baseColor: `neutral`, cssVariables: true) but almost no shadcn components installed. All UI is hand-rolled with raw `<button>`, `<input>`, `<select>`, `<textarea>`, and custom fixed-position overlays. This causes visual inconsistency and maintenance burden. The project already has `@base-ui/react` installed and uses it for menus in navbar/user-menu/tooltip. The CSS tokens in `globals.css` already define all shadcn semantic variables (`--primary`, `--border`, `--background`, etc.) and the `@theme inline` block bridges them to Tailwind utilities.
- **Chosen Architecture**: Install shadcn/ui primitives into `src/app/components/ui/` (alias `~/components/ui`). The `base-nova` style may produce base-ui-backed components; if it fails, fall back to `--style neutral` (Radix-backed). Either way, the component API surface is identical (compound components with the same prop names). Migrate all raw HTML elements to shadcn primitives, preserving every `onClick`, state variable, prop, and behavior exactly. This is a pure markup refactor — zero functional changes.
- **Discarded Alternatives**:
  - *Alternative A*: Keep hand-rolled components and just normalize their styles. Rejected — no consistency guarantee, duplicated effort, no accessibility primitives (focus trap, ARIA, keyboard nav).
  - *Alternative B*: Build a custom component library from scratch. Rejected — YAGNI, shadcn already provides everything needed with the right tokens.

---

### 1. Target Files & Folder Structure

**New files (shadcn primitives — created by CLI):**
- `src/app/components/ui/button.tsx`
- `src/app/components/ui/input.tsx`
- `src/app/components/ui/textarea.tsx`
- `src/app/components/ui/select.tsx`
- `src/app/components/ui/dialog.tsx`
- `src/app/components/ui/sheet.tsx`
- `src/app/components/ui/dropdown-menu.tsx`
- `src/app/components/ui/alert-dialog.tsx`
- `src/app/components/ui/badge.tsx`
- `src/app/components/ui/separator.tsx`
- `src/app/components/ui/scroll-area.tsx`
- `src/app/components/ui/tabs.tsx`
- `src/app/components/ui/label.tsx`
- `src/app/components/ui/avatar.tsx`

**Files to modify (migration targets — organized by phase):**

Phase 3A (Buttons):
- `src/app/components/resume/resume-detail.tsx` (27 buttons)
- `src/app/components/pipeline/applications-view.tsx` (7 buttons)
- `src/app/components/resume/job-search-panel.tsx` (8 buttons)
- `src/app/components/resume/cover-letter-editor.tsx` (9 buttons)
- `src/app/components/interview/interview-setup.tsx` (7 buttons)
- `src/app/components/ats/ats-view.tsx` (7 buttons)
- `src/app/components/pipeline/job-detail-panel.tsx` (7 buttons)
- `src/app/components/chat/chat-view.tsx` (10 buttons)
- `src/app/components/chat/job-preview.tsx` (8 buttons)
- `src/app/components/interview/interview-session.tsx` (6 buttons)
- `src/app/components/resume/tailor-review-panel.tsx` (5 buttons)
- `src/app/components/layout/navbar.tsx` (3 buttons)
- `src/app/components/layout/upload-modal.tsx` (3 buttons)
- `src/app/components/chat/paste-jd-modal.tsx` (3 buttons)
- `src/app/components/chat/build-wizard.tsx` (4 buttons)
- `src/app/components/resume/resume-copilot.tsx` (3 buttons)
- `src/app/components/pipeline/smart-overview.tsx` (3 buttons)
- `src/app/components/pipeline/area-intelligence.tsx` (6 buttons)
- `src/app/components/ui/confirm-dialog.tsx` (2 buttons)
- `src/app/components/ui/upgrade-modal.tsx` (4 buttons)
- `src/app/components/chat/upload-card-message.tsx` (4 buttons)
- `src/app/[locale]/(app)/resumes/page.tsx` (7 buttons)
- `src/app/[locale]/(app)/settings/page.tsx` (12 buttons)
- `src/app/[locale]/(app)/cover-letter/page.tsx` (11 buttons)
- `src/app/[locale]/(app)/settings/billing/page.tsx` (3 buttons)
- `src/app/[locale]/(marketing)/pricing/page.tsx` (3 buttons)
- `src/app/components/dashboard/dashboard-view.tsx` (2 buttons)
- `src/app/components/interview/interview-summary.tsx` (2 buttons)
- `src/app/components/search/RoleAutocomplete.tsx` (2 buttons)
- `src/app/components/search/LocationAutocomplete.tsx` (2 buttons)
- Auth pages: `src/app/[locale]/(auth)/login/page.tsx`, `register/page.tsx`, `reset-password/page.tsx`, `forgot-password/page.tsx`

Phase 3B (Inputs/Textareas):
- `src/app/components/resume/resume-detail.tsx` (23 inputs, 4 textareas)
- `src/app/[locale]/(app)/settings/page.tsx` (7 inputs)
- `src/app/components/pipeline/applications-view.tsx` (4 inputs)
- `src/app/components/resume/job-search-panel.tsx` (3 inputs)
- `src/app/[locale]/(auth)/register/page.tsx` (3 inputs)
- `src/app/[locale]/(app)/cover-letter/page.tsx` (3 inputs, 3 textareas)
- `src/app/components/resume/cover-letter-editor.tsx` (2 inputs, 3 textareas)
- `src/app/components/interview/interview-setup.tsx` (2 inputs)
- `src/app/components/chat/upload-card-message.tsx` (2 inputs)
- `src/app/components/chat/build-wizard.tsx` (2 inputs)
- `src/app/components/ats/ats-view.tsx` (2 inputs, 1 textarea)
- `src/app/[locale]/(auth)/login/page.tsx` (2 inputs)
- `src/app/[locale]/(auth)/reset-password/page.tsx` (2 inputs)
- `src/app/components/pipeline/job-notes.tsx` (1 textarea)
- `src/app/components/interview/interview-session.tsx` (1 textarea)
- `src/app/components/chat/paste-jd-modal.tsx` (1 textarea)
- `src/app/components/search/RoleAutocomplete.tsx` (1 input)
- `src/app/components/search/LocationAutocomplete.tsx` (1 input)
- `src/app/components/resume/resume-copilot.tsx` (1 input)
- `src/app/components/pipeline/area-intelligence.tsx` (1 input)
- `src/app/components/chat/chat-view.tsx` (1 input)

Phase 3C (Selects):
- `src/app/components/interview/interview-setup.tsx` (2 selects)
- `src/app/components/chat/chat-view.tsx` (2 selects)
- `src/app/components/resume/resume-detail.tsx` (1 select)
- `src/app/components/pipeline/job-detail-panel.tsx` (1 select)
- `src/app/components/pipeline/applications-view.tsx` (1 select)
- `src/app/components/ats/ats-view.tsx` (1 select)
- `src/app/[locale]/(app)/cover-letter/page.tsx` (1 select)

Phase 3D (Drawers/Dialogs):
- `src/app/components/pipeline/job-detail-panel.tsx` → Sheet
- `src/app/components/layout/upload-modal.tsx` → Dialog
- `src/app/components/chat/paste-jd-modal.tsx` → Dialog
- `src/app/components/ui/confirm-dialog.tsx` → AlertDialog
- `src/app/components/ui/upgrade-modal.tsx` → Dialog

Phase 3E (Dropdown Menus):
- `src/app/components/layout/navbar.tsx` (LanguageSwitcher)
- `src/app/components/layout/user-menu.tsx`

---

### 2. Import Definitions & Dependencies

**Path aliases (from tsconfig.json):**
- `~/*` → `./src/app/*` (so `~/components/ui/button` = `src/app/components/ui/button.tsx`)
- `@/*` → `./src/*`
- `~/lib/utils` = `src/app/lib/utils.ts` (exports `cn()`)

**shadcn import paths to use in all migrated files:**
```tsx
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '~/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '~/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '~/components/ui/sheet'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '~/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '~/components/ui/alert-dialog'
import { Badge } from '~/components/ui/badge'
import { Label } from '~/components/ui/label'
import { Separator } from '~/components/ui/separator'
```

**Existing utility already available:** `cn()` from `~/lib/utils` (clsx + tailwind-merge).

**Packages that shadcn CLI will auto-install:** `class-variance-authority`, and either `@radix-ui/react-*` (if `--style neutral` fallback) or base-ui equivalents (if `base-nova` works). The CLI handles this automatically.

---

### 3. Database Schema Changes

**N/A** — Pure UI refactor, no database changes.

---

### 4. Step-by-Step Edits

#### PHASE 1: Install shadcn/ui Components

**Step 1.1**: Run the installation commands. Try `base-nova` style first (it's in components.json):

```bash
pnpm dlx shadcn@latest add button input textarea select dialog sheet dropdown-menu alert-dialog badge separator scroll-area tabs label avatar
```

If the above fails or produces errors related to the `base-nova` style, run individually with fallback:
```bash
pnpm dlx shadcn@latest add button --style neutral
pnpm dlx shadcn@latest add input --style neutral
# ... etc for each component
```

If `pnpm dlx` doesn't work, use `npx shadcn@latest add <component>`.

**Step 1.2**: Verify all components landed in `src/app/components/ui/`. Check with `ls src/app/components/ui/`. Expected new files: `button.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`, `dialog.tsx`, `sheet.tsx`, `dropdown-menu.tsx`, `alert-dialog.tsx`, `badge.tsx`, `separator.tsx`, `scroll-area.tsx`, `tabs.tsx`, `label.tsx`, `avatar.tsx`.

**Step 1.3**: Run `npx tsc --noEmit` to verify no type errors from the new components. If the installed components import from packages not yet installed, run `pnpm install` first.

**Step 1.4**: Commit:
```bash
git add -A && git commit -m "feat: install shadcn/ui component primitives"
```

---

#### PHASE 2: Configure Button Variants

**Step 2.1**: Open `src/app/components/ui/button.tsx`. The shadcn CLI generated a `buttonVariants` cva config. Update it to match the project's usage patterns. Replace the `cva` config with:

```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-border bg-card hover:bg-accent-soft hover:text-accent-foreground",
        secondary: "bg-muted text-foreground hover:bg-muted/80",
        ghost: "hover:bg-accent-soft hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

> **IMPORTANT**: If the generated button already has similar variants from `base-nova`, just ensure all 6 variants and 4 sizes above exist. The `cursor-pointer` class must be in the base string (the project uses it everywhere). Keep the `cn()` merge function so extra classNames passed via `className` prop are merged correctly.

**Step 2.2**: The Button component must accept `type` prop (default `"button"`). If the generated component doesn't forward `type`, add it:
```tsx
const Button = React.forwardRef<
  React.ComponentRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot> & {
    variant?: VariantProps<typeof buttonVariants>["variant"]
    size?: VariantProps<typeof buttonVariants>["size"]
  }
>(({ className, variant, size, type = "button", ...props }, ref) => (
  <Comp
    className={cn(buttonVariants({ variant, size, className }))}
    ref={ref}
    type={type}
    {...props}
  />
))
```

**Step 2.3**: Run `npx tsc --noEmit`. Fix any errors.

---

#### PHASE 3A: Migrate Buttons → shadcn Button

**MIGRATION PATTERN** (memorize this — apply to EVERY raw `<button>`):

1. Add import at top of file (if not already present):
   ```tsx
   import { Button } from '~/components/ui/button'
   ```

2. Classify each `<button>` by its className and map to a variant:

   | Pattern in className | Use variant |
   |----------------------|-------------|
   | `bg-primary text-primary-foreground` (or `text-white` + `bg-primary`) | `variant="default"` |
   | `bg-red-600` or `bg-destructive` or `hover:text-red-500` destructive intent | `variant="destructive"` |
   | `border border-border` + `bg-card` or `bg-background` | `variant="outline"` |
   | `bg-muted` or `bg-secondary` | `variant="secondary"` |
   | No border, no bg, just hover (`hover:bg-muted`, `hover:bg-background`, `hover:text-foreground`) | `variant="ghost"` |
   | `text-primary` + underline pattern | `variant="link"` |

3. **Conversion rule**: Replace `<button onClick={...} className="...bg-primary text-white...">` with `<Button variant="default" onClick={...} className="...">`. **Keep all non-base styles** in className (spacing, sizing, icons, text size). **Remove** only the redundant base styles that the variant already provides (e.g., `bg-primary`, `text-primary-foreground`, `rounded-md`, `cursor-pointer`). If unsure, keep the className — `cn()` with `tailwind-merge` will deduplicate.

4. **CRITICAL**: Keep EVERY prop: `onClick`, `disabled`, `type`, `title`, `aria-label`, `ref`, `onMouseEnter`, etc. These must be identical.

5. **Self-closing tags**: `<button onClick={...} className="..." />` → `<Button variant="..." onClick={...} className="..." />`.

6. **Special cases — do NOT convert these buttons**:
   - Buttons that are actually `@base-ui/react` `Menu.Trigger` or `Menu.Item` — leave for Phase 3E.
   - Buttons inside `<TagInput>` that remove tags with `<X>` icon — these are tiny inline icon buttons; convert them to `<Button variant="ghost" size="icon" className="...">` but keep the tiny sizing classes.
   - Drag handles (with `{...attributes} {...listeners}` spread) — convert to `<Button variant="ghost" size="icon" className="..." {...attributes} {...listeners}>`.
   - The native file `<input type="file">` in upload-modal — leave as raw `<input>` (semantically necessary).

**File-by-file instructions:**

**`src/app/components/resume/resume-detail.tsx`** (27 buttons, 23 inputs, 4 textareas, 1 select — LARGEST FILE):
- This file has the most elements. Work methodically top-to-bottom.
- Line ~93: tag remove button → `<Button variant="ghost" size="icon" className="ml-0.5 rounded-full hover:bg-primary/20">`
- Line ~141: drag handle button → `<Button variant="ghost" size="icon" className="absolute left-1.5 top-1/2 -translate-y-1/2 cursor-grab ..." {...attributes} {...listeners}>`
- Line ~211: "Add" button in EditableList → `<Button variant="outline" size="sm" className="flex items-center gap-0.5 rounded-xs px-1.5 py-0.5 text-[10px]">`
- Line ~235: remove item button → `<Button variant="ghost" size="icon" className="cursor-pointer rounded-xs p-0.5 hover:text-red-500">`
- Line ~287: section suggestion buttons → `<Button variant="outline" size="sm" className="flex items-center gap-1 rounded-xs px-2 py-1 text-[10px]">`
- Line ~297: dismiss button → `<Button variant="ghost" className="rounded-xs px-2 py-1 text-[10px]">`
- Line ~336: section drag handle → `<Button variant="ghost" size="icon" className="mt-1.5 shrink-0 cursor-grab ..." {...attributes} {...listeners}>`
- Line ~349: visibility toggle → `<Button variant="ghost" size="icon" className="mt-1.5 shrink-0 ...">`
- Line ~744: delete custom section → `<Button variant="ghost" size="icon" className="absolute right-0 top-0 ...">`
- Line ~801: "Add Section" button → `<Button variant="outline" className="flex items-center gap-1 rounded-xs border-dashed px-3 py-2 text-[11px] w-full justify-center">`
- Line ~811: section picker items → `<Button variant="ghost" className="flex w-full items-center gap-2 px-3 py-2 text-[11px] text-left">`
- Line ~844: "Add" (custom section) → `<Button variant="default" className="rounded-xs px-3 py-1.5 text-[11px]">`
- Line ~852: "Cancel" → `<Button variant="outline" className="rounded-xs px-2 py-1.5 text-[11px]">`
- Line ~1083: "Back to Chat" link → `<Button variant="link" className="ml-2 text-primary">` (keep onClick)
- Line ~1127: "Back" button → `<Button variant="outline" size="sm" className="flex shrink-0 items-center gap-1 rounded-sm px-2 py-1 text-[11px]">`
- Line ~1135: tab buttons — these are custom tab styling; convert to `<Button variant="ghost" className={cn("shrink-0 rounded-xs px-3 py-1 text-[11px]", tab === t ? "bg-card text-foreground shadow-sm font-semibold" : "text-muted-foreground")}>` (keep the cn conditional)
- Line ~1154: "Delete" button → `<Button variant="outline" size="sm" className="flex items-center gap-1 rounded-sm px-2 py-1 text-[11px] hover:text-red-500 hover:border-red-500/30">`
- Line ~1178: template selector → `<Button variant="outline" size="sm" className="flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-[11px]">`
- Line ~1186-1187: export buttons → `<Button variant="ghost" className="rounded-sm px-2 py-1 text-[11px]">`
- Also migrate inputs (23) → `<Input>`, textareas (4) → `<Textarea>`, select (1, line ~699) → shadcn Select.
  - Input pattern: `<input value={...} onChange={...} className="w-full rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-primary" />` → `<Input value={...} onChange={...} className="w-full rounded-xs px-2.5 py-1.5 text-[11px]" />` (shadcn Input already has border + bg + focus styles)
  - Textarea pattern: `<textarea ... className="w-full resize-y rounded-xs border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:border-primary" />` → `<Textarea ... className="w-full resize-y rounded-xs px-2.5 py-1.5 text-[11px]" />`
  - Select (proficiency, line ~699): convert to compound:
    ```tsx
    <Select value={lang.proficiency} onValueChange={(v) => update({ ...lang, proficiency: v })}>
      <SelectTrigger className="w-full rounded-xs px-2 py-1 text-[11px]">
        <SelectValue placeholder="Select..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Basic">Basic</SelectItem>
        <SelectItem value="Conversational">Conversational</SelectItem>
        <SelectItem value="Professional">Professional</SelectItem>
        <SelectItem value="Fluent">Fluent</SelectItem>
        <SelectItem value="Native">Native</SelectItem>
      </SelectContent>
    </Select>
    ```
  - **TagInput inner input** (line ~98): This is a special inline input inside a tag wrapper. Convert to `<Input>` but keep the borderless styling: `<Input ref={inputRef} value={input} onChange={...} onKeyDown={...} onBlur={addTag} placeholder={...} className="min-w-[80px] flex-1 border-none bg-transparent text-[11px] shadow-none focus-visible:ring-0" />`
  - **New custom title input** (line ~832): `<Input ref={newCustomInputRef} value={newCustomTitle} onChange={...} onKeyDown={...} placeholder="..." className="flex-1 rounded-xs px-2.5 py-1.5 text-[11px]" autoFocus />`

> **NOTE**: This file is the hardest. After editing, run `npx tsc --noEmit` immediately.

**`src/app/components/pipeline/job-detail-panel.tsx`** (7 buttons, 1 select):
- Line ~240: close button → `<Button variant="ghost" size="icon" className="rounded-sm p-1" onClick={onClose} aria-label="Close">`
- Line ~436-459: AI tool buttons (Tailor, Cover Letter, ATS, Interview) → `<Button variant="secondary" className="flex items-center justify-center gap-1.5 rounded-xs px-3 py-2.5 text-sm" onClick={...}>`
- Line ~465: "Save to Tracker" → `<Button variant={isSaved ? "default" : "outline"} className="flex flex-1 items-center justify-center gap-2 rounded-xs h-11 text-sm font-semibold" onClick={onSaveToTracker}>`
- Line ~479: "Apply" → `<Button variant="default" className="flex flex-1 items-center justify-center gap-2 rounded-xs h-11 text-sm font-semibold" onClick={handleApply}>`
- Select (line ~303): status dropdown → convert to shadcn Select compound (see resume-detail pattern above). Use `onValueChange` instead of `onChange`.
- **ALSO**: This file is a custom fixed-position slide-over drawer. See Phase 3D for Sheet migration (do both button + sheet migration together for this file).

**`src/app/components/pipeline/applications-view.tsx`** (7 buttons, 4 inputs, 1 select):
- Convert all 7 buttons using the pattern. Most are action/filter buttons.
- Convert 4 inputs → `<Input>`.
- Convert 1 select → shadcn Select compound.

**`src/app/components/resume/job-search-panel.tsx`** (8 buttons, 3 inputs):
- Convert all buttons. Search/filter buttons.
- Convert 3 inputs → `<Input>`.

**`src/app/components/resume/cover-letter-editor.tsx`** (9 buttons, 2 inputs, 3 textareas):
- Convert all buttons (regenerate, tone selector, export, save, etc.).
- Convert 2 inputs → `<Input>`.
- Convert 3 textareas → `<Textarea>`.

**`src/app/components/interview/interview-setup.tsx`** (7 buttons, 2 inputs, 2 selects):
- Convert all buttons.
- Convert 2 inputs → `<Input>`.
- Convert 2 selects → shadcn Select compound.

**`src/app/components/ats/ats-view.tsx`** (7 buttons, 2 inputs, 1 textarea, 1 select):
- Convert all buttons.
- Convert 2 inputs → `<Input>`.
- Convert 1 textarea → `<Textarea>`.
- Convert 1 select → shadcn Select compound.

**`src/app/components/chat/chat-view.tsx`** (10 buttons, 1 input, 2 selects):
- Convert all buttons (send, attach, clear, etc.).
- Convert 1 input → `<Input>` (if not inside an agent-elements component).
- Convert 2 selects → shadcn Select compound.
- **CAUTION**: This file may use agent-elements InputBar. Only convert raw `<button>`/`<input>`/`<select>` that are NOT part of agent-elements. Check imports — if the element comes from `@/components/agent-elements/*`, leave it alone.

**`src/app/components/chat/job-preview.tsx`** (8 buttons):
- Convert all buttons.

**`src/app/components/interview/interview-session.tsx`** (6 buttons, 1 textarea):
- Convert all buttons.
- Convert 1 textarea → `<Textarea>`.

**`src/app/components/resume/tailor-review-panel.tsx`** (5 buttons):
- Convert all buttons.

**`src/app/components/layout/navbar.tsx`** (3 buttons):
- Line ~82: sidebar toggle → `<Button variant="ghost" size="icon" className="ml-1 h-[30px] w-[30px]" onClick={toggleSidebar}>`
- Line ~93: command palette trigger → `<Button variant="outline" className="hidden sm:flex items-center gap-2 rounded-md px-3 py-1.5 text-sm" onClick={...}>`
- Line ~108: theme toggle → `<Button variant="ghost" size="icon" className="relative h-[30px] w-[30px]" onClick={toggle}>`
- **LanguageSwitcher** uses `@base-ui/react/menu` — migrate in Phase 3E.

**`src/app/components/layout/upload-modal.tsx`** (3 buttons):
- Line ~117: close button → `<Button variant="ghost" size="icon" className="rounded-sm p-1" onClick={...}>`
- Line ~129: drag-drop zone button → keep as `<Button variant="ghost" className="w-full rounded-lg border-2 border-dashed p-8 text-center" onClick={...} onDragOver={...} onDragLeave={...} onDrop={...} disabled={parsing}>` (keep all drag handlers)
- Line ~167: "Build with AI" → `<Button variant="ghost" className="w-full flex items-center gap-3 rounded-lg border p-4 text-left" onClick={...}>`
- **ALSO**: migrate custom overlay to Dialog (see Phase 3D).
- **Hidden file input** (line ~183): leave as raw `<input type="file">`.

**`src/app/components/chat/paste-jd-modal.tsx`** (3 buttons, 1 textarea):
- Convert buttons + textarea.
- **ALSO**: migrate custom overlay to Dialog (see Phase 3D).

**`src/app/components/chat/build-wizard.tsx`** (4 buttons, 2 inputs):
- Convert buttons + inputs.

**`src/app/components/resume/resume-copilot.tsx`** (3 buttons, 1 input):
- Convert buttons + input.

**`src/app/components/pipeline/smart-overview.tsx`** (3 buttons):
- Convert buttons.

**`src/app/components/pipeline/area-intelligence.tsx`** (6 buttons, 1 input):
- Convert buttons + input.

**`src/app/components/chat/upload-card-message.tsx`** (4 buttons, 2 inputs):
- Convert buttons + inputs.

**`src/app/components/dashboard/dashboard-view.tsx`** (2 buttons):
- Convert buttons.

**`src/app/components/interview/interview-summary.tsx`** (2 buttons):
- Convert buttons.

**`src/app/components/search/RoleAutocomplete.tsx`** (2 buttons, 1 input):
- Convert buttons. Convert input → `<Input>`.
- **CAUTION**: Autocomplete inputs may have special `ref`/`onKeyDown`/`onChange` behavior. Keep ALL props.

**`src/app/components/search/LocationAutocomplete.tsx`** (2 buttons, 1 input):
- Same as RoleAutocomplete.

**Page files:**
- `src/app/[locale]/(app)/resumes/page.tsx` (7 buttons) — convert all.
- `src/app/[locale]/(app)/settings/page.tsx` (12 buttons, 7 inputs) — convert all.
- `src/app/[locale]/(app)/cover-letter/page.tsx` (11 buttons, 3 inputs, 3 textareas, 1 select) — convert all.
- `src/app/[locale]/(app)/settings/billing/page.tsx` (3 buttons) — convert all.
- `src/app/[locale]/(marketing)/pricing/page.tsx` (3 buttons) — convert all.

**Auth pages** (lower priority, do last):
- `src/app/[locale]/(auth)/login/page.tsx` (buttons, 2 inputs)
- `src/app/[locale]/(auth)/register/page.tsx` (buttons, 3 inputs)
- `src/app/[locale]/(auth)/reset-password/page.tsx` (buttons, 2 inputs)
- `src/app/[locale]/(auth)/forgot-password/page.tsx` (buttons, 1 input)

**After Phase 3A+3B+3C, commit:**
```bash
git add -A && git commit -m "refactor: migrate buttons, inputs, and selects to shadcn"
```

---

#### PHASE 3D: Migrate Custom Overlays → shadcn Dialog/Sheet

**MIGRATION PATTERN for Dialog (centered modal):**

Current pattern:
```tsx
{open && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
    <div className="w-full max-w-md rounded-lg border border-border bg-card shadow-lg" onClick={(e) => e.stopPropagation()}>
      {/* header, body, footer */}
    </div>
  </div>
)}
```

Convert to:
```tsx
<Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    {/* body */}
    <DialogFooter>
      {/* buttons */}
    </DialogFooter>
  </DialogContent>
</Dialog>
```

> **KEY**: The Dialog component handles backdrop, escape key, focus trap, and body scroll lock automatically. Remove all manual `useEffect`/`useCallback` for keydown/scroll/focus-trap. Remove the manual backdrop `<div>`. Remove `document.body.style.overflow` manipulation. The DialogContent already has the backdrop + centered layout + animation built in.

**File-by-file:**

**`src/app/components/layout/upload-modal.tsx`** → Dialog:
- Remove the `if (!open) return null` early return (Dialog handles visibility).
- Wrap entire return in `<Dialog open={open} onOpenChange={(o) => { if (!o && !parsing) onClose() }}>`.
- Replace outer `<div className="fixed inset-0...">` + inner `<div className="w-full max-w-lg...">` with `<DialogContent className="max-w-lg">`.
- Keep header, body, and all handlers (handleFileChange, handleDrop, etc.).
- The hidden `<input type="file">` stays raw — it's outside the Dialog content (or can go inside, it's hidden anyway).
- The BuildWizard sub-component is a separate modal — leave it as-is for now or migrate if time permits.

**`src/app/components/chat/paste-jd-modal.tsx`** → Dialog:
- Remove `if (!open) return null`.
- Wrap in `<Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>`.
- Replace overlay with `<DialogContent className="max-w-lg">`.
- Convert the textarea to `<Textarea>`.
- Convert buttons to `<Button>`.
- Keep the character count validation logic.

**`src/app/components/ui/confirm-dialog.tsx`** → AlertDialog:
- Remove ALL manual focus trap, keydown handler, scroll lock, and the `useEffect`/`useCallback`/`useRef` code (lines 27-83). AlertDialog handles all of this.
- Replace with:
  ```tsx
  import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '~/components/ui/alert-dialog'
  import { Button } from '~/components/ui/button'
  import { Loader2 } from 'lucide-react'

  export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Delete', variant = 'danger', loading = false }: ConfirmDialogProps) {
    return (
      <AlertDialog open={open} onOpenChange={(o) => { if (!o && !loading) onClose() }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading} onClick={onClose}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={loading}
              onClick={(e) => { e.preventDefault(); onConfirm() }}
              className={variant === 'danger' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {loading && <Loader2 size={12} className="animate-spin" />}
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }
  ```
  > **NOTE**: AlertDialogAction by default closes the dialog. Since `onConfirm` may be async with loading state, we `e.preventDefault()` to prevent auto-close, and let `onConfirm` → `onClose` handle closing after the async operation completes.

**`src/app/components/ui/upgrade-modal.tsx`** → Dialog:
- Remove manual focus trap, keydown, scroll lock (same as confirm-dialog).
- Wrap in `<Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>`.
- Replace overlay with `<DialogContent className="max-w-md">`.
- Convert buttons to `<Button>`.
- Keep the router.push logic for CTA buttons.

**`src/app/components/pipeline/job-detail-panel.tsx`** → Sheet:
- This is a slide-over from the right, NOT a centered modal. Use Sheet, not Dialog.
- Current: two sibling `<div>`s — a backdrop + a fixed panel. Replace both with:
  ```tsx
  <Sheet open={!!job} onOpenChange={(o) => { if (!o) onClose() }}>
    <SheetContent side="right" className="w-full max-w-2xl flex flex-col p-0 gap-0">
      {/* Header */}
      <SheetHeader className="shrink-0 border-b border-border px-5 py-4">
        <SheetTitle>{job.title}</SheetTitle>
        {/* subtitle row */}
      </SheetHeader>
      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* ...existing body content... */}
      </div>
      {/* Footer */}
      <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-5 py-4">
        {/* ...existing footer content... */}
      </div>
    </SheetContent>
  </Sheet>
  ```
- Remove the manual `handleKeyDown` callback and the `useEffect` that adds keydown listener + sets body overflow (lines 86-102). Sheet handles Escape + scroll lock.
- Keep the close button as `<Button variant="ghost" size="icon">` inside SheetContent (SheetContent also has a built-in close X button, but keeping the custom one is fine — just ensure there's no duplicate close button conflict. If SheetContent renders its own X, remove the custom close button).

**Commit after Phase 3D:**
```bash
git add -A && git commit -m "refactor: migrate custom overlays to shadcn Dialog, Sheet, and AlertDialog"
```

---

#### PHASE 3E: Migrate @base-ui/react Menus → shadcn DropdownMenu

**MIGRATION PATTERN:**

Current (base-ui):
```tsx
import { Menu } from '@base-ui/react/menu'
<Menu.Root>
  <Menu.Trigger className="...">Trigger</Menu.Trigger>
  <Menu.Portal>
    <Menu.Positioner side="bottom" align="end" className="z-50">
      <Menu.Popup className="...">
        <Menu.Item className="..." onClick={...}>Item</Menu.Item>
      </Menu.Popup>
    </Menu.Positioner>
  </Menu.Portal>
</Menu.Root>
```

Convert to (shadcn):
```tsx
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '~/components/ui/dropdown-menu'
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" className="...">Trigger</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="...">
    <DropdownMenuItem onClick={...}>Item</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

> **KEY**: `DropdownMenuTrigger` with `asChild` wraps the trigger button. `DropdownMenuContent` takes `align` and `sideOffset` props. Items take `onClick`. Use `<DropdownMenuSeparator />` for dividers.

**File-by-file:**

**`src/app/components/layout/navbar.tsx`** — LanguageSwitcher:
- Replace `import { Menu } from '@base-ui/react/menu'` with shadcn DropdownMenu imports.
- `Menu.Root` → `<DropdownMenu>`
- `Menu.Trigger` → `<DropdownMenuTrigger asChild><Button variant="ghost" className="flex h-[30px] items-center gap-1 ...">...</Button></DropdownMenuTrigger>`
- Remove `Menu.Portal`, `Menu.Positioner` (shadcn handles portal/positioning internally).
- `Menu.Popup` → `<DropdownMenuContent align="end" className="min-w-[120px]">`
- `Menu.Item` → `<DropdownMenuItem>`
- Keep the locale checkmarks.

**`src/app/components/layout/user-menu.tsx`**:
- Replace `import { Menu } from '@base-ui/react/menu'` with shadcn DropdownMenu imports.
- `Menu.Root` → `<DropdownMenu>`
- `Menu.Trigger` → `<DropdownMenuTrigger asChild><Button variant="ghost" className="flex h-[30px] w-[30px] ...">...</Button></DropdownMenuTrigger>`
- `Menu.Popup` → `<DropdownMenuContent align="end" className="min-w-[180px]">`
- The header div (user name/email) stays as a plain `<div>`.
- The separator `<div className="mx-2 h-px bg-border" />` → `<DropdownMenuSeparator />`
- `Menu.Item` → `<DropdownMenuItem>`
- Keep all onClick handlers (router.push, handleSignOut).

**`src/app/components/ui/tooltip.tsx`** — uses `@base-ui/react/tooltip`:
- **DO NOT migrate** this file. The shadcn `tooltip` is not in the install list and the base-ui tooltip works fine. Leave it as-is.

**Commit after Phase 3E:**
```bash
git add -A && git commit -m "refactor: migrate base-ui menus to shadcn DropdownMenu"
```

---

#### PHASE 4: Worklog

**Step 4.1**: Create or append to `.worklog.md` in project root:
```markdown
## shadcn/ui Migration — [date]

### Phase 1: Component Installation
- Installed: button, input, textarea, select, dialog, sheet, dropdown-menu, alert-dialog, badge, separator, scroll-area, tabs, label, avatar
- Style used: [base-nova | neutral fallback]

### Phase 2: Button Variants
- Configured 6 variants (default, destructive, outline, secondary, ghost, link)
- Configured 4 sizes (sm, default, lg, icon)

### Phase 3A-3C: Element Migration
- [list files completed]

### Phase 3D: Overlay Migration
- [list files completed]

### Phase 3E: Menu Migration
- [list files completed]

### Issues Encountered
- [any issues]
```

---

### 4.5 Vertical-Slice Order

Execute phases in this exact order — each phase produces a testable checkpoint:

1. **Slice 1**: Phase 1 (install) + Phase 2 (button variants) → checkpoint: `tsc --noEmit` passes, components exist
2. **Slice 2**: Phase 3A buttons in `resume-detail.tsx` ONLY → checkpoint: `tsc --noEmit` + `pnpm lint` passes (proves the pattern works)
3. **Slice 3**: Phase 3A buttons in all remaining files → checkpoint: `tsc --noEmit` passes
4. **Slice 4**: Phase 3B inputs/textareas in all files → checkpoint: `tsc --noEmit` passes
5. **Slice 5**: Phase 3C selects in all files → checkpoint: `tsc --noEmit` passes
6. **Slice 6**: Phase 3D dialogs/sheets → checkpoint: `tsc --noEmit` passes
7. **Slice 7**: Phase 3E dropdown menus → checkpoint: `tsc --noEmit` passes
8. **Slice 8**: Phase 5 final verification → `tsc`, `lint`, `build` all pass

> **If you hit the SAME error twice or reach turn limit, STOP and return: (1) partial diff via `git diff`, (2) exact blocker, (3) which step you're stuck on.**

---

### 5. Assertion & Testing Requirements

This is a **pure UI markup refactor** — no behavior, API, data, or auth changes. The existing test suite should pass unchanged.

- **Unit Tests**: N/A — no behavior change. Run existing `pnpm test` to verify nothing breaks.
- **Integration Tests**: N/A — no multi-module contract changes.
- **E2E UI Tests**: Run `pnpm test:e2e` if time permits. E2E selectors should still work since we're not changing data attributes or text content. If E2E tests use `getByRole('button')`, they'll still find shadcn Buttons (they render as `<button>`).

**Manual verification checklist** (if dev server available):
- [ ] Resume editor: all form inputs work, drag-and-drop reordering works, tab switching works
- [ ] Job detail panel: slide-over opens/closes, AI action buttons navigate correctly
- [ ] Chat: message send works, paste-JD modal opens/closes
- [ ] Settings: form inputs save correctly
- [ ] Upload modal: drag-drop + file upload works
- [ ] Confirm dialog: delete confirmation works with async loading
- [ ] Language switcher: locale changes work
- [ ] User menu: sign out works

---

### 6. Verification Commands & Log Files

| Check | Command | Expected Result |
|-------|---------|-----------------|
| TypeScript | `npx tsc --noEmit` | 0 errors |
| Lint | `pnpm lint` | 0 errors |
| Build | `pnpm build` | Succeeds |
| Unit tests | `pnpm test` | All pass (no behavior change) |

**Run `npx tsc --noEmit` after EACH major file migration** to catch errors early. Do not wait until the end.

**Server log location**: If `pnpm build` fails, check stderr output in terminal. Next.js build errors include file path + line number.

**Final raw-element audit** (after all migrations):
```bash
# Should return ZERO results in components/ (excluding auth pages and special cases)
rg '<button ' src/app/components/ --include='*.tsx' -l
rg '<input ' src/app/components/ --include='*.tsx' -l
rg '<textarea ' src/app/components/ --include='*.tsx' -l
rg '<select ' src/app/components/ --include='*.tsx' -l
```
> Acceptable exceptions: `<input type="file">` in upload-modal.tsx, inputs inside agent-elements components, and any inputs with `className="hidden"`.
