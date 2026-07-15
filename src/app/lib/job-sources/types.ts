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
  country?: string         // ISO 3166-1 alpha-2 code (e.g., "TH", "US")
  region?: string          // UN M49 region (e.g., "Asia", "Europe")
  locationType: 'remote' | 'hybrid' | 'onsite' | 'unknown'
  url: string              // real apply link on the ORIGINAL source
  description: string      // full JD text (HTML stripped for scoring, raw kept separately)
  descriptionHtml?: string // original HTML (for display)
  salary?: string          // salary string if disclosed
  postedAt?: string        // ISO date
  companyLogo?: string
  department?: string
  tags?: string[]          // keyword tags
  visaSponsorship?: boolean // only from arbeitnow (partial coverage)
  experienceLevel?: 'entry' | 'mid' | 'senior'  // inferred from title
  employmentType?: string  // Full-time, Part-time, Contract, etc.
}

export interface ScoredJob extends JobResult {
  score: number            // 0-100, keyword overlap with user skills
  matchedSkills: string[]  // which of the user's skills appear in this JD
  isLocal?: boolean        // true if job is in user's country/city (used for local-first sorting)
}

export interface SearchParams {
  query: string
  location?: string
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
