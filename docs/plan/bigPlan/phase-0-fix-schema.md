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

Find the `bookmarkJob` function (around line 288). When it calls `apiPost('/api/applications', {...})`, ensure `jobData` is included from the PipelineJob. The PipelineJob already contains job data fields — pass them through.

Check the POST call in `bookmarkJob` and add `jobData` to the payload. The PipelineJob type needs a `jobData` field added as well.

**File:** `src/app/types/resume.ts`

Add optional `jobData` to `PipelineJob` interface:
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
  jobData?: Record<string, unknown>  // ← ADD THIS
}
```

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
- [ ] `PipelineJob` type has optional `jobData` field
- [ ] Zero `console.log` statements in reorder route
- [ ] Migration generated and applied
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `pnpm lint` passes with zero new errors
