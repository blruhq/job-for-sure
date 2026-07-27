# Implementation Spec & Plan: Mobile Responsiveness Audit & Enhancements

### 0. Architectural Decision Record (ADR) & Scaling Tradeoffs
- **Context & Constraints**:
  - The application is a Next.js 16 App Router application with Neumorphic styling (`neuro-surface`, `neuro-card`, `neuro-inset`, `neuro-divider`), Tailwind CSS v4, Zustand UI state, and custom responsive layouts.
  - On mobile devices (<768px viewports / iPhones / Android devices), several critical UX/UI components currently experience layout breakages, clipping, horizontal scrolling overflows, touch target sizing issues, or missing touch-friendly controls.
  - The PDF viewer renderer (`@react-pdf/renderer` inside `ResumePreview`) renders in an iframe and has fixed height requirements that can break mobile vertical scrolling if not encapsulated cleanly.
  - Navigation on mobile uses a slide-in overlay menu, but closing on route change or mobile navigation transitions requires strict state discipline.

- **Chosen Architecture**:
  - **CSS-First Touch & Responsive Scaling**: Fix layout containers using Tailwind responsive breakpoints (`md:`, `sm:`, `lg:`), flex-wrap defaults, touch target minimum sizing (`min-h-[44px]`, `min-w-[44px]`), and overflow containment (`overflow-x-hidden`, `max-w-full`).
  - **Mobile Bottom Bar Navigation / Adaptive Header**: Ensure topbar and mobile sidebar overlay provide seamless mobile navigation. Auto-close mobile sidebar overlay upon clicking any link on mobile.
  - **Mobile-Optimized Sub-View Switchers**:
    - Resume Detail: Maintain the toggle button bar (`✏️ Edit` vs `📄 Preview`) for mobile screens while fixing form field inputs, dynamic tag lists, drag handles, and section padding.
    - ATS View & Applications Kanban: Ensure ATS split panel degrades gracefully into single-column layout on mobile, and Applications Kanban board supports horizontal scrolling touch gestures smoothly with swipeable columns or condensed cards.
    - Chat UI: Adjust chat container, input bar, suggestion pills, and top status bar select boxes so they fit within `100dvh` without keyboard overlap or input truncation.

- **Discarded Alternatives**:
  - *Alternative A*: Separate dedicated mobile route routes (e.g. `/m/chat`). Rejected because App Router responsive layouts preserve clean state, URL sharing, and DRY code.
  - *Alternative B*: Replacing `@react-pdf/renderer` with HTML rendering on mobile. Rejected per ADR-002 (WYSIWYG single source of truth for PDF and preview).

---

### 1. Target Files & Folder Structure

- `src/app/[locale]/(app)/layout.tsx`: Update `AppShell` mobile overlay backdrop to auto-close sidebar on pathname change and mobile item click.
- `src/app/components/layout/sidebar.tsx`: Add auto-close callback when a link is clicked on mobile screens.
- `src/app/components/layout/navbar.tsx`: Enhance mobile topbar layout, brand title truncation, touch targets, and language/theme dropdown placement.
- `src/app/components/resume/resume-detail.tsx`: Mobile layout refinements: tab navigation scrollability, responsive header buttons, form field touch targets (min-h 44px), tag input wrap, mobile preview container adjustments.
- `src/app/components/chat/chat-view.tsx`: Responsiveness fixes for top status bar (flex-col on mobile, full-width select dropdowns), entry card grid (p-3 touch targets), suggestion pills horizontal scrolling container, and input bar padding on mobile devices.
- `src/app/components/ats/ats-view.tsx`: Responsive split layout refinement (flex-col on mobile with full width, clean gauge sizing, touch buttons).
- `src/app/components/pipeline/applications-view.tsx`: Kanban responsive column width and horizontal scroll container enhancements for mobile touch screens.
- `src/app/components/pipeline/job-detail-panel.tsx` & `src/app/components/chat/paste-jd-modal.tsx`: Modal and sheet drawer mobile bottom-sheet styling and touch dismiss fixes.
- `src/app/components/marketing/marketing-nav.tsx`: Mobile header drawer scrollability (`max-h-[calc(100dvh-3.5rem)] overflow-y-auto`), touch target optimization (`min-h-[44px]`), and auto-close drawer behavior.
- `src/app/[locale]/(marketing)/page.tsx`: Hero button stacking (`flex-col sm:flex-row`), text truncation/wrap fixes in mockups (`whitespace-normal`), footer link flex-wrap for 320px viewports.
- `src/app/[locale]/(marketing)/pricing/page.tsx`: Touch target heights for subscription CTA buttons (`min-h-[44px]`) and price text scaling on 320px screens.
- `src/app/components/marketing/features-bento.tsx`: Card padding reduction for mobile (`p-5 sm:p-8`), chat mockup word break protections.
- `src/app/components/marketing/interview-section.tsx`: Button touch heights, mock feedback strengths/improvements responsive stack (`grid-cols-1 sm:grid-cols-2`).

*File size rule*: All modified files maintain single responsibility and remain within established code size guidelines.

---

### 2. Import Definitions & Dependencies
- Standard React & Lucide icons (`Menu`, `X`, `ChevronRight`, `PanelLeft`).
- `cn` utility from `~/lib/utils`.
- Existing Zustand hooks: `useUIStore`.
- No new external npm packages required. Standard Tailwind v4 classes used exclusively.

---

### 3. Database Schema Changes
- None (N/A — pure client UI/UX responsive enhancement).

---

### 4. Step-by-Step Edits

#### Step 4.1: Mobile Navigation & Sidebar Overlay Auto-Close (`src/app/components/layout/sidebar.tsx` & `src/app/[locale]/(app)/layout.tsx`)
- Update `Sidebar` links to trigger `toggleSidebar()` when clicked if window width is mobile (<768px).
- In `AppShell`, listen to `pathname` changes to automatically close the mobile sidebar overlay when navigating to a new page.
- Ensure topbar action buttons (Language switcher, theme toggle, user menu) have minimum 44px touch targets (`min-h-[44px] min-w-[44px] flex items-center justify-center`).

#### Step 4.2: Chat UI Mobile Viewport & Touch Optimization (`src/app/components/chat/chat-view.tsx`)
- In `ChatView`, update top status bar (`Profile` and `Target` dropdowns): on mobile (`<640px`), stack selects vertically or wrap cleanly so dropdowns do not overflow screen boundaries.
- Ensure entry cards (`Upload Resume`, `Build with AI`, `Paste Job Posting`) have 44px+ touch heights and mobile gap spacing (`gap-3 sm:gap-4`).
- Wrap suggestion pills in `overflow-x-auto scrollbar-none` container with `touch-pan-x` for smooth touch scrolling.
- Refine input bar `leftActions` button and send button size for mobile touch precision.

#### Step 4.3: Resume Editor & PDF Preview Mobile Experience (`src/app/components/resume/resume-detail.tsx`)
- Update header action buttons (`Back`, `Find Jobs / View Resume / Resume Editor` tabs, `Delete` button): allow horizontal scrolling on narrow screens (`overflow-x-auto flex-nowrap shrink-0`) without clipping text.
- Form inputs in `EditorFormBody`: set `min-h-[44px]` touch target height for input fields, textareas, drag handles, and delete icons.
- Fix `TagInput` container to wrap tags gracefully on mobile screens without pushing inputs off-screen.
- Adjust `mobileView` (`'edit'` | `'preview'`) toggle bar: add clear visual active tab indicator, fix preview container height to `calc(100vh - 180px)` or `h-[calc(100dvh-180px)]` to avoid double scrolling issues.

#### Step 4.4: ATS Optimizer Mobile Layout (`src/app/components/ats/ats-view.tsx`)
- Standardize ATS layout split: `flex flex-col lg:flex-row`.
- On mobile/tablet, ensure left control panel takes full width with responsive padding (`p-4 sm:p-6`).
- Ensure score gauge SVG and text container scale cleanly without clipping on 320px-375px screens (e.g. iPhone SE / iPhone 13 mini).
- Action buttons (`Analyze Match`, `Health Check`, `Tailor Resume with AI`) updated to `min-h-[44px]` touch target height.

#### Step 4.5: Applications Kanban Board Mobile Scrolling (`src/app/components/pipeline/applications-view.tsx`)
- Modify column container for mobile: set column width to `w-[85vw] max-w-[320px] sm:w-72 shrink-0` so mobile users see the current column and a glimpse of the next column to hint horizontal scrolling.
- Add `snap-x snap-mandatory` to column container and `snap-center` to columns for native touch swipe experience on mobile devices.
- Ensure job card action buttons (`Open`, `Remove`, `Add Job`) meet touch accessibility guidelines (≥44px touch area).

#### Step 4.6: Global Touch Targets & Typography Audit Across Components
- Ensure standard buttons across modals (`UploadModal`, `PasteJDModal`, `ConfirmDialog`) utilize `min-h-[44px]` touch targets.
- Set `meta viewport` verification to ensure proper `viewport-fit=cover` and no unwanted initial zoom behavior on form inputs (font size minimum 16px or appropriate mobile scale to prevent iOS auto-zoom).

#### Step 4.7: Landing Page (`(marketing)`) Mobile Audit & Enhancements ✅
- **Mobile Header Navigation (`marketing-nav.tsx`)**:
  - Add `max-h-[calc(100dvh-3.5rem)] overflow-y-auto` to `#mobile-menu` overlay to prevent screen clipping on small devices (e.g. 320px iPhone SE).
  - Ensure links and CTA buttons have minimum `min-h-[44px]` touch targets with flex center alignment.
  - Auto-close drawer on link click and hash navigation.
- **Hero & Mockup Card (`(marketing)/page.tsx`)**:
  - Hero CTA buttons: change container to `flex-col sm:flex-row w-full sm:w-auto gap-3` on mobile (320px-430px) for full-width touchable CTAs.
  - Hero AI Chat mockup: replace `whitespace-nowrap` on text line 108 with `whitespace-normal break-words` to eliminate horizontal scrollbar leak on narrow screens.
  - Stat items: ensure 2-column grid (`grid-cols-2`) padding `p-2` fits cleanly on 320px screens.
- **Features Bento & How-it-Works (`features-bento.tsx`, `how-it-works.tsx`)**:
  - Bento cards: reduce padding on mobile from `p-8` to `p-5 sm:p-8` so content does not overflow 320px viewports.
  - Chat mockup inside Bento card: cap maximum user bubble width to `max-w-[85%]` and ensure text wraps gracefully without leaking.
- **Interview Section (`interview-section.tsx`)**:
  - Feedback card: change strengths/improvements grid from `grid-cols-2` to `grid-cols-1 sm:grid-cols-2` on mobile so bullet lists don't truncate on 320px screens.
  - Action buttons: change `flex items-center gap-3` to `flex-col sm:flex-row w-full sm:w-auto` with `min-h-[44px]` touch targets.
- **Pricing Page (`(marketing)/pricing/page.tsx`)**:
  - Ensure plan subscription CTAs (`handleSubscribe('month')` and `handleSubscribe('year')`) meet `min-h-[44px]` minimum height.
  - Ensure plan card pricing text scales down on 320px screens without overflow.
- **Footer & CTA Section (`(marketing)/page.tsx`)**:
  - Footer container: change `flex items-center justify-between` to `flex-col sm:flex-row gap-4 items-center justify-between text-center sm:text-left` to prevent text overlap on mobile.

---

### 4.5 Vertical-Slice Order
1. **Slice 1 (Mobile Navigation & Layout Shell)**: Topbar + Sidebar overlay auto-close + layout viewport lock (`src/app/[locale]/(app)/layout.tsx`, `navbar.tsx`, `sidebar.tsx`).
2. **Slice 2 (Marketing Landing Page & Mobile Drawer)**: MarketingNav mobile drawer + Hero layout/mockup wrap + Bento & Pricing mobile stack (`marketing-nav.tsx`, `(marketing)/page.tsx`, `pricing/page.tsx`, `features-bento.tsx`, `interview-section.tsx`).
3. **Slice 3 (Chat UI Mobile Polish)**: Topbar selects + entry cards + input bar + pill bar touch targets (`chat-view.tsx`).
4. **Slice 4 (Resume Detail & PDF Mobile View)**: Responsive header tabs + touch inputs + editor/preview switcher (`resume-detail.tsx`).
5. **Slice 5 (ATS & Applications Kanban Mobile)**: ATS flex-col stack + Kanban snap scrolling + touch cards (`ats-view.tsx`, `applications-view.tsx`).

---

### 5. Assertion & Testing Requirements
- **Unit & UI Layout Tests**: Verify responsive utility classes compile cleanly with zero layout regressions via `pnpm build` and `pnpm lint`.
- **Manual Mobile Viewport Verification**:
  - Mobile Sidebar overlay and Marketing header drawer open/auto-close cleanly upon selecting navigation items.
  - Landing page (Hero, Bento grid, How It Works, Interview section, Footer) and Pricing page display zero horizontal scroll leaks on 320px-430px viewports.
  - Landing page hero buttons, navigation links, and pricing CTAs meet minimum touch target height (≥44px).
  - Chat input, pills, and dropdowns fit within 320px - 430px viewports without horizontal screen overflow.
  - Resume editor form inputs are easily touchable (≥44px height) and mobile Edit/Preview switcher switches seamlessly.
  - Applications Kanban board swipes horizontally with touch snap points.

---

### 6. Verification Commands & Log Files
- Build Command: `pnpm build`
- TypeScript Check: `npx tsc --noEmit`
- Lint Command: `pnpm lint`
- Server Log Location: Console stdout / Vercel build logs
