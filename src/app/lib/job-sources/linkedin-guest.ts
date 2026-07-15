// ═══════════════════════════════════════════════════════════════
// LINKEDIN GUEST ADAPTER (FREE — no auth, no API key)
//
// Uses LinkedIn's public guest search endpoint that powers the
// "jobs you might be interested in" widget. Returns HTML, not JSON.
//
// TWO endpoints (we only use #1 here):
//   1. LIST:   /jobs-guest/jobs/api/seeMoreJobPostings/search
//      → 25 job cards per page. We fetch 2 pages (50 jobs total).
//      → Title, company, location, URL, date, salary (when available)
//      → NO job descriptions — fetched on-demand via /api/jobs/detail
//
//   2. DETAIL: /jobs-guest/jobs/api/jobPosting/{jobId}
//      → Full JD text + metadata for ONE job
//      → Used by the detail modal (see /api/jobs/detail/route.ts)
//
// Reliability: ~50-70% uptime in 2026. LinkedIn throttles/blocks
// aggressively. Fail-open: returns empty array on any error.
// The other 10 free sources compensate when this fails.
// ═══════════════════════════════════════════════════════════════

import * as cheerio from 'cheerio'
import type { JobResult } from './types'
import { parseLocation } from './geo'

const GUEST_SEARCH_URL = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search'

// Pool of realistic browser User-Agents. Picked randomly per request
// to prevent UA-based fingerprinting by LinkedIn's anti-bot system.
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
]

function getRandomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

// Base headers (User-Agent is added per-request via getRandomUA())
function makeBrowserHeaders(): Record<string, string> {
  return {
    'User-Agent': getRandomUA(),
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  }
}

/**
 * Extract the numeric LinkedIn job ID from a URL.
 * Examples:
 *   /jobs/view/4403633204/?refId=...  →  "4403633204"
 *   /jobs/view/slug-name-4403633204   →  "4403633204"
 *   https://linkedin.com/jobs/view/123 →  "123"
 */
function extractJobId(url: string): string | null {
  const match = url.match(/\/jobs\/view\/(?:.*-)?(\d+)/)
  return match ? match[1] : null
}

/**
 * Detect work policy from location text.
 * LinkedIn cards sometimes say "Remote", "Hybrid", or just a city.
 */
function detectLocationType(location: string): JobResult['locationType'] {
  const lower = location.toLowerCase()
  if (lower.includes('remote') || lower.includes('work from home')) return 'remote'
  if (lower.includes('hybrid')) return 'hybrid'
  if (!lower || lower === 'unspecified') return 'unknown'
  return 'onsite'
}

/**
 * Fetch up to 50 job cards from LinkedIn's guest search endpoint.
 *
 * Fetches 2 pages (start=0 and start=25) to double the result count.
 * This is a LIST-ONLY call. Descriptions are intentionally NOT fetched
 * here — they're loaded on-demand when the user clicks a card in the
 * detail modal (see /api/jobs/detail/route.ts).
 */
export async function fetchLinkedInGuest(
  query: string,
  location?: string,
  opts?: { signal?: AbortSignal },
): Promise<{ jobs: JobResult[]; error?: string }> {
  try {
    // ── Page 1 (start=0) ──
    const page1 = await fetchLinkedInGuestPage(query, location, 0, opts)
    if (page1.jobs.length === 0) {
      return page1
    }

    // ── Page 2 (start=25) — only if page 1 was full (25 jobs) ──
    if (page1.jobs.length >= 25) {
      await new Promise((r) => setTimeout(r, 300))
      const page2 = await fetchLinkedInGuestPage(query, location, 25, opts)
      if (page2.jobs.length > 0) {
        const seen = new Set(page1.jobs.map((j) => j.id))
        const unique = page2.jobs.filter((j) => !seen.has(j.id))
        return { jobs: [...page1.jobs, ...unique] }
      }
    }

    return page1
  } catch (err) {
    return {
      jobs: [],
      error: err instanceof Error ? err.message : 'LinkedIn guest fetch failed',
    }
  }
}

/**
 * Fetch a single page of job cards from LinkedIn's guest search endpoint.
 * Internal helper — called by fetchLinkedInGuest.
 */
async function fetchLinkedInGuestPage(
  query: string,
  location: string | undefined,
  start: number,
  opts?: { signal?: AbortSignal },
): Promise<{ jobs: JobResult[]; error?: string }> {
  try {
    const params = new URLSearchParams()
    params.set('keywords', query.slice(0, 200))
    if (location && location.trim()) {
      params.set('location', location.trim())
    }
    params.set('start', String(start))

    const url = `${GUEST_SEARCH_URL}?${params.toString()}`

    const res = await fetch(url, {
      signal: opts?.signal,
      headers: makeBrowserHeaders(),
      redirect: 'manual',
    })

    if (res.status >= 300) {
      return { jobs: [], error: `LinkedIn guest: redirected (${res.status})` }
    }

    if (!res.ok) {
      return { jobs: [], error: `LinkedIn guest: HTTP ${res.status}` }
    }

    const html = await res.text()

    if (!html || html.length < 100) {
      return { jobs: [], error: 'LinkedIn guest: empty response (likely rate-limited)' }
    }

    const $ = cheerio.load(html)
    const jobs: JobResult[] = []

    $('li').each((_i, el) => {
      const card = $(el)

      const link =
        card.find('a.base-card__full-link').first() ||
        card.find('a[href*="/jobs/view/"]').first()
      const href = link.attr('href') || ''
      if (!href) return

      const cleanUrl = href.split('?')[0]
      const jobId = extractJobId(href)
      if (!jobId) return

      const title =
        card.find('h3.base-search-card__title').text().trim() ||
        card.find('h3').first().text().trim() ||
        ''
      if (!title) return

      const company =
        card.find('h4.base-search-card__subtitle').text().trim() ||
        card.find('h4').first().text().trim() ||
        ''

      const locationText =
        card.find('.job-search-card__location').text().trim() ||
        card.find('.job-card-container__metadata-item').text().trim() ||
        card.find('[class*="location"]').first().text().trim() ||
        ''

      const timeEl = card.find('time').first()
      const postedAt = timeEl.attr('datetime') || timeEl.attr('title') || undefined

      const salary =
        card.find('.job-search-card__salary-info').text().trim().replace(/\s+/g, ' ') ||
        undefined

      const parsed = parseLocation(locationText || 'Remote')
      const locationType = detectLocationType(locationText)

      jobs.push({
        id: `linkedin-guest:${jobId}`,
        source: 'linkedin-guest' as const,
        company: company || 'LinkedIn',
        title,
        location: locationText || 'Remote',
        country: parsed.country,
        region: parsed.region,
        locationType,
        url: cleanUrl.startsWith('http') ? cleanUrl : `https://www.linkedin.com${cleanUrl}`,
        description: '',
        descriptionHtml: '',
        salary: salary || undefined,
        postedAt,
      })
    })

    return { jobs }
  } catch (err) {
    return {
      jobs: [],
      error: err instanceof Error ? err.message : 'LinkedIn guest page fetch failed',
    }
  }
}

/**
 * Fetch the FULL job description for a single LinkedIn job.
 * Uses the guest DETAIL endpoint.
 *
 * Called by /api/jobs/detail/route.ts when user clicks a card.
 */
export async function fetchLinkedInGuestDetail(
  jobId: string,
  opts?: { signal?: AbortSignal },
): Promise<{ job: JobResult | null; error?: string }> {
  try {
    const url = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`

    const res = await fetch(url, {
      signal: opts?.signal,
      headers: makeBrowserHeaders(),
      redirect: 'manual',
    })

    if (res.status >= 300 || !res.ok) {
      return { job: null, error: `LinkedIn guest detail: HTTP ${res.status}` }
    }

    const html = await res.text()
    if (!html || html.length < 100) {
      return { job: null, error: 'LinkedIn guest detail: empty response' }
    }

    const $ = cheerio.load(html)

    const title =
      $('.top-card-layout__title').text().trim() ||
      $('.topcard__title').text().trim() ||
      $('h1').first().text().trim() ||
      ''

    const company =
      $('.top-card-layout__company-name').text().trim() ||
      $('.topcard__org-name-link').text().trim() ||
      $('.topcard__flavor--company-name').text().trim() ||
      ''

    const location =
      $('.top-card-layout__location').text().trim() ||
      $('.topcard__flavor--bullet').first().text().trim() ||
      ''

    // Full JD text
    const descriptionHtml =
      $('.show-more-less-html__markup').html() ||
      $('.description__text').html() ||
      ''

    const description =
      $('.show-more-less-html__markup').text().trim() ||
      $('.description__text').text().trim() ||
      ''

    if (!title && !description) {
      return { job: null, error: 'LinkedIn guest detail: no content' }
    }

    // Extract job criteria (seniority, employment type, etc.)
    const criteria: string[] = []
    $('.description__job-criteria-item').each((_i, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ')
      if (text) criteria.push(text)
    })

    const fullDescription = [description, ...criteria]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 12000)

    const parsed = parseLocation(location || 'Remote')

    return {
      job: {
        id: `linkedin-guest:${jobId}`,
        source: 'linkedin-guest' as const,
        company: company || 'LinkedIn',
        title: title || 'Unknown Position',
        location: location || 'Remote',
        country: parsed.country,
        region: parsed.region,
        locationType: detectLocationType(location || 'Remote'),
        url: `https://www.linkedin.com/jobs/view/${jobId}/`,
        description: fullDescription,
        descriptionHtml,
      },
    }
  } catch (err) {
    return {
      job: null,
      error: err instanceof Error ? err.message : 'LinkedIn guest detail failed',
    }
  }
}
