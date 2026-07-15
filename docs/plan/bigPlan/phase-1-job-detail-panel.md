# Phase 1 — Job Detail Panel (THE HUB)

> **Time:** 2-3 days
> **Depends on:** Phase 0 (schema fix must be done first)
> **Status:** HIGHEST PRIORITY after Phase 0

## What & Why

Currently every feature (Tailor Resume, Cover Letter, Interview Practice, ATS Match) lives on a SEPARATE PAGE. Users must navigate to each page, manually select a resume, type the company name, type the role, paste the JD. This is 5-6 steps per tool, per job.

The Job Detail Panel is a **slide-over panel** that opens when a user clicks any job card (from search results OR Kanban tracker). It shows everything about that job in ONE place, with action buttons that are **pre-filled from the job data**. One click per action. Zero typing.

This is the **connector hub** — the single most impactful component to build.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  SEARCH RESULTS    KANBAN TRACKER                   │
│       │                  │                          │
│       │ click card       │ click card               │
│       │                  │                          │
│       └────────┬─────────┘                          │
│                │                                    │
│                ▼                                    │
│      JobDetailPanel (slide-over)                    │
│      ┌────────────────────────────┐                 │
│      │ Context-aware:             │                 │
│      │  - from search → "Save" btn │                 │
│      │  - from kanban → timeline  │                 │
│      │  - always: JD, actions,    │                 │
│      │    intelligence links       │                 │
│      └────────────────────────────┘                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Files to Create

### 1. `src/app/components/pipeline/job-detail-panel.tsx` (NEW — main component)

This is the slide-over panel component. It receives a `job` prop and `mode` prop ('search' | 'tracker').

**Structure:**
```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '~/i18n/routing'
import { X, FileText, Mail, Brain, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useAppStore } from '~/lib/store'
import { notify } from '~/lib/toast'
import type { PipelineJob } from '~/types/resume'

interface JobDetailPanelProps {
  job: PipelineJob | null
  mode: 'search' | 'tracker'
  onClose: () => void
}

export function JobDetailPanel({ job, mode, onClose }: JobDetailPanelProps) {
  // ... implementation
}
```

**Panel sections (top to bottom):**

1. **Header** — company name, job title, location, salary, match score badge, close button
2. **Status dropdown** (mode='tracker' only) — Bookmarked / Applied / Interviewing / Offered / Rejected
3. **Job Description** — scrollable text from `job.jobData?.description` or fallback message
4. **Match Intelligence** — score, matched skills, missing skills (from `job.jobData`)
5. **Quick Actions** — 4 buttons, ALL pre-filled:
   - [Tailor Resume] → calls `/api/ai/tailor` with jobData + activeResumeId
   - [Cover Letter] → navigates to `/cover-letter?company=X&role=Y&jd=Z`
   - [Interview] → navigates to `/interview?company=X&role=Y`
   - [Apply] → opens `job.url` in new tab, updates status to 'applied'
6. **Area Intelligence** — link buttons (built in Phase 2)
7. **Company Intelligence** — link buttons (built in Phase 2)
8. **Timeline** (mode='tracker' only) — chronological events
9. **Notes** (mode='tracker' only) — editable textarea, auto-saves
10. **Save to Tracker** button (mode='search' only)

**Slide-over animation:** Use `translate-x-full` → `translate-x-0` with `transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]`. Panel is fixed right side, `w-full max-w-md`, `h-full`, `z-50`.

**Overlay:** Semi-transparent `bg-black/40` behind panel, click to close.

### 2. `src/app/components/pipeline/timeline.tsx` (NEW — timeline sub-component)

Simple component that displays a vertical timeline of events:

```tsx
interface TimelineEvent {
  date: string
  label: string
  icon?: React.ReactNode
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  // Render vertical line with dots and labels
}
```

Events are derived from the application record:
- `createdAt` → "Saved"
- `appliedAt` → "Applied"
- `updatedAt` (if different from createdAt) → "Updated"
- Interview sessions for this company → "Interview Practice (score: X/10)"
- Cover letters for this company → "Cover Letter Generated"
- Tailored resumes linked → "Resume Tailored (X%)"

### 3. `src/app/components/pipeline/job-notes.tsx` (NEW — notes sub-component)

Auto-saving textarea:

```tsx
export function JobNotes({ applicationId, initialNotes }: { applicationId: string; initialNotes: string }) {
  const [notes, setNotes] = useState(initialNotes)
  // Debounced auto-save via PATCH /api/applications/[id]
}
```

## Files to Edit

### 4. `src/app/api/applications/[id]/route.ts` (EDIT — add PATCH handler)

Add a PATCH handler for updating individual application fields (notes, status):

```typescript
export const PATCH = withAuth(async (req, { user }) => {
  const body = await req.json()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id') // or extract from path

  // Validate ownership
  // Update fields: notes, status, appliedAt
  // Return updated record
})
```

### 5. `src/app/components/pipeline/applications-view.tsx` (EDIT — add panel open on card click)

In the Kanban card click handler, open the JobDetailPanel instead of just the job URL:

```tsx
const [selectedJob, setSelectedJob] = useState<PipelineJob | null>(null)

// On card click:
onClick={() => setSelectedJob(job)}

// At bottom of component:
{selectedJob && (
  <JobDetailPanel
    job={selectedJob}
    mode="tracker"
    onClose={() => setSelectedJob(null)}
  />
)}
```

### 6. `src/app/components/resume/job-search-panel.tsx` (EDIT — add panel open on card click)

Same pattern — clicking a job in search results opens the panel with `mode="search"`.

## Action Button Implementation Details

### Tailor Resume button:
```tsx
async function handleTailor() {
  const res = await fetch('/api/ai/tailor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resumeId: activeResumeId,
      jdText: job.jobData?.description || '',
      jobUrl: job.url,
    })
  })
  const data = await res.json()
  // Navigate to resume editor with tailored data
  // Or show success notification + update application.tailoredResumeId
}
```

### Cover Letter button:
```tsx
function handleCoverLetter() {
  const params = new URLSearchParams({
    company: job.company,
    role: job.title,
    jd: job.jobData?.description || '',
  })
  router.push(`/cover-letter?${params}`)
}
```

### Interview button:
```tsx
function handleInterview() {
  const params = new URLSearchParams({
    company: job.company,
    role: job.title,
  })
  router.push(`/interview?${params}`)
}
```

### Apply button:
```tsx
function handleApply() {
  window.open(job.url, '_blank')
  // Update status to 'applied'
  if (mode === 'tracker' && job.applicationId) {
    apiPatch(`/api/applications/${job.applicationId}`, {
      status: 'applied',
      appliedAt: new Date(),
    })
  }
}
```

## Status Badge Logic

Each action button shows a status badge:

```tsx
// Tailor Resume badge:
job.tailoredResumeId ? '✅ Ready' : '⚠️ Not tailored'

// Cover Letter badge:
job.coverLetterId ? '✅ Generated' : '⚠️ Not made'

// Interview badge:
// Query interview sessions for this company
sessionsCount > 0 ? `✅ ${sessionsCount} sessions` : '⚠️ 0 sessions'
```

## Styling Reference

Use existing design tokens:
- Background: `bg-sidebar` or `bg-card`
- Border: `border-border`
- Text: `text-foreground`, `text-muted-foreground`
- Primary actions: `bg-primary text-primary-foreground`
- Score badge: `bg-accent-soft text-primary`
- Monospace labels: `label-mono` class
- Transitions: `transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.2,0,0,1)]`
- Section labels: same pattern as sidebar (`label-mono` + `pt-3 pb-1`)

## Verification

```bash
npx tsc --noEmit
pnpm lint
```

Manual tests:
1. Search for jobs → click a job → panel slides in from right
2. Panel shows JD text, match score, action buttons
3. Click "Tailor Resume" → AI tailors for this specific job (no manual input)
4. Click "Cover Letter" → cover letter page opens pre-filled
5. Click "Interview" → interview page opens pre-filled
6. Click "Apply" → job URL opens in new tab
7. Go to Kanban → click a card → panel shows timeline + notes + status
8. Edit notes → auto-saves
9. Change status → appliedAt timestamp updates
10. Click outside panel or X → panel closes

## Acceptance Criteria

- [ ] Panel slides in from right on card click
- [ ] Panel works from BOTH search results and Kanban
- [ ] JD text displayed (from jobData)
- [ ] Match score + skill gaps displayed
- [ ] 4 action buttons work (Tailor, Cover Letter, Interview, Apply)
- [ ] All actions are pre-filled (zero typing)
- [ ] Status badges show on each action button
- [ ] Status dropdown works (tracker mode)
- [ ] Timeline shows events (tracker mode)
- [ ] Notes auto-save (tracker mode)
- [ ] "Save to Tracker" button works (search mode)
- [ ] Close on X click and overlay click
- [ ] `npx tsc --noEmit` passes
- [ ] `pnpm lint` passes
