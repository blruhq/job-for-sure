# Implementation Spec & Plan — Blueprint UX Visual Overhaul

> Branch: `feat/blueprint-ux`
> Spec: `docs/design.md`
> Source root: `src/`

---

### 0. Architectural Decision Record (ADR) & Scaling Tradeoffs

- **Context**: CSS-only token changes + one new React component (command palette). No DB, no API, no auth changes. No regressions expected unless class names collide.
- **Chosen Architecture**: Direct file edits. Tailwind v4 uses `@theme inline` to bridge CSS vars → utility classes, so all color-token changes propagate automatically. `cmdk` is added via `pnpm add cmdk` (peer deps: React 18+ ✓).
- **Discarded Alternatives**:
  - *CSS Modules per-component*: Overkill. Globals.css is already the single token source for this design system.
  - *Tailwind plugin for dot-grid*: Not needed; hand-crafted CSS classes already in globals.css.

---

### 1. Target Files & Folder Structure

| File | Operation |
|------|-----------|
| `src/app/globals.css` | Update color tokens (P0), dot-grid classes (P1), label-bracket class (P1) |
| `src/app/[locale]/(app)/resumes/page.tsx` | Remove `hover:shadow-md` from card (P0) |
| `src/app/components/pipeline/job-detail-panel.tsx` | Fix AI tools button hierarchy (P1) |
| `src/app/components/pipeline/applications-view.tsx` | Kanban card cool border tokens (P0 minor) |
| `src/app/components/layout/sidebar.tsx` | Apply `label-bracket` to section headers (P1) |
| `src/app/components/layout/navbar.tsx` | Add ⌘K search trigger button (P2) |
| `src/app/components/layout/command-palette.tsx` | NEW: command palette component (P2) |
| `src/app/[locale]/(app)/layout.tsx` | Mount `<CommandPalette />` inside AppShell (P2) |
| `.worklog.md` | Append progress notes |

**Note on dashboard stat cards (P2)**: `src/app/[locale]/(app)/dashboard/page.tsx` just redirects to `/chat`. No stat cards exist there — the "dashboard" IS the chat page. Dashboard `bg-grid-card` instruction is N/A for now (no stat card components in current codebase). Skip without breaking anything.

---

### 2. Import Definitions & Dependencies

**globals.css**: No imports needed — all changes are CSS custom properties.

**command-palette.tsx**:
```tsx
'use client'
import { Command } from 'cmdk'
import { useEffect, useState } from 'react'
import { useRouter } from '~/i18n/routing'
import { Search, LayoutDashboard, FileText, KanbanSquare, Brain, Mail, CheckSquare, Settings, Plus, Briefcase } from 'lucide-react'
```

**navbar.tsx**: Add `Search` from `lucide-react` (already imported in other files — verify if needed) and import `CommandPalette`.

**layout.tsx**: Import `CommandPalette` from `~/components/layout/command-palette`.

---

### 3. Database Schema Changes

None.

---

### 4. Step-by-Step Edits

#### Step 1 — P0: Update `src/app/globals.css` — Light mode color tokens

**Find this block** (lines 56–172, the entire `:root { ... }` token section):

Replace the `:root { }` block comment header and token values as follows. ONLY change the values listed below; leave everything else (typography, layout, motion, Agent Elements overrides) untouched.

**Exact replacements within `:root {}`**:

```
--background: #F7F6F2;   →  --background: #F8F9FA;
--foreground: #1C1B16;   →  --foreground: #0F1115;
--card-foreground: #1C1B16;  →  --card-foreground: #0F1115;
--popover-foreground: #1C1B16; → --popover-foreground: #0F1115;
--secondary: #EFEEE9;    →  --secondary: #F1F3F5;
--secondary-foreground: #1C1B16; → --secondary-foreground: #0F1115;
--muted: #F0EFEA;        →  --muted: #F1F3F5;
--muted-foreground: #71706A; → --muted-foreground: #646E7B;
--accent: rgba(91, 106, 191, 0.08); → --accent: rgba(91, 106, 191, 0.06);
--border: #E6E5DF;       →  --border: #E0E3E8;
--input: #E6E5DF;        →  --input: #E0E3E8;
--sidebar: #EFEEE9;      →  --sidebar: #F3F4F6;
--sidebar-foreground: #1C1B16; → --sidebar-foreground: #0F1115;
--sidebar-hover: #E8E7E1; →  --sidebar-hover: #E9EBEF;
--sidebar-active: #D8D6CE; → --sidebar-active: #DDE0E6;
--sidebar-border: #E6E5DF; → --sidebar-border: #E0E3E8;
--accent-soft: rgba(91, 106, 191, 0.08); → --accent-soft: rgba(91, 106, 191, 0.06);
--accent-blueprint: rgba(91, 106, 191, 0.06); → --accent-blueprint: rgba(91, 106, 191, 0.04);
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04); → --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.03);
--shadow-md: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06); → --shadow-md: 0 1px 3px rgba(0, 0, 0, 0.04);
--shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04); → --shadow-lg: 0 2px 8px rgba(0, 0, 0, 0.06);
--shadow-paper: 0 8px 32px rgba(0, 0, 0, 0.06), 0 0 0 1px var(--border); → --shadow-paper: 0 0 0 1px var(--border);
```

Also update the block comment from `DESIGN TOKENS — Warm paper + steel blue` → `DESIGN TOKENS — Cool canvas + steel blue (Cloudflare/Greptile style)`.

Also update `--success: #2B5F45;` → `--success: #1A8849;` and `--success-soft: rgba(43, 95, 69, 0.08);` → `--success-soft: rgba(26, 136, 73, 0.08);` and `--warn: #D4A316;` → `--warn: #C68A03;`.

Also update Agent Elements override:
`--an-background: var(--background);   /* #F7F6F2 warm paper */` → `--an-background: var(--background);   /* #F8F9FA cool canvas */`

#### Step 2 — P0: Update `src/app/globals.css` — Dark mode color tokens

**In the `.dark { }` block**, make these replacements:

```
--background: #131312;   →  --background: #0D0E11;
--foreground: #EFEEE9;   →  --foreground: #E4E7EC;
--card: #1A1A18;         →  --card: #16181D;
--card-foreground: #EFEEE9; → --card-foreground: #E4E7EC;
--popover: #1A1A18;      →  --popover: #16181D;
--popover-foreground: #EFEEE9; → --popover-foreground: #E4E7EC;
--primary: #7B8AD8;      →  --primary: #8B98E0;
--secondary: #1F1F1D;    →  --secondary: #1C1E24;
--secondary-foreground: #EFEEE9; → --secondary-foreground: #E4E7EC;
--muted: #1F1F1D;        →  --muted: #1C1E24;
--muted-foreground: #A5A49D; → --muted-foreground: #9CA3B0;
--accent: rgba(123, 138, 216, 0.12); → --accent: rgba(139, 152, 224, 0.10);
--accent-foreground: #7B8AD8; → --accent-foreground: #8B98E0;
--ring: #7B8AD8;         →  --ring: #8B98E0;
--sidebar: #161614;      →  --sidebar: #0F1014;
--sidebar-foreground: #EFEEE9; → --sidebar-foreground: #E4E7EC;
--sidebar-hover: #1F1F1D; → --sidebar-hover: #1C1E24;
--sidebar-active: #2E2E2B; → --sidebar-active: #262932;
--sidebar-accent: #7B8AD8; → --sidebar-accent: #8B98E0;
--success: #4ADE80;      →  (keep)
--success-soft: rgba(74, 222, 128, 0.10); → (keep)
--accent-soft: rgba(123, 138, 216, 0.12); → --accent-soft: rgba(139, 152, 224, 0.10);
--accent-blueprint: rgba(123, 138, 216, 0.08); → --accent-blueprint: rgba(139, 152, 224, 0.06);
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2); → --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
--shadow-md: 0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2); → --shadow-md: 0 1px 3px rgba(0, 0, 0, 0.4);
--shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2); → --shadow-lg: 0 2px 8px rgba(0, 0, 0, 0.4);
--shadow-paper: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px var(--border); → --shadow-paper: 0 0 0 1px var(--border);
```

Also update dark Agent Elements overrides to match new colors:
```
--an-background: #131312;  →  --an-background: #0D0E11;
--an-background-secondary: #1F1F1D;  →  --an-background-secondary: #1C1E24;
--an-background-tertiary: #1A1A18;   →  --an-background-tertiary: #16181D;
--an-foreground: #EFEEE9;  →  --an-foreground: #E4E7EC;
--an-foreground-muted: #A5A49D;  →  --an-foreground-muted: #9CA3B0;
--an-primary-color: #7B8AD8;  →  --an-primary-color: #8B98E0;
--an-user-message-bg: rgba(123, 138, 216, 0.12);  →  --an-user-message-bg: rgba(139, 152, 224, 0.10);
--an-input-background: #1A1A18;  →  --an-input-background: #16181D;
--an-send-button-bg: #7B8AD8;  →  --an-send-button-bg: #8B98E0;
--an-tool-background: #1A1A18;  →  --an-tool-background: #16181D;
```

#### Step 3 — P1: Update `src/app/globals.css` — Dot-grid refinement + label-bracket

**Replace the current `.bg-grid-blueprint` block** (lines 296-300):

```css
/* ── Blueprint grid background ── */
.bg-grid-blueprint {
  background-image: radial-gradient(var(--border) 1px, transparent 1px);
  background-size: 16px 16px;
}
```

**With this expanded block**:

```css
/* ── Blueprint grid backgrounds ── */
/* Page/app background — subtle */
.bg-grid-blueprint {
  background-image: radial-gradient(var(--accent-blueprint) 1px, transparent 1px);
  background-size: 20px 20px;
}

/* Card interior — even subtler */
.bg-grid-card {
  background-image: radial-gradient(var(--accent-blueprint) 0.8px, transparent 0.8px);
  background-size: 16px 16px;
}

/* Dark mode variants — brighter dots on dark */
.dark .bg-grid-blueprint {
  background-image: radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 20px 20px;
}
.dark .bg-grid-card {
  background-image: radial-gradient(rgba(255, 255, 255, 0.025) 0.8px, transparent 0.8px);
  background-size: 16px 16px;
}
```

**Add `.label-bracket` class** in the `@layer base { }` block, right after the `.label-mono` block (after line 281):

```css
  /* Bracket label utility — Greptile style */
  .label-bracket {
    font-family: var(--font-mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted-foreground);
    font-weight: 500;
  }
  .label-bracket::before { content: "[ "; }
  .label-bracket::after { content: " ]"; }
```

#### Step 4 — P0: Fix shadow in `src/app/[locale]/(app)/resumes/page.tsx`

**Line 101** — change:
```tsx
className="group relative flex flex-col rounded-sm border border-border bg-card transition-all hover:border-primary/40 hover:shadow-md"
```
To:
```tsx
className="group relative flex flex-col rounded-sm border border-border bg-card transition-all hover:border-foreground/15"
```

Also add `bg-grid-card` to the empty state container (line 76). The empty state wrapping `<div>`:
```tsx
<div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
```
Change to:
```tsx
<div className="flex flex-col items-center justify-center gap-4 py-24 text-center rounded-sm border border-dashed border-border bg-grid-card">
```

#### Step 5 — P1: Fix button hierarchy in `src/app/components/pipeline/job-detail-panel.tsx`

**The AI tools grid** (lines 435-460). Currently all 4 buttons use `bg-primary text-primary-foreground`. Change them to muted ghost style:

Replace ALL four AI tool buttons' `className` from:
```
"flex cursor-pointer items-center justify-center gap-1.5 rounded-xs bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
```
To:
```
"flex cursor-pointer items-center justify-center gap-1.5 rounded-xs bg-muted border border-border px-3 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-accent-soft hover:border-primary/30 active:scale-[0.98]"
```

This applies to: Tailor Resume, Cover Letter, ATS Match, Interview buttons. (The Apply button at line 481 stays as solid primary — already correct. The Save to Tracker button at line 465-476 already uses outline style — already correct per spec.)

#### Step 6 — P1: Apply `label-bracket` to sidebar section headers in `src/app/components/layout/sidebar.tsx`

The sidebar uses `.label-mono` for section headers. Per spec section 5.2, we apply `.label-bracket` ALONGSIDE (not replacing, since `.label-mono` is used elsewhere too). The cleanest approach: add `label-bracket` class to the `<span>` that currently has `label-mono` on the section header spans.

**In `NavSection` component** (line 57), the section header span:
```tsx
<span className={cn('label-mono absolute inset-0 flex items-center px-2.5 transition-opacity duration-150', collapsed ? 'opacity-0' : 'opacity-100')} style={{ fontSize: '11px' }}>
```
Change to (use `label-bracket` instead of `label-mono`, remove inline style since `.label-bracket` sets font-size: 11px):
```tsx
<span className={cn('label-bracket absolute inset-0 flex items-center px-2.5 transition-opacity duration-150', collapsed ? 'opacity-0' : 'opacity-100')}>
```

**In the "MY RESUMES" section** (line 171), same change:
```tsx
<span className={cn('label-mono absolute inset-0 flex items-center px-2.5 transition-opacity duration-150', c ? 'opacity-0' : 'opacity-100')} style={{ fontSize: '11px' }}>
```
→
```tsx
<span className={cn('label-bracket absolute inset-0 flex items-center px-2.5 transition-opacity duration-150', c ? 'opacity-0' : 'opacity-100')}>
```

**In the ADMIN section** (line 136):
```tsx
<div className="label-mono px-2.5 pt-3 pb-1">
```
→
```tsx
<div className="label-bracket px-2.5 pt-3 pb-1">
```

**In the ACCOUNT section** (line 228):
```tsx
<span className={cn('label-mono absolute inset-0 flex items-center px-2.5 transition-opacity duration-150', c ? 'opacity-0' : 'opacity-100')}>
```
→
```tsx
<span className={cn('label-bracket absolute inset-0 flex items-center px-2.5 transition-opacity duration-150', c ? 'opacity-0' : 'opacity-100')}>
```

**Important**: `label-bracket` adds `::before`/`::after` pseudo-elements. Since the sidebar header text is short (e.g., "Home", "Resumes"), it will render as `[ HOME ]`, `[ RESUMES ]`, etc. — exactly per spec section 5.2. No layout changes needed (the span is `absolute inset-0 flex items-center`; the pseudo-elements are inline text).

#### Step 7 — P2: Install `cmdk`

```bash
pnpm add cmdk
```

#### Step 8 — P2: Create `src/app/components/layout/command-palette.tsx`

Create this file with the following full content:

```tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { Command } from 'cmdk'
import { useRouter } from '~/i18n/routing'
import {
  Search, MessageSquare, FileText, KanbanSquare, Brain,
  Mail, CheckSquare, Settings, Plus, Briefcase,
} from 'lucide-react'

interface CommandItem {
  label: string
  group: 'Navigation' | 'Actions'
  icon: React.ComponentType<{ size?: number; className?: string }>
  href?: string
  action?: () => void
}

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  // ── ⌘K / Ctrl+K listener ──
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setOpen((prev) => !prev)
    }
    if (e.key === 'Escape') {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const items: CommandItem[] = [
    { label: 'Career Coach', group: 'Navigation', icon: MessageSquare, href: '/chat' },
    { label: 'My Resumes', group: 'Navigation', icon: FileText, href: '/resumes' },
    { label: 'Applications', group: 'Navigation', icon: KanbanSquare, href: '/applications' },
    { label: 'Interview Prep', group: 'Navigation', icon: Brain, href: '/interview' },
    { label: 'Cover Letter', group: 'Navigation', icon: Mail, href: '/cover-letter' },
    { label: 'ATS Optimizer', group: 'Navigation', icon: CheckSquare, href: '/ats' },
    { label: 'Settings', group: 'Navigation', icon: Settings, href: '/settings' },
    { label: 'New Resume', group: 'Actions', icon: Plus, href: '/resumes' },
    { label: 'Find Jobs', group: 'Actions', icon: Briefcase, href: '/applications' },
  ]

  const navItems = items.filter((i) => i.group === 'Navigation')
  const actionItems = items.filter((i) => i.group === 'Actions')

  const runItem = (item: CommandItem) => {
    setOpen(false)
    if (item.action) {
      item.action()
    } else if (item.href) {
      router.push(item.href as Parameters<typeof router.push>[0])
    }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[190] bg-black/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="fixed left-1/2 top-[20%] z-[200] w-full max-w-xl -translate-x-1/2">
        <Command
          className="overflow-hidden rounded-lg border border-border bg-popover shadow-2xl"
          loop
        >
          <div className="flex items-center border-b border-border px-3">
            <Search size={14} className="shrink-0 text-muted-foreground mr-2" />
            <Command.Input
              className="flex-1 bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="Search commands..."
            />
          </div>
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No commands found.
            </Command.Empty>

            <Command.Group
              heading="Navigation"
              className="mb-1 px-1 py-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground"
            >
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Command.Item
                    key={item.label}
                    value={item.label}
                    onSelect={() => runItem(item)}
                    className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-accent-soft data-[selected=true]:bg-accent-soft data-[selected=true]:text-foreground outline-none"
                  >
                    <Icon size={14} className="shrink-0 text-muted-foreground" />
                    {item.label}
                  </Command.Item>
                )
              })}
            </Command.Group>

            <Command.Group
              heading="Actions"
              className="mb-1 px-1 py-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground"
            >
              {actionItems.map((item) => {
                const Icon = item.icon
                return (
                  <Command.Item
                    key={item.label}
                    value={item.label}
                    onSelect={() => runItem(item)}
                    className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-accent-soft data-[selected=true]:bg-accent-soft data-[selected=true]:text-foreground outline-none"
                  >
                    <Icon size={14} className="shrink-0 text-muted-foreground" />
                    {item.label}
                  </Command.Item>
                )
              })}
            </Command.Group>
          </Command.List>

          {/* Footer hint */}
          <div className="flex items-center gap-3 border-t border-border px-3 py-2">
            <span className="text-[10px] text-muted-foreground">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">↑↓</kbd> navigate
            </span>
            <span className="text-[10px] text-muted-foreground">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">↵</kbd> select
            </span>
            <span className="text-[10px] text-muted-foreground">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">esc</kbd> close
            </span>
          </div>
        </Command>
      </div>
    </>
  )
}
```

#### Step 9 — P2: Update `src/app/components/layout/navbar.tsx` — Add ⌘K trigger button

**Add `Search` to the import** from lucide-react (line 3):
```tsx
import { PanelLeft, Sun, Moon, Globe, Search } from 'lucide-react'
```

**In the `Topbar` function**, after the flex-1 spacer div (`<div className="flex-1" />`), and BEFORE the actions div, insert the ⌘K trigger button:

```tsx
      {/* ⌘K Command Palette trigger */}
      <button
        onClick={() => {
          const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
          document.dispatchEvent(event)
        }}
        className="hidden sm:flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent-soft transition-colors mr-2 max-w-[200px] w-full"
      >
        <Search size={13} className="shrink-0" />
        <span className="flex-1 text-left text-xs">Search...</span>
        <kbd className="ml-auto rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
      </button>
```

#### Step 10 — P2: Mount `CommandPalette` in `src/app/[locale]/(app)/layout.tsx`

**Add import** at top of file (after existing imports):
```tsx
import { CommandPalette } from '~/components/layout/command-palette'
```

**In `AppShell` function**, before the closing `</div>` of the root div (before the `{/* Global upgrade prompt */}` comment), add:
```tsx
      {/* Global ⌘K Command Palette */}
      <CommandPalette />
```

---

### 4.5 Vertical-Slice Order

Execute steps in this order for safe incremental validation:
1. **Steps 1-3** (globals.css changes) — pure CSS, no component changes, visually testable in browser immediately
2. **Step 4** (resumes page) — isolated card fix
3. **Step 5** (job-detail-panel buttons) — isolated footer fix
4. **Step 6** (sidebar labels) — pure className swap
5. **Steps 7-10** (cmdk install + CommandPalette + navbar + layout) — new feature, isolated mount

---

### 5. Assertion & Testing Requirements

**Unit tests**: N/A — no behavior changes to data logic. All changes are CSS tokens and component styling.

**CommandPalette** — no unit test needed. It's a UI overlay driven by keyboard events; tested manually by pressing ⌘K in the running app.

**Build verification**: `npx tsc --noEmit` + `pnpm lint` + `pnpm build` (or `npx next build`) after all steps.

---

### 6. Verification Commands & Log Files

- **TypeScript**: `npx tsc --noEmit`
- **Lint**: `pnpm lint`
- **Tests**: `pnpm test` (unit tests must still pass — no test files changed)
- **Build**: `pnpm build`
- **Log location**: Console stderr / Next.js build output in terminal

**cmdk import note**: `cmdk` exports `Command` as a named export AND as a default. Use `import { Command } from 'cmdk'` (named). If type errors appear, check `cmdk` version peer deps — it requires React 18+. The project uses React 19 which is forward-compatible.

---

### Anti-Pattern Enforcement (from docs/design.md §9)

- DO NOT add `bg-grid-blueprint` behind the resume PDF viewer or editor content areas
- DO NOT use `rounded-2xl` anywhere in these changes — max `rounded-lg` for palette overlay
- DO NOT gradient text
- DO NOT add heavy shadows to new elements — command palette uses `shadow-2xl` on the container (this is a floating overlay, different from cards — acceptable per Cloudflare pattern)
- DO NOT warm the palette — all new tokens are cool gray
