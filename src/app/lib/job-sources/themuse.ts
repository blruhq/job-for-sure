// ═══════════════════════════════════════════════════════════════
// THE MUSE ADAPTER
// Free, no auth, no key. Public JSON API.
// Endpoint: GET https://www.themuse.com/api/public/jobs?page=0
//
// 410k+ jobs, all sectors (not just tech).
// Strengths: experience levels, company metadata.
// Weakness: no salary field, paginated (20/page).
// ═══════════════════════════════════════════════════════════════

import type { JobResult } from './types'
import { parseLocation } from './geo'

interface MuseJob {
  id: string
  name: string              // job title (The Muse uses 'name' for title)
  company?: { name: string; id?: string }
  locations?: { name: string }[]
  levels?: { name: string; short_name?: string }[]
  categories?: { name: string }[]
  contents?: string         // HTML description
  publication_date?: string
  refs?: { landing_page?: string }
  model_type?: string
}

interface MuseResponse {
  page: number
  page_count: number
  total: number
  results: MuseJob[]
}

export async function fetchTheMuse(
  query: string,
  opts?: { signal?: AbortSignal },
): Promise<{ jobs: JobResult[]; error?: string }> {
  try {
    // The Muse doesn't have a keyword search — use category + page.
    // We fetch page 0 and filter client-side by query keywords.
    const url = `https://www.themuse.com/api/public/jobs?page=0`
    const res = await fetch(url, {
      signal: opts?.signal,
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) throw new Error(`The Muse: HTTP ${res.status}`)
    const data: MuseResponse = await res.json()

    const jobs: JobResult[] = (data.results || []).map((job) => {
      const descriptionHtml = job.contents || ''
      const description = descriptionHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      const locations = (job.locations || []).map((l) => l.name).join(', ') || 'Unspecified'
      const levels = (job.levels || []).map((l) => l.name).join(', ')
      const parsed = parseLocation(locations)

      return {
        id: `themuse:${job.id}`,
        source: 'themuse' as const,
        company: job.company?.name || 'Unknown',
        title: job.name,
        location: locations,
        country: parsed.country,
        region: parsed.region,
        locationType: detectLocationType(locations),
        url: job.refs?.landing_page || `https://www.themuse.com/jobs/${job.id}`,
        description: description.slice(0, 8000),
        descriptionHtml,
        postedAt: job.publication_date,
        department: (job.categories || []).map((c) => c.name).join(', ') || undefined,
        experienceLevel: inferExperience(job.name, levels),
      }
    })

    // Client-side keyword filter (The Muse has no search endpoint)
    const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2)
    const filtered = queryTerms.length > 0
      ? jobs.filter((job) => {
          const haystack = `${job.title} ${job.description.slice(0, 1000)} ${job.company} ${job.department || ''}`.toLowerCase()
          return queryTerms.some((t) => haystack.includes(t))
        })
      : jobs

    return { jobs: filtered.slice(0, 30) }
  } catch (err) {
    return { jobs: [], error: err instanceof Error ? err.message : 'The Muse failed' }
  }
}

function detectLocationType(location: string): JobResult['locationType'] {
  const lower = location.toLowerCase()
  if (lower.includes('remote')) return 'remote'
  if (lower.includes('hybrid')) return 'hybrid'
  if (!lower || lower === 'unspecified') return 'unknown'
  return 'onsite'
}

function inferExperience(title: string, levels: string): JobResult['experienceLevel'] {
  const hay = `${title} ${levels}`.toLowerCase()
  if (/\b(senior|lead|principal|staff|director|head)\b/.test(hay)) return 'senior'
  if (/\b(junior|entry|intern|graduate|associate)\b/.test(hay)) return 'entry'
  return 'mid'
}
