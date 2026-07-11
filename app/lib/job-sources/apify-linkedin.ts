// ═══════════════════════════════════════════════════════════════
// APIFY LINKEDIN JOBS ADAPTER
// Paid ($5 free tier = ~500 jobs/month). No login, no key needed.
// Scraper: cryptosignals/linkedin-jobs-scraper
//
// Requires env var:
//   APIFY_TOKEN=xxx
//
// Auto-deactivates if key is missing.
// ═══════════════════════════════════════════════════════════════

import type { JobResult } from './types'

interface ApifyLinkedInJob {
  title?: string
  company?: string
  location?: string
  salary?: string
  postedDate?: string
  jobUrl?: string
  applyUrl?: string
  description?: string
  companyLogo?: string
}

export async function fetchApifyLinkedIn(
  query: string,
  location?: string,
  opts?: { signal?: AbortSignal },
): Promise<{ jobs: JobResult[]; error?: string }> {
  const token = process.env.APIFY_TOKEN
  if (!token) {
    return { jobs: [], error: 'No APIFY_TOKEN — add to .env.local' }
  }

  try {
    const url = `https://api.apify.com/v2/acts/cryptosignals~linkedin-jobs-scraper/run-sync-get-dataset-items?token=${token}&limit=20`

    const res = await fetch(url, {
      method: 'POST',
      signal: opts?.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        action: 'search',
        keywords: query,
        location: location || undefined,
        maxItems: 20,
      }),
    })

    if (!res.ok) {
      throw new Error(`Apify LinkedIn: HTTP ${res.status}`)
    }

    const data: ApifyLinkedInJob[] = await res.json()

    const jobs: JobResult[] = (data || [])
      .filter((job) => job.title && job.company)
      .map((job) => {
        const description = job.description || ''
        const jobLocation = job.location || 'Remote'

        return {
          id: `linkedin:${job.jobUrl ? extractJobId(job.jobUrl) : Math.random()}`,
          source: 'linkedin' as const,
          company: job.company!,
          title: job.title!,
          location: jobLocation,
          locationType: detectLocationType(jobLocation),
          url: job.applyUrl || job.jobUrl || 'https://www.linkedin.com',
          description: description.slice(0, 8000),
          salary: job.salary || undefined,
          postedAt: job.postedDate,
          companyLogo: job.companyLogo || undefined,
        }
      })

    return { jobs }
  } catch (err) {
    return { jobs: [], error: err instanceof Error ? err.message : 'Apify LinkedIn failed' }
  }
}

function extractJobId(url: string): string {
  try {
    // Extract ID from e.g. https://www.linkedin.com/jobs/view/3876543210
    const match = url.match(/\/view\/(\d+)/)
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
