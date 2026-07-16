# Phase 1 — Job Detail Panel (THE HUB)

> **Time:** 2-3 days
> **Depends on:** Phase 0 (schema fix must be done first)
> **Status:** HIGHEST PRIORITY after Phase 0

## What & Why

Currently every feature (Tailor Resume, Cover Letter, Interview Practice, ATS Match) lives on a SEPARATE PAGE. Users must navigate to each page, manually select a resume, type the company name, type the role, paste the JD. This is 5-6 steps per tool, per job.

The Job Detail Panel is a **slide-over panel** that opens when a user clicks any job card — from chat inline cards, search results, OR Kanban tracker. It shows everything about that job in ONE place, with action buttons that are **pre-filled from the job data**. One click per action. Zero typing.

## IMPORTANT — Replace Existing JobDetailModal

There is currently a `src/app/components/resume/job-detail-modal.tsx` that opens when clicking inline job cards. It has JD text + action buttons but NO Smart Overview, NO intelligence links, NO timeline, NO notes.

When building the unified `JobDetailPanel`, **DELETE `job-detail-modal.tsx`** and replace ALL usages.

Files that import `JobDetailModal` (verified):
- `src/app/components/chat/job-preview.tsx` (line 15)
- `src/app/components/resume/job-search-panel.tsx` (line 20)

## Architecture

```
THREE ENTRY POINTS — ONE PANEL

CHAT inline cards   SEARCH RESULTS   KANBAN TRACKER
(job-preview.tsx)   (job-search-      (applications-
 click card          panel.tsx)        view.tsx)
     │                   │                  │
     └───────┬───────────┴──────────────────┘
             ▼
   JobDetailPanel (slide-over)
   mode='search' → Save button
   mode='tracker' → timeline + notes + status
```

## Files to Create

### 1. `src/app/components/pipeline/job-detail-panel.tsx` (NEW — main component)

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '~/i18n/routing'
import { X, FileText, Mail, Brain, ExternalLink } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useCreateApplication, useDeleteApplication } from '~/hooks/use-apps'
import { useActiveResume } from '~/hooks/use-active-resume'
import { notify } from '~/lib/toast'
import type { PipelineJob } from '~/types/resume'

interface JobDetailPanelProps {
  job: PipelineJob | null
  mode: 'search' | 'tracker'
  onClose: () => void
}

export function JobDetailPanel({ job, mode, onClose }: JobDetailPanelProps) {
  // ...
}
```

> **CRITICAL:** Do NOT import `useAppStore` from `~/lib/store` — it's DELETED.
> Use `useCreateApplication` / `useDeleteApplication` from `~/hooks/use-apps`.
> Use `useActiveResume` from `~/hooks/use-active-resume` for the resume context.

### 2. `src/app/components/pipeline/timeline.tsx` (NEW — timeline sub-component)

### 3. `src/app/components/pipeline/job-notes.tsx` (NEW — auto-saving notes)

Uses PATCH `/api/applications/[id]` (handler already exists, accepts `{ status, position, notes }`).

## Files to Edit

### 4. `src/app/api/applications/[id]/route.ts` (NO CHANGE NEEDED)

PATCH handler already exists. Accepts `{ status, position, notes }`. Auto-sets `appliedAt` when status becomes 'applied'.

### 5. `src/app/components/pipeline/applications-view.tsx` (EDIT)

Add panel open on card click:
```tsx
const [selectedJob, setSelectedJob] = useState<PipelineJob | null>(null)
// onClick: setSelectedJob(job)
// At bottom: {selectedJob && <JobDetailPanel job={selectedJob} mode="tracker" onClose={...} />}
```

### 6. `src/app/components/resume/job-search-panel.tsx` (EDIT)

```tsx
// DELETE (line 20):
import { JobDetailModal } from './job-detail-modal'
// ADD:
import { JobDetailPanel } from '~/components/pipeline/job-detail-panel'

// Replace state: modalJob/modalOpen → panelJob
// Replace click handler: setModalJob → setPanelJob(scoredJobToPipelineJob(job, ...))
// Replace render: <JobDetailModal> → <JobDetailPanel>
```

### 7. `src/app/components/chat/job-preview.tsx` (EDIT)

Same replacement pattern. Import at line 15.

### 8. DELETE `src/app/components/resume/job-detail-modal.tsx`

After ALL imports are replaced.

## ScoredJob → PipelineJob Converter

> **CRITICAL:** ScoredJob has `locationType` NOT `remote`, `companyLogo` NOT `logoUrl`,
> `id` NOT `key`, `location` NOT `loc`. See `src/app/lib/job-sources/types.ts`.

```tsx
function scoredJobToPipelineJob(job: ScoredJob, userSkills: string[]): PipelineJob {
  const matchedSet = new Set(job.matchedSkills.map(s => s.toLowerCase()))
  const missing = userSkills.filter(s => !matchedSet.has(s.toLowerCase()))

  return {
    key: job.id,                    // ScoredJob.id, NOT .key
    company: job.company,
    title: job.title,
    loc: job.location,              // ScoredJob.location, NOT .loc
    logo: job.companyLogo || '',    // companyLogo, NOT logoUrl
    color: '',
    score: job.score,
    level: job.score >= 75 ? 'high' : 'mid',
    time: 'new',
    url: job.url,
    resume: '',
    addedAt: new Date().toISOString(),
    salary: job.salary || '',
    jobData: {
      description: job.description || '',
      matchedSkills: job.matchedSkills || [],
      missingSkills: missing,
      source: job.source,
      locationType: job.locationType,  // NOT job.remote
      tags: job.tags,
      visaSponsorship: job.visaSponsorship,
      country: job.country,
    },
  }
}
```

Extract to `src/app/lib/job-utils.ts` and import from both consumers.

## Action Button Implementations

### Tailor Resume:
Calls `/api/ai/tailor` with `{ resume, job: { title, company, description } }`.

### Cover Letter:
```tsx
// Cover letter page does NOT read URL query params.
// Use sessionStorage (SAME pattern as existing job-detail-modal):
function handleCoverLetter() {
  sessionStorage.setItem('jfs_pending_ats_jd', job.jobData?.description || '')
  sessionStorage.setItem('jfs_pending_ats_company', job.company)
  sessionStorage.setItem('jfs_pending_ats_role', job.title)
  router.push(`/resume/${activeResumeId}`)
}
```

### Interview:
```tsx
// Interview page DOES read URL params:
const params = new URLSearchParams({ company: job.company, role: job.title })
router.push(`/interview?${params}`)
```

### Apply:
```tsx
function handleApply() {
  window.open(job.url, '_blank')
  if (mode === 'tracker' && job.applicationId) {
    // Use ApiClient, NOT apiPatch (apiPatch is deleted):
    ApiClient.request(`/api/applications/${job.applicationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'applied' }),
    })
  }
}
```

> **WARNING:** `apiPatch()` does NOT exist anymore. The old `store.tsx` is deleted.
> Use `ApiClient.request()` or add a `useUpdateApplication` hook to `~/hooks/use-apps.ts`.

## Acceptance Criteria

- [ ] Panel slides in from right on card click
- [ ] Panel works from ALL THREE entry points (chat, search, kanban)
- [ ] OLD `job-detail-modal.tsx` DELETED
- [ ] ZERO remaining imports of `job-detail-modal`
- [ ] JD text displayed from jobData
- [ ] Match score + skill gaps displayed
- [ ] 4 action buttons work (all pre-filled)
- [ ] Status dropdown works (tracker mode)
- [ ] Timeline shows events (tracker mode)
- [ ] Notes auto-save (tracker mode)
- [ ] "Save to Tracker" works (search mode)
- [ ] `npx tsc --noEmit` passes
