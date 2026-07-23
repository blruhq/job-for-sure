# Implementation Spec & Plan: Fix Kanban Card Left-Edge Clipping

### 0. Root Cause Analysis

The job cards in the Kanban board at `/en/applications` have their text content visually clipped on the LEFT edge (e.g., "re Engineer" instead of "Software Engineer"). Three compounding causes:

**Cause 1 — Scroll container clips horizontally:**
The cards container at line 511 has `overflow-y-auto`. Per CSS spec, when one overflow axis is `auto/scroll/hidden` and the other is `visible` (default), the `visible` is computed as `auto`. This creates a horizontal clip boundary at the container's padding box edge. With only `p-2` (8px) padding, the neumorphic card shadow (`-6px -6px` normal, `-8px -8px` hover) is clipped, AND any overflowing content is clipped.

**Cause 2 — Button base styles cause text overflow:**
The `<Button>` component (`src/app/components/ui/button.tsx` line 7) has base classes `inline-flex items-center justify-center gap-2 whitespace-nowrap`. When `JobCardContent` is rendered inside a ghost Button (line 523):
- `whitespace-nowrap` is INHERITED by child text elements. The title div (`line-clamp-2 break-words`) does NOT explicitly set `white-space`, so it inherits `nowrap`. With `nowrap`, text cannot wrap, `line-clamp-2` fails to truncate, and text overflows horizontally.
- `justify-center` centers the overflowing content group. When flex content overflows its container with `justify-center`, the overflow splits equally left AND right — this is why text is clipped on the LEFT edge specifically.
- `gap-2` adds 8px gaps between the fragment children of JobCardContent, widening the total content beyond the card width.

**Cause 3 — No min-w-0 on flex children:**
Flex items default to `min-width: auto`, preventing them from shrinking below their content's intrinsic width. Without `min-w-0`, the card and its children cannot shrink to fit the column width.

✅ **All 3 edits applied, `npx tsc --noEmit` passed, `pnpm lint` passed (0 errors).**

### 1. Target Files & Folder Structure

**Single file to modify:**
- `src/app/components/pipeline/applications-view.tsx` — 3 targeted edits

**Reference files (read-only, do NOT modify):**
- `src/app/globals.css` — `neuro-card` shadow definition (line 429). DO NOT change shadow values.
- `src/app/components/ui/button.tsx` — Button base classes (line 7). DO NOT modify; override via className instead.

### 2. Step-by-Step Edits

All edits are in `src/app/components/pipeline/applications-view.tsx`.

---

#### Edit 1: DraggableJobCard — add `min-w-0` (line 74-76)

**Why:** The card is a flex child of the scroll container. Without `min-w-0`, it cannot shrink below its content's intrinsic width, causing overflow.

**Before:**
```tsx
      className={cn(
        'group cursor-grab rounded-sm neuro-card p-2.5 active:cursor-grabbing hover:-translate-y-0.5',
      )}
```

**After:**
```tsx
      className={cn(
        'group cursor-grab rounded-sm neuro-card p-2.5 active:cursor-grabbing hover:-translate-y-0.5 min-w-0 overflow-hidden',
      )}
```

**Rationale:** `min-w-0` allows the card to shrink. `overflow-hidden` ensures the card itself clips its own content cleanly (text wraps inside the card via `line-clamp`/`truncate` rather than overflowing into neighbors). The neumorphic shadow is painted OUTSIDE the box and is NOT affected by `overflow-hidden` on the card itself — it will be visible as long as the PARENT container has enough padding (fixed in Edit 3).

---

#### Edit 2: Button inside card — override whitespace/justify/gap (line 523)

**Why:** The Button base classes (`whitespace-nowrap justify-center gap-2`) cause text to overflow and center-clip. We must override these for the card content button.

**Before:**
```tsx
                        <Button variant="ghost" onClick={() => setSelectedJob(job)} className="w-full text-left h-auto p-0 rounded-none">
```

**After:**
```tsx
                        <Button variant="ghost" onClick={() => setSelectedJob(job)} className="block w-full text-left h-auto p-0 rounded-none whitespace-normal min-w-0">
```

**Rationale:**
- `block` overrides `inline-flex` — removes flex centering (`justify-center`, `items-center`) and flex `gap-2`. Content flows as normal block elements, left-aligned by default. In Tailwind v4, `display: block` from the `block` utility wins over `display: inline-flex` from `inline-flex` because `block` appears later in the generated CSS (display utilities are ordered: inline-flex before block in Tailwind's sort order, so `block` wins when both are present).

  **IMPORTANT:** If `block` does not reliably override `inline-flex` in this Tailwind version, use this alternative className instead:
  ```
  "flex w-full flex-col items-start justify-start gap-0 text-left h-auto p-0 rounded-none whitespace-normal min-w-0"
  ```
  This explicitly overrides `inline-flex`→`flex`, `justify-center`→`justify-start`, `items-center`→`items-start`, `gap-2`→`gap-0`, and adds `flex-col` so children stack vertically. It also adds `whitespace-normal` and `min-w-0`.

- `whitespace-normal` overrides inherited `whitespace-nowrap` — allows text to wrap so `line-clamp-2` and `truncate` work correctly.
- `min-w-0` allows the button to shrink within the card.

---

#### Edit 3: Cards container — fix overflow clipping + flex sizing (line 510-511)

**Why:** The current `overflow-y-auto` with `p-2` clips card shadows and content horizontally. Need explicit `overflow-x-hidden` to prevent horizontal scrollbar, more padding for shadow room, and `flex-1 min-h-0` for proper Kanban column scroll behavior.

**Before (lines 510-511):**
```tsx
                {/* Job Cards */}
                <div className="flex flex-col gap-1.5 p-2 overflow-y-auto">
```

**After:**
```tsx
                {/* Job Cards — overflow-x-hidden prevents horizontal clip/scrollbar while
                     overflow-y-auto enables vertical scroll. px-3/pb-2 padding gives 12px
                     room for the -6px/-8px neumorphic card shadows. */}
                <div className="flex flex-1 min-h-0 min-w-0 flex-col gap-1.5 overflow-y-auto overflow-x-hidden px-3 pb-2 pt-3">
```

**Rationale:**
- `overflow-x-hidden` — explicitly sets `overflow-x: hidden` instead of letting CSS compute it as `auto`. This prevents a horizontal scrollbar from appearing while still clipping cleanly. Combined with `overflow-y-auto`, both axes use their specified values (CSS spec: when both are non-visible, specified values are used).
- `px-3` (12px) — gives 12px horizontal padding. The card shadow extends max -8px (hover), so shadow reaches 4px from container edge. The clip boundary is at 0px (padding box edge). Shadow is within bounds.
- `pt-3` (12px) — gives top padding for shadow + the `hover:-translate-y-0.5` (2px lift). Max shadow top = -8px - 2px = -10px from card. 12px - 10px = 2px clearance.
- `pb-2` (8px) — bottom shadow is `+6px` (downward, into content area), so less padding needed.
- `flex-1 min-h-0` — makes the cards container take remaining column height (after header) and allows it to shrink for vertical scroll. Without `min-h-0`, the flex item's `min-height: auto` prevents shrinking, breaking scroll.
- `min-w-0` — allows the container to shrink within the column flex context.

### 3. What NOT to Change

- **`src/app/globals.css`** — Do NOT modify `neuro-card` shadow values. The shadow is correct; the container must accommodate it.
- **Column width `w-72`** — This is the design spec. Do not change.
- **`neuro-card` class on `DraggableJobCard`** — Keep the neumorphic card styling.
- **dnd-kit drag-and-drop** — All drag listeners, attributes, and sortable context must remain intact.
- **"Open" and "Remove" buttons** — Must remain always visible in each card.

### 4. Vertical-Slice Order

This is a single-file, 3-edit fix. All edits must be applied together for the fix to work:
- Edit 1 (min-w-0 on card) without Edit 3 (container padding) would still clip shadows
- Edit 3 (container padding) without Edit 2 (Button fix) would still clip overflowing text
- Edit 2 (Button fix) without Edit 1 (min-w-0 on card) might still overflow in edge cases

Apply all three, then verify.

### 5. Assertion & Testing Requirements

**No new tests required** — this is a pure CSS/layout fix with no behavioral change, no API change, no data change. The fix alters only className strings on existing DOM elements.

**Manual visual verification** (describe in PR):
1. Navigate to `/en/applications` (must have at least one job in any column)
2. Verify job card titles show FULL text (e.g., "Software Engineer" not "re Engineer")
3. Verify company names show FULL text (e.g., "ExxonMobil" not "obil")
4. Verify "Added July X, YYYY" date is fully visible, not cut off on the left
5. Verify neumorphic shadows are visible on all four sides of each card (not clipped on left/top)
6. Verify drag-and-drop still works (drag a card between columns)
7. Verify "Open" and "Remove" buttons are visible at the bottom of each card
8. Verify no horizontal scrollbar appears in the card list area
9. Verify vertical scrolling works when a column has many cards

### 6. Verification Commands & Log Files

- **TypeScript check:** `npx tsc --noEmit`
- **Lint:** `pnpm lint`
- **Dev server (for manual visual check):** `pnpm dev` then open `http://localhost:3000/en/applications`
- If `tsc` fails: check stderr for type errors in `applications-view.tsx`
- If `lint` fails: check output for unused imports or Tailwind class issues
