'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Bookmark, ExternalLink, MapPin, Loader2, AlertCircle,
  RefreshCw, Filter, X, Globe, Clock, Star, Plane, MessageSquare,
  ChevronDown, Briefcase, Brain, FileText,
} from 'lucide-react'
import { cn } from '~/lib/utils'
import { useAppStore } from '~/lib/store'
import { notify } from '~/lib/toast'
import { companyColor, companyLogo } from '~/lib/company-data'
import type { Resume } from '~/types/resume'
import type { ScoredJob, SearchResult, JobSource, JobResult } from '~/lib/job-sources/types'

// ═══════════════════════════════════════════════════════════════
// JobSearchPanel — real job search from 9+ free sources.
// Replaces the hallucinated match-companies.
// ═══════════════════════════════════════════════════════════════

const SOURCE_NAMES: Record<JobSource, string> = {
  greenhouse: 'Greenhouse',
  ashby: 'Ashby',
  remoteok: 'RemoteOK',
  himalayas: 'Himalayas',
  remotive: 'Remotive',
  themuse: 'The Muse',
  arbeitnow: 'Arbeitnow',
  adzuna: 'Adzuna',
  jsearch: 'JSearch',
  jobbkk: 'JobbKK',
  linkedin: 'LinkedIn (Apify)',
  indeed: 'Indeed (Apify)',
  jobsdb: 'JobsDB (Apify)',
}

// Source tiers used by the search flow (see plan)
const FAST_FREE_SOURCES: JobSource[] = [
  'remoteok', 'himalayas', 'remotive',
  'themuse', 'arbeitnow', 'adzuna', 'jsearch', 'jobbkk',
]
const FULL_FREE_SOURCES: JobSource[] = [
  'greenhouse', 'ashby',
]
const PAID_SOURCES: JobSource[] = ['linkedin', 'indeed', 'jobsdb']

// ── Filter state ──
interface Filters {
  remoteOnly: boolean
  postedDays: number    // 0 = all, 1, 7, 30
  minScore: number      // 0, 50, 75
  workPolicy: Set<string>  // 'remote', 'hybrid', 'onsite'
  experience: Set<string>  // 'entry', 'mid', 'senior'
  visaOnly: boolean
  skillSearch: string
  sourceFilter: Set<JobSource>
}

const DEFAULT_FILTERS: Filters = {
  remoteOnly: false,
  postedDays: 0,
  minScore: 0,
  workPolicy: new Set(),
  experience: new Set(),
  visaOnly: false,
  skillSearch: '',
  sourceFilter: new Set(),
}

export function JobSearchPanel({ resume }: { resume: Resume }) {
  const router = useRouter()
  const { isBookmarked, bookmarkJob, toggleBookmark, addResume, setActiveResumeId } = useAppStore()

  // ── Search query defaults to the AI-detected role ──
  const fallbackQuery = resume.skills && resume.skills.length > 0 
    ? resume.skills.slice(0, 3).join(' ') 
    : ''
  const [query, setQuery] = useState(resume.role || fallbackQuery)
  const [location, setLocation] = useState(resume.location || '')
  const [results, setResults] = useState<ScoredJob[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [sourceCount, setSourceCount] = useState(0)
  const [cached, setCached] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS })

  // ── Infinite scroll & paid sources ──
  const [displayLimit, setDisplayLimit] = useState(25)
  const [paidLoaded, setPaidLoaded] = useState(false)
  const [paidLoading, setPaidLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const searchRunRef = useRef(0) // track latest search to avoid stale merges
  const resultsRef = useRef<ScoredJob[]>([]) // mirror for closures

  // Keep resultsRef in sync with state (for use in callbacks without stale closures)
  useEffect(() => { resultsRef.current = results }, [results])

  // ── Merge helper: combines two search results, dedup by id ──
  const mergeResults = useCallback((existing: ScoredJob[], incoming: ScoredJob[]): ScoredJob[] => {
    const seen = new Set(existing.map(j => j.id))
    const added = incoming.filter(j => !seen.has(j.id))
    if (added.length === 0) return existing
    return [...existing, ...added].sort((a, b) => b.score - a.score)
  }, [])

  // ── SessionStorage cache for search results ──
  // Survives page navigation within the same tab. Dies on tab close (correct —
  // job results go stale quickly). Full descriptions are always stored here
  // since they come from fresh API responses, not the Redis cache.
  const SESSION_TTL_MS = 30 * 60 * 1000 // 30 minutes

  function getSessionKey(q: string, loc: string): string {
    return `jfs_search_${resume.id}_${q.toLowerCase().trim()}_${loc.toLowerCase().trim()}`
  }

  function saveSearchToSession(q: string, loc: string, data: { jobs: ScoredJob[]; total: number; descriptionsIncluded?: boolean }) {
    try {
      sessionStorage.setItem(getSessionKey(q, loc), JSON.stringify({
        jobs: data.jobs,
        total: data.total,
        descriptionsIncluded: data.descriptionsIncluded ?? true,
        timestamp: Date.now(),
      }))
    } catch {
      // sessionStorage full or unavailable — silently skip
    }
  }

  function loadSearchFromSession(q: string, loc: string): { jobs: ScoredJob[]; total: number; descriptionsIncluded: boolean } | null {
    try {
      const raw = sessionStorage.getItem(getSessionKey(q, loc))
      if (!raw) return null
      const data = JSON.parse(raw)
      if (Date.now() - data.timestamp > SESSION_TTL_MS) {
        sessionStorage.removeItem(getSessionKey(q, loc))
        return null
      }
      return {
        jobs: data.jobs as ScoredJob[],
        total: data.total as number,
        descriptionsIncluded: data.descriptionsIncluded ?? true,
      }
    } catch {
      return null
    }
  }

  const handleSearch = useCallback(async (q?: string, loc?: string, fresh?: boolean) => {
    const searchQuery = (q ?? query).trim()
    if (searchQuery.length < 2) return

    const runId = ++searchRunRef.current
    setLoading(true)
    setSearched(true)
    setResults([])
    setPaidLoaded(false)
    setPaidLoading(false)
    setDisplayLimit(25)
    setSourceCount(0)

    try {
      // ── Phase 1: Fast free sources (1-3s) ──
      const fastRes = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          location: (loc ?? location).trim() || undefined,
          skills: resume.skills,
          role: resume.role,
          sources: FAST_FREE_SOURCES,
          limit: 100,
          fresh,
        }),
      })

      if (runId !== searchRunRef.current) return // stale, another search started
      if (!fastRes.ok) throw new Error('Fast search failed')
      const fastData: SearchResult = await fastRes.json()
      setResults(fastData.jobs)
      setSourceCount(fastData.sources.length)
      setCached(fastData.cached)
      // Cache in sessionStorage for instant back-nav within same tab session.
      // This stores full descriptions (unlike Redis cache which strips them).
      saveSearchToSession(searchQuery, loc ?? location ?? '', {
        jobs: fastData.jobs,
        total: fastData.total,
        descriptionsIncluded: fastData.descriptionsIncluded,
      })
      setLoading(false) // release loading — user sees 25 jobs now

      // ── Phase 2: Slow free sources (3-10s, background) ──
      try {
        const fullRes = await fetch('/api/jobs/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: searchQuery,
            location: (loc ?? location).trim() || undefined,
            skills: resume.skills,
            role: resume.role,
            sources: FULL_FREE_SOURCES,
            limit: 100,
            fresh,
          }),
        })
        if (runId !== searchRunRef.current) return
        if (fullRes.ok) {
          const fullData: SearchResult = await fullRes.json()
          setResults(prev => mergeResults(prev, fullData.jobs))
        }
      } catch {
        // Silent fail — fast results are already showing
      }
    } catch (err) {
      if (runId === searchRunRef.current) {
        console.error('[job-search] Error:', err)
        notify({ message: 'Job search failed. Try again.', type: 'error' })
        setLoading(false)
      }
    }
  }, [query, location, resume.skills, resume.role, mergeResults])

  // Auto-search on mount — check sessionStorage first for instant back-nav
  useEffect(() => {
    if (resume.skills.length === 0 || searched) return

    const q = query
    const loc = location ?? ''
    const cached = loadSearchFromSession(q, loc)
    if (cached && cached.jobs.length > 0) {
      setResults(cached.jobs)
      setSearched(true)
      setLoading(false)
      setCached(true)
      return
    }

    handleSearch()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Client-side filtering on loaded results ──
  const filtered = useMemo(() => {
    return results.filter((job) => {
      // Quick chips
      if (filters.remoteOnly && job.locationType !== 'remote') return false
      if (filters.postedDays > 0 && job.postedAt) {
        const age = Date.now() - new Date(job.postedAt).getTime()
        if (age > filters.postedDays * 24 * 60 * 60 * 1000) return false
      }
      if (job.score < filters.minScore) return false

      // Expanded filters
      if (filters.workPolicy.size > 0 && !filters.workPolicy.has(job.locationType)) return false
      if (filters.experience.size > 0 && job.experienceLevel && !filters.experience.has(job.experienceLevel)) return false
      if (filters.visaOnly && !job.visaSponsorship) return false
      if (filters.skillSearch) {
        const hay = `${job.title} ${job.description.slice(0, 2000)} ${(job.tags || []).join(' ')}`.toLowerCase()
        if (!hay.includes(filters.skillSearch.toLowerCase())) return false
      }
      if (filters.sourceFilter.size > 0 && !filters.sourceFilter.has(job.source)) return false

      return true
    })
  }, [results, filters])

  // Only show displayLimit items — rest revealed on scroll
  const displayedJobs = useMemo(() => {
    return filtered.slice(0, displayLimit)
  }, [filtered, displayLimit])

  const hasMore = filtered.length > displayedJobs.length

  // ── Infinite scroll: observe sentinel at bottom of job list ──
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    let loadingMore = false
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          loadingMore = true
          setDisplayLimit(prev => prev + 25)
          setTimeout(() => { loadingMore = false }, 500)
        }
      },
      { threshold: 0, rootMargin: '400px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [filtered.length])

  const activeFilterCount =
    (filters.remoteOnly ? 1 : 0) +
    (filters.postedDays > 0 ? 1 : 0) +
    (filters.minScore > 0 ? 1 : 0) +
    (filters.workPolicy.size > 0 ? 1 : 0) +
    (filters.experience.size > 0 ? 1 : 0) +
    (filters.visaOnly ? 1 : 0) +
    (filters.skillSearch ? 1 : 0) +
    (filters.sourceFilter.size > 0 ? 1 : 0)

  const toggleSet = (set: Set<string>, value: string): Set<string> => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    return next
  }

  const toggleSourceSet = (set: Set<JobSource>, value: JobSource): Set<JobSource> => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    return next
  }

  const clearFilters = () => {
    setFilters({ ...DEFAULT_FILTERS, workPolicy: new Set(), experience: new Set(), sourceFilter: new Set() })
  }

  // ── Actions ──
  const handleBookmark = (job: ScoredJob) => {
    const key = job.id
    if (isBookmarked(key)) {
      toggleBookmark(key)
    } else {
      bookmarkJob({
        key,
        logo: companyLogo(job.company),
        color: companyColor(job.company),
        company: job.company,
        title: job.title,
        loc: job.location,
        score: job.score,
        level: job.score >= 75 ? 'high' : 'mid',
        time: 'just now',
        url: job.url,
        resume: resume.id,
        addedAt: new Date().toISOString(),
      })
      notify({ message: `Bookmarked: ${job.title} at ${job.company}`, type: 'success' })
    }
  }

  const handleAts = (job: ScoredJob) => {
    if (!job.description || job.description.length < 50) {
      // Descriptions were stripped from Redis cache — need a fresh search
      notify({
        message: 'Full job description not cached. Click "Fresh" to reload results, then try ATS Match.',
        type: 'info',
      })
      return
    }
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('jfs_pending_ats_jd', job.description)
      sessionStorage.setItem('jfs_pending_ats_company', job.company)
      sessionStorage.setItem('jfs_pending_ats_role', job.title)
    }
    router.push('/ats')
  }

  const handleInterview = (job: ScoredJob) => {
    router.push(`/interview?company=${encodeURIComponent(job.company)}&role=${encodeURIComponent(job.title)}`)
  }

  const handleRefresh = () => {
    handleSearch(undefined, undefined, true)
    notify({ message: 'Fetching fresh results (bypassing cache)…', type: 'info' })
  }

  // ── Load paid sources (LinkedIn/Indeed via Apify) — user-initiated ──
  const handleLoadPaid = useCallback(async () => {
    if (paidLoading || paidLoaded) return
    setPaidLoading(true)
    try {
      const res = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          location: location.trim() || undefined,
          skills: resume.skills,
          role: resume.role,
          sources: PAID_SOURCES,
          includePaid: true,
          limit: 50,
        }),
      })
      if (!res.ok) throw new Error('Paid search failed')
      const data: SearchResult = await res.json()
      const merged = mergeResults(resultsRef.current, data.jobs)
      setResults(merged)
      // Update sessionStorage to include paid source results
      saveSearchToSession(query, location ?? '', {
        jobs: merged,
        total: data.total,
        descriptionsIncluded: data.descriptionsIncluded,
      })
      setPaidLoaded(true)
      notify({ message: `Added ${data.jobs.length} jobs from LinkedIn, Indeed & JobsDB`, type: 'success' })
    } catch (err) {
      console.error('[job-search-paid] Error:', err)
      notify({ message: 'LinkedIn/Indeed/JobsDB search failed. They may be rate-limited.', type: 'error' })
    } finally {
      setPaidLoading(false)
    }
  }, [query, location, resume.skills, resume.role, paidLoading, paidLoaded, mergeResults])

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="flex w-full flex-col">
      {/* Search bar */}
      <div className="shrink-0 border-b border-border bg-card px-4 md:px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Job title or keywords…"
              className="w-full rounded-sm border border-border bg-background py-1.5 pl-8 pr-3 text-[12px] outline-none focus:border-primary"
            />
          </div>
          <div className="relative w-[150px]">
            <MapPin size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Location…"
              className="w-full rounded-sm border border-border bg-background py-1.5 pl-8 pr-3 text-[12px] outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={loading || query.trim().length < 2}
            className="flex cursor-pointer items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
            {loading ? 'Searching…' : 'Search'}
          </button>
          {searched && !loading && (
            <button
              onClick={handleRefresh}
              className="flex cursor-pointer items-center gap-1 rounded-sm border border-border bg-card px-2 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
              title="Clear cache & fetch fresh"
            >
              <RefreshCw size={11} /> Fresh
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex cursor-pointer items-center gap-1 rounded-sm border px-2 py-1.5 text-[11px] transition-all',
              showFilters || activeFilterCount > 0
                ? 'border-primary bg-accent-soft text-primary'
                : 'border-border bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            <Filter size={11} /> Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Quick chips */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <Chip
            active={filters.remoteOnly}
            onClick={() => setFilters((f) => ({ ...f, remoteOnly: !f.remoteOnly }))}
            icon={<Globe size={11} />}
            label="Remote Only"
          />
          <Chip
            active={filters.postedDays === 7}
            onClick={() => setFilters((f) => ({ ...f, postedDays: f.postedDays === 7 ? 0 : 7 }))}
            icon={<Clock size={11} />}
            label="This Week"
          />
          <Chip
            active={filters.minScore === 75}
            onClick={() => setFilters((f) => ({ ...f, minScore: f.minScore === 75 ? 0 : 75 }))}
            icon={<Star size={11} />}
            label="75%+ Match"
          />
          <Chip
            active={filters.visaOnly}
            onClick={() => setFilters((f) => ({ ...f, visaOnly: !f.visaOnly }))}
            icon={<Plane size={11} />}
            label="Visa Sponsor"
          />

        </div>

        {/* Expanded filter panel */}
        {showFilters && (
          <div className="mt-3 grid grid-cols-2 gap-4 rounded-sm border border-border bg-background p-3 md:grid-cols-3 lg:grid-cols-4">
            {/* Work Policy */}
            <FilterGroup label="Work Policy">
              {['remote', 'hybrid', 'onsite'].map((p) => (
                <FilterCheckbox
                  key={p}
                  checked={filters.workPolicy.has(p)}
                  onChange={() => setFilters((f) => ({ ...f, workPolicy: toggleSet(f.workPolicy, p) }))}
                  label={p.charAt(0).toUpperCase() + p.slice(1)}
                />
              ))}
            </FilterGroup>

            {/* Date Posted */}
            <FilterGroup label="Date Posted">
              {[
                { v: 1, l: '24 hours' },
                { v: 7, l: '7 days' },
                { v: 30, l: '30 days' },
              ].map((d) => (
                <FilterRadio
                  key={d.v}
                  checked={filters.postedDays === d.v}
                  onChange={() => setFilters((f) => ({ ...f, postedDays: f.postedDays === d.v ? 0 : d.v }))}
                  label={d.l}
                />
              ))}
            </FilterGroup>

            {/* Experience */}
            <FilterGroup label="Experience">
              {['entry', 'mid', 'senior'].map((e) => (
                <FilterCheckbox
                  key={e}
                  checked={filters.experience.has(e)}
                  onChange={() => setFilters((f) => ({ ...f, experience: toggleSet(f.experience, e) }))}
                  label={e.charAt(0).toUpperCase() + e.slice(1)}
                />
              ))}
            </FilterGroup>

            {/* Source */}
            <FilterGroup label="Source">
              {(Object.keys(SOURCE_NAMES) as JobSource[]).map((s) => (
                <FilterCheckbox
                  key={s}
                  checked={filters.sourceFilter.has(s)}
                  onChange={() => setFilters((f) => ({ ...f, sourceFilter: toggleSourceSet(f.sourceFilter, s) }))}
                  label={SOURCE_NAMES[s]}
                />
              ))}
            </FilterGroup>

            {/* Skills search */}
            <FilterGroup label="Skill Search" fullWidth>
              <input
                type="text"
                value={filters.skillSearch}
                onChange={(e) => setFilters((f) => ({ ...f, skillSearch: e.target.value }))}
                placeholder="Type a skill to filter…"
                className="w-full rounded-sm border border-border bg-card px-2 py-1 text-[11px] outline-none focus:border-primary"
              />
            </FilterGroup>

            {/* Clear */}
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="col-span-full flex cursor-pointer items-center gap-1 text-[10px] text-destructive hover:underline"
              >
                <X size={10} /> Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 size={20} className="animate-spin text-primary" />
            <div className="font-mono text-[11px] text-muted-foreground">
              Fetching jobs from multiple sources…
            </div>
          </div>
        )}

        {!loading && !searched && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
            <Search size={24} className="text-muted-foreground/40" />
            <div className="text-sm text-muted-foreground">
              Search for real jobs matching your skills.
            </div>
          </div>
        )}

        {!loading && searched && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
            <AlertCircle size={20} className="text-muted-foreground/40" />
            <div className="text-sm text-muted-foreground">
              {results.length === 0
                ? 'No jobs found. Try different keywords.'
                : `No jobs match your filters. ${activeFilterCount > 0 ? 'Try clearing filters.' : ''}`}
            </div>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <>
            <div className="mb-3 text-[11px] text-muted-foreground">
              {filtered.length} real job{filtered.length !== 1 ? 's' : ''}
              {displayedJobs.length < filtered.length && ` · showing ${displayedJobs.length}`}
              {' · '}scored against your {resume.skills.length} skills
            </div>

            <div className="flex flex-col gap-3">
              {displayedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  bookmarked={isBookmarked(job.id)}
                  onBookmark={() => handleBookmark(job)}
                  onAts={() => handleAts(job)}
                  onInterview={() => handleInterview(job)}
                />
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-1" />

            {/* Loading more spinner */}
            {hasMore && (
              <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground">
                <Loader2 size={12} className="animate-spin" />
                <span className="font-mono text-[10px]">Loading more…</span>
              </div>
            )}

            {/* Paid sources button (only when no more free jobs to load) */}
            {!hasMore && !paidLoaded && (
              <div className="mt-4 flex flex-col items-center gap-2 border-t border-border pt-4">
                <p className="text-[11px] text-muted-foreground">
                  Want jobs from more sources?
                </p>
                <button
                  onClick={handleLoadPaid}
                  disabled={paidLoading}
                  className="flex cursor-pointer items-center gap-1.5 rounded-sm border border-primary/40 bg-accent-soft px-3 py-2 text-[11px] font-medium text-primary transition-all hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                >
                  {paidLoading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Briefcase size={12} />
                  )}
                  {paidLoading ? 'Loading…' : 'Search LinkedIn, Indeed & JobsDB'}
                </button>
              </div>
            )}

            {/* Paid loaded confirmation */}
            {paidLoaded && (
              <div className="mt-4 flex items-center justify-center gap-1.5 rounded-sm border border-border bg-card px-3 py-2 text-[11px] text-muted-foreground">
                <Briefcase size={12} className="text-primary" />
                LinkedIn, Indeed &amp; JobsDB jobs loaded
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function JobCard({ job, bookmarked, onBookmark, onAts, onInterview }: {
  job: ScoredJob
  bookmarked: boolean
  onBookmark: () => void
  onAts: () => void
  onInterview: () => void
}) {
  return (
    <div className="rounded-sm border border-border bg-card p-4 transition-colors hover:border-primary">
      <div className="mb-0.5 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-[13px] font-semibold">{job.title}</span>
          <div className="mt-0.5 text-xs text-muted-foreground">{job.company}</div>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-xs px-2 py-0.5 font-mono text-xs font-semibold',
            job.score >= 75 ? 'bg-success-soft text-success' : job.score >= 50 ? 'bg-warn-soft text-[var(--warn)]' : 'bg-muted text-muted-foreground',
          )}
        >
          {job.score}%
        </span>
      </div>

      {/* Tags row */}
      <div className="my-1.5 flex flex-wrap gap-1.5">
        <span className="rounded-xs border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
          {job.location}
        </span>
        <span className="rounded-xs border border-border bg-background px-1.5 py-0.5 text-[11px] uppercase text-muted-foreground">
          {SOURCE_NAMES[job.source] || job.source}
        </span>
        {job.salary && (
          <span className="rounded-xs border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
            {job.salary}
          </span>
        )}
        {job.postedAt && (
          <span className="rounded-xs border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
            {formatPostedDate(job.postedAt)}
          </span>
        )}
        {job.experienceLevel && (
          <span className="rounded-xs border border-border bg-background px-1.5 py-0.5 text-[11px] capitalize text-muted-foreground">
            {job.experienceLevel}
          </span>
        )}
        {job.visaSponsorship && (
          <span className="rounded-xs bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-primary">
            <Plane size={9} className="mr-0.5 inline" /> Visa
          </span>
        )}
      </div>

      {/* Matched skills */}
      {job.matchedSkills.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {job.matchedSkills.slice(0, 8).map((skill) => (
            <span key={skill} className="rounded-xs bg-success-soft px-1.5 py-0.5 text-[10px] font-medium text-success">
              ✓ {skill}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex items-center justify-end gap-2 border-t border-border/50 pt-3">
        <button
          onClick={onBookmark}
          className={cn(
            'flex cursor-pointer items-center gap-1 rounded-xs border px-2 py-1 text-[11px] transition-all hover:scale-[1.02] active:scale-[0.98]',
            bookmarked ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary hover:text-primary',
          )}
        >
          <Bookmark size={11} fill={bookmarked ? 'currentColor' : 'none'} />
          {bookmarked ? 'Bookmarked' : 'Bookmark'}
        </button>
        <button
          onClick={onAts}
          className="flex cursor-pointer items-center gap-1 rounded-xs border border-border bg-card px-2 py-1 text-[11px] transition-colors hover:border-primary hover:text-primary"
        >
          <span>🎯 ATS Fit</span>
        </button>
        <button
          onClick={onInterview}
          className="flex cursor-pointer items-center gap-1 rounded-xs border border-border bg-card px-2 py-1 text-[11px] transition-colors hover:border-primary hover:text-primary"
        >
          <Brain size={11} /> Interview
        </button>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex cursor-pointer items-center gap-1 rounded-xs bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
        >
          Apply <ExternalLink size={10} />
        </a>
      </div>
    </div>
  )
}

function Chip({ active, onClick, icon, label }: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex cursor-pointer items-center gap-1 rounded-xs border px-2 py-1 text-[11px] font-medium transition-all',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function FilterGroup({ label, children, fullWidth }: {
  label: string
  children: React.ReactNode
  fullWidth?: boolean
}) {
  return (
    <div className={fullWidth ? 'col-span-full' : ''}>
      <div className="label-mono mb-1.5">{label}</div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  )
}

function FilterCheckbox({ checked, onChange, label }: {
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-3 w-3 accent-primary" />
      {label}
    </label>
  )
}

function FilterRadio({ checked, onChange, label }: {
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground">
      <input type="radio" checked={checked} onChange={onChange} className="h-3 w-3 accent-primary" />
      {label}
    </label>
  )
}

// ── Helpers ───────────────────────────────────────────────────

function formatPostedDate(iso: string): string {
  try {
    const date = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (days <= 0) return 'today'
    if (days === 1) return 'yesterday'
    if (days < 7) return `${days}d ago`
    if (days < 30) return `${Math.floor(days / 7)}w ago`
    return `${Math.floor(days / 30)}mo ago`
  } catch {
    return ''
  }
}
