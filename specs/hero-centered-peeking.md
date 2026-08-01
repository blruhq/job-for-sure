# Spec: Centered Peeking Tabbed Hero Section

## Section 1 — Product

### Goal & Scope
Redesign ONLY the hero section component in `src/app/[locale]/(marketing)/page.tsx` (and dedicated hero sub-component if extracted) into a **Centered + Peeking Tabbed Window Hero** (Vercel/Supabase style).

### Core Features of New Hero Layout
1. **Top Badge**: `⚡ AI CAREER COACH & ATS OPTIMIZER` with subtle glow/pulse indicator.
2. **Centered Typography**:
   - Giant responsive headline (`text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tighter`).
   - Subtitle centered with max-w-2xl (`text-lg sm:text-xl text-muted-foreground`).
3. **Centered CTAs**:
   - Primary: `Start Free Chat →` (`/chat`)
   - Secondary: `Create Account` (`/register`)
   - Micro trust text below: "Free to start · No credit card required".
4. **1200px Peeking App Window Frame**:
   - Simulated browser/macOS header (`🔴 🟡 🟢 jobforsure.app`).
   - **Interactive Tabs Bar** (Client state: `activeTab`):
     - `🎯 ATS Matcher (89%)`
     - `📄 Resume Builder`
     - `🎙️ Interview Prep`
     - `📊 Job Tracker`
   - Tab Content Area: Shows active mockup view for each tab.
   - Window cuts off / peeks at screen bottom (`translate-y-4` / bottom fold effect) to encourage scrolling.
5. **Mascot Integration**:
   - Jobby mascot peeking over top-right or bottom-left corner of the window frame (`variant="breathe"`) without floating up/down.

---

## Section 2 — Engineering Handoff

### Target Files
- `src/app/components/marketing/hero-section.tsx` (NEW or update in page.tsx)
- `src/app/[locale]/(marketing)/page.tsx`
- `messages/en.json` & `messages/th.json` (hero tab labels if needed)

### Step-by-Step Edits

1. Build client-interactive `<HeroSection />` component with active tab state (`ats`, `resume`, `interview`, `tracker`).
2. Add mock previews for each tab:
   - **ATS Matcher tab**: Score 89%, matched vs missing skills pill grid, career coach AI suggestion.
   - **Resume Builder tab**: Split layout preview with real-time form field + rendered PDF paper view.
   - **Interview Prep tab**: AI interviewer question card + STAR framework rating badge.
   - **Job Tracker tab**: Kanban column pills (Bookmarked, Applied, Interviewing, Offer).
3. Replace existing Hero section in `page.tsx` with `<HeroSection />`.
4. Ensure full responsive support (tabs horizontally scroll on mobile, text centers cleanly).

---

## Section 3 — Verification

- [x] `npx tsc --noEmit` passes
- [x] `pnpm lint` passes
- [x] `pnpm build` passes
- [x] Interactive tab switching works smoothly in browser
- [x] Mobile 375px renders cleanly without horizontal page overflow
