# Phase 0 — Fix Schema (PREREQUISITE)

> **Time:** 30 minutes
> **Status:** MUST DO FIRST — everything else depends on this
> **Risk:** Low — additive changes only, no breaking changes

## What & Why

The `applications` table was migrated from a JSONB blob to proper individual records (DONE). But 3 issues remain:

1. **No JD text storage** — the `applications` table stores company/title/location but NOT the full job description text. Without this, the Job Detail Panel cannot display JD text or power AI features on saved jobs.
2. **Missing `coverLetter` relation** — the FK `coverLetterId` exists on the table, but the Drizzle relation is not declared. This means `db.query.applications.with.coverLetter()` will fail.
3. **Console.logs in production** — the reorder route has 3 `console.log` statements that must be removed.

## Tasks

### Task 1: Add `jobData` column to applications table

**File:** `src/app/lib/schema.ts`

Find the `applications` table definition (around line 154). After the `notes` field (line 174), add:

```typescript
  jobData: jsonb("job_data"),
```

This stores the full scraped job object: `{ description, skills, tags, remote, visa, salary, source, ... }`.

It matches the existing pattern used by `tailoredResumes.jobData` (line 138).

### Task 2: Add `coverLetter` relation

**File:** `src/app/lib/schema.ts`

Find `applicationsRelations` (around line 184). It currently has `user`, `resume`, and `tailoredResume`. Add `coverLetter`:

```typescript
export const applicationsRelations = relations(applications, ({ one }) => ({
  user: one(user, { fields: [applications.userId], references: [user.id] }),
  resume: one(resumes, { fields: [applications.resumeId], references: [resumes.id] }),
  tailoredResume: one(tailoredResumes, { fields: [applications.tailoredResumeId], references: [tailoredResumes.id] }),
  coverLetter: one(coverLetters, { fields: [applications.coverLetterId], references: [coverLetters.id] }),
}))
```

### Task 3: Add `jobData` to CreateApplicationSchema

**File:** `src/app/lib/schemas.ts`

Find `CreateApplicationSchema` (around line 140). Add `jobData` field:

```typescript
export const CreateApplicationSchema = z.object({
  sourceKey: z.string().max(200),
  company: z.string().max(300),
  jobTitle: z.string().max(300),
  jobUrl: z.string().max(2048).optional(),
  location: z.string().max(200).optional(),
  salary: z.string().max(200).optional(),
  logoUrl: z.string().max(2048).optional(),
  color: z.string().max(20).optional(),
  level: z.string().max(10).optional(),
  matchScore: z.number().optional(),
  resumeId: z.string().max(100).nullable().optional(),
  status: z.enum(['bookmarked', 'applied', 'interviewing', 'offered', 'rejected']).optional(),
  jobData: z.record(z.unknown()).optional(),
})
```

### Task 4: Accept and store `jobData` in POST route

**File:** `src/app/api/applications/route.ts`

In the POST handler, extract `jobData` from the validated body and include it in the insert:

Find the destructuring line (around line 27):
```typescript
const { sourceKey, company, jobTitle, jobUrl, location, salary, logoUrl, color, level, matchScore, resumeId, status } = body.data
```

Change to:
```typescript
const { sourceKey, company, jobTitle, jobUrl, location, salary, logoUrl, color, level, matchScore, resumeId, status, jobData } = body.data
```

Then in the `db.insert` call (around line 32), add `jobData`:
```typescript
await db.insert(applications).values({
  id,
  userId: user.id,
  sourceKey,
  company,
  jobTitle,
  jobUrl: jobUrl || null,
  location: location || null,
  salary: salary || null,
  logoUrl: logoUrl || null,
  color: color || null,
  level: level || null,
  matchScore: matchScore ?? null,
  resumeId: resumeId || null,
  status: (status as 'bookmarked' | 'applied' | 'interviewing' | 'offered' | 'rejected') || 'bookmarked',
  jobData: jobData || null,
  position: 0,
  appliedAt: status === 'applied' || status === 'interviewing' || status === 'offered' ? now : null,
  createdAt: now,
  updatedAt: now,
})
```

### Task 5: Pass `jobData` when bookmarking from store

**File:** `src/app/lib/store.tsx`

Find the `bookmarkJob` function (around line 287). It currently sends a POST with these fields: `sourceKey, company, jobTitle, jobUrl, location, logoUrl, color, level, matchScore, resumeId, status`.

It does NOT send `salary` or `jobData`. Fix this by adding them to the POST payload:

```typescript
// In bookmarkJob (around line 297), change the apiPost call:
apiPost('/api/applications', {
  sourceKey: job.key,
  company: job.company,
  jobTitle: job.title,
  jobUrl: job.url || undefined,
  location: job.loc || undefined,
  logoUrl: job.logo || undefined,
  color: job.color || undefined,
  level: job.level || undefined,
  matchScore: job.score || undefined,
  resumeId: job.resume || undefined,
  status: 'bookmarked',
  salary: job.salary || undefined,           // ← ADD THIS
  jobData: job.jobData || undefined,         // ← ADD THIS
})
```

**ALSO: Update `mapAppToJob`** (around line 45) to map `salary` and `jobData` from the DB record back to PipelineJob:

```typescript
function mapAppToJob(app: ApplicationRecord): PipelineJob {
  // ... existing code ...
  return {
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
    salary: (app as any).salary || '',                         // ← ADD
    jobData: (app as any).jobData || undefined,                // ← ADD
  }
}
```

Note: `ApplicationRecord` interface (lines 9-28) must also be updated to include `salary` and `jobData`:

```typescript
interface ApplicationRecord {
  id: string
  sourceKey: string
  company: string
  jobTitle: string
  jobUrl: string | null
  location: string | null
  salary: string | null             // ← ADD
  logoUrl: string | null
  color: string | null
  level: string | null
  status: string
  position: number
  matchScore: number | null
  resumeId: string | null
  notes: string | null
  appliedAt: string | null
  createdAt: string
  updatedAt: string
  jobData: Record<string, unknown> | null  // ← ADD
}
```

**File:** `src/app/types/resume.ts`

Add `salary` and `jobData` to `PipelineJob` interface (around line 102):

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

NOTE: `PipelineJobSchema` in `schemas.ts` already has `.passthrough()` (line 128), so zod will NOT strip these new fields. No zod change needed.

### Task 6: Remove console.logs from reorder route

**File:** `src/app/api/applications/reorder/route.ts`

Delete these 3 lines:
- Line 16: `console.log('[Reorder API] updates:', updates)`
- Line 35: `console.log(\`[Reorder API] Skipping update for ${update.id} - not owned or deleted\`)`
- Line 38: `console.log(\`[Reorder API] Updating application ${update.id} to status: ${update.status}, position: ${update.position}\`)`

### Task 7: Generate and apply migration

Run these commands:
```bash
pnpm db:generate
pnpm db:migrate
```

Verify the migration file in `drizzle/` includes an `ALTER TABLE applications ADD COLUMN job_data jsonb` statement.

## Verification

```bash
# TypeScript check
npx tsc --noEmit

# Lint
pnpm lint

# Manual test
# 1. Bookmark a job from search results
# 2. Check that jobData is stored (query DB or check API response)
# 3. Verify no console.logs in terminal during reorder
```

## Acceptance Criteria

- [ ] `applications` table has `job_data` column (jsonb, nullable)
- [ ] `applicationsRelations` includes `coverLetter` relation
- [ ] `CreateApplicationSchema` accepts `jobData` field
- [ ] POST `/api/applications` stores `jobData`
- [ ] `PipelineJob` type has `salary?` and `jobData?` fields
- [ ] `ApplicationRecord` interface has `salary` and `jobData` fields
- [ ] `bookmarkJob` in store.tsx sends `salary` and `jobData` in POST payload
- [ ] `mapAppToJob` in store.tsx maps `salary` and `jobData` from DB record
- [ ] Zero `console.log` statements in reorder route
- [ ] Migration generated and applied
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `pnpm lint` passes with zero new errors
