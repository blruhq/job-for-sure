// ═══════════════════════════════════════════════════════════════
// JSEARCH ADAPTER (OpenWeb Ninja — Google for Jobs aggregator)
// Free tier: included. No credit card required.
// Register: https://app.openwebninja.com
//
// Requires env var:
//   OPENWEBNINJA_API_KEY=xxx
//
// Strengths: RICHEST data of any source.
//   - Salary (min/max/currency/period)
//   - Employment type, seniority level
//   - Required technologies
//   - Employer reviews (Indeed/Glassdoor)
//   - Apply links from multiple publishers
//   - Remote flag
// Broadest coverage (aggregates Google for Jobs).
//
// Auto-deactivates if key is missing.
// ═══════════════════════════════════════════════════════════════

import type { JobResult } from './types'
import { extractExperienceYears } from './types'
import { parseLocation } from './geo'

interface JSearchJob {
  employer_name?: string
  employer_logo?: string
  employer_website?: string
  job_employer_logo?: string
  job_title?: string
  job_description?: string
  job_is_remote?: boolean
  job_city?: string
  job_state?: string
  job_country?: string
  job_location?: string
  job_min_salary?: number
  job_max_salary?: number
  job_salary_period?: string
  job_salary_currency?: string
  job_apply_link?: string
  job_posted_at_timestamp?: number
  job_posted_at_datetime_utc?: string
  employment_type?: string
  job_employment_type?: string
  seniority_level?: string
  work_arrangement?: string
  required_technologies?: string[]
  job_highlights?: {
    qualifications?: string[]
    responsibilities?: string[]
    benefits?: string[]
  }
  employer_reviews?: Array<{ publisher?: string; rating?: number; count?: number }>
  job_offer_expiration_timestamp?: number
  job_id?: string
}

interface OpenWebNinjaResponse {
  status?: string
  data?: JSearchJob[]
  request_id?: string
}

export async function fetchJSearch(
  query: string,
  location?: string,
  opts?: { signal?: AbortSignal },
): Promise<{ jobs: JobResult[]; error?: string }> {
  const apiKey = process.env.OPENWEBNINJA_API_KEY

  if (!apiKey) {
    return { jobs: [], error: 'No API key — register at app.openwebninja.com' }
  }

  try {
    const searchQuery = location
      ? `${query} in ${location}`
      : query

    const url = `https://api.openwebninja.com/jsearch/search?query=${encodeURIComponent(searchQuery)}&num_pages=1&date_posted=week`

    const res = await fetch(url, {
      signal: opts?.signal,
      headers: {
        'x-api-key': apiKey,
        Accept: 'application/json',
      },
    })

    if (!res.ok) throw new Error(`JSearch: HTTP ${res.status}`)
    const body: OpenWebNinjaResponse = await res.json()

    const rawJobs: JSearchJob[] = body.data || []
    const jobs: JobResult[] = rawJobs.map((job) => {
      // Build description from highlights + description
      const parts: string[] = []
      if (job.job_description) parts.push(job.job_description)
      if (job.job_highlights?.qualifications) parts.push('Qualifications: ' + job.job_highlights.qualifications.join(', '))
      if (job.job_highlights?.responsibilities) parts.push('Responsibilities: ' + job.job_highlights.responsibilities.join(', '))
      const description = parts.join('\n\n').slice(0, 8000)

      // Location — avoid redundant joins like "Bangkok, Bangkok City, Thailand"
      const cityName = job.job_city?.trim() || undefined
      const stateName = job.job_state?.trim() || undefined
      const countryName = job.job_country?.trim() || undefined

      // Build display string: skip state when it's redundant with city
      // (e.g., city="Bangkok", state="Bangkok City" → don't include state)
      const locParts: string[] = []
      if (cityName) locParts.push(cityName)
      if (stateName && normalizeForCompare(stateName) !== normalizeForCompare(cityName)) {
        locParts.push(stateName)
      }
      if (countryName) locParts.push(countryName)
      const locationStr = locParts.join(', ') || job.job_location || (job.job_is_remote ? 'Remote' : 'Unspecified')

      // Extract structured country from job_country field
      const parsed = parseLocation(job.job_country || locationStr)

      // Salary
      let salary: string | undefined
      if (job.job_min_salary && job.job_max_salary) {
        const period = job.job_salary_period === 'YEAR' ? '/yr' : job.job_salary_period === 'MONTH' ? '/mo' : ''
        salary = `${job.job_min_salary}-${job.job_max_salary}${period} ${job.job_salary_currency || ''}`.trim()
      }

      // Structured salary fields (JSearch has the best salary data of all sources)
      const salaryMin = job.job_min_salary || undefined
      const salaryMax = job.job_max_salary || undefined
      const salaryCurrency = job.job_salary_currency || undefined

      // experienceYears: try to extract numeric range from seniority_level first,
      // then from description (JSearch descriptions are rich)
      let experienceYears: string | undefined
      if (job.seniority_level) {
        // Some entries have years directly: "3 - 5 years", "2+ years"
        const fromSeniority = extractExperienceYears(job.seniority_level)
        if (fromSeniority) {
          experienceYears = fromSeniority
        }
      }
      if (!experienceYears) {
        experienceYears = extractExperienceYears(description)
      }

      return {
        id: `jsearch:${job.job_id || Math.random()}`,
        source: 'jsearch' as const,
        company: job.employer_name || 'Unknown',
        title: job.job_title || 'Unknown',
        location: locationStr,
        city: cityName,
        country: parsed.country,
        region: parsed.region,
        locationType: job.job_is_remote ? 'remote' : detectLocationType(locationStr),
        url: job.job_apply_link || 'https://www.google.com/search?q=' + encodeURIComponent(`${job.job_title} ${job.employer_name}`),
        description,
        salary,
        salaryMin,
        salaryMax,
        salaryCurrency,
        experienceYears,
        postedAt: job.job_posted_at_datetime_utc || (job.job_posted_at_timestamp ? new Date(job.job_posted_at_timestamp * 1000).toISOString() : undefined),
        companyLogo: job.employer_logo || job.job_employer_logo || undefined,
        employmentType: job.job_employment_type || job.employment_type,
        experienceLevel: inferExperience(job.job_title || '', job.seniority_level),
        tags: job.required_technologies,
      }
    })

    return { jobs }
  } catch (err) {
    console.error('[jsearch] Fetch error:', err instanceof Error ? err.message : err)
    return { jobs: [], error: err instanceof Error ? err.message : 'JSearch failed' }
  }
}

function detectLocationType(location: string): JobResult['locationType'] {
  const lower = location.toLowerCase()
  if (lower.includes('remote')) return 'remote'
  if (lower.includes('hybrid')) return 'hybrid'
  if (!lower || lower === 'unspecified') return 'unknown'
  return 'onsite'
}

function inferExperience(title: string, seniority?: string): JobResult['experienceLevel'] {
  const hay = `${title} ${seniority || ''}`.toLowerCase()
  if (/\b(senior|lead|principal|staff|director)\b/.test(hay)) return 'senior'
  if (/\b(junior|entry|intern|graduate|associate)\b/.test(hay)) return 'entry'
  return 'mid'
}

/** Normalize a location string for comparison: lowercase, strip suffixes like "City" */
function normalizeForCompare(s: string | undefined): string {
  if (!s) return ''
  return s.toLowerCase().trim().replace(/\s+(city|province|district|metropolis)$/i, '')
}
