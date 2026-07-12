import * as cheerio from 'cheerio'
import type { JobDescription } from '~/types/resume'

export interface ScrapeResult {
  success: boolean
  job?: JobDescription
  error?: string
  source: 'linkedin' | 'indeed' | 'greenhouse' | 'jobdb' | 'manual'
}

// ─── SSRF Protection ─────────────────────────────────────────
// Block requests to private networks, loopback, link-local, etc.
// Prevents attackers from using the scraper as a proxy to reach
// internal services or cloud metadata endpoints.

const BLOCKED_HOSTS = [
  'localhost',
  '0.0.0.0',
  '169.254.169.254', // AWS/GCP/Azure metadata
  'metadata.google.internal',
]

/**
 * Validate that a URL is safe to fetch server-side.
 * Rejects non-HTTPS, private IPs, localhost, and link-local addresses.
 */
function validateUrl(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('Invalid URL')
  }

  // Only allow http(s) — block file://, data://, etc.
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`Blocked protocol: ${parsed.protocol}`)
  }

  const hostname = parsed.hostname.toLowerCase()

  // Block known metadata/loopback hosts
  if (BLOCKED_HOSTS.includes(hostname)) {
    throw new Error('Blocked host')
  }

  // Block IP literals in private/loopback/link-local ranges
  if (hostname.match(/^\d{1,3}(\.\d{1,3}){3}$/)) {
    const parts = hostname.split('.').map(Number)
    const [a, b] = parts
    if (
      a === 10 || // private 10.0.0.0/8
      (a === 172 && b >= 16 && b <= 31) || // private 172.16.0.0/12
      (a === 192 && b === 168) || // private 192.168.0.0/16
      a === 127 || // loopback 127.0.0.0/8
      a === 0 || // 0.0.0.0/8
      (a === 169 && b === 254) || // link-local 169.254.0.0/16
      a >= 224 // multicast/reserved 224.0.0.0/4
    ) {
      throw new Error('Blocked private/reserved IP')
    }
  }

  // Block IPv6 loopback and link-local
  if (hostname === '[::1]' || hostname.startsWith('[fe80:') || hostname.startsWith('[fc') || hostname.startsWith('[fd')) {
    throw new Error('Blocked IPv6 address')
  }
}

/**
 * Scrape a job posting from a URL.
 * Strategy: try provider-specific parser first, fall back to generic.
 */
export async function scrapeJob(url: string): Promise<ScrapeResult> {
  // SSRF: validate URL before any network call
  try {
    validateUrl(url)
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Invalid URL',
      source: 'manual',
    }
  }

  const domain = extractDomain(url)

  try {
    if (domain.includes('indeed')) return scrapeIndeed(url)
    if (domain.includes('greenhouse')) return scrapeGreenhouse(url)
    if (domain.includes('jobdb')) return scrapeJobDb(url)
    if (domain.includes('linkedin')) return scrapeLinkedIn(url)

    // Generic fallback: try to extract whatever we can
    return scrapeGeneric(url, domain)
  } catch (err) {
    return {
      success: false,
      error: `Failed to scrape: ${err instanceof Error ? err.message : 'Unknown error'}`,
      source: 'manual',
    }
  }
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.toLowerCase()
  } catch {
    return ''
  }
}

const MAX_SCRAPE_BYTES = 2 * 1024 * 1024 // 2MB — prevent OOM from huge pages

async function fetchHTML(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'JobForSure-Bot/1.0 (+https://jobforsure.app)',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(10_000), // 10s hard timeout
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  // Stream-read with size limit to prevent memory exhaustion
  const reader = response.body?.getReader()
  if (!reader) return response.text()

  const chunks: Uint8Array[] = []
  let totalBytes = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    totalBytes += value.byteLength
    if (totalBytes > MAX_SCRAPE_BYTES) {
      reader.cancel()
      throw new Error('Response too large (max 2MB)')
    }
    chunks.push(value)
  }

  return new TextDecoder().decode(concatUint8Arrays(chunks))
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.byteLength, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.byteLength
  }
  return result
}

async function scrapeIndeed(url: string): Promise<ScrapeResult> {
  const html = await fetchHTML(url)
  const $ = cheerio.load(html)

  const title =
    $('.jobsearch-JobInfoHeader-title').text().trim() ||
    $('h1').first().text().trim() ||
    $('[data-testid="jobsearch-JobInfoHeader-title"]').text().trim()

  const company =
    $('.jobsearch-InlineCompanyRating .css-1cggq4v').text().trim() ||
    $('[data-testid="jobsearch-JobInfoHeader-company"]').text().trim()

  const location =
    $('.jobsearch-JobInfoHeader-subtitle .css-1cggq4v').last().text().trim() ||
    $('[data-testid="jobsearch-JobInfoHeader-location"]').text().trim()

  const description = $('#jobDescriptionText').text().trim() || $('.jobsearch-jobDescriptionText').text().trim()

  return {
    success: true,
    source: 'indeed',
    job: {
      title: title || 'Unknown Position',
      company: company || 'Unknown Company',
      location: location || 'Remote',
      description: description || 'No description available.',
      requirements: extractRequirements(description),
      qualifications: [],
    },
  }
}

async function scrapeGreenhouse(url: string): Promise<ScrapeResult> {
  const html = await fetchHTML(url)
  const $ = cheerio.load(html)

  const title = $('.app-title').text().trim() || $('h1').first().text().trim()
  const company = $('.company-name').text().trim() || extractDomain(url).split('.')[0] || 'Company'
  const location = $('.location').text().trim() || 'Remote'
  const description = $('#content').text().trim() || $('.description').text().trim()

  return {
    success: true,
    source: 'greenhouse',
    job: {
      title: title || 'Unknown Position',
      company: company.charAt(0).toUpperCase() + company.slice(1),
      location,
      description: description || 'No description available.',
      requirements: extractRequirements(description),
      qualifications: [],
    },
  }
}

async function scrapeJobDb(url: string): Promise<ScrapeResult> {
  const html = await fetchHTML(url)
  const $ = cheerio.load(html)

  const title = $('h1').first().text().trim() || $('.job-title').text().trim()
  const company = $('.company-name').text().trim() || $('.employer').text().trim()
  const description = $('.job-description').text().trim() || $('.description').text().trim()

  return {
    success: true,
    source: 'jobdb',
    job: {
      title: title || 'Unknown Position',
      company: company || 'Unknown Company',
      location: 'Remote',
      description: description || 'No description available.',
      requirements: extractRequirements(description),
      qualifications: [],
    },
  }
}

async function scrapeLinkedIn(url: string): Promise<ScrapeResult> {
  // LinkedIn blocks most scrapers. Return a helpful error.
  return {
    success: false,
    source: 'linkedin',
    error:
      "LinkedIn requires a paid API (Proxycurl or Bright Data) for job scraping. Please paste the job description manually, or use an Indeed/Greenhouse link.",
  }
}

async function scrapeGeneric(url: string, domain: string): Promise<ScrapeResult> {
  try {
    const html = await fetchHTML(url)
    const $ = cheerio.load(html)

    // Remove scripts, styles, nav, footer for cleaner text
    $('script, style, nav, footer, header').remove()

    const title =
      $('h1').first().text().trim() ||
      $('title').text().trim() ||
      'Unknown Position'

    const metaDesc =
      $('meta[name="description"]').attr('content') || ''
    const bodyText = $('body').text().trim()

    // Try to get meaningful description
    const description = [metaDesc, bodyText.slice(0, 3000)].filter(Boolean).join('\n\n')

    // Try to find company name from common patterns
    const company =
      $('[class*="company"]').first().text().trim() ||
      $('[class*="employer"]').first().text().trim() ||
      domain.split('.')[0] || 'Unknown Company'

    return {
      success: true,
      source: 'manual',
      job: {
        title,
        company: company.charAt(0).toUpperCase() + company.slice(1),
        location: 'Remote',
        description: description || 'No description available.',
        requirements: extractRequirements(description + ' ' + bodyText),
        qualifications: [],
      },
    }
  } catch (err) {
    return {
      success: false,
      error: `Could not scrape this page. ${err instanceof Error ? err.message : ''}`,
      source: 'manual',
    }
  }
}

// ─── Helpers ────────────────────────────────────────────────

/**
 * Extract requirements/bullet points from a description text.
 * Looks for lists, "requirements", "qualifications" sections.
 */
function extractRequirements(text: string): string[] {
  if (!text) return []

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const bullets: string[] = []

  let inRequirements = false
  for (const line of lines) {
    const lower = line.toLowerCase()

    // Detect requirement sections
    if (
      lower.includes('requirement') ||
      lower.includes('qualification') ||
      lower.includes('what you need') ||
      lower.includes('what we look for') ||
      lower.includes('about you')
    ) {
      inRequirements = true
      continue
    }

    // Detect end of requirements
    if (inRequirements && (lower.includes('benefit') || lower.includes('about us') || lower.includes('apply'))) {
      break
    }

    // Collect bullet points
    if (inRequirements && (line.startsWith('-') || line.startsWith('•') || line.startsWith('*'))) {
      bullets.push(line.replace(/^[-•*\s]+/, '').trim())
    } else if (inRequirements && /^\d+[.)]/.test(line)) {
      bullets.push(line.replace(/^\d+[.)]\s*/, '').trim())
    } else if (inRequirements && line.length > 20 && !line.endsWith(':')) {
      bullets.push(line)
    }
  }

  return bullets.slice(0, 15)
}

/**
 * Create a manual job description from user-pasted text.
 */
export function createManualJob(
  title: string,
  company: string,
  description: string,
): JobDescription {
  return {
    title,
    company,
    location: 'Remote',
    description,
    requirements: extractRequirements(description),
    qualifications: [],
  }
}
