// ═══════════════════════════════════════════════════════════════
// JOBBKK ADAPTER (Thailand job board — FREE)
// Server-rendered HTML (PHP site, no Cloudflare), cheerio-scraped.
// URL format:
//   https://www.jobbkk.com/jobs/lists/1/หางาน,{query},ทุกจังหวัด,ทั้งหมด.html
//
// No API key needed. Returns ~15 results per page.
// ═══════════════════════════════════════════════════════════════

import * as cheerio from 'cheerio'
import type { JobResult } from './types'

const BASE_URL = 'https://www.jobbkk.com'

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/**
 * Parse relative date strings from JobbKK (in Thai).
 * Examples: "1 วันที่แล้ว", "3 วันที่แล้ว", "30+ วันที่แล้ว"
 */
function parsePostedDate(text: string): string | undefined {
  const match = text.match(/(\d+)\s*วัน/)
  if (!match) return undefined
  const days = parseInt(match[1], 10)
  if (isNaN(days)) return undefined
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

/**
 * Build the search URL for JobbKK.
 * The URL path is Thai-encoded: หางาน,{query},ทุกจังหวัด,ทั้งหมด.html
 */
function buildSearchUrl(query: string, _location?: string): string {
  // URL-encode the query for the Thai path format
  const encodedQuery = encodeURIComponent(query)
  return `${BASE_URL}/jobs/lists/1/%E0%B8%AB%E0%B8%B2%E0%B8%87%E0%B8%B2%E0%B8%99,${encodedQuery},%E0%B8%97%E0%B8%B8%E0%B8%81%E0%B8%88%E0%B8%B1%E0%B8%87%E0%B8%AB%E0%B8%A7%E0%B8%B1%E0%B8%94,%E0%B8%97%E0%B8%B1%E0%B9%89%E0%B8%87%E0%B8%AB%E0%B8%A1%E0%B8%94.html`
}

export async function fetchJobbKK(
  query: string,
  _location?: string,
  opts?: { signal?: AbortSignal },
): Promise<{ jobs: JobResult[]; error?: string }> {
  try {
    const url = buildSearchUrl(query, _location)

    const res = await fetch(url, {
      signal: opts?.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
      },
    })

    if (!res.ok) {
      throw new Error(`JobbKK: HTTP ${res.status}`)
    }

    const html = await res.text()
    const $ = cheerio.load(html)

    const jobs: JobResult[] = []

    // Each job card is a div.joblist-detail-section
    $('div.joblist-detail-section').each((_i, el) => {
      const card = $(el)

      // ── Title & URL ──
      const titleLink = card.find('.joblist-name-urgent a').first()
      const title = titleLink.text().trim()
      const relativeUrl = titleLink.attr('href')
      if (!title || !relativeUrl) return // skip invalid cards

      const url = relativeUrl.startsWith('http')
        ? relativeUrl
        : `${BASE_URL}${relativeUrl}`

      // ── Company ──
      const company = card.find('.joblist-company-name a').first().text().trim()

      // ── Location ──
      const location = card.find('.position-location span').last().text().trim()

      // ── Salary ──
      const salary = card.find('.position-salary span').last().text().trim()

      // ── Posted date ──
      const postedText = card.find('.joblist-updatetime-md-upper').text().trim()
      const postedAt = parsePostedDate(postedText)

      // Build a description from the available data
      const description = [
        `ตำแหน่ง: ${title}`,
        `บริษัท: ${company}`,
        `สถานที่: ${location}`,
        salary ? `เงินเดือน: ${salary}` : '',
      ]
        .filter(Boolean)
        .join('\n')

      // Generate a stable ID from the URL
      const idMatch = relativeUrl.match(/\/detail(?:urgent)?\/(\d+)\/(\d+)/)
      const id = idMatch
        ? `jobbkk:${idMatch[1]}-${idMatch[2]}`
        : `jobbkk:${Math.random().toString(36).slice(2, 8)}`

      jobs.push({
        id,
        source: 'jobbkk' as const,
        company: company || 'Unknown Company',
        title,
        location: location || 'Thailand',
        locationType: 'onsite', // JobbKK is primarily Thai onsite roles
        url,
        description: description.slice(0, 8000),
        salary: salary && salary !== 'ตามตกลง' ? salary : undefined,
        postedAt,
        experienceLevel: inferExperienceLevel(title),
      })
    })

    return { jobs }
  } catch (err) {
    return {
      jobs: [],
      error: err instanceof Error ? err.message : 'JobbKK fetch failed',
    }
  }
}

function inferExperienceLevel(title: string): JobResult['experienceLevel'] {
  const t = title.toLowerCase()
  if (/\b(fresh|junior|entry|intern|ฝึกงาน|เด็ก|ใหม่|เริ่มต้น)\b/.test(t)) return 'entry'
  if (/\b(senior|principal|lead|staff|manager|หัวหน้า|อาวุโส)\b/.test(t)) return 'senior'
  return 'mid'
}
