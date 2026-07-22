// ═══════════════════════════════════════════════════════════════
// UNIFIED JOB TYPES
// Every source adapter normalizes to this shape.
// ═══════════════════════════════════════════════════════════════

export type JobSource =
  | 'greenhouse'
  | 'ashby'
  | 'remoteok'
  | 'himalayas'
  | 'remotive'
  | 'themuse'
  | 'arbeitnow'
  | 'adzuna'
  | 'jsearch'
  | 'jobbkk'
  | 'linkedin-guest' // Free LinkedIn guest endpoint (list only, no descriptions)
  | 'linkedin'       // Paid Apify LinkedIn (full data)
  | 'indeed'
  | 'jobsdb'
  | 'jobsdb-rest'

export interface JobResult {
  id: string               // unique: `{source}:{nativeId}`
  source: JobSource
  company: string
  title: string
  location: string         // display string (free text from source)
  city?: string            // structured city name (e.g., "Bangkok") — for Numbeo, housing
  district?: string        // structured district/neighborhood (e.g., "Sathon") — for Maps, commute
  country?: string         // ISO 3166-1 alpha-2 code (e.g., "TH", "US")
  region?: string          // UN M49 region (e.g., "Asia", "Europe")
  locationType: 'remote' | 'hybrid' | 'onsite' | 'unknown'
  url: string              // real apply link on the ORIGINAL source
  description: string      // full JD text (HTML stripped for scoring, raw kept separately)
  descriptionHtml?: string // original HTML (for display)
  salary?: string          // salary string if disclosed (free text or formatted)
  salaryMin?: number       // structured: numeric minimum salary (in currency units)
  salaryMax?: number       // structured: numeric maximum salary (in currency units)
  salaryCurrency?: string  // structured: ISO currency code e.g. 'USD', 'THB', 'GBP'
  experienceYears?: string // e.g. "3-5 years", "2+ years" — from structured data or regex
  postedAt?: string        // ISO date
  companyLogo?: string
  department?: string
  tags?: string[]          // keyword tags
  visaSponsorship?: boolean // only from arbeitnow (partial coverage)
  experienceLevel?: 'entry' | 'mid' | 'senior'  // inferred from title
  employmentType?: string  // Full-time, Part-time, Contract, etc.
}

/**
 * Extract "N-M years" experience requirement from job description text.
 * Supports English and Thai language patterns.
 * Returns the FIRST match found (e.g. "3-5 years", "2+ years").
 * Returns undefined if no match — fail-open.
 *
 * Thai patterns use direct keyword matching instead of \b (word boundary),
 * because Thai script has no spaces between words and \b doesn't work.
 */
export function extractExperienceYears(text: string): string | undefined {
  // ── English range: "3-5 years", "3 to 5 years", "3–5 yrs" ──
  const enRange = text.match(
    /\b(\d+)\s*[-–to]+\s*(\d+)\s*(?:years?|yrs?)\b/i
  )
  if (enRange?.[1] && enRange?.[2]) return `${enRange[1]}-${enRange[2]} years`

  // ── English single: "2+ years", "5 years experience", "at least 3 years" ──
  const enSingle = text.match(
    /\b(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience)?\b/i
  )
  if (enSingle) return `${enSingle[1]}+ years`

  // ── Thai range with experience context: "ประสบการณ์ 3-5 ปี", "อายุงาน 2-4 ปี" ──
  const thRange = text.match(
    /(?:ประสบการณ์|อายุงาน|อายุการทำงาน)\s*[:：]?\s*(\d+)\s*[-–]\s*(\d+)\s*ปี/
  )
  if (thRange?.[1] && thRange?.[2]) return `${thRange[1]}-${thRange[2]} years`

  // ── Thai "X ปีขึ้นไป" (X years up): "3 ปีขึ้นไป" ──
  const thUp = text.match(/(\d+)\s*ปี\s*ขึ้นไป/)
  if (thUp?.[1]) return `${thUp[1]}+ years`

  // ── Thai "อย่างน้อย X ปี" (at least X years) ──
  const thAtLeast = text.match(/อย่างน้อย\s*(\d+)\s*ปี/)
  if (thAtLeast?.[1]) return `${thAtLeast[1]}+ years`

  // ── Thai "ไม่น้อยกว่า X ปี" (not less than X years) ──
  const thNotLess = text.match(/ไม่น้อยกว่า\s*(\d+)\s*ปี/)
  if (thNotLess?.[1]) return `${thNotLess[1]}+ years`

  // ── Thai context keyword + years: "ประสบการณ์ 3 ปี", "อายุงาน 5 ปี" ──
  const thContext = text.match(
    /(?:ประสบการณ์|อายุงาน|อายุการทำงาน)\s*[:：]?\s*(\d+)\s*ปี/
  )
  if (thContext?.[1]) return `${thContext[1]}+ years`

  return undefined
}

export interface ScoredJob extends JobResult {
  score: number            // 0-100, keyword overlap with user skills
  matchedSkills: string[]  // which of the user's skills appear in this JD
  isLocal?: boolean        // true if job is in user's country/city (used for local-first sorting)
}

export interface SearchParams {
  query: string
  location?: string
  countryCode?: string
  skills?: string[]
  role?: string
  sources?: JobSource[]    // defaults to all available
  limit?: number           // default 30
  fresh?: boolean          // bypass cache, fetch fresh
}

export interface SearchResult {
  jobs: ScoredJob[]
  total: number
  cached: boolean
  fetchedAt: string
  sources: { source: JobSource; count: number; error?: string }[]
  /** True if descriptions are included in the response, false if truncated for cache savings */
  descriptionsIncluded?: boolean
}
