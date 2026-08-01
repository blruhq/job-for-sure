# Spec: Hero Mockup Frame Center Alignment & Production Polish

## Section 1 — Product

### Goal & Scope
Fix the horizontal center alignment and visual density/scaling of the browser mockup frame component in `src/app/components/marketing/hero-section.tsx` to achieve a 100% production-grade Vercel/Supabase-style peeking hero.

### Issues to Fix
1. **Horizontal Center Alignment**:
   - Ensure the outer container `<div className="w-full max-w-[1140px] mx-auto">` is perfectly centered within the flex column section.
   - Verify layout wrappers do not cause flex-start or left alignment shifts on any screen width.

2. **Production-Grade Mockup Internal Sizing**:
   - The interactive tab content must not use artificial tiny/compressed font sizes (`text-[10px]`, `text-[11px]`).
   - Remove squished multi-column layout artifacts.
   - Use standard 14px/16px (`text-sm`/`text-base`) body typography with generous padding so the preview looks like an actual 100% full-scale desktop app screen.
   - Fix inner tab components (Chat, Resume Builder, Interview Prep, Job Tracker) so each tab's content area fills the 16:10 frame naturally without awkward vertical or horizontal stretching.

---

## Section 2 — Engineering Handoff

### Target File
- `src/app/components/marketing/hero-section.tsx`

### Verification Checklist
- [ ] Browser mockup frame is 100% horizontally centered on desktop (1440px), laptop (1024px), tablet (768px), and mobile (375px)
- [ ] Text inside mockup uses standard readable font sizes (`text-xs`, `text-sm`, `text-base`)
- [ ] Mascot `Jobby` sits cleanly peeking above the frame without obscuring tab buttons or title text
- [ ] `npx tsc --noEmit` and `pnpm lint` pass
- [ ] `pnpm build` succeeds
