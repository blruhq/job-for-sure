# Implementation Spec & Plan: Logo Position Fix (Stationary on Sidebar Toggle)

### 0. Root Cause & Architectural Decision

**Problem:** The logo in the topbar appears to shift position when toggling the sidebar between collapsed (56px) and expanded (220px) states. Three rounds of prior edits attempted to fix this with absolute positioning inside the brand area container, but the logo still appears to move.

**Root Cause:** The logo `<Link>` is `position: absolute; left: 16px` inside a brand area `<div>` that has `position: relative` AND `transition-all` with width animation (220px↔56px). While absolute positioning should theoretically keep the logo stationary relative to the container's left edge, two factors cause apparent movement:

1. **`transition-all` on the containing block:** The `transition-all` class (vs `transition-[width]`) applies transition to ALL CSS properties. During the 200ms width animation, the browser creates a compositing context for the brand area. Sub-pixel rounding within this animated containing block can cause the absolutely-positioned child (logo) to render 1-2px differently between the start and end of the animation.

2. **Conditional sibling mount/unmount:** The brand text `<Link>` is conditionally rendered (`{!sidebarCollapsed && ...}`). When React mounts/unmounts this sibling DOM node, it triggers a layout recalculation within the brand area container, which can momentarily affect the rendered position of the absolutely-positioned logo.

**Fix Strategy — Decouple the logo from the animating container entirely:**
- Make the `<header>` element `position: relative` (the header never changes size or position — it's always full viewport width, 48px tall).
- Move the logo `<Link>` and brand text `<Link>` OUT of the brand area div, making them direct children of `<header>` with `position: absolute`.
- Replace the brand area with an empty spacer div that uses `transition-[width]` (NOT `transition-all`) — it has no content, no children, just reserves horizontal space.

This makes the logo's containing block the `<header>` (rock-solid, never animates), completely eliminating any possibility of sub-pixel shift or layout-recalculation interference.

### 1. Target Files

| File | Action | Change |
|------|--------|--------|
| `src/app/components/layout/navbar.tsx` | **MODIFY** | Restructure the `Topbar()` component's brand area (lines ~48-82) |

**No other files need changes.** The sidebar, layout, use-ui store, and globals.css are all correct and stay as-is.

### 2. What NOT to Change

- `src/app/components/layout/sidebar.tsx` — already correct, nav items use `pl-[16px]` in both states
- `src/app/[locale]/(app)/layout.tsx` — AppShell layout is correct
- `src/app/hooks/use-ui.ts` — Zustand store is correct
- `src/app/globals.css` — CSS variables (`--sidebar-width: 220px`, `--sidebar-collapsed-width: 56px`, `--topbar-height: 48px`) are correct
- Sidebar widths (220px / 56px) — must NOT change
- Topbar height (48px) — must NOT change
- Neumorphic design language — must be preserved

### 3. Step-by-Step Edits

#### Edit: `src/app/components/layout/navbar.tsx`

Replace the ENTIRE `<header>` block inside `Topbar()` (currently lines 49-111) with the new structure below.

**CURRENT CODE (to be replaced):**
```tsx
    <header className="flex h-[var(--topbar-height)] shrink-0 items-center neuro-surface z-50">
      {/* Brand area — matches sidebar width, collapses */}
      <div
        className={cn(
          'relative h-full shrink-0 transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)]',
          sidebarCollapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]',
        )}
      >
        {/* Logo — fixed left position, never moves */}
        <Link
          href="/chat"
          className="absolute left-[16px] top-1/2 -translate-y-1/2 flex items-center gap-2"
        >
          <div className="neuro-icon-well rounded-[3px] p-0.5">
            <Image
              src="/logo.png"
              alt="Job For Sure"
              width={24}
              height={24}
              className="shrink-0"
              priority
            />
          </div>
        </Link>
        {/* Brand text — fades in/out, doesn't affect logo position */}
        {!sidebarCollapsed && (
          <Link
            href="/chat"
            className="absolute left-[52px] top-1/2 -translate-y-1/2 text-sm font-semibold tracking-[-0.02em]"
          >
            JOB FOR SURE
          </Link>
        )}
      </div>

      {/* Sidebar toggle — visible on all sizes */}
```

**NEW CODE (replacement):**
```tsx
    <header className="relative flex h-[var(--topbar-height)] shrink-0 items-center neuro-surface z-50">
      {/*
        Logo — positioned relative to the HEADER (not the brand area).
        The header never changes size, so left-[16px] is bulletproof.
        z-10 ensures it sits above the spacer div below.
      */}
      <Link
        href="/chat"
        className="absolute left-[16px] top-1/2 -translate-y-1/2 z-10 flex items-center"
      >
        <div className="neuro-icon-well rounded-[3px] p-0.5">
          <Image
            src="/logo.png"
            alt="Job For Sure"
            width={24}
            height={24}
            className="shrink-0"
            priority
          />
        </div>
      </Link>
      {/*
        Brand text — also relative to header, fades in/out.
        Does not affect logo position because both are absolutely positioned.
      */}
      {!sidebarCollapsed && (
        <Link
          href="/chat"
          className="absolute left-[52px] top-1/2 -translate-y-1/2 z-10 text-sm font-semibold tracking-[-0.02em]"
        >
          JOB FOR SURE
        </Link>
      )}
      {/*
        Brand area spacer — empty div, NO content, NO children.
        Only animates width (transition-[width], NOT transition-all).
        This reserves horizontal space so the toggle button sits at the right edge.
      */}
      <div
        className={cn(
          'h-full shrink-0 transition-[width] duration-200 ease-[cubic-bezier(0.2,0,0,1)]',
          sidebarCollapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]',
        )}
      />

      {/* Sidebar toggle — visible on all sizes */}
```

**The rest of the header (toggle button, spacer, actions) stays EXACTLY the same.** Only the brand area structure above the toggle button changes.

#### Key Differences (diff summary):

| Aspect | OLD | NEW |
|--------|-----|-----|
| Header position | `flex` (static) | `relative flex` (positioned) |
| Logo location | Inside brand area div | Direct child of `<header>` |
| Logo containing block | Brand area div (animates width) | `<header>` (never changes) |
| Brand area role | `relative` container holding logo + text | Empty spacer, `transition-[width]` only |
| Transition type | `transition-all` | `transition-[width]` |
| Logo z-index | implicit | `z-10` (above spacer) |
| Logo `gap-2` | Present (unnecessary) | Removed |

### 4. Why This Works (CSS Containing Block Theory)

1. **`position: absolute` resolves against the nearest positioned ancestor.** Previously that was the brand area div (`position: relative`). Now it's the `<header>` (`position: relative`).

2. **The `<header>` never changes width, height, or position.** It's always `100vw × 48px` at `x=0, y=0`. So `left: 16px` relative to the header is ALWAYS at viewport `x=16px`, regardless of what the spacer div does.

3. **The spacer div is empty.** No children, no content. Its only job is to push the toggle button to the correct x position (56px or 220px). Since it has no positioned descendants, it cannot affect the logo.

4. **`transition-[width]` is stricter than `transition-all`.** Only the `width` property animates. No other property can accidentally transition, eliminating any compositing-context side effects.

### 5. Verification Checklist

After implementing, verify ALL of these:

- [x] **Logo stays at exact same pixel when toggling:** Open dev tools, inspect the logo `<img>` element, note its `getBoundingClientRect().left` value. Toggle sidebar. Value must be identical (±0px) in both states.
- [x] **Logo aligns with sidebar nav icons:** The logo icon-well left edge should be at the same x as the nav icon left edge (both at 16px from viewport left). The nav icons use `pl-[16px]`.
- [x] **Brand text fades in/out smoothly:** When expanding, "JOB FOR SURE" text appears at `left: 52px`. When collapsing, it disappears. No jarring jump.
- [x] **Toggle button animates smoothly:** The PanelLeft toggle button slides from x≈60px (collapsed) to x≈224px (expanded) over 200ms.
- [x] **No overlap:** When collapsed (56px), the logo icon-well (16px-44px) must NOT overlap the toggle button (starts at ~60px). 16px gap minimum.
- [x] **Neumorphic styling preserved:** The `neuro-icon-well` class on the logo container is unchanged. The `neuro-surface` on the header is unchanged.
- [x] **Logo is clickable:** The `<Link href="/chat">` must navigate to `/chat` when clicked in both states.
- [x] **Dark mode works:** Toggle dark mode, verify logo is still stationary and neumorphic shadows render correctly (dark mode neutralizes neuro effects to flat shadows).
- [x] **Mobile works:** On mobile (<768px), the desktop sidebar is hidden. The logo should still appear in the topbar at left:16px.

### 6. Build & Test Commands

```bash
# Type check
npx tsc --noEmit

# Lint
pnpm lint

# Build (full compile check)
pnpm build

# Dev server visual check (already running on localhost:3000)
# 1. Open http://localhost:3000/en/chat
# 2. Log in
# 3. Open browser DevTools → Console
# 4. Run this snippet to measure logo position:
#    const logo = document.querySelector('header img[alt="Job For Sure"]');
#    console.log('Logo left:', logo.getBoundingClientRect().left);
# 5. Click the sidebar toggle button
# 6. Run the same snippet again
# 7. The 'left' value must be IDENTICAL in both states
```

### 7. Assertion & Testing Requirements

- **Unit Tests:** N/A — no behavior/logic change, pure CSS/layout fix.
- **Integration Tests:** N/A — no API or data flow change.
- **E2E Tests:** N/A — visual positioning fix, not a user-flow change.
- **Manual Verification:** REQUIRED — follow the verification checklist in section 5. The engineer must confirm via browser DevTools that `getBoundingClientRect().left` on the logo `<img>` is identical before and after toggling.
