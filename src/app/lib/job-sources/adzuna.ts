// ═══════════════════════════════════════════════════════════════
// ADZUNA ADAPTER
// Free API, requires registration. 2,500 searches/month free.
// Register: https://developer.adzuna.com/signup
//
// Requires env vars:
//   ADZUNA_APP_ID=xxx
//   ADZUNA_APP_KEY=xxx
//
// Strengths: 18 countries (incl SG, HK, IN, AU, UK, DE, FR, US),
// real salary data, contract type, full-text search.
//
// Auto-deactivates if keys are missing.
// ═══════════════════════════════════════════════════════════════

import type { JobResult } from './types'
import { parseLocation } from './geo'

interface AdzunaJob {
  id: string
  title: string
  company?: { display_name: string }
  description: string
  location?: { display_name?: string; area?: string[] }
  latitude?: number
  longitude?: number
  salary_min?: number
  salary_max?: number
  contract_type?: string
  contract_time?: string
  category?: { label?: string; tag?: string }
  created?: string
  redirect_url?: string
}

interface AdzunaResponse {
  results: AdzunaJob[]
  count: number
  mean?: number
}

const COUNTRY_MAP: Record<string, string> = {
  'us': 'us', 'usa': 'us', 'united states': 'us',
  'uk': 'gb', 'united kingdom': 'gb', 'britain': 'gb', 'england': 'gb',
  'singapore': 'sg', 'hong kong': 'hk',
  'india': 'in', 'australia': 'au',
  'germany': 'de', 'france': 'fr', 'netherlands': 'nl',
  'canada': 'ca', 'japan': 'jp',
  'thailand': 'us', // Adzuna doesn't have TH — default to US for broad search
}

const ADZUNA_SUPPORTED = new Set(['at', 'au', 'be', 'br', 'ca', 'ch', 'de', 'es', 'fr', 'gb', 'in', 'it', 'mx', 'nl', 'nz', 'pl', 'sg', 'us', 'za'])

export async function fetchAdzuna(
  query: string,
  location?: string,
  opts?: { signal?: AbortSignal; countryCode?: string },
): Promise<{ jobs: JobResult[]; error?: string }> {
  const appId = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY

  if (!appId || !appKey) {
    return { jobs: [], error: 'No API key — register at developer.adzuna.com/signup' }
  }

  try {
    // Determine country code from location (prioritize passed countryCode)
    const country = (opts?.countryCode || resolveCountry(location)).toLowerCase()

    // Skip if country is not supported by Adzuna
    if (!ADZUNA_SUPPORTED.has(country)) {
      return { jobs: [] }
    }

    const baseUrl = `https://api.adzuna.com/v1/api/jobs/${country}/search/1`

    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      what: query,
      results_per_page: '20',
      'content-type': 'application/json',
    })
    if (location && COUNTRY_MAP[location.toLowerCase()] === undefined) {
      params.set('where', location)
    }

    const res = await fetch(`${baseUrl}?${params}`, {
      signal: opts?.signal,
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) throw new Error(`Adzuna: HTTP ${res.status}`)
    const data: AdzunaResponse = await res.json()

    const jobs: JobResult[] = (data.results || []).map((job) => {
      const locationParts = job.location?.area || [job.location?.display_name || 'Unspecified']
      const locationStr = job.location?.display_name || locationParts.join(', ')

      // Extract country from area array (first element is typically country)
      const countryArea = job.location?.area?.[0]
      const parsed = parseLocation(countryArea || locationStr)

      // Salary
      let salary: string | undefined
      if (job.salary_min && job.salary_max) {
        salary = `$${Math.round(job.salary_min / 1000)}k-${Math.round(job.salary_max / 1000)}k`
      } else if (job.salary_min) {
        salary = `$${Math.round(job.salary_min / 1000)}k+`
      }

      // Contract type mapping
      const employmentType = job.contract_time === 'full_time' ? 'Full-time'
        : job.contract_time === 'part_time' ? 'Part-time'
        : job.contract_type === 'contract' ? 'Contract'
        : undefined

      return {
        id: `adzuna:${job.id}`,
        source: 'adzuna' as const,
        company: job.company?.display_name || 'Unknown',
        title: job.title,
        location: locationStr,
        city: parsed.city,
        country: parsed.country,
        region: parsed.region,
        locationType: detectLocationType(locationStr),
        url: job.redirect_url || 'https://www.adzuna.com',
        description: (job.description || '').slice(0, 8000),
        salary,
        postedAt: job.created,
        department: job.category?.label,
        employmentType,
      }
    })

    return { jobs }
  } catch (err) {
    return { jobs: [], error: err instanceof Error ? err.message : 'Adzuna failed' }
  }
}

function resolveCountry(location?: string): string {
  if (!location) return 'us'
  const lower = location.toLowerCase().trim()
  for (const [key, code] of Object.entries(COUNTRY_MAP)) {
    if (lower.includes(key)) return code
  }
  return 'us'
}

function detectLocationType(location: string): JobResult['locationType'] {
  const lower = location.toLowerCase()
  if (lower.includes('remote')) return 'remote'
  if (lower.includes('hybrid')) return 'hybrid'
  if (!lower || lower === 'unspecified') return 'unknown'
  return 'onsite'
}
