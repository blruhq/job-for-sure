# Spec: Hero Mockup 1:1 Real UI Fidelity & 16:10 Fit Verification

## Section 1 — Product

### Goal & Scope
Verify and guarantee that every single tab mockup inside `src/app/components/marketing/hero-section.tsx` (`chat`, `ats`, `resume`, `interview`, `tracker`) is a 100% accurate visual representation of the real application UI (`/chat`, `/ats`, `/resumes`, `/interview`, `/applications`) while fitting perfectly inside the 16:10 aspect ratio desktop browser window mockup.

### Key Requirements
1. **1:1 UI Match**:
   - `chat`: Sidebar (Sessions list + AI Engine badge) + Main chat area (User prompt + AI recommendation box + Input bar). Matches `src/app/components/chat/chat-view.tsx`.
   - `ats`: Status bar + Radial gauge score (89%) + Matched/Missing keyword pills + AI Tailor button + A4 Resume sheet preview. Matches `src/app/components/ats/ats-view.tsx`.
   - `resume`: Form inputs (Name, Target Title, Bullet point) + PDF sheet preview. Matches `src/app/components/resume/resume-editor.tsx`.
   - `interview`: Question card + STAR answer + Score rating box. Matches `src/app/components/interview/interview-card.tsx`.
   - `tracker`: 4 Kanban columns (Bookmarked, Applied, Interviewing, Offer). Matches `src/app/[locale]/(app)/applications/page.tsx`.
2. **16:10 Frame Fit**:
   - Every tab's content must fit cleanly inside the container without causing unexpected vertical/horizontal scrolling or text clipping inside the browser frame.
3. **Mascot Placement**:
   - Jobby mascot peeks cleanly above the top-left corner without obscuring window tabs or title text.

---

## Section 2 — Engineering Handoff & Verification

### Target File
- `src/app/components/marketing/hero-section.tsx`

### Verification Checklist
- [x] `npx tsc --noEmit` passes cleanly
- [x] `pnpm lint` passes
- [x] `pnpm build` succeeds
- [x] Tab 1 default is `chat`
- [x] 16:10 aspect ratio fits all 5 tabs without overflow
