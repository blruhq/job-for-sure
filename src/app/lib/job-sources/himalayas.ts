// ═══════════════════════════════════════════════════════════════
// HIMALAYAS ADAPTER
// Free, no auth, no key. Public JSON API.
// Docs: https://himalayas.app/docs/openapi.json
// Endpoint: GET https://himalayas.app/jobs/api/search?q={query}
//
// Strengths: salary data, employment type, seniority level,
// timezone restrictions. 101k+ remote jobs.
// ═══════════════════════════════════════════════════════════════

import type { JobResult } from './types'
import { parseLocation } from './geo'

interface HimalayasJob {
  guid?: string
  id?: string
  title?: string
  excerpt?: string
  companyName?: string
  companySlug?: string
  companyLogo?: string
  employmentType?: string
  locationRestrictions?: string[]
  timezoneRestrictions?: string[]
  category?: string
  minSalary?: number
  maxSalary?: number
  salaryPeriod?: string
  currency?: string
  description?: string
  pubDate?: string
  applicationLink?: string
  externalLink?: string
}

interface HimalayasResponse {
  jobs?: HimalayasJob[]
  total?: number
}

export async function fetchHimalayas(
  query: string,
  opts?: { signal?: AbortSignal },
): Promise<{ jobs: JobResult[]; error?: string }> {
  try {
    const url = `https://himalayas.app/jobs/api/search?q=${encodeURIComponent(query)}&limit=30`
    const res = await fetch(url, {
      signal: opts?.signal,
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) throw new Error(`Himalayas: HTTP ${res.status}`)
    const data: HimalayasResponse = await res.json()

    const jobs: JobResult[] = (data.jobs || []).map((job) => {
      const descriptionHtml = job.description || ''
      const description = descriptionHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      const location = (job.locationRestrictions || []).join(', ') || 'Remote'
      const salary = formatSalary(job.minSalary, job.maxSalary, job.salaryPeriod, job.currency)
      const parsed = parseLocation(location)

      return {
        id: `himalayas:${job.guid || job.id || Math.random()}`,
        source: 'himalayas' as const,
        company: job.companyName || 'Unknown',
        title: job.title || 'Unknown',
        location,
        city: parsed.city,
        country: parsed.country,
        region: parsed.region,
        locationType: detectLocationType(location),
        url: job.applicationLink || job.externalLink || `https://himalayas.app/jobs/${job.companySlug || ''}`,
        description: description.slice(0, 8000),
        descriptionHtml,
        salary,
        postedAt: job.pubDate,
        companyLogo: job.companyLogo || undefined,
        employmentType: job.employmentType,
      }
    })

    return { jobs }
  } catch (err) {
    console.error('[himalayas] Fetch error:', err instanceof Error ? err.message : err)
    return { jobs: [], error: err instanceof Error ? err.message : 'Himalayas failed' }
  }
}

function formatSalary(min?: number, max?: number, period?: string, currency?: string): string | undefined {
  if (!min && !max) return undefined
  const cur = currency || 'USD'
  const sym = cur === 'USD' ? '$' : cur === 'GBP' ? '£' : cur === 'EUR' ? '€' : `${cur} `
  const periodSuffix = period === 'year' ? 'k/yr' : period === 'month' ? 'k/mo' : 'k'
  const minK = min ? Math.round(min / 1000) : null
  const maxK = max ? Math.round(max / 1000) : null
  if (minK && maxK) return `${sym}${minK}-${maxK}${periodSuffix}`
  if (minK) return `${sym}${minK}${periodSuffix}+`
  if (maxK) return `up to ${sym}${maxK}${periodSuffix}`
  return undefined
}

function detectLocationType(location: string): JobResult['locationType'] {
  const lower = location.toLowerCase()
  if (lower.includes('remote') || lower.includes('worldwide') || lower.includes('anywhere')) return 'remote'
  if (lower.includes('hybrid')) return 'hybrid'
  if (!lower || lower === 'unknown') return 'unknown'
  return 'onsite'
}
