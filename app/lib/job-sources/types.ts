// ═══════════════════════════════════════════════════════════════
// UNIFIED JOB TYPES
// Every source adapter normalizes to this shape.
// ═══════════════════════════════════════════════════════════════

export type JobSource = 'greenhouse' | 'ashby' | 'remoteok' | 'adzuna'

export interface JobResult {
  id: string               // unique: `{source}:{nativeId}`
  source: JobSource
  company: string
  title: string
  location: string
  locationType: 'remote' | 'hybrid' | 'onsite' | 'unknown'
  url: string              // real apply link on the ORIGINAL source
  description: string      // full JD text (HTML stripped for scoring, raw kept separately)
  descriptionHtml?: string // original HTML (for display)
  salary?: string          // salary string if disclosed
  postedAt?: string        // ISO date
  companyLogo?: string
  department?: string
  tags?: string[]          // keyword tags (RemoteOK provides these)
}

export interface ScoredJob extends JobResult {
  score: number            // 0-100, keyword overlap with user skills
  matchedSkills: string[]  // which of the user's skills appear in this JD
}

export interface SearchParams {
  query: string
  location?: string
  skills?: string[]
  role?: string
  sources?: JobSource[]    // defaults to all available
  limit?: number           // default 30
}

export interface SearchResult {
  jobs: ScoredJob[]
  total: number
  cached: boolean
  fetchedAt: string
  sources: { source: JobSource; count: number; error?: string }[]
}
