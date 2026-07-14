// ═══════════════════════════════════════════════════════════════
// ARBEITNOW ADAPTER
// Free, no auth, no key. Public JSON API.
// Endpoint: GET https://www.arbeitnow.com/api/job-board-api
//
// 🎯 THIS IS THE ONLY SOURCE WITH VISA SPONSORSHIP DATA.
// Returns `visa_sponsorship` boolean per job.
// Also returns tags, remote flag, salary (rare).
//
// Coverage: Germany/EU focused, but includes global remote jobs.
// ═══════════════════════════════════════════════════════════════

import type { JobResult } from './types'
import { parseLocation } from './geo'

interface ArbeitnowJob {
  slug: string
  company_name: string
  title: string
  description?: string
  tags?: string[]
  location?: string
  remote?: boolean
  visa_sponsorship?: boolean
  salary?: string
  url?: string
  createdAt?: string
}

interface ArbeitnowResponse {
  data: ArbeitnowJob[]
  links?: { next?: string }
  meta?: { total?: number }
}

export async function fetchArbeitnow(
  query: string,
  opts?: { signal?: AbortSignal },
): Promise<{ jobs: JobResult[]; error?: string }> {
  try {
    const res = await fetch('https://www.arbeitnow.com/api/job-board-api', {
      signal: opts?.signal,
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) throw new Error(`Arbeitnow: HTTP ${res.status}`)
    const data: ArbeitnowResponse = await res.json()

    const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2)

    const jobs: JobResult[] = (data.data || [])
      .filter((job) => {
        // Client-side keyword filter
        if (queryTerms.length === 0) return true
        const haystack = `${job.title} ${job.description || ''} ${(job.tags || []).join(' ')} ${job.company_name}`.toLowerCase()
        return queryTerms.some((t) => haystack.includes(t))
      })
      .slice(0, 30)
      .map((job) => {
        const descriptionHtml = job.description || ''
        const description = descriptionHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        const location = job.location || (job.remote ? 'Remote' : 'Unspecified')
        const parsed = parseLocation(location)

        return {
          id: `arbeitnow:${job.slug}`,
          source: 'arbeitnow' as const,
          company: job.company_name || 'Unknown',
          title: job.title || 'Unknown',
          location,
          country: parsed.country,
          region: parsed.region,
          locationType: job.remote ? 'remote' as const : detectLocationType(location),
          url: job.url || `https://www.arbeitnow.com/jobs/${job.slug}`,
          description: description.slice(0, 8000),
          descriptionHtml,
          salary: job.salary || undefined,
          postedAt: job.createdAt,
          tags: job.tags,
          visaSponsorship: job.visa_sponsorship ?? false,
        }
      })

    return { jobs }
  } catch (err) {
    return { jobs: [], error: err instanceof Error ? err.message : 'Arbeitnow failed' }
  }
}

function detectLocationType(location: string): JobResult['locationType'] {
  const lower = location.toLowerCase()
  if (lower.includes('remote')) return 'remote'
  if (lower.includes('hybrid')) return 'hybrid'
  if (!lower || lower === 'unspecified') return 'unknown'
  return 'onsite'
}
