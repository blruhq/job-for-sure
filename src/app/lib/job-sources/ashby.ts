// ═══════════════════════════════════════════════════════════════
// ASHBY ADAPTER
// Free, no auth, no key. Public Posting API.
// Endpoint: POST https://api.ashbyhq.com/posting-api/job-board/{slug}
// NOTE: Ashby uses POST (even for reads) and returns a rich JSON payload.
// ═══════════════════════════════════════════════════════════════

import type { JobResult } from './types'
import { extractExperienceYears } from './types'
import { parseLocation } from './geo'

interface AshbyCompensation {
  compensationTierSummary?: string   // e.g. "$120,000 - $160,000"
  minValue?: number
  maxValue?: number
  currency?: string
  interval?: string                  // "year" | "month" etc.
}

interface AshbyJob {
  id: string
  title: string
  department?: string
  team?: string
  employmentType?: string
  location?: string
  locationName?: string
  descriptionHtml?: string
  jobUrl?: string
  publishedDate?: string
  externalLink?: string
  compensation?: AshbyCompensation   // ← ADD THIS
}

interface AshbyResponse {
  name?: string
  jobs: AshbyJob[]
}

export async function fetchAshbyCompany(
  slug: string,
  opts?: { signal?: AbortSignal },
): Promise<JobResult[]> {
  // Ashby's posting API — GET variant also works for some boards
  const url = `https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`
  const res = await fetch(url, {
    signal: opts?.signal,
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    if (res.status === 404) return [] // company not on Ashby
    throw new Error(`Ashby ${slug}: HTTP ${res.status}`)
  }

  const data: AshbyResponse = await res.json()
  const companyName = data.name || slug
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

  return data.jobs.map((job) => {
    const descriptionHtml = job.descriptionHtml || ''
    const description = descriptionHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const location = job.location || job.locationName || 'Unknown'
    const parsed = parseLocation(location)

    // Compensation (was requested with ?includeCompensation=true but never read — fix)
    const comp = job.compensation
    let salary: string | undefined
    let salaryMin: number | undefined
    let salaryMax: number | undefined
    let salaryCurrency: string | undefined

    if (comp) {
      if (comp.compensationTierSummary) {
        salary = comp.compensationTierSummary
      }
      if (comp.minValue && comp.maxValue) {
        salaryMin = comp.minValue
        salaryMax = comp.maxValue
        salaryCurrency = comp.currency || 'USD'
        if (!salary) {
          const sym = salaryCurrency === 'USD' ? '$' : salaryCurrency === 'GBP' ? '£' : salaryCurrency === 'EUR' ? '€' : `${salaryCurrency} `
          const period = comp.interval === 'year' ? '/yr' : comp.interval === 'month' ? '/mo' : ''
          salary = `${sym}${Math.round(salaryMin / 1000)}k-${Math.round(salaryMax / 1000)}k${period}`
        }
      }
    }

    // Extract experience years from description
    const experienceYears = extractExperienceYears(description)

    return {
      id: `ashby:${job.id}`,
      source: 'ashby' as const,
      company: companyName,
      title: job.title,
      location,
      city: parsed.city,
      country: parsed.country,
      region: parsed.region,
      locationType: detectLocationType(location),
      url: job.jobUrl || job.externalLink || `https://app.ashbyhq.com/posting-api/job-board/${slug}`,
      description: description.slice(0, 8000),
      descriptionHtml,
      salary,
      salaryMin,
      salaryMax,
      salaryCurrency,
      experienceYears,
      employmentType: job.employmentType,
      postedAt: job.publishedDate,
      department: job.department,
    }
  })
}

function detectLocationType(location: string): JobResult['locationType'] {
  const lower = location.toLowerCase()
  if (lower.includes('remote')) return 'remote'
  if (lower.includes('hybrid')) return 'hybrid'
  if (lower === '' || lower === 'unknown') return 'unknown'
  return 'onsite'
}
