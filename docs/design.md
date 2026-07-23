# Visual & UX/UI Redesign: Cloudflare + Greptile Technical Blueprint Theme

> **Status**: Production-level spec for full visual overhaul
> **Branch**: `feat/blueprint-ux`
> **Previous pass**: Structural changes (sidebar spacing, `/resumes` page, drawer width) are done.
> **This pass**: Complete color palette overhaul, dot-grid card treatment, command palette, bracket label system, and modern dev-tool visual identity.

---

## 1. What Changed vs Previous Pass

The first implementation pass made structural improvements (font sizes, drawer width, collection page route). But the **visual identity** — colors, card treatment, backgrounds, typography feel — is still the old warm-paper aesthetic (`#F7F6F2` background, `#5B6ABF` steel blue). This spec defines the complete visual transformation into the Cloudflare/Greptile style.

---

## 2. Reference Analysis

### 2.1 Cloudflare Dashboard
| Element | Pattern |
|---------|---------|
| **Background** | Near-white `#F8F9FA` or pure white with optional dot-grid sections |
| **Cards** | Flat, `1px solid #E5E7EB` border, white bg, `border-radius: 6-8px`, **zero drop shadow** |
| **Card interiors** | Some cards use a subtle dot-grid background (`radial-gradient`) |
| **Primary color** | `#0051C3` (dark blue) / `#1E9CFF` (bright blue accent) |
| **Typography** | Inter for everything, system mono for technical labels |
| **Spacing** | Strict 4px grid (`p-3`, `p-4`, `gap-2`, `gap-3`) |
| **Density** | High information density, small but readable text (13-14px body) |
| **Sidebar** | Dark gray `#1D1D1F` in some themes, or white with subtle border-right |
| **Hover** | Background tint shift, not shadow. `bg-gray-50` on white surfaces |

### 2.2 Greptile Brand Guidelines (from greptile.com/design)
| Token | Value |
|-------|-------|
| **True Black** | `#2A2A2A` |
| **White** | `#FEFEFE` |
| **Greptile Green** | `#28E99F` (vibrant signal accent) |
| **Basalt** (dark bg) | `#3D3B4F` |
| **Eggshell** (light border) | `#D6D6D6` |
| **Sandbank** (light bg) | `#EEEEEE` |
| **Tree Frog** (primary) | `#756CF5` (violet/purple) |
| **Pond** (blue) | `#5882FF` |
| **Sky** (light blue) | `#71ADFF` |
| **Body font** | DM Sans |
| **Heading font** | Anybody (geometric display) |
| **Mono font** | Space Mono |

### 2.3 Shared Pattern: The "Dev-Tool Card"
Both Cloudflare and Greptile use the same card recipe:
```
1px solid border (hairline)
flat white/dark surface (no gradient, no glass)
no drop shadow (or 0 1px 2px rgba(0,0,0,0.04) at most)
border-radius: 6-8px
hover: border darkens slightly, not shadow
```

---

## 3. New Design Tokens

### 3.1 Color Palette — Light Mode
```css
:root {
  /* Surfaces */
  --background: #F8F9FA;          /* cool canvas — NOT warm paper */
  --foreground: #0F1115;          /* near-black ink */
  --card: #FFFFFF;                /* clean white card */
  --card-foreground: #0F1115;

  /* Primary — shift from steel blue to Greptile-inspired violet-blue */
  --primary: #5B6ABF;              /* keep brand identity but increase saturation */
  --primary-foreground: #FFFFFF;

  /* Neutrals — cool gray, not warm */
  --secondary: #F1F3F5;
  --secondary-foreground: #0F1115;
  --muted: #F1F3F5;
  --muted-foreground: #646E7B;    /* cool gray-600 */

  /* Borders — cool, crisp */
  --border: #E0E3E8;              /* cool gray border (was warm #E6E5DF) */
  --input: #E0E3E8;
  --ring: #5B6ABF;

  /* Accent — brighter, more tech-feel */
  --accent: rgba(91, 106, 191, 0.06);
  --accent-foreground: #5B6ABF;
  --accent-soft: rgba(91, 106, 191, 0.06);
  --accent-blueprint: rgba(91, 106, 191, 0.04);

  /* Status — same hues, keep */
  --success: #1A8849;
  --success-soft: rgba(26, 136, 73, 0.08);
  --warn: #C68A03;
  --warn-soft: rgba(198, 138, 3, 0.08);
  --danger-soft: rgba(220, 38, 38, 0.08);

  /* Sidebar — cooler tone */
  --sidebar: #F3F4F6;             /* cool gray-100 (was warm #EFEEE9) */
  --sidebar-foreground: #0F1115;
  --sidebar-hover: #E9EBEF;
  --sidebar-active: #DDE0E6;
  --sidebar-border: #E0E3E8;
  --sidebar-accent: #5B6ABF;

  /* Shadows — near-invisible, Cloudflare style */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.03);
  --shadow-md: 0 1px 3px rgba(0, 0, 0, 0.04);
  --shadow-lg: 0 2px 8px rgba(0, 0, 0, 0.06);
  --shadow-paper: 0 0 0 1px var(--border);
}
```

### 3.2 Color Palette — Dark Mode
```css
.dark {
  /* Surfaces — deep charcoal with slight blue tint (like Linear/Vercel) */
  --background: #0D0E11;          /* near-black with blue undertone */
  --foreground: #E4E7EC;
  --card: #16181D;                /* card sits 1 step above bg */
  --card-foreground: #E4E7EC;

  --primary: #8B98E0;              /* lighter for dark bg contrast */
  --primary-foreground: #0D0E11;

  --secondary: #1C1E24;
  --secondary-foreground: #E4E7EC;
  --muted: #1C1E24;
  --muted-foreground: #9CA3B0;

  --border: rgba(255, 255, 255, 0.06);
  --input: rgba(255, 255, 255, 0.08);
  --ring: #8B98E0;

  --accent: rgba(139, 152, 224, 0.10);
  --accent-foreground: #8B98E0;
  --accent-soft: rgba(139, 152, 224, 0.10);
  --accent-blueprint: rgba(139, 152, 224, 0.06);

  --sidebar: #0F1014;
  --sidebar-foreground: #E4E7EC;
  --sidebar-hover: #1C1E24;
  --sidebar-active: #262932;
  --sidebar-border: rgba(255, 255, 255, 0.06);
  --sidebar-accent: #8B98E0;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 1px 3px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 2px 8px rgba(0, 0, 0, 0.4);
  --shadow-paper: 0 0 0 1px var(--border);
}
```

### 3.3 Key Differences from Current Tokens

| Token | Old Value | New Value | Why |
|-------|-----------|-----------|-----|
| `--background` (light) | `#F7F6F2` (warm paper) | `#F8F9FA` (cool canvas) | Eliminates yellow/warm tint |
| `--border` (light) | `#E6E5DF` (warm) | `#E0E3E8` (cool gray) | Crisp, technical feel |
| `--muted-foreground` (light) | `#71706A` (warm) | `#646E7B` (cool gray) | Better contrast, tech vibe |
| `--sidebar` (light) | `#EFEEE9` (warm) | `#F3F4F6` (cool gray) | Matches Cloudflare sidebar tone |
| `--background` (dark) | `#131312` (warm dark) | `#0D0E11` (blue-black) | Linear/Vercel style deep charcoal |
| `--card` (dark) | `#1A1A18` (warm) | `#16181D` (cool) | Neutral dark card surface |
| `--shadow-paper` | `0 8px 32px ...` (heavy) | `0 0 0 1px var(--border)` | Cloudflare flat: border-only, no float |
| `--shadow-*` | Multiple layered shadows | Single thin shadows | Cloudflare uses minimal depth |

---

## 4. Dot-Grid Background System

### 4.1 The Pattern (already in globals.css, needs refinement)

Current:
```css
.bg-grid-blueprint {
  background-image: radial-gradient(var(--border) 1px, transparent 1px);
  background-size: 16px 16px;
}
```

**Refined** — add a card-specific variant and make the dots subtler:
```css
/* Page/app background — subtle */
.bg-grid-blueprint {
  background-image: radial-gradient(var(--accent-blueprint) 1px, transparent 1px);
  background-size: 20px 20px;
}

/* Card interior — even subtler, used on stat cards and empty states */
.bg-grid-card {
  background-image: radial-gradient(var(--accent-blueprint) 0.8px, transparent 0.8px);
  background-size: 16px 16px;
}

/* Dark mode variant — brighter dots on dark */
.dark .bg-grid-blueprint {
  background-image: radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 20px 20px;
}
.dark .bg-grid-card {
  background-image: radial-gradient(rgba(255, 255, 255, 0.025) 0.8px, transparent 0.8px);
  background-size: 16px 16px;
}
```

### 4.2 Where to Apply

| Surface | Class | Notes |
|---------|-------|-------|
| Sidebar background | `bg-grid-blueprint` | Already applied ✓ |
| Main app content area | `bg-grid-blueprint` | Apply to layout main wrapper |
| Dashboard stat cards | `bg-grid-card` | Subtle texture inside cards |
| Resume collection cards | None | Keep clean white for readability |
| Resume editor/PDF | **NEVER** | Don't place behind actual content |
| Empty states | `bg-grid-card` | Enhances "blueprint" feel |
| Job detail drawer body | None | Keep clean for readability |

---

## 5. Bracket Label System

### 5.1 The Pattern
Greptile uses bracketed monospace labels extensively. Define a reusable class:

```css
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

### 5.2 Usage
Replace the current `.label-mono` usage in sidebar sections, page headers, and card metadata with `.label-bracket` where appropriate:
- Sidebar: `[ HOME ]`, `[ MY RESUMES ]`, `[ JOBS ]`
- Page headers: `[ 01 // DASHBOARD ]`, `[ 02 // RESUME COLLECTION ]`
- Status indicators: `[ STATUS: READY ]`, `[ SCORE: 87% ]`

---

## 6. Component-Level Changes

### 6.1 Card Recipe (Global)
All cards across the app should use this base recipe:
```tsx
// Cloudflare-style flat card
className="rounded-md border border-border bg-card p-4"
// Hover: darken border slightly, no shadow
hover:className="hover:border-foreground/15"
```
**Remove**: `shadow-md`, `shadow-lg`, `hover:shadow-md`, `hover:shadow-lg` from cards. Cloudflare cards don't float.

### 6.2 Sidebar
- Already updated: `text-sm` nav links, `py-2` padding, `bg-grid-blueprint` background, resume collection link.
- **Still needed**: Apply bracket labels to section headers. Use `.label-bracket` class.
- **Still needed**: Sidebar background token update from warm to cool gray.

### 6.3 Resume Collection Page (`/resumes`)
- Already created with grid layout, cards, bracket label in header.
- **Still needed**: Card hover should be `hover:border-foreground/15` (border darken), NOT `hover:shadow-md`. Remove shadow from card recipe.
- **Still needed**: Add `bg-grid-card` to the empty state container.
- **Still needed**: Update the `+ New Resume` card border to use the cool border color.

### 6.4 Job Detail Drawer
- Already updated: `max-w-2xl` width, `h-11` buttons, sticky footer with backdrop blur.
- **Still needed**: The footer border should be `border-t border-border` (already done). Verify the AI tools grid buttons are not too heavy — consider making them secondary style (border only, not solid primary).
- **Button hierarchy fix**: Currently all 4 AI tool buttons + Save/Apply are solid primary blue — no visual hierarchy. Change to:
  - **Apply**: solid primary `bg-primary text-primary-foreground` (the main action)
  - **Save to Tracker**: outline `border border-border bg-card hover:border-primary` (secondary)
  - **AI tools (Tailor, Cover Letter, ATS, Interview)**: ghost/text style `bg-muted hover:bg-accent-soft text-foreground` (tertiary, grouped)

### 6.5 Dashboard
- **Stat cards**: Apply `bg-grid-card` texture inside.
- **Card borders**: Hairline `border border-border`, no shadow.
- **Section labels**: Use `.label-bracket` class.

### 6.6 Applications Kanban Board
- **Column headers**: Use `.label-bracket` with colored dot.
- **Job cards**: Keep small but use cool border tokens.
- **Card hover**: `hover:border-foreground/15`, no shadow.

---

## 7. Command Palette (⌘K)

### 7.1 Implementation
Install `cmdk` (already a common pattern in Next.js dev tools):
```bash
pnpm add cmdk
```

### 7.2 Component Structure
Create `src/app/components/layout/command-palette.tsx`:
- Global `⌘K` / `Ctrl+K` keyboard listener
- Floating overlay (centered, not slide-out)
- Styled to match the Cloudflare/Greptile aesthetic:
  ```tsx
  <Command className="fixed left-1/2 top-[20%] z-[200] w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-popover shadow-2xl">
    <Command.Input className="border-b border-border px-4 py-3 text-sm outline-none placeholder:text-muted-foreground" />
    <Command.List className="max-h-[400px] overflow-y-auto p-2">
      <Command.Group heading="Navigation">
        <Command.Item>Dashboard</Command.Item>
        <Command.Item>My Resumes</Command.Item>
        <Command.Item>Applications</Command.Item>
        ...
      </Command.Group>
      <Command.Group heading="Actions">
        <Command.Item>New Resume</Command.Item>
        <Command.Item>Find Jobs</Command.Item>
        ...
      </Command.Group>
    </Command.List>
  </Command>
  ```

### 7.3 Trigger in Navbar
Add a search trigger button in the topbar/navbar:
```tsx
<button className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent-soft transition-colors w-full max-w-xs">
  <Search size={14} />
  <span>Search...</span>
  <kbd className="ml-auto rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
</button>
```

---

## 8. Implementation Order

| Priority | Task | Files |
|----------|------|-------|
| **P0** | Update color tokens (warm → cool) | `src/app/globals.css` |
| **P0** | Remove heavy shadows from cards globally | All component files using `shadow-md/lg` |
| **P1** | Add `.label-bracket` class + apply to sidebar/page headers | `globals.css`, `sidebar.tsx`, `resumes/page.tsx`, `dashboard-view.tsx` |
| **P1** | Refine dot-grid CSS (add `.bg-grid-card` + dark mode variants) | `globals.css` |
| **P1** | Apply `bg-grid-blueprint` to main app content area | `src/app/[locale]/(app)/layout.tsx` |
| **P1** | Fix button hierarchy in job detail drawer footer | `job-detail-panel.tsx` |
| **P2** | Install `cmdk` + build command palette | `command-palette.tsx`, `navbar.tsx` |
| **P2** | Apply `bg-grid-card` to dashboard stat cards | `dashboard-view.tsx` |
| **P2** | Update Kanban board visual treatment | `applications-view.tsx` |

---

## 9. Anti-Patterns to Avoid

1. **Do NOT put dot-grid behind resume text or PDF previews** — causes cognitive fatigue
2. **Do NOT use heavy shadows** — Cloudflare/Greptile cards are flat with hairline borders only
3. **Do NOT over-decorate** — the grid and brackets are seasoning, not the main course
4. **Do NOT warm the palette** — the entire point is moving from warm paper to cool tech
5. **Do NOT gradient text** — use solid colors, emphasis via weight
6. **Do NOT rounded-2xl cards** — max `rounded-md` (8px) for the technical aesthetic
