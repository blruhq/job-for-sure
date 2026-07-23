# Post-Implementation Fixes + Smoke Test Plan

> **For the coding agent:** 2 code fixes, then start the dev server. Do NOT skip the smoke test.

## Issues Found

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| 1 | 3 unused imports in `tailor-review-panel.tsx` | Trivial | Remove them |
| 2 | `?mode=review` URL param is ignored — **user lands on "Find Jobs" tab instead of editor** | **Real bug** | Read param, auto-switch to editor tab |
| 3 | Animation classes (`animate-in slide-in-from-right`) | Non-issue | `tw-animate-css` is already installed — works fine. Do NOT touch. |

---

## Fix 1: Remove unused imports

**File:** `src/app/components/resume/tailor-review-panel.tsx`

Find line 4:
```typescript
import { Check, X, ChevronDown, ChevronRight } from 'lucide-react'
```

Replace with:
```typescript
import { Check } from 'lucide-react'
```

That's it. Only `Check` is used (line 157: `<Check size={10} strokeWidth={3} />`).

---

## Fix 2: Wire `?mode=review` to auto-switch to editor tab (REAL BUG)

**The problem:** When ATS view calls `router.push('/resume/${resume.id}?mode=review')`, the user lands on the resume page. But `ResumeDetail` defaults to `tab === 'jobs'` (Find Jobs tab). The review mode only renders when `tab === 'editor'`. So the user sees the Find Jobs tab — no review panel, no changes to accept. The `pendingTailor` data is sitting in the store unused.

**The fix:** Read the URL search param on mount. If `mode=review`, switch to the editor tab.

### 2A. Add useSearchParams import

**File:** `src/app/components/resume/resume-detail.tsx`

Find line 4:
```typescript
import { useRouter } from 'next/navigation'
```

Replace with:
```typescript
import { useRouter, useSearchParams } from 'next/navigation'
```

### 2B. Read the param and auto-switch to editor tab

In the `ResumeDetail` component function, find the state declarations (around line 340, after the existing `useState` declarations for tab, galleryOpen, etc.).

Find:
```typescript
  const [tab, setTab] = useState<'jobs' | 'view' | 'editor' | 'cover-letter'>('jobs')
```

Replace with:
```typescript
  const [tab, setTab] = useState<'jobs' | 'view' | 'editor' | 'cover-letter'>('jobs')
  const searchParams = useSearchParams()
```

Then, after the existing `useEffect` for section suggestions (the one that starts around line 398 with `useEffect(() => { if (tab === 'editor' && !suggestionAnalysed.current...`), add a new useEffect:

```typescript
  // ── Auto-switch to editor tab when arriving with ?mode=review ──
  useEffect(() => {
    const mode = searchParams.get('mode')
    if (mode === 'review' && storePendingTailor) {
      setTab('editor')
    }
  }, [searchParams, storePendingTailor])
```

This ensures:
- Arriving from ATS "Tailor Resume with AI" → lands on editor tab in review mode
- The `pendingTailor` check prevents switching if the data expired or was cleared
- The effect re-runs if the param changes (defensive)

### 2C. Verification (code level)

After the fix, trace this flow mentally:
1. ATS view: `setPendingTailor({...})` then `router.push('/resume/${id}?mode=review')`
2. Page loads → `ResumeDetail` renders → `useEffect` fires → `searchParams.get('mode')` returns `'review'` → `storePendingTailor` is non-null → `setTab('editor')`
3. Editor tab renders → `isReviewMode` is true (because `storePendingTailor.baseResumeId === resumeId`) → review panel + live PDF shows

---

## Smoke Test Checklist

After applying both fixes, run the dev server and manually verify each feature.

### Start dev server

```bash
pnpm dev
```

Wait for "Ready" in terminal. Open the app in the browser.

### Test 1: Paste-URL Tracker Intake

| Step | Action | Expected |
|------|--------|----------|
| 1 | Navigate to Applications (sidebar → Applications) | Kanban board loads |
| 2 | Find the paste-URL input in the header | Input is visible with placeholder text |
| 3 | Paste a Greenhouse job URL (e.g. `https://boards.greenhouse.io/embed/jobapp?id=XXXX`) and press Enter | Spinner shows, then a card appears in "Bookmarked" column with company + title |
| 4 | Try an invalid URL (e.g. "not-a-url") | Error toast: "Please enter a valid URL" |
| 5 | Try a LinkedIn URL | Error toast with helpful message about LinkedIn requiring paid API |

**Pass criteria:** Step 3 must produce a card. If the scrape fails for all URLs, the scraper itself may be blocked by CORS/network — check server logs.

### Test 2: Live PDF Editor Pane

| Step | Action | Expected |
|------|--------|----------|
| 1 | Select a resume from sidebar → click "Resume Editor" tab | Form on left (55%), live PDF on right (45%) |
| 2 | Type in the "Professional Summary" textarea | PDF updates within ~500ms. Typing must NOT feel laggy. |
| 3 | Add a skill tag (type + Enter) | Skill appears in PDF preview |
| 4 | Edit a bullet point in Work Experience | PDF updates |
| 5 | Click "Save Changes" | Toast: "Resume saved". Tab stays on editor (does NOT switch to Find Jobs) |
| 6 | Resize browser to mobile width (<1024px) | PDF hides, replaced by collapsible "Preview PDF" toggle |
| 7 | Click "Preview PDF" toggle on mobile | PDF shows in a ~500px tall panel |

**Pass criteria:** Step 2 is the critical one. If typing feels janky (input lag > 100ms), the `useDeferredValue` is not enough — may need to increase debounce. PDF must update visibly.

### Test 3: Co-Pilot Drawer

| Step | Action | Expected |
|------|--------|----------|
| 1 | In the editor tab, find the "Co-Pilot" button in the toolbar (top right, with Sparkles icon) | Button is visible |
| 2 | Click it | Drawer slides in from the right (380px max width). Backdrop on mobile. |
| 3 | Type a message and press Enter | AI responds (streaming dots show) |
| 4 | Click the X in drawer header | Drawer closes. PDF pane is fully visible again. |
| 5 | Click outside the drawer (on mobile) | Drawer closes (backdrop click) |

**Pass criteria:** Drawer opens/closes without layout shift. Chat works inside the drawer.

### Test 4: Tailor Review Mode (THE BIG ONE)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Navigate to ATS Optimizer (sidebar → ATS Optimizer) | ATS view loads |
| 2 | Paste a job description (50+ words of real JD text) into the text area | JD text shows |
| 3 | Click "Analyze" | Analysis results appear (score, matched/missing skills) |
| 4 | Click "Tailor Resume with AI" | Button shows "Rewriting Resume..." spinner |
| 5 | Wait for AI response (5-15 seconds) | Page navigates to `/resume/{id}?mode=review` |
| 6 | **VERIFY:** Editor tab auto-selected (not Find Jobs) | Editor tab is active. Review panel on left, PDF on right. |
| 7 | Review panel shows list of changes | Each change has: field type, label, before (red strikethrough), after (green), rationale |
| 8 | All changes are checked (accepted) by default | Checkmarks visible, PDF shows fully-optimized resume |
| 9 | Uncheck one change | PDF updates to revert that specific change |
| 10 | Click "Accept all" | All changes checked again |
| 11 | Click "Reject all" | All changes unchecked. Apply button disabled. |
| 12 | Re-check 2-3 changes | Apply button shows "Apply N changes" |
| 13 | Click "Apply N changes" | Toast: "Tailored variant created!". Exits review mode. Returns to normal editor. |
| 14 | Check sidebar | New variant appears indented (└) under the base resume with label "Tailored for Target Company — Target Position" |
| 15 | Click the variant in sidebar | Opens the variant resume in editor (normal mode, not review) |

**Pass criteria:** Steps 5-6 are the bug fix verification. Step 9 is the core feature — toggling must update the PDF. Step 14 verifies variant grouping.

**If step 5 fails (navigation doesn't happen):** Check browser console for errors. The ATS `handleTailor` might be failing silently.

**If step 9 fails (PDF doesn't update on toggle):** Check that `toggleAcceptedChange` in store.tsx is creating a new Set and the `reviewPreviewResume` useMemo in resume-detail.tsx is recomputing.

**If AI returns no changes (step 7 shows empty):** The enriched prompt may not be producing the new schema. Check the `/api/ai/tailor` response in the Network tab. The API now expects `id`, `field` (enum), `label` — if the AI doesn't emit these, the Zod validation will fail.

### Test 5: Variant Sidebar Grouping

| Step | Action | Expected |
|------|--------|----------|
| 1 | After Test 4 creates a variant, look at sidebar (expanded mode) | Base resume shows normally. Variant is indented below with `└` prefix and label. |
| 2 | Click the variant | Navigates to variant editor |
| 3 | Hover over variant → click trash icon | Delete confirmation dialog |
| 4 | Confirm delete | Variant disappears from sidebar |
| 5 | Base resume is unaffected | Base resume still in list |

**Pass criteria:** Variants nest correctly under their base. Deleting a variant doesn't affect the base.

---

## What NOT to Fix

| Item | Why |
|------|-----|
| `animate-in slide-in-from-right` classes | `tw-animate-css` v1.4.0 is installed. Classes work. |
| `handleOptimize` silent overwrite (resume-detail.tsx ~line 865) | Pre-existing behavior, not a regression from this implementation. Flag for future iteration — should also route through review mode. NOT in scope for this fix. |
| E2E tests | After smoke test passes, write a separate plan for Playwright E2E regression tests. |

---

## File Manifest

| File | Action | Fix |
|------|--------|-----|
| `src/app/components/resume/tailor-review-panel.tsx` | EDIT — remove 3 unused imports | 1 |
| `src/app/components/resume/resume-detail.tsx` | EDIT — add useSearchParams + useEffect for ?mode=review | 2 |
