// ═══════════════════════════════════════════════════════════════
// UNIFIED SEARCH ORCHESTRATOR
//
// Fetches from all enabled sources in parallel, merges, deduplicates,
// scores against user skills, and caches the result.
//
// Sources:
//   - RemoteOK: live (one call returns all remote jobs, filter by keyword)
//   - Greenhouse: live (fetch top N companies in parallel, filter by keyword)
//   - Ashby: live (fetch top N companies in parallel, filter by keyword)
// ═══════════════════════════════════════════════════════════════

import type { JobResult, ScoredJob, SearchParams, SearchResult, JobSource } from './types'
import { fetchGreenhouseCompany } from './greenhouse'
import { fetchAshbyCompany } from './ashby'
import { fetchRemoteOK } from './remoteok'
import { rankJobs } from './scoring'
import { getCached, setCached, cacheKey } from './cache'
import {
  GREENHOUSE_COMPANIES,
  ASHBY_COMPANIES,
  GREENHOUSE_FETCH_LIMIT,
  ASHBY_FETCH_LIMIT,
} from './companies'

const SEARCH_TIMEOUT_MS = 15_000 // per-source timeout

export async function searchJobs(params: SearchParams): Promise<SearchResult> {
  const {
    query,
    location,
    skills = [],
    role,
    sources = ['greenhouse', 'ashby', 'remoteok'],
    limit = 30,
  } = params

  // 1. Check cache
  const key = cacheKey(query, location)
  const cached = getCached<SearchResult>(key)
  if (cached) {
    // Re-score with THIS user's skills (jobs are cached, scores are personal)
    const rescored = rankJobs(cached.jobs.map(stripScore), skills, role).slice(0, limit)
    return {
      ...cached,
      jobs: rescored,
      cached: true,
    }
  }

  // 2. Fetch from all sources in parallel
  const sourceResults = await Promise.allSettled([
    sources.includes('remoteok') ? fetchWithTimeout(() => fetchRemoteOKJobs(query, location)) : null,
    sources.includes('greenhouse') ? fetchWithTimeout(() => fetchGreenhouseJobs(query, location)) : null,
    sources.includes('ashby') ? fetchWithTimeout(() => fetchAshbyJobs(query, location)) : null,
  ])

  // 3. Collect results
  const allJobs: JobResult[] = []
  const sourceStats: SearchResult['sources'] = []

  const sourceNames: JobSource[] = ['remoteok', 'greenhouse', 'ashby']
  sourceResults.forEach((result, i) => {
    const source = sourceNames[i]
    if (result.status === 'fulfilled' && result.value) {
      allJobs.push(...result.value.jobs)
      sourceStats.push({ source, count: result.value.jobs.length, error: result.value.error })
    } else if (result.status === 'rejected') {
      sourceStats.push({ source, count: 0, error: result.reason?.message || 'Failed' })
    }
  })

  // 4. Deduplicate (by company + title, prefer sources in order: remoteok > greenhouse > ashby)
  const deduped = deduplicateJobs(allJobs)

  // 5. Filter by query keywords (for sources that don't support server-side search)
  const filtered = filterByQuery(deduped, query, location)

  // 6. Score against user skills
  const scored = rankJobs(filtered, skills, role).slice(0, limit)

  // 7. Build result (store UNSCORED jobs in cache, re-score per user)
  const result: SearchResult = {
    jobs: scored,
    total: filtered.length,
    cached: false,
    fetchedAt: new Date().toISOString(),
    sources: sourceStats,
  }

  // Cache the un-scored filtered jobs (not the scored ones — scores are per-user)
  if (filtered.length > 0) {
    setCached(key, {
      ...result,
      jobs: filtered, // raw jobs, re-scored on cache hit
    })
  }

  return result
}

// ── Source fetchers ──────────────────────────────────────────

async function fetchRemoteOKJobs(query: string, location?: string): Promise<{ jobs: JobResult[]; error?: string }> {
  try {
    const allJobs = await fetchRemoteOK()
    // RemoteOK returns ALL jobs — we filter client-side
    return { jobs: allJobs }
  } catch (err) {
    return { jobs: [], error: err instanceof Error ? err.message : 'RemoteOK failed' }
  }
}

async function fetchGreenhouseJobs(query: string, location?: string): Promise<{ jobs: JobResult[]; error?: string }> {
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

async function fetchAshbyJobs(query: string, location?: string): Promise<{ jobs: JobResult[]; error?: string }> {
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

function fetchWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
  return fn()
}

// Strip score from ScoredJob to get raw JobResult (for caching)
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
    // Query filter: at least one query term must match title, description, or tags
    if (queryTerms.length > 0) {
      const haystack = `${job.title} ${job.description.slice(0, 2000)} ${(job.tags || []).join(' ')} ${job.department || ''}`.toLowerCase()
      const matchesQuery = queryTerms.some((term) => haystack.includes(term))
      if (!matchesQuery) return false
    }

    // Location filter
    if (locationLower && locationLower !== 'remote' && locationLower !== 'anywhere') {
      const jobLoc = job.location.toLowerCase()
      // If user specified a location, non-remote jobs must match it
      if (job.locationType !== 'remote' && !jobLoc.includes(locationLower)) {
        return false
      }
    }

    // If user wants remote specifically, prefer remote jobs
    if (locationLower === 'remote' && job.locationType !== 'remote' && job.locationType !== 'unknown') {
      // Don't hard-filter, but remote jobs will naturally rank higher
    }

    return true
  })
}

// ── Re-export types ──────────────────────────────────────────
export type { JobResult, ScoredJob, SearchParams, SearchResult, JobSource }
export { rankJobs, scoreJob } from './scoring'
