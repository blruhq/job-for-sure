// ═══════════════════════════════════════════════════════════════
// JOBSDB / JOBSTREET REST ADAPTER (FREE — no auth, no Apify)
//
// Uses SEEK's public job search REST API. Same endpoint their
// website frontend calls. Returns structured JSON (not HTML).
//
// Covers 6 countries via siteKey mapping:
//   JobsDB:    Thailand (TH), Hong Kong (HK)
//   JobStreet: Singapore (SG), Malaysia (MY), Philippines (PH), Indonesia (ID)
//
// API URL pattern:
//   https://{domain}/api/jobsearch/v5/search?siteKey={key}&sourcesystem=houston
//
// No authentication required. No Cloudflare. No rate limiting observed
// at low volume. Cache aggressively (6h TTL handled by orchestrator).
//
// Data quality: title, company, location (with province), salary,
// company logo, bullet points, work type, classifications, teaser.
// ═══════════════════════════════════════════════════════════════

import type { JobResult } from './types'
import { parseLocation } from './geo'

// ── Country → SEEK endpoint mapping ──────────────────────────
// JobsDB brand: Thailand, Hong Kong
// JobStreet brand: Singapore, Malaysia, Philippines, Indonesia
const COUNTRY_MAP: Record<string, { domain: string; siteKey: string }> = {
  TH: { domain: 'th.jobsdb.com',    siteKey: 'TH-Main' },
  HK: { domain: 'hk.jobsdb.com',    siteKey: 'HK-Main' },
  SG: { domain: 'sg.jobstreet.com', siteKey: 'SG-Main' },
  MY: { domain: 'my.jobstreet.com', siteKey: 'MY-Main' },
  PH: { domain: 'ph.jobstreet.com', siteKey: 'PH-Main' },
  ID: { domain: 'id.jobstreet.com', siteKey: 'ID-Main' },
}

// ── Random User-Agents (same pool as linkedin-guest.ts) ──────
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

// ── API response types (subset of fields we use) ────────────
interface JobsDBLocation {
  label: string
  countryCode?: string
  seoHierarchy?: Array<{ contextualName: string }>
}

interface JobsDBJob {
  id: string
  title: string
  companyName?: string
  advertiser?: { description?: string }
  locations?: JobsDBLocation[]
  salaryLabel?: string
  listingDate?: string
  listingDateDisplay?: string
  workTypes?: string[]
  workArrangements?: { data?: Array<{ label?: { text?: string } }> }
  teaser?: string
  bulletPoints?: string[]
  classifications?: Array<{
    classification?: { description?: string }
    subclassification?: { description?: string }
  }>
  branding?: { serpLogoUrl?: string }
}

interface JobsDBResponse {
  data?: JobsDBJob[]
  totalCount?: number
}

/**
 * Fetch jobs from JobsDB/JobStreet REST API.
 *
 * Automatically detects the right country endpoint based on the
 * user's location. If the user's country isn't covered by JobsDB/
 * JobStreet (e.g., US, UK), returns empty array (not an error —
 * other sources compensate).
 *
 * One request returns up to 50 jobs.
 */
export async function fetchJobsDBRest(
  query: string,
  location?: string,
  opts?: { signal?: AbortSignal; countryCode?: string },
): Promise<{ jobs: JobResult[]; error?: string }> {
  try {
    // 1. Parse user location to get country code (use passed countryCode first)
    const countryCode = opts?.countryCode || parseLocation(location).country

    // 2. Look up country in SEEK mapping
    const config = countryCode ? COUNTRY_MAP[countryCode] : null

    // 3. If country not covered → skip silently (not an error)
    if (!config) {
      return { jobs: [] }
    }

    // 4. Build API URL
    const params = new URLSearchParams()
    params.set('siteKey', config.siteKey)
    params.set('sourcesystem', 'houston')
    params.set('keywords', query.slice(0, 200))
    params.set('pageSize', '50')
    params.set('page', '1')
    params.set('sortmode', 'ListedDate')

    // Pass city as where parameter (only if location is not a country code or "Thailand")
    if (location && location !== countryCode && location.toLowerCase() !== 'thailand') {
      params.set('where', location)
    }

    const url = `https://${config.domain}/api/jobsearch/v5/search?${params.toString()}`

    // 5. Fetch
    const res = await fetch(url, {
      signal: opts?.signal,
      headers: {
        'User-Agent': getRandomUA(),
        Accept: 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })

    if (!res.ok) {
      return { jobs: [], error: `JobsDB REST: HTTP ${res.status}` }
    }

    const json: JobsDBResponse = await res.json()

    // 6. Normalize to JobResult[]
    const jobs: JobResult[] = (json.data || [])
      .filter((job) => job.title && (job.companyName || job.advertiser?.description))
      .map((job) => {
        // Location: use first location entry's label
        const locData = job.locations?.[0]
        const locationLabel = locData?.label || location || ''

        // Parse location for country/region
        const parsedLoc = parseLocation(locationLabel || 'Remote')

        // Determine work type
        const workArrangement = job.workArrangements?.data?.[0]?.label?.text?.toLowerCase() || ''
        const locationType: JobResult['locationType'] =
          workArrangement.includes('remote') ? 'remote' :
          workArrangement.includes('hybrid') ? 'hybrid' :
          workArrangement.includes('on-site') || workArrangement === '' ? 'onsite' : 'unknown'

        // Build classification tags
        const tags: string[] = []
        for (const c of job.classifications || []) {
          if (c.classification?.description) tags.push(c.classification.description)
          if (c.subclassification?.description) tags.push(c.subclassification.description)
        }

        // Employment type
        const employmentType = job.workTypes?.[0]

        // Company name
        const company = job.companyName || job.advertiser?.description || 'Unknown Company'

        // Description from teaser + bullet points
        const descParts: string[] = []
        if (job.teaser) descParts.push(job.teaser)
        if (job.bulletPoints && job.bulletPoints.length > 0) {
          descParts.push(job.bulletPoints.map((bp) => `• ${bp}`).join('\n'))
        }
        const description = descParts.join('\n\n')

        // Job URL
        const jobUrl = `https://${config.domain}/job/${job.id}`

        // Company logo
        const companyLogo = job.branding?.serpLogoUrl || undefined

        return {
          id: `jobsdb-rest:${job.id}`,
          source: 'jobsdb-rest' as const,
          company,
          title: job.title,
          location: locationLabel || 'Unknown',
          country: parsedLoc.country || countryCode,
          region: parsedLoc.region,
          locationType,
          url: jobUrl,
          description,
          salary: job.salaryLabel || undefined,
          postedAt: job.listingDate,
          companyLogo,
          tags: tags.length > 0 ? tags : undefined,
          employmentType,
        }
      })

    return { jobs }
  } catch (err) {
    // Fail-open: other sources compensate
    return {
      jobs: [],
      error: err instanceof Error ? err.message : 'JobsDB REST fetch failed',
    }
  }
}
