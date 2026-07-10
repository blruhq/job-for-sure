// ═══════════════════════════════════════════════════════════════
// JSEARCH ADAPTER (RapidAPI — Google for Jobs aggregator)
// Free tier: 200 requests/month.
// Register: https://rapidapi.com/letscrape-6pRBpxxU8V/api/jsearch
//
// Requires env var:
//   RAPIDAPI_KEY=xxx
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

interface JSearchResponse {
  data: JSearchJob[]
  status?: string
  message?: string
}

export async function fetchJSearch(
  query: string,
  location?: string,
  opts?: { signal?: AbortSignal },
): Promise<{ jobs: JobResult[]; error?: string }> {
  const apiKey = process.env.RAPIDAPI_KEY

  if (!apiKey) {
    return { jobs: [], error: 'No API key — register at rapidapi.com (search JSearch)' }
  }

  try {
    const searchQuery = location
      ? `${query} in ${location}`
      : query

    const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(searchQuery)}&num_pages=1&date_posted=week`

    const res = await fetch(url, {
      signal: opts?.signal,
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
        Accept: 'application/json',
      },
    })

    if (!res.ok) throw new Error(`JSearch: HTTP ${res.status}`)
    const data: JSearchResponse = await res.json()

    const jobs: JobResult[] = (data.data || []).map((job) => {
      // Build description from highlights + description
      const parts: string[] = []
      if (job.job_description) parts.push(job.job_description)
      if (job.job_highlights?.qualifications) parts.push('Qualifications: ' + job.job_highlights.qualifications.join(', '))
      if (job.job_highlights?.responsibilities) parts.push('Responsibilities: ' + job.job_highlights.responsibilities.join(', '))
      const description = parts.join('\n\n').slice(0, 8000)

      // Location
      const locParts = [job.job_city, job.job_state, job.job_country].filter(Boolean)
      const locationStr = locParts.join(', ') || job.job_location || (job.job_is_remote ? 'Remote' : 'Unspecified')

      // Salary
      let salary: string | undefined
      if (job.job_min_salary && job.job_max_salary) {
        const period = job.job_salary_period === 'YEAR' ? '/yr' : job.job_salary_period === 'MONTH' ? '/mo' : ''
        salary = `${job.job_min_salary}-${job.job_max_salary}${period} ${job.job_salary_currency || ''}`.trim()
      }

      return {
        id: `jsearch:${job.job_id || Math.random()}`,
        source: 'jsearch' as const,
        company: job.employer_name || 'Unknown',
        title: job.job_title || 'Unknown',
        location: locationStr,
        locationType: job.job_is_remote ? 'remote' : detectLocationType(locationStr),
        url: job.job_apply_link || 'https://www.google.com/search?q=' + encodeURIComponent(`${job.job_title} ${job.employer_name}`),
        description,
        salary,
        postedAt: job.job_posted_at_datetime_utc || (job.job_posted_at_timestamp ? new Date(job.job_posted_at_timestamp * 1000).toISOString() : undefined),
        companyLogo: job.employer_logo || job.job_employer_logo || undefined,
        employmentType: job.job_employment_type || job.employment_type,
        experienceLevel: inferExperience(job.job_title || '', job.seniority_level),
        tags: job.required_technologies,
      }
    })

    return { jobs }
  } catch (err) {
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
