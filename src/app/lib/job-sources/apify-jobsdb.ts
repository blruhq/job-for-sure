// ═══════════════════════════════════════════════════════════════
// APIFY JOBSDB ADAPTER (Thailand)
// Paid (~$0.004/result). No login, no key needed beyond Apify token.
// Scraper: mai_amm/jobsdb-thailand-scraper
//
// Requires env var:
//   APIFY_TOKEN=xxx
//
// Auto-deactivates if key is missing.
// ═══════════════════════════════════════════════════════════════

import type { JobResult } from './types'
import { extractExperienceYears } from './types'
import { parseLocation } from './geo'

interface ApifyJobsDBJob {
  title?: string
  company?: string
  location?: string
  salary?: string
  url?: string
  description?: string
  postedDate?: string
  companyLogo?: string
  locationType?: string
  employmentType?: string
}

export async function fetchApifyJobsDB(
  query: string,
  location?: string,
  opts?: { signal?: AbortSignal },
): Promise<{ jobs: JobResult[]; error?: string }> {
  const token = process.env.APIFY_TOKEN
  if (!token) {
    return { jobs: [], error: 'No APIFY_TOKEN — add to .env.local' }
  }

  try {
    const url = `https://api.apify.com/v2/acts/mai_amm~jobsdb-thailand-scraper/run-sync-get-dataset-items?token=${token}&limit=20`

    const res = await fetch(url, {
      method: 'POST',
      signal: opts?.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        searchQuery: query,
        location: location || 'Thailand',
        maxItems: 20,
      }),
    })

    if (!res.ok) {
      throw new Error(`Apify JobsDB: HTTP ${res.status}`)
    }

    const data: ApifyJobsDBJob[] = await res.json()

    const jobs: JobResult[] = (data || [])
      .filter((job) => job.title && job.company)
      .map((job) => {
        const description = job.description || ''
        const experienceYears = extractExperienceYears(description)
        const jobLocation = job.location || 'Thailand'
        const parsed = parseLocation(jobLocation)

        return {
          id: `jobsdb:${job.url ? extractJobId(job.url) : Math.random()}`,
          source: 'jobsdb' as const,
          company: job.company!,
          title: job.title!,
          location: jobLocation,
          city: parsed.city,
          country: parsed.country,
          region: parsed.region,
          locationType: detectLocationType(jobLocation),
          url: job.url || 'https://www.jobsdb.com/th',
          description: description.slice(0, 8000),
          salary: job.salary || undefined,
          experienceYears,
          postedAt: job.postedDate,
          companyLogo: job.companyLogo || undefined,
          employmentType: job.employmentType,
        }
      })

    return { jobs }
  } catch (err) {
    return {
      jobs: [],
      error: err instanceof Error ? err.message : 'Apify JobsDB failed',
    }
  }
}

function extractJobId(url: string): string {
  try {
    // Extract ID from e.g. https://th.jobsdb.com/job/12345678
    const match = url.match(/\/job\/(\d+)/)
    return match ? match[1] : String(Math.random())
  } catch {
    return String(Math.random())
  }
}

function detectLocationType(location: string): JobResult['locationType'] {
  const lower = location.toLowerCase()
  if (lower.includes('remote')) return 'remote'
  if (lower.includes('hybrid')) return 'hybrid'
  if (!lower || lower === 'unspecified') return 'unknown'
  return 'onsite'
}
