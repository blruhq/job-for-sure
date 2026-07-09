import * as cheerio from 'cheerio'
import type { JobDescription } from '~/types/resume'

export interface ScrapeResult {
  success: boolean
  job?: JobDescription
  error?: string
  source: 'linkedin' | 'indeed' | 'greenhouse' | 'jobdb' | 'manual'
}

/**
 * Scrape a job posting from a URL.
 * Strategy: try provider-specific parser first, fall back to generic.
 */
export async function scrapeJob(url: string): Promise<ScrapeResult> {
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

async function fetchHTML(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return response.text()
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
    if (inRequirements && line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) {
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
