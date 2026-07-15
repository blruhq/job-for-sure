// ═══════════════════════════════════════════════════════════════
// LINKEDIN GUEST ADAPTER (FREE — no auth, no API key)
//
// Uses LinkedIn's public guest search endpoint that powers the
// "jobs you might be interested in" widget. Returns HTML, not JSON.
//
// TWO endpoints (we only use #1 here):
//   1. LIST:   /jobs-guest/jobs/api/seeMoreJobPostings/search
//      → 25 job cards per page (title, company, location, URL, date)
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

// LinkedIn requires browser-like headers or it returns 999/403.
const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
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
 * Fetch up to 25 job cards from LinkedIn's guest search endpoint.
 *
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
    const params = new URLSearchParams()
    // LinkedIn handles multi-word queries well — pass raw query.
    // Strip very long queries to avoid URL length issues.
    params.set('keywords', query.slice(0, 200))
    if (location && location.trim()) {
      params.set('location', location.trim())
    }
    params.set('start', '0')

    const url = `${GUEST_SEARCH_URL}?${params.toString()}`

    const res = await fetch(url, {
      signal: opts?.signal,
      headers: BROWSER_HEADERS,
      redirect: 'manual', // LinkedIn may redirect to auth — treat as failure
    })

    // 3xx = redirect to login/auth wall — not a real result
    if (res.status >= 300) {
      return { jobs: [], error: `LinkedIn guest: redirected (${res.status})` }
    }

    if (!res.ok) {
      return { jobs: [], error: `LinkedIn guest: HTTP ${res.status}` }
    }

    const html = await res.text()

    // Empty or near-empty response = rate-limited or blocked
    if (!html || html.length < 100) {
      return { jobs: [], error: 'LinkedIn guest: empty response (likely rate-limited)' }
    }

    const $ = cheerio.load(html)
    const jobs: JobResult[] = []

    // ── Parse job cards ──
    // LinkedIn card selectors are fragile — use multiple fallbacks.
    // The guest API consistently returns <li> elements with these patterns.
    $('li').each((_i, el) => {
      const card = $(el)

      // ── URL + Job ID ──
      const link =
        card.find('a.base-card__full-link').first() ||
        card.find('a[href*="/jobs/view/"]').first()
      const href = link.attr('href') || ''
      if (!href) return // not a job card

      const cleanUrl = href.split('?')[0] // strip tracking params
      const jobId = extractJobId(href)
      if (!jobId) return // can't use without ID

      // ── Title ──
      const title =
        card.find('h3.base-search-card__title').text().trim() ||
        card.find('h3').first().text().trim() ||
        ''
      if (!title) return

      // ── Company ──
      const company =
        card.find('h4.base-search-card__subtitle').text().trim() ||
        card.find('h4').first().text().trim() ||
        ''

      // ── Location ──
      const locationText =
        card.find('.job-search-card__location').text().trim() ||
        card.find('.job-card-container__metadata-item').text().trim() ||
        card.find('[class*="location"]').first().text().trim() ||
        ''

      // ── Posted date ──
      const timeEl = card.find('time').first()
      const postedAt = timeEl.attr('datetime') || timeEl.attr('title') || undefined

      // ── Normalize location using geo.ts ──
      const parsed = parseLocation(locationText || 'Remote')

      // ── Determine work policy ──
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
        // Intentionally empty — fetched on-demand via detail endpoint
        description: '',
        descriptionHtml: '',
        postedAt,
      })
    })

    return { jobs }
  } catch (err) {
    // Fail-open: LinkedIn is flaky, other sources compensate
    return {
      jobs: [],
      error: err instanceof Error ? err.message : 'LinkedIn guest fetch failed',
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
      headers: BROWSER_HEADERS,
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
