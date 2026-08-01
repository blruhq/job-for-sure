# Job For Sure — Design System

## Vibe

Swiss / International Typographic Style career platform for job seekers (tech & non-tech). Engineered, precise visual language. Linear/Vercel-grade structure with visible grid hairline dividers and a targeted wiring-diagram motif.

- **Variance**: Structured Swiss Grid
- **Motion**: Precise Kinetic Signal
- **Density**: High Information Density

---

## 1. Colors

Near-monochrome base paired with **Swiss Sapphire (`#2563EB`)** — authoritative, trustworthy accent signaling career acceleration rather than code execution.

| Token | Light Mode | Dark Mode | Usage |
| :--- | :--- | :--- | :--- |
| `--bg-app` | `#FFFFFF` | `#09090B` | Canvas background |
| `--bg-surface` | `#FAFAFA` | `#121215` | Card / panel surface |
| `--bg-subtle` | `#F4F4F5` | `#18181B` | Input background, hovered rows |
| `--border-hairline` | `#E4E4E7` (1px) | `#27272A` (1px) | Visible structural grid dividers |
| `--border-strong` | `#A1A1AA` | `#52525B` | Active state borders, focused fields |
| `--text-primary` | `#09090B` | `#F4F4F5` | Headings, primary body |
| `--text-secondary` | `#71717A` | `#A1A1AA` | Labels, captions, secondary details |
| `--text-tertiary` | `#A1A1AA` | `#71717A` | Disabled text, subtle hints |
| `--accent-primary` | `#2563EB` | `#3B82F6` | Primary action buttons, active indicators |
| `--accent-hover` | `#1D4ED8` | `#60A5FA` | Button hover states |
| `--accent-subtle` | `#EFF6FF` | `#1E293B` | Selected item background, badge fills |
| `--signal-dot` | `#2563EB` | `#60A5FA` | Wiring diagram node core |
| `--signal-line` | `#93C5FD` | `#1D4ED8` | Wiring diagram trace stroke |

---

## 2. Typography

Primary Sans: **Geist Sans** (fallback: **Inter**). One font family for the entire UI.

| Level | Size / Line-Height | Weight | Tracking | Family | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | 3.5rem (56px) / 1.05 | 600 SemiBold | `tracking-[-0.04em]` | Geist Sans | Hero headline |
| **H1** | 2.5rem (40px) / 1.1 | 600 SemiBold | `tracking-[-0.03em]` | Geist Sans | Section headers |
| **H2** | 1.75rem (28px) / 1.2 | 600 SemiBold | `tracking-[-0.02em]` | Geist Sans | Card headers, modal titles |
| **H3** | 1.25rem (20px) / 1.3 | 500 Medium | `tracking-[-0.01em]` | Geist Sans | Feature titles, subheadings |
| **Body Large** | 1.125rem (18px) / 1.5 | 400 Regular | `tracking-normal` | Geist Sans | Hero lead paragraphs |
| **Body Base** | 0.875rem (14px) / 1.5 | 400 Regular | `tracking-normal` | Geist Sans | Standard UI body, form fields |
| **Body Small** | 0.75rem (12px) / 1.4 | 400 Regular | `tracking-normal` | Geist Sans | Helper text, secondary specs |
| **Eyebrow Label** | 0.75rem (12px) / 1.2 | 500 Medium | `tracking-[0.1em] uppercase` | Geist Sans | Section labels above headings |

> **Rule**: No monospace fonts anywhere in the UI. Section labels use **uppercase tracking** in Geist Sans (`text-xs uppercase tracking-[0.1em] text-secondary`). Example: `RESUME BUILDER`, `HOW IT WORKS`, `GET STARTED`. This keeps the Swiss-grid discipline without dev-tool aesthetics.

---

## 3. Spacing & Grid

### Spacing System (8px base)

| Token | Value | Usage |
| :--- | :--- | :--- |
| `space-1` | 4px | Fine adjustments, icon-to-text gap |
| `space-2` | 8px | Tight element spacing, small gaps |
| `space-3` | 12px | Compact card padding, input spacing |
| `space-4` | 16px | Standard element spacing, mobile gutter |
| `space-6` | 24px | Desktop gutter, medium padding |
| `space-8` | 32px | Large section padding |
| `space-12` | 48px | Section vertical rhythm |
| `space-16` | 64px | Hero / major section padding |
| `space-20` | 80px | Max section padding |

### Structural Grid

| Breakpoint | Columns | Gutter | Max Width | Outer Padding |
| :--- | :--- | :--- | :--- | :--- |
| Desktop (≥1024px) | 12 | 24px | 1280px | — |
| Tablet (768px–1023px) | 8 | 16px | 100% | — |
| Mobile (<768px) | 4 | 16px | 100% | 16px |

### Grid Divider Rule

Hairline dividers use negative margin collapse (`-mr-px -mb-px`) or `border-r border-b border-hairline` on grid items to produce clean single-pixel borders without border doubling.

---

## 4. Layout Sections

### Navbar (App Shell & Marketing)
- Height: 56px (`h-14`), 1px bottom border (`border-b border-hairline`).
- Left: Logotype `JOB FOR SURE` in Geist SemiBold.
- Center: Nav links (`Resume Builder`, `ATS Match`, `Cover Letter`, `Interview Prep`, `Job Search`) in 13px Geist Medium.
- Right: Primary CTA button ("Start Building" / "Dashboard").

### Hero Section (Marketing)
- Height: `py-20` max. Max 4 text elements: Eyebrow badge, H1 Display (max 2 lines), Body Large (max 2 lines), Dual CTA buttons.
- **Wiring Motif**: Integrated directly under the CTA buttons, showing a live interactive horizontal trace connecting 3 stage cards (`Resume Input` → `AI Match Engine` → `Interview Ready`).

### How It Works (Swiss 3-Column Bento)
- 3-column horizontal grid (`grid-cols-1 md:grid-cols-3 border-hairline`).
- Card headers contain uppercase tracking eyebrow labels (`HOW IT WORKS`, `STEP ONE`, etc.) in Geist Sans Medium.
- Thin SVG wiring trace bridges the top border of card 1 to card 2, and card 2 to card 3.

### Interactive App Shell (Editor / ATS Match / Interview Prep)
- **Left Panel** (Control / Input): ~40% width (`col-span-5`), clean form sections separated by hairline dividers.
- **Right Panel** (Live Preview / AI Co-Pilot): ~60% width (`col-span-7`), crisp paper preview container (`bg-white` with 1px border) or chat interaction stream.
- **Wiring Motif**: **OMITTED** in functional app shell to eliminate visual clutter.

### Footer
- 4-column minimal Swiss grid, top border hairline, copyright annotation `© 2026 JOB FOR SURE. ALL RIGHTS RESERVED.` in Geist Sans uppercase tracking.

---

## 5. Wiring-Diagram Motif Specification

The signature wiring connector represents data flow and pipeline precision.

### Visual Specs
- **Line Weight**: 1.5px (`stroke-width="1.5"`).
- **Node Dot**:
  - Outer ring: 8px circle (`r="4"`), 1.5px stroke `--signal-line`, fill `--bg-app`.
  - Inner core: 4px solid circle (`r="2"`), fill `--accent-primary`.
- **Trace Signal Animation**:
  - A 24px glowing pulse line moves along the path continuously using SVG `stroke-dasharray="24 120"` and `stroke-dashoffset`.
  - Duration: 3s ease-in-out infinite loop.

### Allowed Locations
1. **Landing Hero**: Connecting the 3 stage preview cards.
2. **How It Works**: Linking step headers.

### Forbidden Locations
Resume editor inputs, PDF viewer overlay, billing settings, cover letter workspace, modal dialogs, settings pages.

---

## 6. Motion & Micro-Interactions

- **Button Hover**: Background darkening/lightening shift. Scale transition `active:scale-[0.98]`.
- **Card Hover**: 1px border color transition from `--border-hairline` to `--border-strong` over 150ms (`ease-out`). Zero heavy drop shadows.
- **Modal Reveal**: Scale-up from 98% to 100% with opacity fade in 200ms (`cubic-bezier(0.16, 1, 0.3, 1)`).

---

## 7. Component Specs

### Buttons

| Size | Height | Padding | Text |
| :--- | :--- | :--- | :--- |
| Small | `h-8` | `px-3` | `text-xs font-medium` |
| Base | `h-10` | `px-4` | `text-sm font-medium` |
| Large | `h-12` | `px-6` | `text-base font-semibold` |

- **Radius**: 6px (`rounded-md`).
- **Primary**: Background `--text-primary`, Text `--bg-app`.
- **Secondary**: Background `--bg-subtle`, 1px border `--border-hairline`, Text `--text-primary`.
- **Accent**: Background `--accent-primary`, Text `#FFFFFF`.

### Cards & Panels
- Border: 1px solid `--border-hairline`.
- Radius: `rounded-lg` (8px).
- Inner Padding: `p-6` (24px) or `p-8` (32px).
- Header: Separated from body by 1px bottom border when containing tab navigation or toolbars.

### Form Controls
- Inputs & Selects: `h-10 px-3 bg-subtle border border-hairline rounded-md text-sm text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none`.

### Icons
- 1.5px stroke weight (Lucide React or Tabler Icons configured to `strokeWidth={1.5}`).
- Company Brand Logos: Simple Icons CDN (`https://cdn.simpleicons.org/{slug}`).

---

## 8. Do's and Don'ts

### Do
- Use strict 1px hairline dividers between all grid cells.
- Use uppercase tracking labels (`text-xs uppercase tracking-[0.1em]`) for section eyebrows in Geist Sans.
- Keep layout rhythm aligned to an 8px grid (8px, 16px, 24px, 32px, 48px, 64px).
- Keep the wiring-diagram motif scarce — it's a signature, not a theme.

### Don't
- Use monospace fonts anywhere in the UI.
- Use numbered indexes like `01 — SECTION` — too dev-tool coded.
- Use purple/violet gradients or craft-beige backgrounds.
- Apply the wiring motif to functional app screens (editor, billing, settings).
- Use rounded pill buttons (`rounded-full`) for standard actions.
- Use heavy drop shadows (`shadow-2xl` or dark blurred ambient shadows).
