// ═══════════════════════════════════════════════════════════════
// REMOTEOK ADAPTER
// Free, no auth, no key. Public JSON API.
// Endpoint: GET https://remoteok.com/api
// Returns ALL remote jobs in one call — filter client-side.
// Attribution required: link back to RemoteOK (see API terms).
// ═══════════════════════════════════════════════════════════════

import type { JobResult } from './types'

interface RemoteOKJob {
  slug: string
  id: string
  epoch?: number
  date?: string
  company?: string
  company_logo?: string
  position?: string
  tags?: string[]
  description?: string
  location?: string
  salary_min?: number
  salary_max?: number
  salary?: string
  url?: string
}

type RemoteOKResponse = Array<Record<string, unknown>>

export async function fetchRemoteOK(
  opts?: { signal?: AbortSignal },
): Promise<JobResult[]> {
  const res = await fetch('https://remoteok.com/api', {
    signal: opts?.signal,
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`RemoteOK: HTTP ${res.status}`)
  }

  const data: RemoteOKResponse = await res.json()

  // First element is metadata/legal notice — skip it
  const jobs = data.slice(1) as unknown as RemoteOKJob[]

  return jobs
    .filter((job) => job.id && job.position && job.company)
    .map((job) => {
      const descriptionHtml = job.description || ''
      const description = descriptionHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      const location = job.location || 'Remote'

      // Build salary string from min/max if available
      let salary: string | undefined
      if (job.salary) {
        salary = job.salary
      } else if (job.salary_min && job.salary_max) {
        salary = `$${(job.salary_min / 1000).toFixed(0)}k-${(job.salary_max / 1000).toFixed(0)}k`
      }

      return {
        id: `remoteok:${job.id}`,
        source: 'remoteok' as const,
        company: job.company!,
        title: job.position!,
        location,
        locationType: 'remote' as const, // RemoteOK is remote-only by definition
        url: job.url || `https://remoteok.com/l/${job.slug}`,
        description: description.slice(0, 8000),
        descriptionHtml,
        salary,
        postedAt: job.date,
        companyLogo: job.company_logo || undefined,
        tags: job.tags,
      }
    })
}
