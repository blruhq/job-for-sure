// ═══════════════════════════════════════════════════════════════
// UNIFIED SEARCH ORCHESTRATOR
//
// Fetches from ALL enabled sources in parallel, merges, deduplicates,
// scores against user skills, and caches the result.
//
// Sources (11-13 depending on which API keys are configured):
//   No-key (always active):
//     Greenhouse, Ashby, RemoteOK, Himalayas, Remotive, The Muse, Arbeitnow, JobbKK
//   Key-gated (auto-activate when env vars are present):
//     Adzuna (ADZUNA_APP_ID + ADZUNA_APP_KEY)
//     JSearch (OPENWEBNINJA_API_KEY)
// ═══════════════════════════════════════════════════════════════

import type { JobResult, ScoredJob, SearchParams, SearchResult, JobSource } from './types'
import { fetchGreenhouseCompany } from './greenhouse'
import { fetchAshbyCompany } from './ashby'
import { fetchRemoteOK } from './remoteok'
import { fetchHimalayas } from './himalayas'
import { fetchRemotive } from './remotive'
import { fetchTheMuse } from './themuse'
import { fetchArbeitnow } from './arbeitnow'
import { fetchAdzuna } from './adzuna'
import { fetchJSearch } from './jsearch'
import { fetchJobbKK } from './jobbkk'
import { fetchApifyLinkedIn } from './apify-linkedin'
import { fetchApifyIndeed } from './apify-indeed'
import { fetchApifyJobsDB } from './apify-jobsdb'
import { fetchLinkedInGuest } from './linkedin-guest'
import { rankJobs, inferExperienceLevel } from './scoring'
import { getCached, setCached, cacheKey } from './cache'
import {
  GREENHOUSE_COMPANIES,
  ASHBY_COMPANIES,
  GREENHOUSE_FETCH_LIMIT,
  ASHBY_FETCH_LIMIT,
} from './companies'
import { parseLocation, isRemoteRegionCompatible, getMacroRegion } from './geo'
import { expandQueryTerms } from './role-synonyms'

const SEARCH_TIMEOUT_MS = 15_000 // per-source timeout

// Source tiers (see DESIGN.md for the full flow)
//   FAST_FREE — single API calls, 1-3s
//   SLOW_FREE — multi-company ATS, 3-10s
//   BUDGET    — free tier with monthly limit (200/mo)
//   PAID      — Apify credits (LinkedIn, Indeed, JobsDB)
const FAST_FREE_SOURCES: JobSource[] = [
  'remoteok', 'himalayas', 'remotive',
  'themuse', 'arbeitnow', 'adzuna', 'jsearch', 'jobbkk',
  'linkedin-guest',
]
const SLOW_FREE_SOURCES: JobSource[] = ['greenhouse', 'ashby']
const BUDGET_SOURCES: JobSource[] = []
const PAID_SOURCES: JobSource[] = ['linkedin', 'indeed', 'jobsdb']
const FREE_SOURCES: JobSource[] = [
  ...FAST_FREE_SOURCES, ...SLOW_FREE_SOURCES, ...BUDGET_SOURCES,
]

// All sources (used when includePaid is true or explicit sources given)
const ALL_SOURCES: JobSource[] = [...FREE_SOURCES, ...PAID_SOURCES]

// ── Silent auto-retry wrapper ─────────────────────────────────
// If a source returns 0 jobs with an error, wait 500ms and retry once.
// Most transient failures (network blip, rate-limit) resolve on retry.
// If still failing, give up — fail-open, other sources compensate.
async function withRetry(
  fn: () => Promise<{ jobs: JobResult[]; error?: string }>,
): Promise<{ jobs: JobResult[]; error?: string }> {
  const first = await fn()
  // Success or has jobs → use it
  if (first.jobs.length > 0 || !first.error) return first
  // Had error with 0 jobs → retry once after 500ms
  await new Promise(r => setTimeout(r, 500))
  const second = await fn()
  return second
}

export async function searchJobs(params: SearchParams): Promise<SearchResult> {
  const {
    query,
    location,
    skills = [],
    role,
    sources: rawSources,
    limit = 30,
    fresh = false,
    includePaid = false,
  } = params

  // Resolve sources: default to free sources unless includePaid is true
  const sources = rawSources ?? (includePaid ? ALL_SOURCES : FREE_SOURCES)

  // 1. Check cache (unless fresh=true)
  const key = cacheKey(query, location, sources)
  if (!fresh) {
    const cached = await getCached<SearchResult>(key)
    if (cached) {
      // Cached jobs have descriptions stripped to save Redis storage.
      // On cache hit, descriptions won't be available (descriptionsIncluded=false).
      // Scoring still works on title + tags + company — slightly less accurate
      // but saves ~80% Redis storage. Full descriptions come from fresh scrape
      // or client-side sessionStorage.
      const refiltered = filterByQuery(cached.jobs.map(stripScore), query, location)
      const rescored = rankJobs(refiltered, skills, role, location).slice(0, limit)
      return {
        ...cached,
        jobs: rescored,
        total: refiltered.length,
        cached: true,
        descriptionsIncluded: false,
      }
    }
  }

  // 2. Fetch from all enabled sources in parallel (lazy thunks for retry)
  const fetchers: Array<() => Promise<{ jobs: JobResult[]; error?: string }>> = []
  const fetcherSources: JobSource[] = []

  // No-key sources (always try)
  if (sources.includes('remoteok')) {
    fetchers.push(() => fetchRemoteOKJobs(query))
    fetcherSources.push('remoteok')
  }
  if (sources.includes('himalayas')) {
    fetchers.push(() => fetchHimalayas(query))
    fetcherSources.push('himalayas')
  }
  if (sources.includes('remotive')) {
    fetchers.push(() => fetchRemotive(query))
    fetcherSources.push('remotive')
  }
  if (sources.includes('themuse')) {
    fetchers.push(() => fetchTheMuse(query))
    fetcherSources.push('themuse')
  }
  if (sources.includes('arbeitnow')) {
    fetchers.push(() => fetchArbeitnow(query))
    fetcherSources.push('arbeitnow')
  }
  if (sources.includes('greenhouse')) {
    fetchers.push(() => fetchGreenhouseJobs(query))
    fetcherSources.push('greenhouse')
  }
  if (sources.includes('ashby')) {
    fetchers.push(() => fetchAshbyJobs(query))
    fetcherSources.push('ashby')
  }

  // Key-gated sources (auto-activate when env vars present)
  if (sources.includes('adzuna')) {
    fetchers.push(() => fetchAdzuna(query, location))
    fetcherSources.push('adzuna')
  }
  if (sources.includes('jsearch')) {
    fetchers.push(() => fetchJSearch(query, location))
    fetcherSources.push('jsearch')
  }
  if (sources.includes('jobbkk')) {
    fetchers.push(() => fetchJobbKK(query, location))
    fetcherSources.push('jobbkk')
  }
  if (sources.includes('linkedin-guest')) {
    fetchers.push(() => fetchLinkedInGuest(query, location))
    fetcherSources.push('linkedin-guest')
  }
  if (sources.includes('linkedin')) {
    fetchers.push(() => fetchApifyLinkedIn(query, location))
    fetcherSources.push('linkedin')
  }
  if (sources.includes('indeed')) {
    fetchers.push(() => fetchApifyIndeed(query, location))
    fetcherSources.push('indeed')
  }
  if (sources.includes('jobsdb')) {
    fetchers.push(() => fetchApifyJobsDB(query, location))
    fetcherSources.push('jobsdb')
  }

  const results = await Promise.allSettled(fetchers.map(f => withRetry(f)))

  // 3. Collect
  const allJobs: JobResult[] = []
  const sourceStats: SearchResult['sources'] = []

  results.forEach((result, i) => {
    const source = fetcherSources[i]
    if (result.status === 'fulfilled') {
      allJobs.push(...result.value.jobs)
      sourceStats.push({ source, count: result.value.jobs.length, error: result.value.error })
    } else {
      sourceStats.push({ source, count: 0, error: 'Failed' })
    }
  })

  // 4. Deduplicate
  const deduped = deduplicateJobs(allJobs)

  // 5. Filter by query keywords
  const filtered = filterByQuery(deduped, query, location)

  // 6. Infer experience levels for jobs that don't have one
  filtered.forEach((job) => {
    if (!job.experienceLevel) {
      job.experienceLevel = inferExperienceLevel(job.title)
    }
  })

  // 7. Score against user skills
  const scored = rankJobs(filtered, skills, role, location).slice(0, limit)

  // 8. Build result
  const result: SearchResult = {
    jobs: scored,
    total: filtered.length,
    cached: false,
    fetchedAt: new Date().toISOString(),
    sources: sourceStats,
    descriptionsIncluded: true,
  }

  // 9. Cache — store WITHOUT descriptions to save Redis storage (~80% savings).
  //    Full descriptions are returned on fresh scrape and stored client-side
  //    in sessionStorage. On cache hit, descriptions are fetched on-demand
  //    when user opens a job card or uses ATS match.
  if (filtered.length > 0) {
    const leanJobs: JobResult[] = filtered.map(j => ({
      id: j.id,
      source: j.source,
      company: j.company,
      title: j.title,
      location: j.location,
      country: j.country,
      region: j.region,
      locationType: j.locationType,
      url: j.url,
      description: '',        // stripped — saves ~80% Redis storage
      descriptionHtml: '',     // stripped
      salary: j.salary,
      postedAt: j.postedAt,
      companyLogo: j.companyLogo,
      department: j.department,
      tags: j.tags,
      visaSponsorship: j.visaSponsorship,
      experienceLevel: j.experienceLevel,
      employmentType: j.employmentType,
    }))
    setCached(key, { ...result, jobs: leanJobs, descriptionsIncluded: false })
  }

  return result
}

// ── Source wrappers ──────────────────────────────────────────

async function fetchRemoteOKJobs(query: string): Promise<{ jobs: JobResult[]; error?: string }> {
  try {
    const allJobs = await fetchRemoteOK()
    return { jobs: allJobs }
  } catch (err) {
    return { jobs: [], error: err instanceof Error ? err.message : 'RemoteOK failed' }
  }
}

async function fetchGreenhouseJobs(query: string): Promise<{ jobs: JobResult[]; error?: string }> {
  const slugs = GREENHOUSE_COMPANIES.slice(0, GREENHOUSE_FETCH_LIMIT).map((c) => c.slug)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS)

  try {
    const results = await Promise.allSettled(
      slugs.map((slug) => fetchGreenhouseCompany(slug, { signal: controller.signal })),
    )
    clearTimeout(timer)

    const jobs: JobResult[] = []
    results.forEach((r) => {
      if (r.status === 'fulfilled') jobs.push(...r.value)
    })
    return { jobs }
  } catch (err) {
    clearTimeout(timer)
    return { jobs: [], error: err instanceof Error ? err.message : 'Greenhouse failed' }
  }
}

async function fetchAshbyJobs(query: string): Promise<{ jobs: JobResult[]; error?: string }> {
  const slugs = ASHBY_COMPANIES.slice(0, ASHBY_FETCH_LIMIT).map((c) => c.slug)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS)

  try {
    const results = await Promise.allSettled(
      slugs.map((slug) => fetchAshbyCompany(slug, { signal: controller.signal })),
    )
    clearTimeout(timer)

    const jobs: JobResult[] = []
    results.forEach((r) => {
      if (r.status === 'fulfilled') jobs.push(...r.value)
    })
    return { jobs }
  } catch (err) {
    clearTimeout(timer)
    return { jobs: [], error: err instanceof Error ? err.message : 'Ashby failed' }
  }
}

// ── Helpers ──────────────────────────────────────────────────

function stripScore(job: ScoredJob): JobResult {
  const { score: _score, matchedSkills: _matched, ...rest } = job
  return rest
}

function deduplicateJobs(jobs: JobResult[]): JobResult[] {
  const seen = new Map<string, JobResult>()
  for (const job of jobs) {
    const key = `${job.company.toLowerCase()}::${job.title.toLowerCase().slice(0, 50)}`
    if (!seen.has(key)) {
      seen.set(key, job)
    }
  }
  return Array.from(seen.values())
}

export function filterByQuery(jobs: JobResult[], query: string, location?: string): JobResult[] {
  // Expand query with role synonyms (English + Thai) for broader matching.
  // "Junior Software Engineer" also matches "developer", "โปรแกรมเมอร์", etc.
  const queryTerms = expandQueryTerms(query)

  // Parse user location into structured country/macro-region
  const userParsed = parseLocation(location)
  const userCountry = userParsed.country

  // Determine if location filtering should be active
  const hasLocationFilter = location && location.trim()
    && location.toLowerCase() !== 'remote'
    && location.toLowerCase() !== 'anywhere'

  // Pre-compute user text tokens for fallback matching
  const userTokens = hasLocationFilter
    ? (location || '').toLowerCase()
        .split(/[\s,]+/)
        .map(t => t.trim())
        .filter(t => t.length > 1)
    : []

  return jobs.filter((job) => {
    // ── 1. Query keyword matching (unchanged) ──
    if (queryTerms.length > 0) {
      const haystack = `${job.title} ${job.description.slice(0, 2000)} ${(job.tags || []).join(' ')} ${job.department || ''}`.toLowerCase()
      const matchesQuery = queryTerms.some((term) => haystack.includes(term))
      if (!matchesQuery) return false
    }

    // ── 2. Location filtering ──
    // Replaces the old hardcoded TH/US/EU token-substring hack.
    // Strategy: country-code matching when possible, text-match fallback otherwise.
    if (hasLocationFilter) {
      if (job.locationType === 'remote') {
        // Remote jobs: use region compatibility if we parsed user's country,
        // otherwise permissive (can't determine region from city-only input).
        if (userCountry && !isRemoteRegionCompatible(userCountry, job.location)) return false
      } else {
        // Non-remote (onsite/hybrid): try country-code match first
        if (userCountry && job.country) {
          // Both sides have country data → compare ISO codes
          if (job.country !== userCountry) return false
        } else {
          // At least one side lacks country data → text-match fallback
          // (handles city names, Thai script when country is unknown, etc.)
          const jobLoc = job.location.toLowerCase()
          const matchesLocation = userTokens.some(token => jobLoc.includes(token))
          if (!matchesLocation) return false
        }
      }
    }

    return true
  })
}

// ── Re-exports ───────────────────────────────────────────────
export type { JobResult, ScoredJob, SearchParams, SearchResult, JobSource }
export { rankJobs, scoreJob, inferExperienceLevel } from './scoring'
