// ═══════════════════════════════════════════════════════════════
// UNIFIED SEARCH ORCHESTRATOR
//
// Fetches from ALL enabled sources in parallel, merges, deduplicates,
// scores against user skills, and caches the result.
//
// Sources (9-11 depending on which API keys are configured):
//   No-key (always active):
//     Greenhouse, Ashby, RemoteOK, Himalayas, Remotive, The Muse, Arbeitnow
//   Key-gated (auto-activate when env vars are present):
//     Adzuna (ADZUNA_APP_ID + ADZUNA_APP_KEY)
//     JSearch (RAPIDAPI_KEY)
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
import { fetchApifyLinkedIn } from './apify-linkedin'
import { fetchApifyIndeed } from './apify-indeed'
import { rankJobs, inferExperienceLevel } from './scoring'
import { getCached, setCached, cacheKey } from './cache'
import {
  GREENHOUSE_COMPANIES,
  ASHBY_COMPANIES,
  GREENHOUSE_FETCH_LIMIT,
  ASHBY_FETCH_LIMIT,
} from './companies'

const SEARCH_TIMEOUT_MS = 15_000 // per-source timeout

// Source tiers (see DESIGN.md for the full flow)
//   FAST_FREE — single API calls, 1-3s
//   SLOW_FREE — multi-company ATS, 3-10s
//   BUDGET    — free tier with monthly limit (200/mo)
//   PAID      — Apify credits (LinkedIn, Indeed)
const FAST_FREE_SOURCES: JobSource[] = [
  'remoteok', 'himalayas', 'remotive',
  'themuse', 'arbeitnow', 'adzuna',
]
const SLOW_FREE_SOURCES: JobSource[] = ['greenhouse', 'ashby']
const BUDGET_SOURCES: JobSource[] = ['jsearch']
const PAID_SOURCES: JobSource[] = ['linkedin', 'indeed']
const FREE_SOURCES: JobSource[] = [
  ...FAST_FREE_SOURCES, ...SLOW_FREE_SOURCES, ...BUDGET_SOURCES,
]

// All sources (used when includePaid is true or explicit sources given)
const ALL_SOURCES: JobSource[] = [...FREE_SOURCES, ...PAID_SOURCES]

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
    const cached = getCached<SearchResult>(key)
    if (cached) {
      const rescored = rankJobs(cached.jobs.map(stripScore), skills, role).slice(0, limit)
      return { ...cached, jobs: rescored, cached: true }
    }
  }

  // 2. Fetch from all enabled sources in parallel
  const fetchers: Promise<{ jobs: JobResult[]; error?: string }>[] = []
  const fetcherSources: JobSource[] = []

  // No-key sources (always try)
  if (sources.includes('remoteok')) {
    fetchers.push(wrapSource('remoteok', () => fetchRemoteOKJobs(query)))
    fetcherSources.push('remoteok')
  }
  if (sources.includes('himalayas')) {
    fetchers.push(wrapSource('himalayas', () => fetchHimalayas(query)))
    fetcherSources.push('himalayas')
  }
  if (sources.includes('remotive')) {
    fetchers.push(wrapSource('remotive', () => fetchRemotive(query)))
    fetcherSources.push('remotive')
  }
  if (sources.includes('themuse')) {
    fetchers.push(wrapSource('themuse', () => fetchTheMuse(query)))
    fetcherSources.push('themuse')
  }
  if (sources.includes('arbeitnow')) {
    fetchers.push(wrapSource('arbeitnow', () => fetchArbeitnow(query)))
    fetcherSources.push('arbeitnow')
  }
  if (sources.includes('greenhouse')) {
    fetchers.push(wrapSource('greenhouse', () => fetchGreenhouseJobs(query)))
    fetcherSources.push('greenhouse')
  }
  if (sources.includes('ashby')) {
    fetchers.push(wrapSource('ashby', () => fetchAshbyJobs(query)))
    fetcherSources.push('ashby')
  }

  // Key-gated sources (auto-activate when env vars present)
  if (sources.includes('adzuna')) {
    fetchers.push(wrapSource('adzuna', () => fetchAdzuna(query, location)))
    fetcherSources.push('adzuna')
  }
  if (sources.includes('jsearch')) {
    fetchers.push(wrapSource('jsearch', () => fetchJSearch(query, location)))
    fetcherSources.push('jsearch')
  }
  if (sources.includes('linkedin')) {
    fetchers.push(wrapSource('linkedin', () => fetchApifyLinkedIn(query, location)))
    fetcherSources.push('linkedin')
  }
  if (sources.includes('indeed')) {
    fetchers.push(wrapSource('indeed', () => fetchApifyIndeed(query, location)))
    fetcherSources.push('indeed')
  }

  const results = await Promise.allSettled(fetchers)

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
  const scored = rankJobs(filtered, skills, role).slice(0, limit)

  // 8. Build result
  const result: SearchResult = {
    jobs: scored,
    total: filtered.length,
    cached: false,
    fetchedAt: new Date().toISOString(),
    sources: sourceStats,
  }

  // 9. Cache (unscored jobs, re-scored per user on cache hit)
  if (filtered.length > 0) {
    setCached(key, { ...result, jobs: filtered })
  }

  return result
}

// ── Source wrappers ──────────────────────────────────────────

async function wrapSource(
  _name: string,
  fn: () => Promise<{ jobs: JobResult[]; error?: string }>,
): Promise<{ jobs: JobResult[]; error?: string }> {
  return fn()
}

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

function filterByQuery(jobs: JobResult[], query: string, location?: string): JobResult[] {
  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2)

  const locationLower = location?.toLowerCase().trim()

  return jobs.filter((job) => {
    if (queryTerms.length > 0) {
      const haystack = `${job.title} ${job.description.slice(0, 2000)} ${(job.tags || []).join(' ')} ${job.department || ''}`.toLowerCase()
      const matchesQuery = queryTerms.some((term) => haystack.includes(term))
      if (!matchesQuery) return false
    }

    if (locationLower && locationLower !== 'remote' && locationLower !== 'anywhere') {
      const jobLoc = job.location.toLowerCase()
      if (job.locationType !== 'remote' && !jobLoc.includes(locationLower)) {
        return false
      }
    }

    return true
  })
}

// ── Re-exports ───────────────────────────────────────────────
export type { JobResult, ScoredJob, SearchParams, SearchResult, JobSource }
export { rankJobs, scoreJob, inferExperienceLevel } from './scoring'
