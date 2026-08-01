# Implementation Spec & Plan - Full Responsive UX/UI Audit & Adaptations

### 0. Architectural Decision Record (ADR) & Scaling Tradeoffs
- **Context & Constraints**:
  - The application serves users across diverse viewports: Mobile Phones (320px–430px), Tablets ( portrait 768px, landscape 1024px), Laptops (1024px–1440px), and Ultra-wide Desktop displays (1440px+).
  - Web views range from dynamic app tools (Chat, Resume Editor) requiring viewport height lock (`100dvh`) to document/marketing pages requiring standard body scrolling (Landing Page, Settings, Billing).
  - Input mechanisms vary between touch screens (`@media (pointer: coarse)`) and fine mouse pointers. Touch interactions require minimum touch targets of 44x44px and instant active state feedback without persistent hover artifacts.
- **Chosen Architecture**:
  - Mobile-first Tailwind CSS design system using native breakpoint classes (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`).
  - Explicit container width boundaries (`max-w-7xl` for standard app sections, `max-w-full` / split-pane layouts for workspace views like Chat and Resume Editor).
  - Dynamic viewport height locking using standard `dvh` (`h-[calc(100dvh-4rem)]` or `h-[100dvh]`) for fixed workspaces, preventing mobile browser address bar jumpiness while allowing document scrolling on standard settings and content pages.
  - Media-query driven input layer (`@media (pointer: coarse)`) to enhance touch target padding (min 44px) and prevent stuck hover states on touch devices.
  - Responsive PDF preview strategy: Tabbed view toggle on mobile (<768px), `h-[60vh]` embedded stack on tablet portrait (768px-1023px), and side-by-side full-height workspace (`h-full`) on laptop/desktop (≥1024px).
- **Discarded Alternatives**:
  - *Alternative A*: JS-calculated dynamic resize listeners for height lock. Discarded due to main-thread overhead and layout thrashing compared to native CSS `dvh`.
  - *Alternative B*: Unconditional viewport scroll lock on all pages. Discarded because settings and landing pages overflow viewport bounds on mobile and require natural document scrolling.

---

### 1. Target Files & Folder Structure
- `src/app/globals.css` - Custom breakpoint utility classes, dynamic viewport height utilities, touch-target safety mixins, fine/coarse pointer rules.
- `src/app/[locale]/(app)/layout.tsx` - Shell responsive frame, sidebar drawer integration, topbar responsive padding.
- `src/components/layout/sidebar.tsx` - Responsive drawer collapse for screen widths `<1024px`, fixed sidebar for `≥1024px`.
- `src/components/layout/topbar.tsx` - Mobile hamburger trigger, topbar height adjustment (`4rem` / `h-16`), dynamic responsive page titles.
- `src/components/resume/resume-editor-layout.tsx` - Viewport height lock workspace (`h-[calc(100dvh-4rem)]`), responsive PDF panel split/tab toggle.
- `src/components/resume/pdf-viewer-wrapper.tsx` - Responsive height scaling for PDF viewer iframe across phone, tablet, and desktop viewports.
- `src/components/chat/chat-layout.tsx` - Chat stream viewport lock (`h-[calc(100dvh-4rem)]`), input bar sticky positioning and mobile keyboard offset.
- `src/components/ui/button.tsx` - Touch target normalization (min 44px height/width on `pointer: coarse`).

---

### 2. Import Definitions & Dependencies
- Standard Tailwind CSS utilities (`@tailwindcss/postcss`).
- `lucide-react` icons (`Menu`, `X`, `FileText`, `Edit3`, `Sliders`).
- Existing layout components from `src/components/layout/`.
- No new external libraries required.

---

### 3. Database Schema Changes
- N/A — Purely client-side responsive visual layout and interaction audit.

---

### 4. Step-by-Step Edits

#### Step 4.1: Breakpoint Matrix & Container Standardization ✅
- Audit and normalize breakpoint boundaries across app pages:
  - `xs`: 320px - 479px (Small phones: iPhone SE, Android compact)
  - `sm`: 480px - 767px (Large phones / phablets)
  - `md`: 768px - 1023px (Tablet portrait)
  - `lg`: 1024px - 1439px (Tablet landscape / Laptop)
  - `xl`: 1440px - 1919px (Desktop)
  - `2xl`: 1920px+ (Ultra-wide)
- Apply `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` on standard content containers (Dashboard, Settings, Billing, Job List).
- Apply `w-full max-w-full px-2 sm:px-4` on full-bleed interactive workspaces (Resume Editor, AI Chat).

#### Step 4.2: Tablet Portrait vs Landscape Layout Transitions ✅
- Refactor application shell sidebar:
  - Below `1024px` (`<lg`): Sidebar renders as an off-canvas slide-over drawer triggered by topbar hamburger button.
  - At `1024px` and above (`≥lg`): Sidebar renders as a persistent fixed column (`w-64`).
- Refactor grid layouts across dashboard and job search cards:
  - Default: `grid-cols-1` (Mobile)
  - `md:` (768px): `grid-cols-2` (Tablet portrait)
  - `lg:` (1024px): `grid-cols-3` (Laptop/Desktop landscape)

#### Step 4.3: Viewport Height Locking vs Document Scrolling Strategy ✅
- Set strict viewport height lock `h-[calc(100dvh-4rem)] overflow-hidden` for interactive app tools:
  - `/app/chat`: Fixed stream container with internal auto-scroll and bottom fixed input bar.
  - `/app/resume/[id]`: Split workspace (Editor left, PDF preview right) anchored to dynamic viewport height.
- Set standard document scrolling `min-h-screen overflow-y-auto` for content-dense pages:
  - Landing page, Settings, Billing, Application Kanban board, Public Marketing pages.

#### Step 4.4: Touch vs Pointer Adaptation & Touch Targets
- In `globals.css` / UI primitives, configure `@media (pointer: coarse)` overrides:
  - Force minimum touch target size of 44px × 44px for interactive controls (`button`, `input`, `select`, icon buttons, tabs).
  - Add active state feedback classes (`active:scale-95 active:bg-accent/80`) for instant tactile response on tap.
  - Suppress sticky `:hover` background styles on touch devices by scoping hover states to `@media (pointer: fine)`.

#### Step 4.5: PDF Viewer Responsive Adaptation Across Spectrum ✅
- Implement responsive PDF viewer containers in `pdf-viewer-wrapper.tsx` & `resume-editor-layout.tsx`:
  - **Phone (<768px)**: Render PDF preview inside a tabbed view toggle ("Edit Form" vs "Preview PDF"). Full viewport focus for selected tab.
  - **Tablet Portrait (768px - 1023px)**: Stack Editor and PDF Viewer vertically. Set PDF viewer height to `h-[60vh]` with standalone scroll lock.
  - **Laptop/Desktop (≥1024px)**: Render side-by-side split screen (`w-1/2` Editor, `w-1/2` PDF Viewer). PDF Viewer takes `h-full` within `h-[calc(100dvh-4rem)]`.

---

### 4.5 Vertical-Slice Order
1. **Slice 1 (Breakpoints & Touch Primitives)**: Update `globals.css` and UI primitives (`button.tsx`, `topbar.tsx`) for pointer adaptation and min 44px touch targets.
2. **Slice 2 (Shell & Tablet Sidebar)**: Refactor app shell layout and `sidebar.tsx` drawer transition at `<1024px` breakpoint.
3. **Slice 3 (Workspace Viewport Locking)**: Apply `100dvh` lock to Chat and Resume Editor pages while verifying document scroll on Settings/Landing.
4. **Slice 4 (PDF Viewer Responsive Spectrum)**: Implement Tab toggle (<768px), stacked `60vh` (768px-1023px), and side-by-side `h-full` (≥1024px) in `resume-editor-layout.tsx`.

---

### 5. Assertion & Testing Requirements
- **Unit Tests**:
  - Test topbar drawer toggle state transitions (open/close on mobile viewport).
  - Test tab view toggle state switching between Editor and Preview on mobile.
- **Integration Tests**:
  - Verify breakpoint utility classes match specified design tokens.
- **E2E UI Tests**:
  - Playwright test at `375x812` (Mobile phone): Ensure sidebar is hidden behind hamburger menu, PDF tab switch functions, touch target size ≥44px.
  - Playwright test at `768x1024` (Tablet portrait): Ensure sidebar collapses to drawer, grid renders 2 columns, PDF viewer scales to `60vh`.
  - Playwright test at `1440x900` (Desktop): Ensure persistent sidebar (`w-64`), side-by-side `50/50` resume editor and PDF viewer (`h-full`).

---

### 6. Verification Commands & Log Files
- Build Command: `pnpm build`
- TypeCheck Command: `npx tsc --noEmit`
- Lint Command: `pnpm lint`
- Test Command: `pnpm test`
- Log Location: Browser DevTools Console / Playwright Test Runner output logs
