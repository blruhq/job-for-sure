// ═══════════════════════════════════════════════════════════════
// REMOTIVE ADAPTER
// Free, no auth, no key. Public JSON API.
// Endpoint: GET https://remotive.com/api/remote-jobs?search={query}
//
// Returns ALL remote jobs in one call (like RemoteOK).
// Rate limit: max ~4 calls/day recommended. We cache aggressively.
// ═══════════════════════════════════════════════════════════════

import type { JobResult } from './types'
import { extractExperienceYears } from './types'
import { parseLocation } from './geo'

interface RemotiveJob {
  id: number
  title: string
  company_name: string
  company_logo?: string
  category?: string
  job_type?: string
  publication_date?: string
  candidate_required_location?: string
  salary?: string
  description?: string
  url?: string
  tags?: string[]
}

interface RemotiveResponse {
  'job-count'?: number
  jobs: RemotiveJob[]
}

export async function fetchRemotive(
  query: string,
  opts?: { signal?: AbortSignal },
): Promise<{ jobs: JobResult[]; error?: string }> {
  try {
    const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=30`
    const res = await fetch(url, {
      signal: opts?.signal,
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) throw new Error(`Remotive: HTTP ${res.status}`)
    const data: RemotiveResponse = await res.json()

    const jobs: JobResult[] = (data.jobs || []).map((job) => {
      const descriptionHtml = job.description || ''
      const description = descriptionHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      const experienceYears = extractExperienceYears(description)
      const location = job.candidate_required_location || 'Remote'
      const parsed = parseLocation(location)

      return {
        id: `remotive:${job.id}`,
        source: 'remotive' as const,
        company: job.company_name || 'Unknown',
        title: job.title || 'Unknown',
        location,
        country: parsed.country,
        region: parsed.region,
        locationType: 'remote' as const,
        url: job.url || `https://remotive.com/remote-jobs/${job.id}`,
        description: description.slice(0, 8000),
        descriptionHtml,
        salary: job.salary || undefined,
        experienceYears,
        postedAt: job.publication_date,
        companyLogo: job.company_logo || undefined,
        department: job.category,
        tags: job.tags,
        employmentType: job.job_type,
      }
    })

    return { jobs }
  } catch (err) {
    return { jobs: [], error: err instanceof Error ? err.message : 'Remotive failed' }
  }
}
