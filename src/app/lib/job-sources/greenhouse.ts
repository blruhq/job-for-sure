// ═══════════════════════════════════════════════════════════════
// GREENHOUSE ADAPTER
// Free, no auth, no key. Public Job Board API.
// Docs: https://developers.greenhouse.io/job-board.html
// Endpoint: GET https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true
// ═══════════════════════════════════════════════════════════════

import type { JobResult } from './types'
import { parseLocation } from './geo'

interface GreenhouseJob {
  id: number
  title: string
  location: { name: string }
  absolute_url: string
  content?: string
  first_published?: string
  updated_at?: string
  departments?: { name: string }[]
  metadata?: { name: string; value: string }[]
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[]
  meta?: { total: number }
}

export async function fetchGreenhouseCompany(
  slug: string,
  opts?: { signal?: AbortSignal },
): Promise<JobResult[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`
  const res = await fetch(url, {
    signal: opts?.signal,
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    if (res.status === 404) return [] // company not on Greenhouse
    throw new Error(`Greenhouse ${slug}: HTTP ${res.status}`)
  }

  const data: GreenhouseResponse = await res.json()

  // Derive company name from the slug if not in the job data.
  const companyName = slug
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

  return data.jobs.map((job) => {
    // Strip HTML from content for scoring/description
    const descriptionHtml = job.content || ''
    const description = descriptionHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

    // Check for pay transparency in metadata
    const salaryMeta = job.metadata?.find(
      (m) => m.name.toLowerCase().includes('salary') || m.name.toLowerCase().includes('compensation'),
    )

    const locName = job.location?.name || 'Unknown'
    const parsed = parseLocation(locName)

    return {
      id: `greenhouse:${job.id}`,
      source: 'greenhouse' as const,
      company: companyName,
      title: job.title,
      location: locName,
      city: parsed.city,
      country: parsed.country,
      region: parsed.region,
      locationType: detectLocationType(locName),
      url: job.absolute_url,
      description: description.slice(0, 8000),
      descriptionHtml,
      salary: salaryMeta?.value,
      postedAt: job.first_published,
      department: job.departments?.[0]?.name,
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
