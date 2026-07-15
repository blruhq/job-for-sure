# PLAN: Job Search UX Overhaul — Free JobsDB REST + Kill Paid Gate + Enhance LinkedIn + Banner Merge

> **For:** Execution agent (fast writer, follow instructions exactly)
> **Prerequisite:** Local-first sorting (`isLocal` + `compareJobs`) is ALREADY IMPLEMENTED. Do NOT touch it.
> **Total tasks:** 16 organized into 5 groups (A-E)
> **Files touched:** 7 (1 new, 6 edited)
> **DO NOT** make changes outside this plan. **DO NOT** "improve" code that isn't listed.
> **DO NOT** touch `scoring.ts` or `tests/` — those are done.
> **types.ts** has two small edits (add `jobsdb-rest` to JobSource, remove `includePaid` from SearchParams). Do NOT touch anything else in types.ts.
> After EVERY group, run the verification command listed before moving on.

---

## QUICK REFERENCE — Verification Commands

```bash
# Type check (MUST pass with 0 errors)
npx tsc --noEmit

# Tests (MUST all pass)
pnpm test

# Dev server (for manual verification)
pnpm dev
```

---

## CONTEXT — What This Plan Does

### Problem 1: Fake "Unlock Paid Sources" Button
The app hides Indeed/JobsDB behind a button that shows a FAKE job count (`15 + query.length % 25`). When clicked, it merges results and RE-SORTS the entire list, destroying the user's scroll position. This is dishonest and bad UX.

### Problem 2: Apify LinkedIn + JobsDB Are Wasted Money
- **LinkedIn**: We pay Apify ~$0.02/search but ALREADY have a free guest scraper (`linkedin-guest.ts`) that hits the same public endpoint.
- **JobsDB**: We pay Apify ~$0.02/search but JobsDB has a FREE public REST API (`/api/jobsearch/v5/search`) that returns BETTER data (structured JSON, salaries, province-level locations, company logos). Tested live July 2026 — works perfectly, no Cloudflare, no auth.

### Problem 3: Phase 2 Silent Merge Breaks Scroll
When slow source results arrive 3-15s after search, they silently merge + re-sort the list. Jobs the user was reading shift position. Should use banner pattern instead (like the existing SWR refresh).

### Solution
1. **New `jobsdb-rest.ts` adapter** — Free JobsDB/JobStreet REST API covering 6 countries (TH, HK, SG, MY, PH, ID)
2. Kill the "Unlock paid sources" button entirely
3. Move Indeed (Apify) to fire automatically in Phase 2
4. Drop Apify LinkedIn AND Apify JobsDB (both have free alternatives)
5. Enhance the free LinkedIn guest adapter (random UAs, salary parsing, multi-page)
6. Phase 2 uses banner merge (same pattern as existing SWR refresh)

### Cost Savings
```
BEFORE: LinkedIn $0.02 + JobsDB $0.02 + Indeed $0.02 = $0.06/search
AFTER:  LinkedIn FREE + JobsDB FREE + Indeed $0.02 = $0.02/search
SAVINGS: 67% reduction
```

---

## WHAT IS ALREADY DONE — DO NOT TOUCH

```
✅ types.ts          — isLocal?: boolean on ScoredJob
✅ scoring.ts        — scoreJob sets isLocal, compareJobs exported, rankJobs uses compareJobs
✅ index.ts          — stripScore strips isLocal
✅ job-search-panel  — mergeResults + backgroundRefresh use compareJobs
✅ scoring.test.ts   — isLocal + local-first sorting tests
```

**DO NOT EDIT THESE FILES unless explicitly stated in a task below.**

---

# GROUP A — New JobsDB REST API Adapter (4 tasks)

This is a NEW FILE. Create it from scratch using the code provided.

## A1. Create `jobsdb-rest.ts` — The Adapter

**File:** `src/app/lib/job-sources/jobsdb-rest.ts` (NEW FILE)

**Why:** JobsDB/JobStreet (both owned by SEEK) expose a public REST API at `/api/jobsearch/v5/search`. No auth, no Cloudflare, returns structured JSON with salaries, province data, company logos. Covers 6 Asian countries. Tested live July 2026 — works perfectly. This replaces the paid Apify JobsDB adapter.

**Create this file with EXACTLY this content:**

```ts
// ═══════════════════════════════════════════════════════════════
// JOBSDB / JOBSTREET REST ADAPTER (FREE — no auth, no Apify)
//
// Uses SEEK's public job search REST API. Same endpoint their
// website frontend calls. Returns structured JSON (not HTML).
//
// Covers 6 countries via siteKey mapping:
//   JobsDB:    Thailand (TH), Hong Kong (HK)
//   JobStreet: Singapore (SG), Malaysia (MY), Philippines (PH), Indonesia (ID)
//
// API URL pattern:
//   https://{domain}/api/jobsearch/v5/search?siteKey={key}&sourcesystem=houston
//
// No authentication required. No Cloudflare. No rate limiting observed
// at low volume. Cache aggressively (6h TTL handled by orchestrator).
//
// Data quality: title, company, location (with province), salary,
// company logo, bullet points, work type, classifications, teaser.
// ═══════════════════════════════════════════════════════════════

import type { JobResult } from './types'
import { parseLocation } from './geo'

// ── Country → SEEK endpoint mapping ──────────────────────────
// JobsDB brand: Thailand, Hong Kong
// JobStreet brand: Singapore, Malaysia, Philippines, Indonesia
const COUNTRY_MAP: Record<string, { domain: string; siteKey: string }> = {
  TH: { domain: 'th.jobsdb.com',    siteKey: 'TH-Main' },
  HK: { domain: 'hk.jobsdb.com',    siteKey: 'HK-Main' },
  SG: { domain: 'sg.jobstreet.com', siteKey: 'SG-Main' },
  MY: { domain: 'my.jobstreet.com', siteKey: 'MY-Main' },
  PH: { domain: 'ph.jobstreet.com', siteKey: 'PH-Main' },
  ID: { domain: 'id.jobstreet.com', siteKey: 'ID-Main' },
}

// ── Random User-Agents (same pool as linkedin-guest.ts) ──────
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
]

function getRandomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

// ── API response types (subset of fields we use) ────────────
interface JobsDBLocation {
  label: string
  countryCode?: string
  seoHierarchy?: Array<{ contextualName: string }>
}

interface JobsDBJob {
  id: string
  title: string
  companyName?: string
  advertiser?: { description?: string }
  locations?: JobsDBLocation[]
  salaryLabel?: string
  listingDate?: string
  listingDateDisplay?: string
  workTypes?: string[]
  workArrangements?: { data?: Array<{ label?: { text?: string } }> }
  teaser?: string
  bulletPoints?: string[]
  classifications?: Array<{
    classification?: { description?: string }
    subclassification?: { description?: string }
  }>
  branding?: { serpLogoUrl?: string }
}

interface JobsDBResponse {
  data?: JobsDBJob[]
  totalCount?: number
}

/**
 * Fetch jobs from JobsDB/JobStreet REST API.
 *
 * Automatically detects the right country endpoint based on the
 * user's location. If the user's country isn't covered by JobsDB/
 * JobStreet (e.g., US, UK), returns empty array (not an error —
 * other sources compensate).
 *
 * One request returns up to 50 jobs.
 */
export async function fetchJobsDBRest(
  query: string,
  location?: string,
  opts?: { signal?: AbortSignal },
): Promise<{ jobs: JobResult[]; error?: string }> {
  try {
    // 1. Parse user location to get country code
    const parsed = parseLocation(location)
    const countryCode = parsed.country

    // 2. Look up country in SEEK mapping
    const config = countryCode ? COUNTRY_MAP[countryCode] : null

    // 3. If country not covered → skip silently (not an error)
    if (!config) {
      return { jobs: [] }
    }

    // 4. Build API URL
    const params = new URLSearchParams()
    params.set('siteKey', config.siteKey)
    params.set('sourcesystem', 'houston')
    params.set('keywords', query.slice(0, 200))
    params.set('pageSize', '50')
    params.set('page', '1')
    params.set('sortmode', 'ListedDate')

    const url = `https://${config.domain}/api/jobsearch/v5/search?${params.toString()}`

    // 5. Fetch
    const res = await fetch(url, {
      signal: opts?.signal,
      headers: {
        'User-Agent': getRandomUA(),
        Accept: 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })

    if (!res.ok) {
      return { jobs: [], error: `JobsDB REST: HTTP ${res.status}` }
    }

    const json: JobsDBResponse = await res.json()

    // 6. Normalize to JobResult[]
    const jobs: JobResult[] = (json.data || [])
      .filter((job) => job.title && (job.companyName || job.advertiser?.description))
      .map((job) => {
        // Location: use first location entry's label
        const locData = job.locations?.[0]
        const locationLabel = locData?.label || location || ''

        // Parse location for country/region
        const parsedLoc = parseLocation(locationLabel || 'Remote')

        // Determine work type
        const workArrangement = job.workArrangements?.data?.[0]?.label?.text?.toLowerCase() || ''
        const locationType: JobResult['locationType'] =
          workArrangement.includes('remote') ? 'remote' :
          workArrangement.includes('hybrid') ? 'hybrid' :
          workArrangement.includes('on-site') || workArrangement === '' ? 'onsite' : 'unknown'

        // Build classification tags
        const tags: string[] = []
        for (const c of job.classifications || []) {
          if (c.classification?.description) tags.push(c.classification.description)
          if (c.subclassification?.description) tags.push(c.subclassification.description)
        }

        // Employment type
        const employmentType = job.workTypes?.[0]

        // Company name
        const company = job.companyName || job.advertiser?.description || 'Unknown Company'

        // Description from teaser + bullet points
        const descParts: string[] = []
        if (job.teaser) descParts.push(job.teaser)
        if (job.bulletPoints && job.bulletPoints.length > 0) {
          descParts.push(job.bulletPoints.map((bp) => `• ${bp}`).join('\n'))
        }
        const description = descParts.join('\n\n')

        // Job URL
        const jobUrl = `https://${config.domain}/job/${job.id}`

        // Company logo
        const companyLogo = job.branding?.serpLogoUrl || undefined

        return {
          id: `jobsdb-rest:${job.id}`,
          source: 'jobsdb-rest' as const,
          company,
          title: job.title,
          location: locationLabel || 'Unknown',
          country: parsedLoc.country || countryCode,
          region: parsedLoc.region,
          locationType,
          url: jobUrl,
          description,
          salary: job.salaryLabel || undefined,
          postedAt: job.listingDate,
          companyLogo,
          tags: tags.length > 0 ? tags : undefined,
          employmentType,
        }
      })

    return { jobs }
  } catch (err) {
    // Fail-open: other sources compensate
    return {
      jobs: [],
      error: err instanceof Error ? err.message : 'JobsDB REST fetch failed',
    }
  }
}
```

---

## A2. Add `'jobsdb-rest'` to the `JobSource` type

**File:** `src/app/lib/job-sources/types.ts`

**Why:** The new adapter needs a source identifier. We add `'jobsdb-rest'` as a new source type (distinct from the old `'jobsdb'` which was the Apify version).

Find the `JobSource` type at **lines 6-21**:

```ts
export type JobSource =
  | 'greenhouse'
  | 'ashby'
  | 'remoteok'
  | 'himalayas'
  | 'remotive'
  | 'themuse'
  | 'arbeitnow'
  | 'adzuna'
  | 'jsearch'
  | 'jobbkk'
  | 'linkedin-guest'
  | 'linkedin'
  | 'indeed'
  | 'jobsdb'
```

**Replace with (add `'jobsdb-rest'`):**

```ts
export type JobSource =
  | 'greenhouse'
  | 'ashby'
  | 'remoteok'
  | 'himalayas'
  | 'remotive'
  | 'themuse'
  | 'arbeitnow'
  | 'adzuna'
  | 'jsearch'
  | 'jobbkk'
  | 'linkedin-guest'
  | 'linkedin'
  | 'indeed'
  | 'jobsdb'
  | 'jobsdb-rest'
```

---

## A3. Register the new adapter in the orchestrator

**File:** `src/app/lib/job-sources/index.ts`

**Why:** The orchestrator (`searchJobs`) needs to know when to call the new adapter.

### Step 1: Add import

Find at **line 28**:

```ts
import { fetchApifyJobsDB } from './apify-jobsdb'
```

**Add AFTER it:**

```ts
import { fetchJobsDBRest } from './jobsdb-rest'
```

### Step 2: Add fetcher registration

Find the Apify JobsDB fetcher registration at **lines 175-178**:

```ts
  if (sources.includes('jobsdb')) {
    fetchers.push(() => fetchApifyJobsDB(query, location))
    fetcherSources.push('jobsdb')
  }
```

**Add AFTER it:**

```ts
  if (sources.includes('jobsdb-rest')) {
    fetchers.push(() => fetchJobsDBRest(query, location))
    fetcherSources.push('jobsdb-rest')
  }
```

---

## A4. Update source display names in the frontend

**File:** `src/app/components/resume/job-search-panel.tsx`

Find the `SOURCE_NAMES` constant at **lines 27-42**:

```ts
const SOURCE_NAMES: Record<JobSource, string> = {
  greenhouse: 'Greenhouse',
  ashby: 'Ashby',
  remoteok: 'RemoteOK',
  himalayas: 'Himalayas',
  remotive: 'Remotive',
  themuse: 'The Muse',
  arbeitnow: 'Arbeitnow',
  adzuna: 'Adzuna',
  jsearch: 'JSearch',
  jobbkk: 'JobbKK',
  'linkedin-guest': 'LinkedIn',
  linkedin: 'LinkedIn (Apify)',
  indeed: 'Indeed (Apify)',
  jobsdb: 'JobsDB (Apify)',
}
```

**Replace with (add `jobsdb-rest` entry):**

```ts
const SOURCE_NAMES: Record<JobSource, string> = {
  greenhouse: 'Greenhouse',
  ashby: 'Ashby',
  remoteok: 'RemoteOK',
  himalayas: 'Himalayas',
  remotive: 'Remotive',
  themuse: 'The Muse',
  arbeitnow: 'Arbeitnow',
  adzuna: 'Adzuna',
  jsearch: 'JSearch',
  jobbkk: 'JobbKK',
  'linkedin-guest': 'LinkedIn',
  linkedin: 'LinkedIn (Apify)',
  indeed: 'Indeed (Apify)',
  jobsdb: 'JobsDB (Apify)',
  'jobsdb-rest': 'JobsDB',
}
```

**Also update `SOURCE_SHORT` in the chat job preview file.**

**File:** `src/app/components/chat/job-preview.tsx`

Find the `SOURCE_SHORT` constant at **lines 16-31**:

```ts
const SOURCE_SHORT: Record<JobSource, string> = {
  greenhouse: 'Greenhouse',
  ashby: 'Ashby',
  remoteok: 'RemoteOK',
  himalayas: 'Himalayas',
  remotive: 'Remotive',
  themuse: 'The Muse',
  arbeitnow: 'Arbeitnow',
  adzuna: 'Adzuna',
  jsearch: 'JSearch',
  jobbkk: 'JobbKK',
  'linkedin-guest': 'LinkedIn',
  linkedin: 'LinkedIn',
  indeed: 'Indeed',
  jobsdb: 'JobsDB',
}
```

**Replace with (add `'jobsdb-rest': 'JobsDB'` entry at the end):**

```ts
const SOURCE_SHORT: Record<JobSource, string> = {
  greenhouse: 'Greenhouse',
  ashby: 'Ashby',
  remoteok: 'RemoteOK',
  himalayas: 'Himalayas',
  remotive: 'Remotive',
  themuse: 'The Muse',
  arbeitnow: 'Arbeitnow',
  adzuna: 'Adzuna',
  jsearch: 'JSearch',
  jobbkk: 'JobbKK',
  'linkedin-guest': 'LinkedIn',
  linkedin: 'LinkedIn',
  indeed: 'Indeed',
  jobsdb: 'JobsDB',
  'jobsdb-rest': 'JobsDB',
}
```

### Verification for Group A

```bash
npx tsc --noEmit
```

Must pass with 0 errors. The new `jobsdb-rest.ts` file must compile cleanly. The `JobSource` type must include `'jobsdb-rest'`. Both `SOURCE_NAMES` and `SOURCE_SHORT` must include the new key.

---

# GROUP B — Enhance LinkedIn Guest Adapter (3 tasks)

## B1. Add Random User Agents

**File:** `src/app/lib/job-sources/linkedin-guest.ts`

**Why:** Current code uses a single fixed User-Agent string. Every request looks like the same browser. LinkedIn can fingerprint this as a bot. Random UAs make each request look like a different browser, reducing block risk.

### Step 1: Replace the `BROWSER_HEADERS` constant

Find this code at **lines 28-33**:

```ts
// LinkedIn requires browser-like headers or it returns 999/403.
const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
}
```

**Replace with:**

```ts
// Pool of realistic browser User-Agents. Picked randomly per request
// to prevent UA-based fingerprinting by LinkedIn's anti-bot system.
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
]

function getRandomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

// Base headers (User-Agent is added per-request via getRandomUA())
function makeBrowserHeaders(): Record<string, string> {
  return {
    'User-Agent': getRandomUA(),
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  }
}
```

### Step 2: Update `fetchLinkedInGuestDetail` to use `makeBrowserHeaders()`

> **NOTE:** Do NOT update `fetchLinkedInGuest` here — that entire function gets replaced in task B2 below. Only update the DETAIL function here.

Find at **line 197** inside `fetchLinkedInGuestDetail`:

```ts
      headers: BROWSER_HEADERS,
```

**Replace with:**

```ts
      headers: makeBrowserHeaders(),
```

---

## B2. Add Salary Parsing + Multi-Page Fetch

**File:** `src/app/lib/job-sources/linkedin-guest.ts`

**Why:** Add salary parsing from job cards (~5-10% of listings have salary). Fetch 2 pages (50 jobs instead of 25).

Find the **entire** `fetchLinkedInGuest` function (from `export async function fetchLinkedInGuest` to its closing `}`). That is approximately **lines 66-180**.

**Replace the ENTIRE function with:**

```ts
/**
 * Fetch up to 50 job cards from LinkedIn's guest search endpoint.
 *
 * Fetches 2 pages (start=0 and start=25) to double the result count.
 * This is a LIST-ONLY call. Descriptions are intentionally NOT fetched
 * here — they're loaded on-demand when the user clicks a card in the
 * detail modal (see /api/jobs/detail/route.ts).
 */
export async function fetchLinkedInGuest(
  query: string,
  location?: string,
  opts?: { signal?: AbortSignal },
): Promise<{ jobs: JobResult[]; error?: string }> {
  try {
    // ── Page 1 (start=0) ──
    const page1 = await fetchLinkedInGuestPage(query, location, 0, opts)
    if (page1.jobs.length === 0) {
      return page1
    }

    // ── Page 2 (start=25) — only if page 1 was full (25 jobs) ──
    if (page1.jobs.length >= 25) {
      await new Promise((r) => setTimeout(r, 300))
      const page2 = await fetchLinkedInGuestPage(query, location, 25, opts)
      if (page2.jobs.length > 0) {
        const seen = new Set(page1.jobs.map((j) => j.id))
        const unique = page2.jobs.filter((j) => !seen.has(j.id))
        return { jobs: [...page1.jobs, ...unique] }
      }
    }

    return page1
  } catch (err) {
    return {
      jobs: [],
      error: err instanceof Error ? err.message : 'LinkedIn guest fetch failed',
    }
  }
}

/**
 * Fetch a single page of job cards from LinkedIn's guest search endpoint.
 * Internal helper — called by fetchLinkedInGuest.
 */
async function fetchLinkedInGuestPage(
  query: string,
  location: string | undefined,
  start: number,
  opts?: { signal?: AbortSignal },
): Promise<{ jobs: JobResult[]; error?: string }> {
  try {
    const params = new URLSearchParams()
    params.set('keywords', query.slice(0, 200))
    if (location && location.trim()) {
      params.set('location', location.trim())
    }
    params.set('start', String(start))

    const url = `${GUEST_SEARCH_URL}?${params.toString()}`

    const res = await fetch(url, {
      signal: opts?.signal,
      headers: makeBrowserHeaders(),
      redirect: 'manual',
    })

    if (res.status >= 300) {
      return { jobs: [], error: `LinkedIn guest: redirected (${res.status})` }
    }

    if (!res.ok) {
      return { jobs: [], error: `LinkedIn guest: HTTP ${res.status}` }
    }

    const html = await res.text()

    if (!html || html.length < 100) {
      return { jobs: [], error: 'LinkedIn guest: empty response (likely rate-limited)' }
    }

    const $ = cheerio.load(html)
    const jobs: JobResult[] = []

    $('li').each((_i, el) => {
      const card = $(el)

      const link =
        card.find('a.base-card__full-link').first() ||
        card.find('a[href*="/jobs/view/"]').first()
      const href = link.attr('href') || ''
      if (!href) return

      const cleanUrl = href.split('?')[0]
      const jobId = extractJobId(href)
      if (!jobId) return

      const title =
        card.find('h3.base-search-card__title').text().trim() ||
        card.find('h3').first().text().trim() ||
        ''
      if (!title) return

      const company =
        card.find('h4.base-search-card__subtitle').text().trim() ||
        card.find('h4').first().text().trim() ||
        ''

      const locationText =
        card.find('.job-search-card__location').text().trim() ||
        card.find('.job-card-container__metadata-item').text().trim() ||
        card.find('[class*="location"]').first().text().trim() ||
        ''

      const timeEl = card.find('time').first()
      const postedAt = timeEl.attr('datetime') || timeEl.attr('title') || undefined

      const salary =
        card.find('.job-search-card__salary-info').text().trim().replace(/\s+/g, ' ') ||
        undefined

      const parsed = parseLocation(locationText || 'Remote')
      const locationType = detectLocationType(locationText)

      jobs.push({
        id: `linkedin-guest:${jobId}`,
        source: 'linkedin-guest' as const,
        company: company || 'LinkedIn',
        title,
        location: locationText || 'Remote',
        country: parsed.country,
        region: parsed.region,
        locationType,
        url: cleanUrl.startsWith('http') ? cleanUrl : `https://www.linkedin.com${cleanUrl}`,
        description: '',
        descriptionHtml: '',
        salary: salary || undefined,
        postedAt,
      })
    })

    return { jobs }
  } catch (err) {
    return {
      jobs: [],
      error: err instanceof Error ? err.message : 'LinkedIn guest page fetch failed',
    }
  }
}
```

### Step 2: Update the file header comment

Find the header comment at **lines 7-10**:

```ts
// TWO endpoints (we only use #1 here):
//   1. LIST:   /jobs-guest/jobs/api/seeMoreJobPostings/search
//      → 25 job cards per page (title, company, location, URL, date)
//      → NO job descriptions — fetched on-demand via /api/jobs/detail
```

**Replace with:**

```ts
// TWO endpoints (we only use #1 here):
//   1. LIST:   /jobs-guest/jobs/api/seeMoreJobPostings/search
//      → 25 job cards per page. We fetch 2 pages (50 jobs total).
//      → Title, company, location, URL, date, salary (when available)
//      → NO job descriptions — fetched on-demand via /api/jobs/detail
```

### Verification for Group B

```bash
npx tsc --noEmit
```

Must pass with 0 errors. Check that `BROWSER_HEADERS` is NOT referenced anywhere in the file (replaced by `makeBrowserHeaders()`).

---

# GROUP C — Kill Paid Sources Gate (5 tasks)

## C1. Remove `PAID_SOURCES`, `paidLoaded`, `paidLoading`, `paidTeaseCount` from job-search-panel.tsx

**File:** `src/app/components/resume/job-search-panel.tsx`

### Step 1: Remove the `PAID_SOURCES` constant

Find at **line 53**:

```ts
const PAID_SOURCES: JobSource[] = ['linkedin', 'indeed', 'jobsdb']
```

**Delete this entire line.**

### Step 2: Remove `paidLoaded` and `paidLoading` state

Find at **lines 98-99**:

```ts
  const [paidLoaded, setPaidLoaded] = useState(false)
  const [paidLoading, setPaidLoading] = useState(false)
```

**Delete both lines.**

### Step 3: Remove `paidTeaseCount` memo

Find at **lines 118-122**:

```ts
  // ── Fake "+N more" tease count for paid sources (v1: faked, v1.5: real) ──
  // Deterministic per search so it doesn't jump around on re-render.
  const paidTeaseCount = useMemo(() => {
    return 15 + (query.length % 25) // 15–39 range, stable per query
  }, [query])
```

**Delete all 5 lines (including the comment).**

### Step 4: Remove `setPaidLoaded` and `setPaidLoading` from `handleSearch`

Find inside `handleSearch`:

```ts
    setPaidLoaded(false)
    setPaidLoading(false)
```

**Delete both lines.**

---

## C2. Remove `handleLoadPaid` function

**File:** `src/app/components/resume/job-search-panel.tsx`

Find the **entire** `handleLoadPaid` function (from `// ── Load paid sources` through the closing `}, [...])`):

```ts
  // ── Load paid sources (LinkedIn/Indeed via Apify) — user-initiated ──
  const handleLoadPaid = useCallback(async () => {
    ...
  }, [...])
```

**Delete the entire function (all lines).**

---

## C3. Remove Paid Sources UI (Button + Confirmation)

**File:** `src/app/components/resume/job-search-panel.tsx**

### Step 1: Remove the "Unlock paid sources" button block

Find the `{/* Paid sources button */}` section:

```tsx
            {/* Paid sources button (only when no more free jobs to load) */}
            {!hasMore && !paidLoaded && (
              ...
            )}
```

**Delete the entire block.**

### Step 2: Remove the "Paid loaded" confirmation block

Find the `{/* Paid loaded confirmation */}` section:

```tsx
            {/* Paid loaded confirmation */}
            {paidLoaded && (
              ...
            )}
```

**Delete the entire block.**

### Step 3: Clean up unused imports

Check if `Briefcase` is still used anywhere in the file. If not, remove it from the lucide-react import.

---

## C4. Move Sources Into Phase 2

**File:** `src/app/components/resume/job-search-panel.tsx`

Find the `FULL_FREE_SOURCES` constant:

```ts
const FULL_FREE_SOURCES: JobSource[] = [
  'greenhouse', 'ashby',
]
```

**Replace with (add `indeed` and `jobsdb-rest`):**

```ts
const FULL_FREE_SOURCES: JobSource[] = [
  'greenhouse', 'ashby', 'indeed', 'jobsdb-rest',
]
```

**Note:** We use `'jobsdb-rest'` (free REST API), NOT `'jobsdb'` (old Apify). `'linkedin'` (Apify) is intentionally NOT added — we use `'linkedin-guest'` (free).

**Important about backend `FREE_SOURCES`:** The backend's `FREE_SOURCES` constant (in `index.ts`) does NOT include `'indeed'` or `'jobsdb-rest'`. This is intentional — they only fire when the frontend explicitly sends them in the `sources` array (which Phase 2 does via `FULL_FREE_SOURCES`). The chat preview (`job-preview.tsx`) does NOT specify sources, so it defaults to `FREE_SOURCES` and will NOT fire JobsDB/Indeed. This is fine — the chat preview is meant to be fast with a few results. The full search panel is where JobsDB/Indeed appear.

---

## C5. Remove `includePaid` + Dead Apify Code from Backend

### File 1: `src/app/api/jobs/search/route.ts`

Find in the Zod schema:

```ts
  includePaid: z.boolean().optional(),
```

**Delete this line.**

Find in the destructuring:

```ts
  const { query, location, skills, role, sources, limit, fresh, includePaid } = body.data
```

**Replace with:**

```ts
  const { query, location, skills, role, sources, limit, fresh } = body.data
```

Find in the `searchJobs` call:

```ts
    includePaid: includePaid || false,
```

**Delete this line.**

### File 2: `src/app/lib/job-sources/types.ts`

Find in `SearchParams`:

```ts
  includePaid?: boolean    // include Apify LinkedIn/Indeed (costs $)
```

**Delete this line.**

### File 3: `src/app/lib/job-sources/index.ts`

Find:

```ts
const PAID_SOURCES: JobSource[] = ['linkedin', 'indeed', 'jobsdb']
```

**Replace with a comment (delete the constant):**

```ts
// Apify sources: 'linkedin' dropped (use free linkedin-guest instead).
// 'indeed' still uses Apify. 'jobsdb' replaced by free 'jobsdb-rest'.
```

Find:

```ts
// All sources (used when includePaid is true or explicit sources given)
const ALL_SOURCES: JobSource[] = [...FREE_SOURCES, ...PAID_SOURCES]
```

**Delete both lines.**

Find inside `searchJobs` destructuring:

```ts
    includePaid = false,
```

**Delete this line.**

Find:

```ts
  // Resolve sources: default to free sources unless includePaid is true
  const sources = rawSources ?? (includePaid ? ALL_SOURCES : FREE_SOURCES)
```

**Replace with:**

```ts
  // Resolve sources: default to all free+api sources
  const sources = rawSources ?? FREE_SOURCES
```

Find the Apify LinkedIn fetcher registration:

```ts
  if (sources.includes('linkedin')) {
    fetchers.push(() => fetchApifyLinkedIn(query, location))
    fetcherSources.push('linkedin')
  }
```

**Delete all 4 lines.**

Find the import:

```ts
import { fetchApifyLinkedIn } from './apify-linkedin'
```

**Delete this line.** (File stays on disk, just not imported.)

### Verification for Group C

```bash
npx tsc --noEmit
```

```bash
grep -rn "paidLoaded\|paidLoading\|paidTeaseCount\|handleLoadPaid\|PAID_SOURCES\|includePaid\|ALL_SOURCES" src/
```

Must return ZERO matches.

---

# GROUP D — Phase 2 Banner Merge (2 tasks)

## D1. Change Phase 2 Merge to Use Banner

**File:** `src/app/components/resume/job-search-panel.tsx`

**Why:** Currently Phase 2 results merge directly into `results` via `mergeResults`, which re-sorts the list and disrupts scroll. Instead, push to `newJobs` state → triggers the existing "🆕 N new jobs" banner.

Find the Phase 2 block inside `handleSearch`:

```ts
      // ── Phase 2: Slow free sources (3-10s, background) ──
      try {
        const fullRes = await fetch('/api/jobs/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: searchQuery,
            location: (loc ?? location).trim() || undefined,
            skills: resume.skills,
            role: resume.role,
            sources: FULL_FREE_SOURCES,
            limit: 100,
            fresh,
          }),
        })
        if (runId !== searchRunRef.current) return
        if (fullRes.ok) {
          const fullData: SearchResult = await fullRes.json()
          setResults(prev => mergeResults(prev, fullData.jobs))
        }
      } catch {
        // Silent fail — fast results are already showing
      }
```

**Replace with:**

```ts
      // ── Phase 2: Slow sources (3-15s, background) ──
      // Results go into newJobs (banner) instead of silently re-sorting.
      // This prevents scroll disruption when Greenhouse/Ashby/Indeed/JobsDB arrive.
      try {
        const fullRes = await fetch('/api/jobs/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: searchQuery,
            location: (loc ?? location).trim() || undefined,
            skills: resume.skills,
            role: resume.role,
            sources: FULL_FREE_SOURCES,
            limit: 100,
            fresh,
          }),
        })
        if (runId !== searchRunRef.current) return
        if (fullRes.ok) {
          const fullData: SearchResult = await fullRes.json()
          // Find new jobs not already in results
          const existingIds = new Set(resultsRef.current.map(j => j.id))
          const freshNew = fullData.jobs.filter(j => !existingIds.has(j.id))
          if (freshNew.length > 0) {
            setNewJobs(prev => {
              const prevIds = new Set(prev.map(j => j.id))
              const added = freshNew.filter(j => !prevIds.has(j.id))
              return [...prev, ...added].sort(compareJobs)
            })
          }
        }
      } catch {
        // Silent fail — fast results are already showing
      }
```

---

## D2. Update Source Count Text

**File:** `src/app/components/resume/job-search-panel.tsx`

Find the loading skeleton text (search for `Searching 11 sources` or `Searching 1`):

```ts
              Searching 11 sources…
```

**Replace with:**

```ts
              Searching 13 sources…
```

Find the results count text (search for `of 11 sources`):

```tsx
                    Results from {sourceCount} of 11 sources
```

**Replace with:**

```tsx
                    Results from {sourceCount} of 13 sources
```

**Why 13?** 9 fast free (remoteok, himalayas, remotive, themuse, arbeitnow, adzuna, jsearch, jobbkk, linkedin-guest) + 4 slow (greenhouse, ashby, indeed, jobsdb-rest) = 13.

### Verification for Group D

```bash
npx tsc --noEmit
pnpm test
```

Then manual test with `pnpm dev`:

1. Go to `/en/resume/{id}` and search with a Thai location (e.g., "Bangkok, Thailand")
2. Verify Phase 1 results appear immediately (1-3s)
3. Wait 5-15s — verify "🆕 N new jobs" banner appears
4. Click banner — verify jobs merge with local-first sorting
5. Verify NO "Unlock paid sources" button
6. Verify JobsDB jobs (source label: "JobsDB") appear in results
7. Verify Indeed jobs (source label: "Indeed") appear in results
8. Test with non-Asian location (e.g., "San Francisco") — JobsDB should return 0 jobs (graceful skip)

---

# GROUP E — Final Cleanup (2 tasks)

## E1. Remove Dead Code and Verify

### Step 1: Check for unused imports in `job-search-panel.tsx`

- `Briefcase` — was used by paid sources button. Remove if no other usage.
- `useMemo` — was used by `paidTeaseCount`. Check if other `useMemo` calls remain (thaiSynonyms uses it). Keep if still used.

### Step 2: Verify no TypeScript errors

```bash
npx tsc --noEmit
```

### Step 3: Run all tests

```bash
pnpm test
```

### Step 4: Build check

```bash
pnpm build
```

### Step 5: Grep for leftover references

Run ALL of these — each must return ZERO matches:

```bash
grep -rn "paidLoaded" src/                    # should be 0
grep -rn "paidLoading" src/                   # should be 0
grep -rn "paidTeaseCount" src/                # should be 0
grep -rn "handleLoadPaid" src/                # should be 0
grep -rn "PAID_SOURCES" src/                  # should be 0
grep -rn "includePaid" src/                   # should be 0
grep -rn "ALL_SOURCES" src/                   # should be 0
grep -rn "Unlock paid" src/                   # should be 0
grep -rn "BROWSER_HEADERS" src/app/lib/job-sources/linkedin-guest.ts  # should be 0
```

---

## E2. Test the JobsDB REST Adapter Manually

```bash
pnpm dev
```

Test these scenarios:

1. **Thai user**: Search "React Developer" with location "Bangkok, Thailand"
   - JobsDB jobs should appear (source: "JobsDB")
   - Should show Thai locations (Bangkok, Chon Buri, etc.)
   - Some should have salary (฿XX,XXX)

2. **Singapore user**: Search "React Developer" with location "Singapore"
   - JobStreet jobs should appear (source: "JobsDB" — same brand label)
   - Should show SGD salaries ($X,XXX)

3. **Hong Kong user**: Search "React Developer" with location "Hong Kong"
   - JobsDB HK jobs should appear
   - Should show HKD salaries

4. **US user**: Search "React Developer" with location "San Francisco, USA"
   - No JobsDB jobs (country not covered — graceful skip)
   - Other sources (LinkedIn, Indeed) compensate

5. **No location**: Search "React Developer" with no location
   - Check resume.location for country fallback
   - If resume has Thailand → JobsDB TH fires
   - If resume has no location → JobsDB skipped

---

## SUMMARY — What Changed

```
┌──────────────────────────────────────────────────────────────┐
│ BEFORE (current state):                                      │
│                                                              │
│   Phase 1: 9 free fast sources → show results               │
│   Phase 2: Greenhouse + Ashby → silent merge (breaks scroll) │
│   Button: "Unlock paid sources" with FAKE count             │
│   Click button → re-sorts entire list → scroll broken       │
│   Apify LinkedIn: $0.02/search (unnecessary)                │
│   Apify JobsDB: $0.02/search (unnecessary — free API exists)│
│   Total cost: ~$0.06/search                                 │
│                                                              │
│ AFTER:                                                       │
│                                                              │
│   Phase 1: 9 free fast sources → show results (1-3s)        │
│   Phase 2: Greenhouse + Ashby + Indeed (Apify) +            │
│            JobsDB REST (FREE, 6 countries)                  │
│            → banner merge ("🆕 N new jobs")                  │
│            → user clicks to merge, scroll preserved          │
│   No button. No gate. No fake numbers.                      │
│   LinkedIn: free guest API (enhanced: random UA, salary,    │
│             50 jobs instead of 25)                           │
│   JobsDB: free REST API (salaries, provinces, logos,        │
│           6 countries: TH, HK, SG, MY, PH, ID)              │
│   Indeed: Apify (~$0.02/search — keep for now)              │
│   Total cost: ~$0.02/search (67% reduction)                 │
│                                                              │
│ FILES:                                                       │
│   NEW:   src/app/lib/job-sources/jobsdb-rest.ts             │
│   EDIT:  src/app/lib/job-sources/linkedin-guest.ts          │
│   EDIT:  src/app/components/resume/job-search-panel.tsx     │
│   EDIT:  src/app/lib/job-sources/index.ts                   │
│   EDIT:  src/app/lib/job-sources/types.ts                   │
│   EDIT:  src/app/api/jobs/search/route.ts                   │
│   EDIT:  src/app/components/chat/job-preview.tsx            │
│                                                              │
│ NET CODE: ~+180 lines new (JobsDB REST adapter + LinkedIn)  │
│           ~-130 lines deleted (paid sources gate)            │
│           NET: +50 lines (more capability, less cost)        │
└──────────────────────────────────────────────────────────────┘
```

---

## DO NOT DO

- **DO NOT** edit `scoring.ts` — local-first sorting is already done
- **DO NOT** edit `types.ts` to add `isLocal` — already there (you only add `jobsdb-rest` to the JobSource union)
- **DO NOT** edit `scoring.test.ts` — tests already updated
- **DO NOT** add proxy rotation
- **DO NOT** install any new npm packages
- **DO NOT** delete `apify-linkedin.ts` or `apify-jobsdb.ts` from disk (just stop importing them)
- **DO NOT** change the SWR background refresh logic — it already uses the banner pattern correctly
- **DO NOT** add user-agent spoofing (pretending to be GPTBot etc.) — use random REAL browser UAs only
- **DO NOT** add delays longer than 300ms between LinkedIn page fetches
- **DO NOT** modify the JobsDB REST API URL format — it must use exactly the parameters shown in the adapter code
