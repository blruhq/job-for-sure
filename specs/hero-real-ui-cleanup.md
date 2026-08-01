# Spec: 1:1 Actual UI Component Extraction for Hero Preview

## Section 1 — Product

### Goal & Scope
The hero preview must show REAL app UI state (or exact simplified component clones of real components), eliminating synthetic / fake copy and artificial labeled cards like "TechCorp ATS Optimization", "Interactive Form Fields", "Live Sync", "Behavioral Question", etc.

### Issues to Fix
1. **Chat Tab (`chat`)**:
   - The fake session list ("TechCorp ATS Optimization", "Resume Review — Senior FE", "Behavioral Interview Prep") does not reflect how real chat sessions are rendered in `src/app/components/chat/chat-view.tsx`.
   - Remove fake session sidebar labels. Replace with actual empty state cards OR clean real chat conversation matching `ChatView` structure without placeholder session titles.

2. **Resume Tab (`resume`)**:
   - "Interactive Form Fields" and "Live Sync" badges do not exist in `src/app/[locale]/(app)/resumes/page.tsx` or `src/app/components/resume/resume-editor.tsx`.
   - Replace with the real resume editor form section labels (e.g. "Personal Details", "Professional Summary", "Work Experience") matching `src/app/components/resume/resume-editor.tsx`.

3. **Interview Tab (`interview`)**:
   - Remove fake badges like "Behavioral Question" / "STAR Verified" if they don't match `src/app/components/interview/interview-card.tsx`.
   - Match `src/app/components/interview/interview-card.tsx` layout directly.

4. **QA Verification**:
   - Use `qa` subagent (or Playwright/screenshot verification) to inspect the rendered page and confirm visual quality.

---

## Section 2 — Engineering Handoff

### Target Files
- `src/app/components/marketing/hero-section.tsx`
- `specs/hero-real-ui-cleanup.md`

### Verification Checklist
- [ ] No synthetic labels ("TechCorp ATS Optimization", "Interactive Form Fields", "Live Sync", "STAR Verified")
- [ ] Chat tab matches actual `ChatView` component structure
- [ ] Resume tab matches actual `ResumeEditor` component structure
- [ ] QA verification executed via `qa` agent
- [ ] `npx tsc --noEmit` and `pnpm build` pass cleanly
