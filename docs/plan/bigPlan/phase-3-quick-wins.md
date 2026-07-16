# Phase 3 — Quick Wins (Salary + AI Resume Review + Dashboard)

> **Time:** 2-3 days
> **Depends on:** Phase 0 (schema fix). Phase 1 (panel) recommended but not blocking.
> **All features are now possible because the DB has proper application records.**

## What & Why

Three quick wins that are now possible because the JSONB blob was migrated to proper records:

1. **Salary Tracking** — the `salary` column already exists. Just display it on cards and add offer comparison.
2. **AI Resume Review** — proactive line-by-line critique using existing AI infra. Huntr, Teal, Simplify all have this. You only have ATS keyword match.
3. **Metrics Dashboard** — funnel stats from proper records. Huntr has this.

---

## Part A: Salary Tracking Display

### What
Show salary on Kanban cards and in job detail panel. Add a "compare offers" view.

### Files to Edit

**`src/app/components/pipeline/applications-view.tsx`**
- On each Kanban card, show salary text below location
- Parse the `salary` field (already stored as text string from scraping)

```tsx
// Inside the card render, after location:
{job.salary && (
  <span className="text-xs text-muted-foreground">
    {job.salary}
  </span>
)}
```

**`src/app/components/pipeline/job-detail-panel.tsx`**
- Show salary prominently in header
- If status is "offered", show "Compare Offers" section

**PipelineJob type** (`src/app/types/resume.ts`):
- Add `salary?: string` to PipelineJob if not already present

### Offer Comparison View
When user has multiple "offered" applications, show a comparison table:
- Company | Salary | Location | Match Score | Commute

This is a simple table component that queries `applications WHERE status = 'offered'`.

### API
No new API needed — salary is already in the application record returned by `GET /api/applications`.

### Store
The `mapAppToJob` function in `store.tsx` already maps `app.salary` — verify it's included in PipelineJob.

---

## Part B: AI Resume Review

### What
A proactive "Review My Resume" button that scans the ENTIRE resume and returns line-by-line critique:
- "This bullet lacks metrics — add numbers"
- "This skill section is thin for your role"
- "Summary is too generic — be more specific"
- "Gap detected: no quantifiable achievements"

This is DIFFERENT from ATS match (which compares resume to a specific JD). This is a GENERAL quality review.

### New API Route: `src/app/api/ai/resume-review/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { generateObjectWithFailover } from '~/lib/ai-providers'
import { withAuth } from '~/lib/with-auth'
import { z } from 'zod'

const ReviewSchema = z.object({
  score: z.number().min(0).max(100),
  issues: z.array(z.object({
    section: z.string(),
    severity: z.enum(['critical', 'warning', 'suggestion']),
    message: z.string(),
    currentText: z.string().optional(),
    suggestedFix: z.string().optional(),
  })),
  strengths: z.array(z.string()),
  summary: z.string(),
})

export const POST = withAuth(async (req, { user }) => {
  const { resumeData } = await req.json()

  const result = await generateObjectWithFailover({
    schema: ReviewSchema,
    system: `You are an expert resume reviewer. Analyze the resume and provide:
    1. Overall quality score (0-100)
    2. Line-by-line issues with severity (critical/warning/suggestion)
    3. Strengths to keep
    4. Executive summary

    Focus on:
    - Impact: Are bullets quantified with metrics?
    - Clarity: Is language clear and concise?
    - ATS-friendliness: Are keywords present?
    - Completeness: Are sections well-filled?
    - Red flags: Gaps, typos, generic language
    
    Be direct and specific. Reference the exact text that needs improvement.`,

    prompt: `Review this resume:\n\n${JSON.stringify(resumeData, null, 2)}`,
  })

  return NextResponse.json(result)
}, { rateLimitType: 'ai', route: '/api/ai/resume-review' })
```

### New Component: `src/app/components/resume/resume-review.tsx`

A panel that shows:
- Overall score (large number + color)
- Issues list (sorted by severity: red critical, yellow warning, blue suggestion)
- Each issue: section name, message, current text (highlighted), suggested fix
- "Apply Fix" button (copies suggestion to clipboard or applies directly to editor)
- Strengths list

Place a "Review Resume" button in the resume editor (next to Co-Pilot button).

### Trigger Points
- Resume editor page: "Review Resume" button in sidebar
- Job detail panel: "Review before applying" suggestion
- Dashboard: "Your resume scores X/100 — review issues" widget

---

## Part C: Metrics Dashboard

### What
Replace the current basic dashboard with real metrics from proper application records.

### New API Route: `src/app/api/applications/metrics/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { applications } from '~/lib/schema'
import { withAuth } from '~/lib/with-auth'
import { eq, and, isNull, sql, count } from 'drizzle-orm'

export const GET = withAuth(async (_req, { user }) => {
  // Total counts by status
  const counts = await db
    .select({
      status: applications.status,
      count: count(),
    })
    .from(applications)
    .where(and(
      eq(applications.userId, user.id),
      isNull(applications.deletedAt),
    ))
    .groupBy(applications.status)

  // Response rate: applied / (applied + interviewing + offered + rejected)
  // Interview rate: interviewing / applied
  // Offer rate: offered / applied

  const metrics = {
    total: 0,
    bookmarked: 0,
    applied: 0,
    interviewing: 0,
    offered: 0,
    rejected: 0,
    responseRate: 0,    // % of applied that got any response
    interviewRate: 0,   // % of applied that reached interview
    offerRate: 0,       // % of applied that got offer
    avgMatchScore: 0,
  }

  // ... fill in from counts

  return NextResponse.json(metrics)
}, { route: '/api/applications/metrics' })
```

### Dashboard Component: `src/app/components/dashboard/dashboard-view.tsx` (EDIT)

Add a metrics section:

```
┌──────────────────────────────────────────────────┐
│  YOUR JOB SEARCH AT A GLANCE                     │
│                                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│  │   12   │ │    8   │ │    3   │ │    1   │   │
│  │ Saved  │ │ Applied│ │ Interv.│ │ Offers │   │
│  └────────┘ └────────┘ └────────┘ └────────┘   │
│                                                  │
│  Response Rate: 37.5% (3 of 8 responded)        │
│  ████████░░░░░░░░░░░░░░░░                       │
│                                                  │
│  Avg Match Score: 76%                           │
│  ███████████████░░░░░                           │
│                                                  │
│  RECENT ACTIVITY                                 │
│  ● Applied to Acme Corp — 2 days ago            │
│  ● Interview at Beta Inc — 3 days ago           │
│  ● Saved Gamma LLC — 5 days ago                 │
│                                                  │
└──────────────────────────────────────────────────┘
```

The "Recent Activity" section queries applications ordered by `updatedAt DESC LIMIT 5`.

### Files to Create/Edit

| File | Action |
|------|--------|
| `src/app/api/applications/metrics/route.ts` | CREATE — metrics endpoint |
| `src/app/api/ai/resume-review/route.ts` | CREATE — AI review endpoint |
| `src/app/components/dashboard/dashboard-view.tsx` | EDIT — add metrics + activity feed |
| `src/app/components/resume/resume-review.tsx` | CREATE — review results UI |
| `src/app/components/pipeline/applications-view.tsx` | EDIT — show salary on cards |
| `src/app/components/pipeline/job-detail-panel.tsx` | EDIT — show salary in header |

---

## Verification

```bash
npx tsc --noEmit
pnpm lint
```

Manual tests:
1. Salary visible on Kanban cards (if job data has salary)
2. "Review Resume" button in resume editor produces line-by-line critique
3. Dashboard shows pipeline counts (bookmark/applied/interview/offer)
4. Dashboard shows response rate percentage
5. Recent activity feed shows latest 5 events
6. Offer comparison shows side-by-side when multiple offers exist

## Acceptance Criteria

**Salary:**
- [ ] Salary shown on Kanban cards
- [ ] Salary shown in job detail panel header
- [ ] Offer comparison view works when 2+ offers exist

**AI Resume Review:**
- [ ] "Review Resume" button exists in resume editor
- [ ] POST `/api/ai/resume-review` returns structured critique
- [ ] Issues displayed with severity colors (red/yellow/blue)
- [ ] Strengths displayed
- [ ] Overall score displayed

**Metrics Dashboard:**
- [ ] Pipeline funnel counts visible (saved/applied/interview/offer)
- [ ] Response rate calculated correctly
- [ ] Average match score displayed
- [ ] Recent activity feed shows last 5 events
- [ ] `npx tsc --noEmit` passes
- [ ] `pnpm lint` passes
