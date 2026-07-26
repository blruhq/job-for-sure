# Implementation Spec & Plan: Neumorphism Apple Vision Pro Recalibration

### 0. Architectural Decision Record (ADR) & Scaling Tradeoffs

- **Context & Constraints**: The current neumorphism shadows use white highlight 0.22 / dark shadow 0.08-0.09. Apple Vision Pro's signature look uses white highlight 0.15-0.20 / dark shadow 0.15-0.25. The effect: elements feel *embedded* in the surface (carved out) rather than *floating above* it. This is a **CSS-only visual recalibration** — zero behavior, API, data, or logic changes.

- **Chosen Architecture**: **Extract shadow color+opacity into CSS custom properties** (`--neuro-dark-*`, `--neuro-light-*`) in `:root`, then reference them in all `.neuro-*` box-shadow declarations. This makes future recalibration a 6-line change instead of 30+ individual rgba edits. Values are calibrated to Apple Vision Pro's multi-layer, very subtle profile.

- **Discarded Alternatives**:
  - *Alternative A: Just change the hardcoded rgba opacity values in-place.* Rejected — works but makes future tuning painful (30+ individual edits again). CSS variables are trivially supported by all modern browsers and the project already uses this pattern for colors.
  - *Alternative B: Use Tailwind @theme shadow tokens.* Rejected — Tailwind v4 `@theme` doesn't support multi-layer box-shadow cleanly, and the existing CSS class approach works perfectly with dark-mode overrides.

### 1. Target Files & Folder Structure

**MODIFY (1 file):**
```
src/app/globals.css    # All changes in this single file
```

No new files. No new dependencies. Single-file CSS change.

### 2. Import Definitions & Dependencies

N/A — no imports. Pure CSS.

### 3. Database Schema Changes

N/A — no database changes.

### 4. Step-by-Step Edits

All edits are in `src/app/globals.css`.

---

#### ✅ STEP 1: Add neumorphic shadow color variables to `:root`

**Location**: In the `:root` block, right after the existing `--neuro-surface: #E8E2D8;` line (line ~108).

**Add these variables:**
```css
  /* ── Neumorphic shadow colors (Apple Vision Pro profile) ── */
  /* Dark shadow = warm clay tone, Light highlight = warm ivory glow */
  /* Calibrated to Apple VP: white 0.15-0.20, dark 0.15-0.25 */
  --neuro-dark-card: rgba(74, 68, 56, 0.18);
  --neuro-dark-card-hover: rgba(74, 68, 56, 0.22);
  --neuro-dark-inset: rgba(74, 68, 56, 0.15);
  --neuro-dark-pill: rgba(74, 68, 56, 0.15);
  --neuro-dark-pill-hover: rgba(74, 68, 56, 0.18);
  --neuro-dark-pill-active: rgba(74, 68, 56, 0.12);
  --neuro-dark-modal: rgba(74, 68, 56, 0.20);
  --neuro-dark-chat: rgba(74, 68, 56, 0.12);
  --neuro-dark-chat-hover: rgba(74, 68, 56, 0.14);
  --neuro-light-base: rgba(253, 251, 247, 0.18);
  --neuro-light-hover: rgba(253, 251, 247, 0.22);
```

---

#### ✅ STEP 2: Update `.neuro-card` to use variables

**Current (lines ~434-440):**
```css
.neuro-card {
  background-color: var(--neuro-surface);
  box-shadow: 6px 6px 12px rgba(74, 68, 56, 0.09), -6px -6px 12px rgba(253, 251, 247, 0.22);
}
.neuro-card:hover {
  box-shadow: 8px 8px 16px rgba(74, 68, 56, 0.10), -8px -8px 16px rgba(253, 251, 247, 0.28);
}
```

**Replace with:**
```css
.neuro-card {
  background-color: var(--neuro-surface);
  box-shadow: 6px 6px 12px var(--neuro-dark-card), -6px -6px 12px var(--neuro-light-base);
}
.neuro-card:hover {
  box-shadow: 8px 8px 16px var(--neuro-dark-card-hover), -8px -8px 16px var(--neuro-light-hover);
}
```

---

#### ✅ STEP 3: Update `.neuro-inset` to use variables

**Current (lines ~443-446):**
```css
.neuro-inset {
  background-color: var(--neuro-surface);
  box-shadow: inset 4px 4px 8px rgba(74, 68, 56, 0.08), inset -4px -4px 8px rgba(253, 251, 247, 0.22);
}
```

**Replace with:**
```css
.neuro-inset {
  background-color: var(--neuro-surface);
  box-shadow: inset 4px 4px 8px var(--neuro-dark-inset), inset -4px -4px 8px var(--neuro-light-base);
}
```

---

#### ✅ STEP 4: Update `.neuro-inset:focus-visible` / `:focus-within` to use variables

**Current (lines ~449-454):**
```css
.neuro-inset:focus-visible,
.neuro-inset:focus-within {
  box-shadow:
    inset 4px 4px 8px rgba(74, 68, 56, 0.08),
    inset -4px -4px 8px rgba(253, 251, 247, 0.22);
}
```

**Replace with:**
```css
.neuro-inset:focus-visible,
.neuro-inset:focus-within {
  box-shadow:
    inset 4px 4px 8px var(--neuro-dark-inset),
    inset -4px -4px 8px var(--neuro-light-base);
}
```

---

#### ✅ STEP 5: Update `.neuro-inset-container:focus-visible` / `:focus-within` to use variables

**Current (lines ~457-462):**
```css
.neuro-inset-container:focus-visible,
.neuro-inset-container:focus-within {
  box-shadow:
    inset 4px 4px 8px rgba(74, 68, 56, 0.08),
    inset -4px -4px 8px rgba(253, 251, 247, 0.22);
}
```

**Replace with:**
```css
.neuro-inset-container:focus-visible,
.neuro-inset-container:focus-within {
  box-shadow:
    inset 4px 4px 8px var(--neuro-dark-inset),
    inset -4px -4px 8px var(--neuro-light-base);
}
```

---

#### ✅ STEP 6: Update `.neuro-icon-well` to use variables

**Current (lines ~465-468):**
```css
.neuro-icon-well {
  background-color: var(--neuro-surface);
  box-shadow: inset 3px 3px 6px rgba(74, 68, 56, 0.08), inset -3px -3px 6px rgba(253, 251, 247, 0.22);
}
```

**Replace with:**
```css
.neuro-icon-well {
  background-color: var(--neuro-surface);
  box-shadow: inset 3px 3px 6px var(--neuro-dark-inset), inset -3px -3px 6px var(--neuro-light-base);
}
```

---

#### ✅ STEP 7: Update `.neuro-pill` (base + hover + active) to use variables

**Current (lines ~471-480):**
```css
.neuro-pill {
  background-color: var(--neuro-surface);
  box-shadow: 3px 3px 6px rgba(74, 68, 56, 0.09), -3px -3px 6px rgba(253, 251, 247, 0.22);
}
.neuro-pill:hover {
  box-shadow: 4px 4px 8px rgba(74, 68, 56, 0.10), -4px -4px 8px rgba(253, 251, 247, 0.28);
}
.neuro-pill:active {
  box-shadow: inset 2px 2px 4px rgba(74, 68, 56, 0.08), inset -2px -2px 4px rgba(253, 251, 247, 0.22);
}
```

**Replace with:**
```css
.neuro-pill {
  background-color: var(--neuro-surface);
  box-shadow: 3px 3px 6px var(--neuro-dark-pill), -3px -3px 6px var(--neuro-light-base);
}
.neuro-pill:hover {
  box-shadow: 4px 4px 8px var(--neuro-dark-pill-hover), -4px -4px 8px var(--neuro-light-hover);
}
.neuro-pill:active {
  box-shadow: inset 2px 2px 4px var(--neuro-dark-pill-active), inset -2px -2px 4px var(--neuro-light-base);
}
```

---

#### ✅ STEP 8: Update `.neuro-modal` to use variables

**Current (lines ~483-486):**
```css
.neuro-modal {
  background-color: var(--neuro-surface);
  box-shadow: 8px 8px 24px rgba(74, 68, 56, 0.10), -8px -8px 24px rgba(253, 251, 247, 0.22);
}
```

**Replace with:**
```css
.neuro-modal {
  background-color: var(--neuro-surface);
  box-shadow: 8px 8px 24px var(--neuro-dark-modal), -8px -8px 24px var(--neuro-light-base);
}
```

---

#### ✅ STEP 9: Update `.neuro-chat` scoped overrides to use variables

**Current (lines ~507-523):**
```css
.neuro-chat .bg-an-input-background {
  border-color: transparent;
  box-shadow: inset 4px 4px 8px rgba(74, 68, 56, 0.06), inset -4px -4px 8px rgba(253, 251, 247, 0.22);
}

.neuro-chat .bg-an-send-button-bg {
  box-shadow: 3px 3px 6px rgba(74, 68, 56, 0.07), -3px -3px 6px rgba(253, 251, 247, 0.22);
}

.neuro-chat .neuro-card {
  box-shadow: 4px 4px 10px rgba(74, 68, 56, 0.06), -4px -4px 10px rgba(253, 251, 247, 0.22);
}
.neuro-chat .neuro-card:hover {
  box-shadow: 6px 6px 14px rgba(74, 68, 56, 0.07), -6px -6px 14px rgba(253, 251, 247, 0.22);
}
```

**Replace with:**
```css
.neuro-chat .bg-an-input-background {
  border-color: transparent;
  box-shadow: inset 4px 4px 8px var(--neuro-dark-chat), inset -4px -4px 8px var(--neuro-light-base);
}

.neuro-chat .bg-an-send-button-bg {
  box-shadow: 3px 3px 6px var(--neuro-dark-chat), -3px -3px 6px var(--neuro-light-base);
}

.neuro-chat .neuro-card {
  box-shadow: 4px 4px 10px var(--neuro-dark-chat), -4px -4px 10px var(--neuro-light-base);
}
.neuro-chat .neuro-card:hover {
  box-shadow: 6px 6px 14px var(--neuro-dark-chat-hover), -6px -6px 14px var(--neuro-light-hover);
}
```

---

#### ✅ STEP 10: Do NOT touch dark mode overrides

The `.dark .neuro-*` section (lines ~530-585) uses `var(--shadow-md)`, `var(--shadow-lg)`, etc. These are already correct and should NOT be modified. Dark mode neutralization stays as-is.

---

### Value Change Summary

| Element | Dark Shadow (old → new) | White Highlight (old → new) |
|---------|------------------------|----------------------------|
| Card base | 0.09 → **0.18** | 0.22 → **0.18** |
| Card hover | 0.10 → **0.22** | 0.28 → **0.22** |
| Inset base/focus | 0.08 → **0.15** | 0.22 → **0.18** |
| Icon well | 0.08 → **0.15** | 0.22 → **0.18** |
| Pill base | 0.09 → **0.15** | 0.22 → **0.18** |
| Pill hover | 0.10 → **0.18** | 0.28 → **0.22** |
| Pill active | 0.08 → **0.12** | 0.22 → **0.18** |
| Modal | 0.10 → **0.20** | 0.22 → **0.18** |
| Chat input bar | 0.06 → **0.12** | 0.22 → **0.18** |
| Chat send button | 0.07 → **0.12** | 0.22 → **0.18** |
| Chat card | 0.06 → **0.12** | 0.22 → **0.18** |
| Chat card hover | 0.07 → **0.14** | 0.22 → **0.22** |

### 4.5 Vertical-Slice Order

Single file, single pass. All 9 steps edit `globals.css` sequentially. No vertical slicing needed — the change is atomic.

### 5. Assertion & Testing Requirements

**N/A — no behavior change.** Pure CSS variable extraction + opacity recalibration. No logic, API, data, auth, or user-visible flow changes.

### 6. Verification Commands & Log Files

- **TypeScript check**: `npx tsc --noEmit` — must pass (CSS changes don't affect TS, but verify no regressions)
- **Build**: `pnpm build` — must succeed
- **Visual verification**: Run `pnpm dev`, then:
  1. Navigate to `/en/chat` — cards should feel more "carved into" the surface, less "floating"
  2. Hover a card — depth increase should be subtle but noticeable
  3. Focus an input — inset shadow should be more pronounced
  4. Toggle dark mode — should look unchanged (dark mode neutralization untouched)
  5. Navigate to `/en/applications` — kanban cards should have more tactile depth
- **Server Log Location**: stderr/console output during `pnpm dev` or `pnpm build`
