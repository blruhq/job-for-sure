# Phase 6 — Additional Sources + Future Enhancements

> **Time:** 2-3 days per source
> **Depends on:** Nothing blocking. Can be done in parallel with other phases.
> **Status:** Enhancement — NOT blocking for launch

## What & Why

This phase covers adding more job sources and culture data to your existing 13-source scraping pipeline. The main addition is **jobsbyculture.com** — a site that aggregates company culture data (Glassdoor ratings, pros/cons, values) alongside job listings.

### Why jobsbyculture.com is valuable:
1. **Culture data** — no other source provides Glassdoor ratings + pros/cons attached to jobs
2. **Scraper-friendly** — `robots.txt` explicitly allows all AI bots
3. **Sitemaps available** — `sitemap.xml` enumerates every URL
4. **Clean URLs** — predictable structure (`/companies/{slug}`, `/jobs/{company}/{role}`)
5. **Differentiator** — no competitor has culture-attached job data

---

## Part A: jobsbyculture.com as Additional Job Source

### File: `src/app/lib/job-sources/jobsbyculture.ts` (NEW)

Follow the EXACT same pattern as existing sources (see `remoteok.ts`, `himalayas.ts`, etc.).

```typescript
import type { JobResult } from './types'

const SOURCE_NAME = 'jobsbyculture' as const
const BASE_URL = 'https://jobsbyculture.com'

export async function fetchJobsByCulture(query: string, _location: string): Promise<JobResult[]> {
  // Step 1: Fetch the jobs listing page or sitemap
  const url = `${BASE_URL}/jobs?q=${encodeURIComponent(query)}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'JobForSure/1.0' },
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) return []

  const html = await res.text()
  // Step 2: Parse HTML with cheerio (same as other sources)
  const $ = cheerio.load(html)

  const jobs: JobResult[] = []

  // Step 3: Extract job cards
  // NOTE: The exact selectors must be verified by inspecting the live site.
  $('[data-job-card], .job-card, article.job').each((_, el) => {
    const title = $(el).find('.job-title, h3, h2').first().text().trim()
    const company = $(el).find('.company-name, .company').first().text().trim()
    const location = $(el).find('.location').first().text().trim()
    const link = $(el).find('a[href*="/jobs/"]').first().attr('href')
    const logoUrl = $(el).find('img').attr('src')

    // Culture-specific data (unique to this source):
    const cultureScore = $(el).find('[data-culture-score]').attr('data-culture-score')
    const glassdoorRating = $(el).find('[data-glassdoor-rating]').attr('data-glassdoor-rating')
    const companySize = $(el).find('[data-company-size]').text().trim()

    if (title && company) {
      jobs.push({
        id: `${SOURCE_NAME}::${company}::${title}`.toLowerCase().replace(/\s+/g, '-'),
        source: SOURCE_NAME,
        title,
        company,
        location: location || 'Remote',
        url: link?.startsWith('http') ? link : `${BASE_URL}${link}`,
        companyLogo: logoUrl || '',
        description: '', // fetch from detail page if needed
        locationType: location?.toLowerCase().includes('remote') ? 'remote' : 'unknown',
        // Culture data stored in a custom field for later use:
        ...(cultureScore || glassdoorRating ? {
          culture: {
            score: cultureScore ? parseFloat(cultureScore) : undefined,
            glassdoorRating: glassdoorRating ? parseFloat(glassdoorRating) : undefined,
            companySize: companySize || undefined,
          }
        } : {}),
      })
    }
  })

  return jobs
}
```

### Register in orchestrator

> **CRITICAL:** The orchestrator uses string arrays + `if (sources.includes(...))` blocks
> with `fetchers.push()`. NOT an object array. Follow the EXACT pattern of existing sources.

**Step 1:** Add `'jobsbyculture'` to the `JobSource` union type in `src/app/lib/job-sources/types.ts`:

```typescript
export type JobSource =
  | 'greenhouse'
  | 'ashby'
  // ... existing ...
  | 'jobsdb-rest'
  | 'jobsbyculture'    // ← ADD THIS
```

**Step 2:** Add to `FAST_FREE_SOURCES` in `src/app/lib/job-sources/index.ts` (line 48):

```typescript
const FAST_FREE_SOURCES: JobSource[] = [
  'remoteok', 'himalayas', 'remotive',
  'themuse', 'arbeitnow', 'adzuna', 'jsearch', 'jobbkk',
  'linkedin-guest',
  'jobsbyculture',    // ← ADD THIS
]
```

**Step 3:** Add the import at the top of `index.ts`:

```typescript
import { fetchJobsByCulture } from './jobsbyculture'
```

**Step 4:** Add a `fetchers.push()` block in the `searchJobs()` function (around line 115+):

> **CRITICAL:** In `searchJobs()`, the destructured variable `query` is a **string** (the search
> query text), NOT an object with a `.query` property. Use bare `query` and `location`:

```typescript
if (sources.includes('jobsbyculture')) {
  fetchers.push(() => fetchJobsByCulture(query, location || ''))
  fetcherSources.push('jobsbyculture')
}
```

**Step 5:** Add `'jobsbyculture': 'JobsByCulture'` to `SOURCE_NAMES` and `SOURCE_SHORT` in:
- `src/app/lib/source-names.ts`
- (These maps were extracted to a shared file during cleanup)

### Update JobResult type

**File:** `src/app/lib/job-sources/types.ts`

Add `'jobsbyculture'` to the `JobSource` union (see Step 1 above — same change).

Add optional culture data to `JobResult`:

```typescript
export interface JobResult {
  // ... existing 19 fields ...
  culture?: {
    score?: number
    glassdoorRating?: number
    companySize?: string
    pros?: string[]
    cons?: string[]
    values?: string[]
  }
}
```

### Verify selectors

IMPORTANT: Before implementing, verify the actual DOM structure of jobsbyculture.com by:
1. Opening a job listing page in browser
2. Inspecting the HTML structure
3. Updating the cheerio selectors to match

The sitemap is at: `https://jobsbyculture.com/sitemap.xml`

---

## Part B: Company Culture Data Enrichment

When a job from ANY source is displayed, enrich it with culture data from jobsbyculture.

### New API Route: `src/app/api/company-culture/route.ts`

```typescript
import { getRedis } from '~/lib/redis'

export const GET = withAuth(async (req, { user }) => {
  const { searchParams } = new URL(req.url)
  const company = searchParams.get('company')

  if (!company) {
    return NextResponse.json({ error: 'Company name required' }, { status: 400 })
  }

  // Check Redis cache first (24h TTL) — getRedis() is a factory, wrap in try/catch
  const cacheKey = `culture::${company.toLowerCase()}`
  try {
    const redis = getRedis()
    const cached = await redis.get(cacheKey)
    if (cached) return NextResponse.json(JSON.parse(cached))
  } catch { /* fail-open */ }

  // Scrape jobsbyculture.com/companies/{slug}
  const slug = company.toLowerCase().replace(/\s+/g, '-')
  const res = await fetch(`https://jobsbyculture.com/companies/${slug}`, {
    headers: { 'User-Agent': 'JobForSure/1.0' },
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) {
    return NextResponse.json({ found: false })
  }

  const html = await res.text()
  const $ = cheerio.load(html)

  // Extract culture data (verify selectors against live site)
  const culture = {
    found: true,
    name: $('h1').first().text().trim(),
    glassdoorRating: parseFloat($('[data-glassdoor]').text()) || undefined,
    cultureScore: parseFloat($('[data-culture-score]').text()) || undefined,
    size: $('[data-size]').text().trim() || undefined,
    pros: $('[data-pro]').map((_, el) => $(el).text().trim()).get(),
    cons: $('[data-con]').map((_, el) => $(el).text().trim()).get(),
    values: $('[data-value]').map((_, el) => $(el).text().trim()).get(),
    url: `https://jobsbyculture.com/companies/${slug}`,
  }

  // Cache for 24 hours
  try {
    const redis = getRedis()
    await redis.set(cacheKey, JSON.stringify(culture), { ex: 86400 })
  } catch { /* fail-open */ }

  return NextResponse.json(culture)
}, { route: '/api/company-culture' })
```

### Display in Job Detail Panel

If culture data is found, show it INLINE (no link-out needed for this):

```
── COMPANY CULTURE (from jobsbyculture) ──
⭐ Glassdoor: 4.2/5   📊 Size: 500-1000
✅ Pros: "Great work-life balance", "Good benefits"
⚠️ Cons: "Slow promotion process"
🏷️ Values: Innovation, Transparency, Ownership
[View full profile →]
```

This replaces the company intelligence LINK with INLINE DATA for companies that jobsbyculture has data on. Falls back to links for companies without data.

---

## Part C: Future Enhancement Ideas (NOT in scope now)

Documented for future reference. Do NOT build these now.

1. **Salary API** — Integrate Glassdoor/Levels.fyi salary data per role+city
2. **Map View** — Leaflet + OpenStreetMap showing all bookmarked jobs on a map
3. **Commute Cost Calculator** — BTS/MRT fare tables for inline cost display
4. **Google Distance Matrix API** — Accurate transit time badges on cards
5. **LinkedIn Import** — Import profile data from LinkedIn
6. **Application Deadline Alerts** — Track and notify approaching deadlines
7. **Email Templates** — Pre-written outreach emails for recruiters
8. **Multi-language Job Search** — Search jobs in TH + EN simultaneously
9. **Referral Network** — Connect users who work at target companies
10. **Interview Question Bank** — Company-specific real interview questions

---

## Acceptance Criteria

**jobsbyculture as source:**
- [ ] `src/app/lib/job-sources/jobsbyculture.ts` created
- [ ] Registered in orchestrator (`index.ts`)
- [ ] Returns JobResult[] with culture data attached
- [ ] Cached in Redis (6h TTL, same as other sources)
- [ ] Source health monitor includes JobsByCulture
- [ ] Verify selectors work against live site before shipping

**Culture enrichment API:**
- [ ] `src/app/api/company-culture/route.ts` created
- [ ] Returns culture data for known companies
- [ ] Returns `{ found: false }` for unknown companies
- [ ] Cached in Redis (24h TTL)
- [ ] SSRF protection (validate URL before fetch — follow existing scraper.ts pattern)

**Culture display in panel:**
- [ ] Inline culture data shown when available
- [ ] Falls back to company intelligence links when not available
- [ ] Glassdoor rating + size + pros/cons displayed

**General:**
- [ ] `npx tsc --noEmit` passes
- [ ] `pnpm lint` passes
- [ ] New source doesn't slow down job search (timeout at 10s)
