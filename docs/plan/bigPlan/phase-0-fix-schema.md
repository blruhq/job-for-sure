# Phase 0 — Fix Schema (PREREQUISITE)

> **Time:** 20 minutes
> **Status:** MUST DO FIRST — everything else depends on this
> **Risk:** Low — additive changes only

## What & Why

The `applications` table has `salary` column ✓ and `coverLetter` relation ✓ (both already done). But 2 things are still missing:

1. **No `jobData` column** — the table stores company/title/location/salary but NOT the full job description text or scraped metadata. Without this, the Job Detail Panel cannot display JD text or power AI features on saved jobs.
2. **`salary` and `jobData` not flowing through the client** — `PipelineJob` type, `groupByStatus()` mapper, `CreateApplicationPayload`, and all bookmark call sites do NOT send/read `salary` or `jobData`.

## Current State (verified)

| Item | Status |
|------|--------|
| `applications.salary` column | ✅ EXISTS (schema.ts:141) |
| `applications.coverLetterId` FK | ✅ EXISTS (schema.ts:149) |
| `applicationsRelations.coverLetter` | ✅ EXISTS (schema.ts:163) |
| `applications.jobData` column | ❌ MISSING |
| `CreateApplicationSchema.jobData` | ❌ MISSING (salary ✓ at schemas.ts:147) |
| `PipelineJob.salary?` | ❌ MISSING |
| `PipelineJob.jobData?` | ❌ MISSING |
| `groupByStatus()` maps salary/jobData | ❌ MISSING both (use-apps.ts:29-44) |
| `CreateApplicationPayload.salary` | ❌ MISSING (api-client.ts:3-15) |
| Bookmark call sites send salary/jobData | ❌ NONE of the 4 call sites send either |
| Console.logs in reorder route | ✅ ALREADY REMOVED |

## Tasks

### Task 1: Add `jobData` column to schema

**File:** `src/app/lib/schema.ts`

In the `applications` table definition (line 131), after `notes` (line 150), add:

```typescript
  jobData: jsonb("job_data"),
```

This stores the full scraped job object: `{ description, skills, tags, locationType, visa, salary, source, ... }`.

### Task 2: Add `jobData` to Zod schema

**File:** `src/app/lib/schemas.ts`

In `CreateApplicationSchema` (line 141), add after `status`:

```typescript
  jobData: z.record(z.unknown()).optional(),
```

### Task 3: Accept `jobData` in POST route

**File:** `src/app/api/applications/route.ts`

In the POST handler destructuring (around line 27), add `jobData`:

```typescript
const { sourceKey, company, jobTitle, jobUrl, location, salary, logoUrl, color, level, matchScore, resumeId, status, jobData } = body.data
```

In the `db.insert` call, add:

```typescript
  jobData: jobData || null,
```

### Task 4: Add `salary` + `jobData` to PipelineJob type

**File:** `src/app/types/resume.ts`

Add to the `PipelineJob` interface (line 119):

```typescript
export interface PipelineJob {
  key: string
  applicationId?: string
  logo: string
  color: string
  company: string
  title: string
  loc: string
  score: number
  level: 'high' | 'mid'
  time: string
  url: string
  resume: string
  addedAt: string
  salary?: string                        // ← ADD
  jobData?: Record<string, unknown>      // ← ADD
}
```

### Task 5: Map `salary` + `jobData` in groupByStatus

**File:** `src/app/hooks/use-apps.ts`

In `groupByStatus()` (lines 29-44), add to the PipelineJob construction:

```typescript
    const job: PipelineJob = {
      key: app.sourceKey,
      applicationId: app.id,
      logo: app.logoUrl || '',
      color: app.color || '',
      company: app.company,
      title: app.jobTitle,
      loc: app.location || '',
      score: app.matchScore || 0,
      level: (app.level as 'high' | 'mid') || 'mid',
      time: timeLabels[app.status] || 'saved',
      url: app.jobUrl || '',
      resume: app.resumeId || '',
      addedAt: app.createdAt,
      salary: app.salary || '',                 // ← ADD
      jobData: app.jobData || undefined,        // ← ADD
    }
```

### Task 6: Add `salary` + `jobData` to CreateApplicationPayload

**File:** `src/app/lib/api-client.ts`

Add to `CreateApplicationPayload` interface (lines 3-15):

```typescript
export interface CreateApplicationPayload {
  sourceKey: string
  company: string
  jobTitle: string
  jobUrl?: string
  location?: string
  salary?: string          // ← ADD
  logoUrl?: string
  color?: string
  level?: string
  matchScore?: number
  resumeId?: string
  status: string
  jobData?: Record<string, unknown>  // ← ADD
}
```

### Task 7: Send `salary` + `jobData` at all bookmark payload-construction sites

There are **4 payload-construction sites** that build the createApplication payload (plus 1 shared hook wrapper):

| # | File | Approx line | salary sent? | jobData sent? | logo/color sent? |
|---|------|-------------|-------------|---------------|-----------------|
| 1 | `src/app/components/resume/job-search-panel.tsx` | ~76 | NO | NO | YES |
| 2 | `src/app/components/chat/job-preview.tsx` | ~33 | NO | NO | NO (dropped) |
| 3 | `src/app/components/pipeline/applications-view.tsx` | ~252 (scrape URL) | n/a | n/a | NO |
| 4 | `src/app/components/pipeline/applications-view.tsx` | ~294 (manual add) | n/a | n/a | NO |

> **Note:** Sites 3-4 are manual entry (user types job title/company). They don't
> have salary/jobData. Leave those as-is.
>
> **Shared hook:** `src/app/hooks/use-bookmark.ts` wraps `useCreateApplication`.
> It is currently imported but unused in `job-preview.tsx`. If revived, callers
> must pass `salary`/`jobData` through `toggleBookmark(payload)`. The hook already
> accepts `CreateApplicationPayload`, so it will pass through any fields added there.

### Task 8: Generate and apply migration

```bash
pnpm db:generate
pnpm db:migrate
```

Verify the migration file includes `ALTER TABLE applications ADD COLUMN job_data jsonb`.

## Verification

```bash
npx tsc --noEmit
pnpm lint
```

## Acceptance Criteria

- [ ] `applications` table has `job_data` column (jsonb, nullable)
- [ ] `CreateApplicationSchema` accepts `jobData` field
- [ ] POST `/api/applications` stores `jobData`
- [ ] `PipelineJob` type has `salary?` and `jobData?` fields
- [ ] `groupByStatus()` maps `salary` and `jobData` from DB rows
- [ ] `CreateApplicationPayload` includes `salary?` and `jobData?`
- [ ] `job-search-panel.tsx` bookmarkJob sends `salary` and `jobData`
- [ ] `job-preview.tsx` bookmarkJob sends `salary` and `jobData`
- [ ] Migration generated and applied
- [ ] `npx tsc --noEmit` passes
