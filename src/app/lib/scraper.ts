import * as cheerio from 'cheerio'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
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
//
// Two-layer defense:
//   1. String-literal checks for known-bad hostnames
//   2. DNS resolution + IP range validation (blocks rebinding)
//
// Without layer 2, an attacker can register a domain that resolves
// to 169.254.169.254 and bypass the string check. By resolving the
// hostname and validating the actual IP, we close that hole.

const BLOCKED_HOSTS = new Set([
  'localhost',
  '0.0.0.0',
  '169.254.169.254', // AWS/GCP/Azure metadata
  'metadata.google.internal',
])

/**
 * Check if an IPv4 address is in a private / reserved range.
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(p => p < 0 || p > 255)) return true // malformed → block
  const [a, b] = parts
  return (
    a === 10 ||                         // private 10.0.0.0/8
    (a === 172 && b >= 16 && b <= 31) || // private 172.16.0.0/12
    (a === 192 && b === 168) ||          // private 192.168.0.0/16
    a === 127 ||                         // loopback 127.0.0.0/8
    a === 0 ||                           // 0.0.0.0/8
    (a === 169 && b === 254) ||          // link-local 169.254.0.0/16
    a >= 224                             // multicast/reserved 224.0.0.0/4
  )
}

/**
 * Check if an IPv6 address is loopback, link-local, or unique-local.
 */
function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase()
  return (
    lower === '::1' ||              // loopback
    lower.startsWith('fe80:') ||    // link-local
    lower.startsWith('fc') ||       // unique-local fc00::/7
    lower.startsWith('fd') ||       // unique-local fc00::/7
    lower.startsWith('::ffff:')     // IPv4-mapped (check the embedded IPv4)
      && isPrivateIPv4(lower.slice('::ffff:'.length))
  )
}

/**
 * Check if any resolved IP address is in a private/reserved range.
 */
function isBlockedIP(ip: string): boolean {
  const version = isIP(ip)
  if (version === 4) return isPrivateIPv4(ip)
  if (version === 6) return isPrivateIPv6(ip)
  return true // unknown format → block
}

/**
 * Validate that a URL is safe to fetch server-side.
 * Performs both string-literal checks AND DNS resolution to prevent
 * DNS rebinding attacks.
 *
 * @throws Error if the URL is invalid, uses a blocked protocol/host,
 *   or resolves to a private/reserved IP address.
 */
async function validateUrl(url: string): Promise<void> {
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

  // Layer 1: Block known metadata/loopback hostnames
  if (BLOCKED_HOSTS.has(hostname)) {
    throw new Error('Blocked host')
  }

  // Layer 1b: If hostname is already an IP literal, validate directly
  const ipVersion = isIP(hostname)
  if (ipVersion > 0) {
    if (isBlockedIP(hostname)) {
      throw new Error('Blocked private/reserved IP')
    }
    return // Valid public IP literal
  }

  // Layer 2: DNS resolution — prevent rebinding attacks
  // Resolve the hostname and check ALL returned addresses.
  let records: { address: string }[]
  try {
    records = await lookup(hostname, { all: true })
  } catch {
    throw new Error(`DNS resolution failed for ${hostname}`)
  }

  if (records.length === 0) {
    throw new Error(`No DNS records for ${hostname}`)
  }

  // EVERY resolved IP must be public. If ANY resolves to private → block.
  for (const record of records) {
    if (isBlockedIP(record.address)) {
      throw new Error(`Blocked: ${hostname} resolves to private IP ${record.address}`)
    }
  }
}

/**
 * Scrape a job posting from a URL.
 * Strategy: try provider-specific parser first, fall back to generic.
 */
export async function scrapeJob(url: string): Promise<ScrapeResult> {
  // SSRF: validate URL (including DNS resolution) before any network call
  try {
    await validateUrl(url)
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
    if (domain.includes('jobsdb')) return scrapeJobDb(url)
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
const MAX_REDIRECTS = 3

async function fetchHTML(url: string, customHeaders?: Record<string, string>): Promise<string> {
  let currentUrl = url
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    await validateUrl(currentUrl)

    const response = await fetch(currentUrl, {
      headers: {
        'User-Agent': 'JobForSure-Bot/1.0 (+https://jobforsure.app)',
        Accept: 'text/html,application/xhtml+xml',
        ...customHeaders,
      },
      signal: AbortSignal.timeout(10_000),
      redirect: 'manual',
    })

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) throw new Error('Redirect with no Location header')
      currentUrl = new URL(location, currentUrl).href
      continue
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

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

  throw new Error(`Too many redirects (max ${MAX_REDIRECTS})`)
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
  // JobsDB (SEEK family) uses Cloudflare WAF — send browser-like headers
  const browserHeaders: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,th;q=0.8',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
  }

  try {
    const html = await fetchHTML(url, browserHeaders)
    const $ = cheerio.load(html)

    // SEEK/JobsDB uses data-automation attributes
    const title =
      $('[data-automation="job-detail-title"]').text().trim() ||
      $('h1[data-automation*="title"]').text().trim() ||
      $('h1').first().text().trim()

    const company =
      $('[data-automation="advertiser-name"]').text().trim() ||
      $('[data-automation="job-detail-company"]').text().trim() ||
      $('[class*="company"]').first().text().trim() ||
      $('[class*="employer"]').first().text().trim()

    const location =
      $('[data-automation="job-detail-location"]').text().trim() ||
      $('[class*="location"]').first().text().trim()

    const description =
      $('[data-automation="job-detail-description"]').text().trim() ||
      $('#job-description').text().trim() ||
      $('[class*="description"]').text().trim() ||
      $('[class*="job-body"]').text().trim()

    if (!title && !description) {
      // Page probably didn't render (Cloudflare challenge) — fall through to error
      throw new Error(
        'JobsDB blocked the request. Try pasting the job description manually.'
      )
    }

    return {
      success: true,
      source: 'jobdb',
      job: {
        title: title || 'Unknown Position',
        company: company || 'Unknown Company',
        location: location || 'Remote',
        description: description || 'No description available.',
        requirements: extractRequirements(description),
        qualifications: [],
      },
    }
  } catch (err) {
    return {
      success: false,
      source: 'jobdb',
      error:
        err instanceof Error
          ? err.message
          : 'JobsDB is not accessible via automated scraping. Please paste the job description manually.',
    }
  }
}

const LINKEDIN_BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
}

/**
 * Extract numeric job ID from a LinkedIn job URL.
 * Handles www.linkedin.com, country-prefixed (th.linkedin.com), etc.
 */
function extractLinkedInJobId(url: string): string | null {
  const match = url.match(/jobs\/view\/(\d+)/)
  return match ? match[1] : null
}

/**
 * Try LinkedIn's guest job API — returns HTML without authentication.
 * Endpoint: /jobs-guest/jobs/api/jobPosting/{id}
 */
async function scrapeLinkedInGuestApi(
  jobId: string,
  originalUrl: string,
): Promise<ScrapeResult | null> {
  const apiUrl = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`

  const html = await fetchHTML(apiUrl, LINKEDIN_BROWSER_HEADERS)
  if (!html || html.length < 100) return null

  const $ = cheerio.load(html)

  const title =
    $('.top-card-layout__title').text().trim() ||
    $('.topcard__title').text().trim() ||
    $('h1').first().text().trim()

  const company =
    $('.top-card-layout__company-name').text().trim() ||
    $('.topcard__org-name-link').text().trim() ||
    $('.topcard__flavor--company-name').text().trim()

  const location =
    $('.top-card-layout__location').text().trim() ||
    $('.topcard__flavor--bullet').first().text().trim()

  // Description lives inside show-more-less-html or .description__text
  const description =
    $('.show-more-less-html__markup').text().trim() ||
    $('.description__text').text().trim()

  if (!title && !description) {
    return null // guest API returned junk
  }

  // Also try to extract criteria (seniority, function, etc.)
  const criteria: string[] = []
  $('.description__job-criteria-item').each((_, el) => {
    const text = $(el).text().trim()
    if (text) criteria.push(text)
  })

  const fullDescription = [description, ...criteria].filter(Boolean).join('\n\n')

  return {
    success: true,
    source: 'linkedin',
    job: {
      title: title || 'Unknown Position',
      company: company || extractDomain(originalUrl).split('.')[0] || 'LinkedIn',
      location: location || 'Remote',
      description: fullDescription || 'No description available.',
      requirements: extractRequirements(fullDescription),
      qualifications: [],
    },
  }
}

/**
 * Fallback: try to find an external apply URL from the LinkedIn page shell.
 * LinkedIn's HTML shell often includes the external ATS link in meta tags
 * or data attributes, even when the main content is JS-rendered.
 *
 * Once found, we delegate to scrapeJob() for that URL.
 */
async function scrapeLinkedInExternalFallback(
  url: string,
): Promise<ScrapeResult | null> {
  // Fetch the main LinkedIn page (may still be blocked, but worth trying)
  const html = await fetchHTML(url, LINKEDIN_BROWSER_HEADERS)
  if (!html || html.length < 100) return null

  const $ = cheerio.load(html)

  // Look for the external apply URL in common locations
  const externalUrl =
    $('meta[name="apply-url"]').attr('content') ||
    $('meta[property="linkedin:applyUrl"]').attr('content') ||
    $('[data-external-activate]').attr('href') ||
    $('a[data-tracking-control-name*="external"]').attr('href') ||
    $('a[href*="jobs.lever.co"]').first().attr('href') ||
    $('a[href*="greenhouse.io"]').first().attr('href') ||
    $('a[href*="ashbyhq.com"]').first().attr('href') ||
    $('a[href*":"apply"]').first().attr('href')

  // Find any external job board URL in the page
  const externalRegex = /https?:\/\/(?:jobs\.lever\.co|boards\.greenhouse\.io|jobs\.ashbyhq\.com|jobs\.workable\.com|apply\.workable\.com)\/[^\s"']+/g
  const matchFromText = html.match(externalRegex)
  const resolvedExternal = externalUrl || (matchFromText ? matchFromText[0] : null)

  if (!resolvedExternal || resolvedExternal.includes('linkedin.com')) {
    return null // no external URL found, or it points back to LinkedIn
  }

  // Delegate to scrapeJob for the external URL
  // (this re-enters the dispatch — greenhouse/lever/generic will handle it)
  return scrapeJob(resolvedExternal)
}

async function scrapeLinkedIn(url: string): Promise<ScrapeResult> {
  const jobId = extractLinkedInJobId(url)

  // --- Strategy 1: Guest API (no auth, works for most postings) ---
  if (jobId) {
    try {
      const guestResult = await scrapeLinkedInGuestApi(jobId, url)
      if (guestResult) return guestResult
    } catch {
      // fall through
    }
  }

  // --- Strategy 2: Find external ATS URL (Lever, Greenhouse, Ashby) ---
  try {
    const externalResult = await scrapeLinkedInExternalFallback(url)
    if (externalResult) return externalResult
  } catch {
    // fall through
  }

  // --- Strategy 3: Give up with helpful message ---
  return {
    success: false,
    source: 'linkedin',
    error:
      "LinkedIn requires authentication for scraping. We tried the guest API and looked for an external apply link but couldn't get the job content. " +
      "Please paste the job description manually, or if this is a Lever/Greenhouse posting, use that URL directly.",
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


