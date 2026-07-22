# Implementation Spec & Plan
# Feature: Job Card — Salary Range + Experience Needed

---

### 0. Architectural Decision Record (ADR) & Scaling Tradeoffs

- **Context & Constraints:** All job data is in-memory (no DB changes needed). `JobResult` in `types.ts` is the single source of truth. Salary is already `salary?: string` (free text). `experienceLevel` is `'entry'|'mid'|'senior'` (title-inferred 3-value enum). We need to add **`experienceYears?: string`** (e.g. `"3-5 years"`) as a new optional field — populated from structured API data where available, or from a lightweight regex scan of job description text. We also need to decide on structured vs. free-text salary.
- **Chosen Architecture:**
  - **Salary**: Keep free-text `salary?: string` but also add `salaryMin?: number`, `salaryMax?: number`, `salaryCurrency?: string`. Sources that already have min/max numerics (Himalayas, JSearch, Adzuna, RemoteOK) populate all 4. Sources with only a string (Remotive, Arbeitnow, JobbKK, LinkedIn cards, apify) populate only `salary`. Display logic prefers structured fields for cleaner rendering, falls back to free-text string. No DB migrations needed — `PipelineJob.jobData` is `Record<string, unknown>`, so new fields pass through automatically.
  - **Experience years**: Add `experienceYears?: string` to `JobResult`. Populated from: (1) JSearch `seniority_level` full string when it contains years/numbers, (2) Greenhouse `metadata` name-value scan, (3) LinkedIn detail criteria HTML parse, (4) lightweight regex `/\b(\d+)\s*[-–to]+\s*(\d+)\s*(?:years?|yrs?)\b/i` on `description` for all other sources. AI extraction is NOT used — regex is fast, free, fail-open, and runs at scrape time with no latency. `experienceYears` is informational only; it does NOT affect scoring.
  - **Cache**: `experienceYears`, `salaryMin`, `salaryMax`, `salaryCurrency` are included in the lean-cache object in `index.ts` (same pattern as `salary`).
  - **UI**: In `JobCard` (search panel) and `job-preview.tsx` chat cards, salary becomes a visually distinct pill with a `$` icon when numeric range is available. `experienceYears` gets a `Briefcase` icon pill. In `JobDetailPanel` header tags row, both fields are shown prominently above the description.
- **Discarded Alternatives:**
  - *AI extraction from description at search time*: Adds ~500ms latency per new job batch, costs tokens, risks rate-limit. Regex covers 80% of real cases for free.
  - *Replacing free-text salary with only structured fields*: Breaks Remotive/Arbeitnow/JobbKK/LinkedIn sources that return only salary strings with no numeric parsing. Keep both.
  - *Keeping `experienceLevel` only (entry/mid/senior)*: User explicitly asked for "experience that need for this job" — the enum is not granular enough. "3-5 years" is a concrete, scannable signal.

---

### 1. Target Files & Folder Structure

Files to **modify** (no new files needed):

```
src/app/lib/job-sources/types.ts                    ← add 3 fields to JobResult
src/app/lib/job-sources/ashby.ts                    ← fix compensation bug (AshbyJob type + mapping)
src/app/lib/job-sources/greenhouse.ts               ← expand metadata search + experienceYears
src/app/lib/job-sources/jsearch.ts                  ← map seniority_level to experienceYears
src/app/lib/job-sources/himalayas.ts                ← populate salaryMin/salaryMax/salaryCurrency
src/app/lib/job-sources/adzuna.ts                   ← populate salaryMin/salaryMax/salaryCurrency
src/app/lib/job-sources/remoteok.ts                 ← populate salaryMin/salaryMax
src/app/lib/job-sources/linkedin-guest.ts           ← parse criteria items for experienceYears
src/app/lib/job-sources/remotive.ts                 ← regex experienceYears from description
src/app/lib/job-sources/arbeitnow.ts                ← regex experienceYears from description
src/app/lib/job-sources/themuse.ts                  ← regex experienceYears from description
src/app/lib/job-sources/jobbkk.ts                   ← regex experienceYears from description
src/app/lib/job-sources/jobsdb-rest.ts              ← regex experienceYears from description
src/app/lib/job-sources/apify-indeed.ts             ← regex experienceYears from description
src/app/lib/job-sources/apify-jobsdb.ts             ← regex experienceYears from description
src/app/lib/job-sources/apify-linkedin.ts           ← regex experienceYears from description
src/app/lib/job-sources/index.ts                    ← add new fields to leanJobs cache object
src/app/lib/job-utils.ts                            ← pass new fields through scoredJobToPipelineJob
src/app/components/resume/job-search-panel.tsx      ← update JobCard UI
src/app/components/chat/job-preview.tsx             ← update inline chat card UI
src/app/components/pipeline/job-detail-panel.tsx    ← update detail panel header tags
```

---

### 2. Import Definitions & Dependencies

- **No new npm packages.** All logic uses existing code.
- `lucide-react` already imported in all three UI files. Add `Briefcase` and `DollarSign` from `lucide-react` where needed.
- No changes to `app/lib/schema.ts` or `drizzle/`. All job data is in-memory / Redis cache / `PipelineJob.jobData`.
- `generateTextWithFailover` is NOT used (no AI extraction in this plan).

---

### 3. Database Schema Changes

**None.** `PipelineJob.jobData` is `Record<string, unknown>` — new fields (`salaryMin`, `salaryMax`, `salaryCurrency`, `experienceYears`) flow through automatically without any migration.

---

### 4. Step-by-Step Edits

#### Step A — `src/app/lib/job-sources/types.ts`

Add 3 optional fields to `JobResult` after the `salary?: string` line:

```typescript
salary?: string          // salary string if disclosed (free text or formatted)
salaryMin?: number       // structured: numeric minimum salary (in currency units)
salaryMax?: number       // structured: numeric maximum salary (in currency units)
salaryCurrency?: string  // structured: ISO currency code e.g. 'USD', 'THB', 'GBP'
experienceYears?: string // e.g. "3-5 years", "2+ years" — from structured data or regex
```

---

#### Step B — Create a shared utility function

**Add to `src/app/lib/job-sources/types.ts`** (at the bottom, before any `export` of `ScoredJob`): a helper that ALL adapters will call.

```typescript
/**
 * Extract "N-M years" experience requirement from job description text.
 * Returns the FIRST match found (e.g. "3-5 years", "2+ years").
 * Returns undefined if no match — fail-open.
 */
export function extractExperienceYears(text: string): string | undefined {
  // Match patterns like: "3-5 years", "3 to 5 years", "2+ years", "at least 3 years"
  const match = text.match(
    /\b(\d+)\s*[-–to]+\s*(\d+)\s*(?:years?|yrs?)\b|\b(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience)?\b/i
  )
  if (!match) return undefined
  if (match[1] && match[2]) return `${match[1]}-${match[2]} years`
  if (match[3]) return `${match[3]}+ years`
  return undefined
}
```

Import this function in every adapter file that uses it.

---

#### Step C — Fix `src/app/lib/job-sources/ashby.ts`

**Bug:** `?includeCompensation=true` is already sent but the response fields are never read because `AshbyJob` interface doesn't include them.

1. Extend `AshbyJob` interface to include compensation fields:

```typescript
interface AshbyCompensation {
  compensationTierSummary?: string   // e.g. "$120,000 - $160,000"
  minValue?: number
  maxValue?: number
  currency?: string
  interval?: string                  // "year" | "month" etc.
}

interface AshbyJob {
  id: string
  title: string
  department?: string
  team?: string
  employmentType?: string
  location?: string
  locationName?: string
  descriptionHtml?: string
  jobUrl?: string
  publishedDate?: string
  externalLink?: string
  compensation?: AshbyCompensation   // ← ADD THIS
}
```

2. In the `.map()` function, after the `description` and `location` lines, add:

```typescript
// Compensation (was requested with ?includeCompensation=true but never read — fix)
const comp = job.compensation
let salary: string | undefined
let salaryMin: number | undefined
let salaryMax: number | undefined
let salaryCurrency: string | undefined

if (comp) {
  if (comp.compensationTierSummary) {
    salary = comp.compensationTierSummary
  }
  if (comp.minValue && comp.maxValue) {
    salaryMin = comp.minValue
    salaryMax = comp.maxValue
    salaryCurrency = comp.currency || 'USD'
    if (!salary) {
      const sym = salaryCurrency === 'USD' ? '$' : salaryCurrency === 'GBP' ? '£' : salaryCurrency === 'EUR' ? '€' : `${salaryCurrency} `
      const period = comp.interval === 'year' ? '/yr' : comp.interval === 'month' ? '/mo' : ''
      salary = `${sym}${Math.round(salaryMin / 1000)}k-${Math.round(salaryMax / 1000)}k${period}`
    }
  }
}

// Extract experience years from description
const experienceYears = extractExperienceYears(description)
```

3. Add import at top: `import { extractExperienceYears } from './types'`

4. Add to the returned object: `salary, salaryMin, salaryMax, salaryCurrency, experienceYears, employmentType: job.employmentType`

---

#### Step D — Fix/expand `src/app/lib/job-sources/greenhouse.ts`

1. Add import at top: `import { extractExperienceYears } from './types'`

2. In the `.map()` callback, after the existing `salaryMeta` lookup, expand the metadata search:

```typescript
// Check for pay transparency in metadata
const salaryMeta = job.metadata?.find(
  (m) => m.name.toLowerCase().includes('salary') || m.name.toLowerCase().includes('compensation'),
)

// Check metadata for experience years / seniority
const expMeta = job.metadata?.find(
  (m) => m.name.toLowerCase().includes('experience') || m.name.toLowerCase().includes('years') || m.name.toLowerCase().includes('seniority'),
)

// Employment type from metadata (many Greenhouse boards expose this)
const empTypeMeta = job.metadata?.find(
  (m) => m.name.toLowerCase().includes('employment') || m.name.toLowerCase().includes('job type') || m.name.toLowerCase().includes('work type'),
)

// Extract experience from description text as fallback
const experienceYears = expMeta?.value || extractExperienceYears(description)
```

3. Update returned object to include:
```typescript
salary: salaryMeta?.value,
experienceYears,
employmentType: empTypeMeta?.value,
```

---

#### Step E — Update `src/app/lib/job-sources/jsearch.ts`

1. Add import: `import { extractExperienceYears } from './types'`

2. In the mapping, the `seniority_level` field contains strings like `"Mid-Senior Level"`, `"Entry level"`, `"3 - 5 years"` depending on the Google source. Map it:

```typescript
// experienceYears: try to extract numeric range from seniority_level first,
// then from description (JSearch descriptions are rich)
let experienceYears: string | undefined
if (job.seniority_level) {
  // Some entries have years directly: "3 - 5 years", "2+ years"
  const fromSeniority = extractExperienceYears(job.seniority_level)
  if (fromSeniority) {
    experienceYears = fromSeniority
  }
}
if (!experienceYears) {
  experienceYears = extractExperienceYears(description)
}
```

3. Also populate structured salary fields. After the existing `salary` build block:

```typescript
// Structured salary fields (JSearch has the best salary data of all sources)
const salaryMin = job.job_min_salary || undefined
const salaryMax = job.job_max_salary || undefined
const salaryCurrency = job.job_salary_currency || undefined
```

4. Add to returned object: `salaryMin, salaryMax, salaryCurrency, experienceYears`

---

#### Step F — Update `src/app/lib/job-sources/himalayas.ts`

1. Add import: `import { extractExperienceYears } from './types'`

2. After the `salary = formatSalary(...)` line, add:

```typescript
const salaryMin = job.minSalary || undefined
const salaryMax = job.maxSalary || undefined
const salaryCurrency = job.currency || undefined
const experienceYears = extractExperienceYears(description)
```

3. Add to returned object: `salaryMin, salaryMax, salaryCurrency, experienceYears`

---

#### Step G — Update `src/app/lib/job-sources/adzuna.ts`

1. Add import: `import { extractExperienceYears } from './types'`

2. In the `.map()`, after the salary block, add:

```typescript
const salaryMin = job.salary_min || undefined
const salaryMax = job.salary_max || undefined
const salaryCurrency = 'USD'  // Adzuna doesn't expose currency — USD is the safe default for the supported country list
const experienceYears = extractExperienceYears(job.description || '')
```

3. Add to returned object: `salaryMin, salaryMax, salaryCurrency, experienceYears`

---

#### Step H — Update `src/app/lib/job-sources/remoteok.ts`

1. Add import: `import { extractExperienceYears } from './types'`

2. After the existing salary block, add:

```typescript
const salaryMin = job.salary_min || undefined
const salaryMax = job.salary_max || undefined
const salaryCurrency = 'USD'   // RemoteOK is USD-only
const experienceYears = extractExperienceYears(description)
```

3. Add to returned object: `salaryMin, salaryMax, salaryCurrency, experienceYears`

---

#### Step I — Update remaining adapters (regex-only experienceYears)

For each of these files: `remotive.ts`, `arbeitnow.ts`, `themuse.ts`, `jobbkk.ts`, `jobsdb-rest.ts`, `apify-indeed.ts`, `apify-jobsdb.ts`, `apify-linkedin.ts`

Apply the same pattern to each:
1. Add import: `import { extractExperienceYears } from './types'`
2. In the `.map()`, after the `description` variable is built: `const experienceYears = extractExperienceYears(description)`
3. Add `experienceYears` to the returned object.

**Special note for `linkedin-guest.ts` detail function (`fetchLinkedInGuestDetail`):**
The `.description__job-criteria-item` elements already get concatenated into `criteria[]` and joined into `fullDescription`. Before joining them into `fullDescription`, parse seniority from the HTML:

```typescript
// Extract experience years from criteria HTML items
// LinkedIn criteria look like: "Seniority levelMid-Senior Level" or "Mid-Senior Level\n3-5 years experience"
let experienceYears: string | undefined
$('.description__job-criteria-item').each((_i, el) => {
  const label = $(el).find('.description__job-criteria-subheader').text().trim().toLowerCase()
  const value = $(el).find('.description__job-criteria-text').text().trim()
  if (label.includes('seniority') || label.includes('experience')) {
    const extracted = extractExperienceYears(value)
    if (extracted && !experienceYears) experienceYears = extracted
    // Also keep raw label like "Mid-Senior Level" if no years found
    if (!experienceYears && value) experienceYears = value
  }
})
```

Add `import { extractExperienceYears } from './types'` at the top.
Add `experienceYears` to the returned `job` object in `fetchLinkedInGuestDetail`.
For `fetchLinkedInGuestPage` (list view), also add regex on the card's available text: `experienceYears: extractExperienceYears(title)` (titles sometimes say "3-5 years exp" — though this is rare, it's free).

---

#### Step J — Update `src/app/lib/job-sources/index.ts`

In the `leanJobs` cache object (the `map()` around line 225), add the new fields:

```typescript
salary: j.salary,
salaryMin: j.salaryMin,           // ← ADD
salaryMax: j.salaryMax,           // ← ADD
salaryCurrency: j.salaryCurrency, // ← ADD
postedAt: j.postedAt,
companyLogo: j.companyLogo,
department: j.department,
tags: j.tags,
visaSponsorship: j.visaSponsorship,
experienceLevel: j.experienceLevel,
experienceYears: j.experienceYears,  // ← ADD
employmentType: j.employmentType,
```

---

#### Step K — Update `src/app/lib/job-utils.ts`

In `scoredJobToPipelineJob`, add the new fields to `jobData`:

```typescript
jobData: {
  description: job.description || '',
  matchedSkills: job.matchedSkills || [],
  missingSkills: missing,
  source: job.source,
  locationType: job.locationType,
  tags: job.tags,
  visaSponsorship: job.visaSponsorship,
  country: job.country,
  descriptionHtml: job.descriptionHtml,
  companyLogo: job.companyLogo,
  department: job.department,
  region: job.region,
  postedAt: job.postedAt,
  experienceLevel: job.experienceLevel,
  experienceYears: job.experienceYears,    // ← ADD
  employmentType: job.employmentType,
  salaryMin: job.salaryMin,               // ← ADD
  salaryMax: job.salaryMax,               // ← ADD
  salaryCurrency: job.salaryCurrency,     // ← ADD
},
```

---

#### Step L — Update `JobCard` in `src/app/components/resume/job-search-panel.tsx`

**Goal:** Display salary range and experience years as visually distinct pills — not buried in the same-styled tag row.

1. Add `DollarSign, Briefcase` to the lucide-react import (they are already available in the package).

2. Replace the existing salary chip (lines ~867-871) with a richer version. **Replace** this block:

```tsx
{job.salary && (
  <span className="rounded-xs border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
    {job.salary}
  </span>
)}
```

**With:**

```tsx
{/* Salary — prefer structured range, fallback to free-text */}
{(job.salaryMin || job.salary) && (
  <span className="flex items-center gap-0.5 rounded-xs border border-emerald-500/30 bg-emerald-50/50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
    <DollarSign size={9} />
    {job.salaryMin && job.salaryMax
      ? `${job.salaryCurrency === 'USD' ? '$' : job.salaryCurrency === 'GBP' ? '£' : job.salaryCurrency === 'EUR' ? '€' : `${job.salaryCurrency ?? ''} `}${Math.round(job.salaryMin / 1000)}k–${Math.round(job.salaryMax / 1000)}k`
      : job.salary}
  </span>
)}
```

3. After the existing `{job.experienceLevel && ...}` chip (around line 877), add a new experience-years chip:

```tsx
{job.experienceYears && (
  <span className="flex items-center gap-0.5 rounded-xs border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
    <Briefcase size={9} />
    {job.experienceYears}
  </span>
)}
```

4. Update the `ScoredJob` type access — the `ScoredJob` extends `JobResult` which now has `salaryMin`, `salaryMax`, `salaryCurrency`, `experienceYears`. No additional type imports needed since `ScoredJob` is already imported from `~/lib/job-sources/types`.

---

#### Step M — Update inline chat cards in `src/app/components/chat/job-preview.tsx`

1. Add `DollarSign, Briefcase` to the lucide-react import line (line 6).

2. Replace the existing `{job.salary && ...}` chip (lines 191-195) with:

```tsx
{(job.salaryMin || job.salary) && (
  <span className="flex items-center gap-0.5 rounded-xs bg-emerald-50/50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
    <DollarSign size={8} />
    {job.salaryMin && job.salaryMax
      ? `${job.salaryCurrency === 'USD' ? '$' : job.salaryCurrency === 'GBP' ? '£' : job.salaryCurrency === 'EUR' ? '€' : `${job.salaryCurrency ?? ''} `}${Math.round(job.salaryMin / 1000)}k–${Math.round(job.salaryMax / 1000)}k`
      : job.salary}
  </span>
)}
```

3. After the `{job.visaSponsorship && ...}` block (around line 196), add:

```tsx
{job.experienceYears && (
  <span className="flex items-center gap-0.5 rounded-xs bg-muted/50 px-1.5 py-0.5 text-[9px] text-muted-foreground">
    <Briefcase size={8} />
    {job.experienceYears}
  </span>
)}
```

4. In the `bookmarkJob` data object (line ~229), also pass through the new fields:

```typescript
jobData: {
  description: job.description,
  descriptionHtml: job.descriptionHtml,
  tags: job.tags,
  locationType: job.locationType,
  visaSponsorship: job.visaSponsorship,
  experienceLevel: job.experienceLevel,
  experienceYears: job.experienceYears,     // ← ADD
  employmentType: job.employmentType,
  source: job.source,
  companyLogo: job.companyLogo,
  department: job.department,
  country: job.country,
  region: job.region,
  city: job.city,
  district: job.district,
  salaryMin: job.salaryMin,                 // ← ADD
  salaryMax: job.salaryMax,                 // ← ADD
  salaryCurrency: job.salaryCurrency,       // ← ADD
},
```

---

#### Step N — Update `src/app/components/pipeline/job-detail-panel.tsx`

1. Add `DollarSign, Briefcase` to the lucide-react imports (line 6-8).

2. At the top of the component, extract `experienceYears` and structured salary from `job.jobData`:

```typescript
const experienceYears = (job.jobData?.experienceYears as string) || ''
const salaryMin = job.jobData?.salaryMin as number | undefined
const salaryMax = job.jobData?.salaryMax as number | undefined
const salaryCurrency = (job.jobData?.salaryCurrency as string) || 'USD'
```

3. In the **"Tags row"** (the `<div className="mt-2 flex flex-wrap gap-1.5">` around line 246), replace the existing salary chip:

**Replace:**
```tsx
{job.salary && (
  <span className="rounded-xs border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
    {job.salary}
  </span>
)}
```

**With:**
```tsx
{(salaryMin || job.salary) && (
  <span className="flex items-center gap-0.5 rounded-xs border border-emerald-500/30 bg-emerald-50/50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
    <DollarSign size={10} />
    {salaryMin && salaryMax
      ? `${salaryCurrency === 'USD' ? '$' : salaryCurrency === 'GBP' ? '£' : salaryCurrency === 'EUR' ? '€' : `${salaryCurrency} `}${Math.round(salaryMin / 1000)}k–${Math.round(salaryMax / 1000)}k`
      : job.salary}
  </span>
)}
```

4. After the `{visaSponsorship && ...}` chip (around line 270), add:

```tsx
{experienceYears && (
  <span className="flex items-center gap-0.5 rounded-xs border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
    <Briefcase size={10} />
    {experienceYears}
  </span>
)}
```

---

### 4.5 Vertical-Slice Order

Execute in this order so each step is independently testable:

1. **types.ts + extractExperienceYears** — foundation; all other files depend on this.
2. **Ashby fix (Step C)** — highest value bug fix; test by verifying a known Ashby company with comp data returns salary.
3. **Greenhouse expansion (Step D)** — second-biggest data gap.
4. **JSearch + Himalayas + Adzuna + RemoteOK (Steps E-H)** — structured salary propagation.
5. **Remaining adapters regex-only (Step I)** — experienceYears coverage across all sources.
6. **index.ts cache (Step J)** — ensures new fields survive the Redis lean-cache round trip.
7. **job-utils.ts (Step K)** — ensures new fields flow into PipelineJob.jobData.
8. **JobCard UI (Step L)** — visible result in the search panel.
9. **job-preview.tsx (Step M)** — visible result in chat cards.
10. **job-detail-panel.tsx (Step N)** — visible result in the slide-over detail panel.

---

### 5. Assertion & Testing Requirements

Behavior changes in logic (adapter parsing, type shape, UI display) — tests are appropriate.

**Unit Tests** (`tests/unit/`):

1. **`extractExperienceYears.test.ts`** — Test the new utility function:
   - `"3-5 years of experience"` → `"3-5 years"`
   - `"2+ years"` → `"2+ years"`
   - `"minimum 5 years"` → `"5+ years"`
   - `"no relevant text"` → `undefined`
   - Empty string → `undefined`
   - Multi-match string → returns first match

2. **`ashby.test.ts`** — Mock the Ashby API response with a `compensation` field and assert that `salary`, `salaryMin`, `salaryMax`, `salaryCurrency` are populated.

3. **`greenhouse.test.ts`** — Mock metadata with `[{ name: "Years of Experience", value: "5+ years" }]` and assert `experienceYears` is `"5+ years"`.

**Integration Tests:** N/A — no multi-module contracts change beyond what unit tests cover.

**E2E UI Tests:** Skip — the UI change is additive chip display only; no flow changes.

---

### 6. Verification Commands & Log Files

- **TypeScript check:** `npx tsc --noEmit` — Run first. Must pass with 0 errors. The new optional fields on `JobResult` are all `?` so existing code that doesn't use them should compile cleanly.
- **Lint:** `pnpm lint`
- **Unit tests:** `pnpm test:unit` or `pnpm vitest run tests/unit/`
- **Build:** `pnpm build`
- **Dev sanity check:** `pnpm dev` → visit `http://localhost:3000/en/resume/68e8bfdc-4832-4f66-b5d0-86b195ec8eea` → search for any role → confirm salary pill shows green with `$` icon when data is available, and `Briefcase` + years chip appears when populated.
- **Server Log Location:** Next.js dev server stdout in the terminal running `pnpm dev`. Build errors appear in the same terminal. No separate log file.

---

### Appendix — Source Coverage Summary After This Plan

| Source | Salary | salaryMin/Max | experienceYears |
|--------|--------|---------------|-----------------|
| RemoteOK | ✅ string | ✅ populated | ✅ regex |
| Himalayas | ✅ string | ✅ populated | ✅ regex |
| Remotive | ✅ string | ❌ no API field | ✅ regex |
| The Muse | ❌ none | ❌ | ✅ regex |
| Arbeitnow | ✅ string | ❌ no API field | ✅ regex |
| **Ashby** | **✅ FIXED** | **✅ FIXED** | **✅ regex** |
| Greenhouse | ✅ metadata | ❌ no API field | ✅ metadata + regex |
| Adzuna | ✅ string | ✅ populated | ✅ regex |
| JSearch | ✅ string | ✅ populated | ✅ seniority + regex |
| JobbKK | ✅ string | ❌ HTML scrape | ✅ regex |
| LinkedIn Guest | ✅ card HTML | ❌ | ✅ criteria parse |
| LinkedIn Apify | ✅ string | ❌ | ✅ regex |
| Indeed Apify | ✅ string | ❌ | ✅ regex |
| JobsDB REST | ✅ salaryLabel | ❌ | ✅ regex |
| JobsDB Apify | ✅ string | ❌ | ✅ regex |
