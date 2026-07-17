// ═══════════════════════════════════════════════════════════════
// APIFY INDEED ADAPTER
// Paid ($5 free tier = ~1,600 jobs/month). No login, no key needed.
// Scraper: automation-lab/indeed-scraper
//
// Requires env var:
//   APIFY_TOKEN=xxx
//
// Auto-deactivates if key is missing.
// ═══════════════════════════════════════════════════════════════

import type { JobResult } from './types'
import { parseLocation } from './geo'

interface ApifyIndeedJob {
  title?: string
  company?: string
  location?: string
  salary?: string
  jobUrl?: string
  jobId?: string
  isRemote?: boolean
  description?: string
  companyLogo?: string
  datePosted?: string
}

export async function fetchApifyIndeed(
  query: string,
  location?: string,
  opts?: { signal?: AbortSignal },
): Promise<{ jobs: JobResult[]; error?: string }> {
  const token = process.env.APIFY_TOKEN
  if (!token) {
    return { jobs: [], error: 'No APIFY_TOKEN — add to .env.local' }
  }

  try {
    const url = `https://api.apify.com/v2/acts/automation-lab~indeed-scraper/run-sync-get-dataset-items?token=${token}&limit=20`

    const res = await fetch(url, {
      method: 'POST',
      signal: opts?.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query,
        location: location || undefined,
        maxItems: 20,
        includeDescription: true,
      }),
    })

    if (!res.ok) {
      throw new Error(`Apify Indeed: HTTP ${res.status}`)
    }

    const data: ApifyIndeedJob[] = await res.json()

    const jobs: JobResult[] = (data || [])
      .filter((job) => job.title && job.company)
      .map((job) => {
        const description = job.description || ''
        const jobLocation = job.location || 'Remote'
        const parsed = parseLocation(jobLocation)

        return {
          id: `indeed:${job.jobId || Math.random()}`,
          source: 'indeed' as const,
          company: job.company!,
          title: job.title!,
          location: jobLocation,
          city: parsed.city,
          country: parsed.country,
          region: parsed.region,
          locationType: job.isRemote ? 'remote' : detectLocationType(jobLocation),
          url: job.jobUrl || 'https://www.indeed.com',
          description: description.slice(0, 8000),
          salary: job.salary || undefined,
          postedAt: job.datePosted,
          companyLogo: job.companyLogo || undefined,
        }
      })

    return { jobs }
  } catch (err) {
    return { jobs: [], error: err instanceof Error ? err.message : 'Apify Indeed failed' }
  }
}

function detectLocationType(location: string): JobResult['locationType'] {
  const lower = location.toLowerCase()
  if (lower.includes('remote')) return 'remote'
  if (lower.includes('hybrid')) return 'hybrid'
  if (!lower || lower === 'unspecified') return 'unknown'
  return 'onsite'
}
