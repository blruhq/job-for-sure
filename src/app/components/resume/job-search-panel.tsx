'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from '~/i18n/routing'
import {
  Search, Bookmark, Loader2, AlertCircle,
  RefreshCw, Filter, X, Globe, Clock, Star, Plane,
  DollarSign, Briefcase,
} from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { cn } from '~/lib/utils'
import { compareJobs } from '~/lib/job-sources/scoring'
import { useApplications, useCreateApplication, useDeleteApplication } from '~/hooks/use-apps'
import { notify } from '~/lib/toast'
import { companyColor, companyLogo } from '~/lib/company-data'
import type { Resume, PipelineJob } from '~/types/resume'
import type { ScoredJob, SearchResult, JobSource } from '~/lib/job-sources/types'
import { scoredJobToPipelineJob } from '~/lib/job-utils'
import { countryToFlag } from '~/lib/job-sources/geo'
import { JobDetailPanel } from '~/components/pipeline/job-detail-panel'
import { getCards, setCards } from '~/lib/client-cache'
import { expandQueryTerms } from '~/lib/job-sources/role-synonyms'
import { LocationAutocomplete } from '../search/LocationAutocomplete'
import { RoleAutocomplete } from '../search/RoleAutocomplete'

// ═══════════════════════════════════════════════════════════════
// JobSearchPanel — real job search from 9+ free sources.
// Replaces the hallucinated match-companies.
// ═══════════════════════════════════════════════════════════════

import { SOURCE_NAMES } from '~/lib/source-names'

// Source tiers used by the search flow (see plan)
const FAST_FREE_SOURCES: JobSource[] = [
  'remoteok', 'himalayas', 'remotive',
  'themuse', 'arbeitnow', 'adzuna', 'jsearch', 'jobbkk',
  'linkedin-guest',
]
const FULL_FREE_SOURCES: JobSource[] = [
  'greenhouse', 'ashby', 'indeed', 'jobsdb-rest',
]
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
  const { data: applications } = useApplications()
  const { mutateAsync: createBookmark } = useCreateApplication()
  const { mutateAsync: deleteBookmark } = useDeleteApplication()

  const isBookmarked = (key: string) => applications?.bookmark.some((j) => j.key === key) ?? false

  const bookmarkJob = (job: { key: string; company: string; title: string; loc: string; score: number; level: string; url: string; logo: string; color: string; resume: string; addedAt: string; salary?: string; jobData?: Record<string, unknown> }) => {
    createBookmark({ sourceKey: job.key, company: job.company, jobTitle: job.title, jobUrl: job.url, location: job.loc, logoUrl: job.logo, color: job.color, level: job.level, matchScore: job.score, resumeId: job.resume, status: 'bookmarked', salary: job.salary, jobData: job.jobData })
  }

  const toggleBookmark = (key: string) => {
    const existing = applications?.bookmark.find((j) => j.key === key)
    if (existing?.applicationId) deleteBookmark(existing.applicationId)
  }

  // ── Search query defaults to the AI-detected role ──
  const fallbackQuery = resume.skills && resume.skills.length > 0 
    ? resume.skills.slice(0, 3).join(' ') 
    : ''
  const [query, setQuery] = useState(resume.role || fallbackQuery)
  const [location, setLocation] = useState(resume.location || '')
  const [countryCode, setCountryCode] = useState('')
  const [results, setResults] = useState<ScoredJob[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [sourceCount, setSourceCount] = useState(0)
  const [cached, setCached] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS })

  // ── Infinite scroll & paid sources ──
  const [displayLimit, setDisplayLimit] = useState(25)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const searchRunRef = useRef(0) // track latest search to avoid stale merges
  const resultsRef = useRef<ScoredJob[]>([]) // mirror for closures

  // ── Detail panel ──
  const [panelJob, setPanelJob] = useState<PipelineJob | null>(null)

  // ── SWR Background Refresh states ──
  const [newJobs, setNewJobs] = useState<ScoredJob[]>([])
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false)

  // Thai synonyms for the query translation pill
  const thaiSynonyms = useMemo(() => {
    const terms = expandQueryTerms(query)
    return terms.filter(t => /[\u0e00-\u0e7f]/.test(t))
  }, [query])

  // Keep resultsRef in sync with state (for use in callbacks without stale closures)
  useEffect(() => { resultsRef.current = results }, [results])

  // ── Merge helper: combines two search results, dedup by id ──
  const mergeResults = useCallback((existing: ScoredJob[], incoming: ScoredJob[]): ScoredJob[] => {
    const seen = new Set(existing.map(j => j.id))
    const added = incoming.filter(j => !seen.has(j.id))
    if (added.length === 0) return existing
    return [...existing, ...added].sort(compareJobs)
  }, [])

  // ── localStorage cache for search results ──
  // 6h TTL (upgraded from 30-min sessionStorage). Survives tab close + browser restart.
  // Cards in localStorage, JDs in IndexedDB (see client-cache.ts).

  function saveSearchToCache(q: string, loc: string, data: { jobs: ScoredJob[]; total: number; descriptionsIncluded?: boolean }) {
    setCards(q, loc, resume.id, data)
  }

  function loadSearchFromCache(q: string, loc: string): { jobs: ScoredJob[]; total: number; descriptionsIncluded: boolean; timestamp: number } | null {
    return getCards(q, loc, resume.id)
  }

  // ── SWR Background Refresh ──
  const backgroundRefresh = useCallback(async (searchQuery: string, loc: string) => {
    setBackgroundRefreshing(true)
    try {
      const fastRes = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          location: loc?.trim().toLowerCase() === 'remote' ? undefined : loc?.trim() || undefined,
          countryCode: countryCode || undefined,
          skills: resume.skills,
          role: resume.role,
          sources: FAST_FREE_SOURCES,
          limit: 100,
          fresh: true, // force bypass server-side cache
        }),
      })

      if (!fastRes.ok) throw new Error('Background search failed')
      const fastData: SearchResult = await fastRes.json()

      // Find new jobs not currently in results state
      const existingIds = new Set(resultsRef.current.map(j => j.id))
      const freshNewJobs = fastData.jobs.filter(j => !existingIds.has(j.id))

      if (freshNewJobs.length > 0) {
        setNewJobs(prev => {
          const prevIds = new Set(prev.map(j => j.id))
          const added = freshNewJobs.filter(j => !prevIds.has(j.id))
          return [...prev, ...added].sort(compareJobs)
        })
      }

      // Phase 2: Slow sources in background
      try {
        const fullRes = await fetch('/api/jobs/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: searchQuery,
            location: loc?.trim().toLowerCase() === 'remote' ? undefined : loc?.trim() || undefined,
            countryCode: countryCode || undefined,
            skills: resume.skills,
            role: resume.role,
            sources: FULL_FREE_SOURCES,
            limit: 100,
            fresh: true,
          }),
        })
        if (fullRes.ok) {
          const fullData: SearchResult = await fullRes.json()
          const currentIds = new Set([
            ...resultsRef.current.map(j => j.id),
            ...newJobs.map(j => j.id),
            ...freshNewJobs.map(j => j.id),
          ])
          const slowNewJobs = fullData.jobs.filter(j => !currentIds.has(j.id))
          if (slowNewJobs.length > 0) {
            setNewJobs(prev => {
              const prevIds = new Set(prev.map(j => j.id))
              const added = slowNewJobs.filter(j => !prevIds.has(j.id))
              return [...prev, ...added].sort(compareJobs)
            })
          }
        }
      } catch {
        // silent fail
      }
    } catch (err) {
      console.error('[job-search-bg] Background refresh failed:', err)
    } finally {
      setBackgroundRefreshing(false)
    }
    // countryCode is read via closure but excluded to avoid recreating the
    // SWR refresher on every keystroke in the location input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume.skills, resume.role, newJobs])

  const handleShowNewJobs = useCallback(() => {
    if (newJobs.length === 0) return
    setResults(prev => {
      const merged = mergeResults(newJobs, prev)
      saveSearchToCache(query, location || '', {
        jobs: merged,
        total: merged.length,
      })
      return merged
    })
    setNewJobs([])
    // saveSearchToCache is a stable module-level function — adding it would
    // invalidate the callback unnecessarily.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newJobs, query, location, mergeResults])

  const handleSearch = useCallback(async (q?: string, loc?: string, fresh?: boolean) => {
    const searchQuery = (q ?? query).trim()
    if (searchQuery.length < 2) return

    const runId = ++searchRunRef.current
    setLoading(true)
    setSearched(true)
    setResults([])
    setDisplayLimit(25)
    setSourceCount(0)

    try {
      // ── Phase 1: Fast free sources (1-3s) ──
      const fastRes = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          location: (loc ?? location)?.trim().toLowerCase() === 'remote' ? undefined : (loc ?? location)?.trim() || undefined,
          countryCode: countryCode || undefined,
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
      saveSearchToCache(searchQuery, loc ?? location ?? '', {
        jobs: fastData.jobs,
        total: fastData.total,
        descriptionsIncluded: fastData.descriptionsIncluded,
      })
      setLoading(false) // release loading — user sees 25 jobs now

      // ── Phase 2: Slow sources (3-15s, background) ──
      // Results go into newJobs (banner) instead of silently re-sorting.
      // This prevents scroll disruption when Greenhouse/Ashby/Indeed/JobsDB arrive.
      try {
        const fullRes = await fetch('/api/jobs/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: searchQuery,
            location: (loc ?? location)?.trim().toLowerCase() === 'remote' ? undefined : (loc ?? location)?.trim() || undefined,
            countryCode: countryCode || undefined,
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
          // Find new jobs not already in results
          const existingIds = new Set(resultsRef.current.map(j => j.id))
          const freshNew = fullData.jobs.filter(j => !existingIds.has(j.id))
          if (freshNew.length > 0) {
            setNewJobs(prev => {
              const prevIds = new Set(prev.map(j => j.id))
              const added = freshNew.filter(j => !prevIds.has(j.id))
              return [...prev, ...added].sort(compareJobs)
            })
          }
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
    // saveSearchToCache is a stable module-level function — exclude from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, location, countryCode, resume.skills, resume.role, mergeResults])

  // Auto-search on mount — check sessionStorage first for instant back-nav
  useEffect(() => {
    if (resume.skills.length === 0 || searched) return

    const q = query
    const loc = location ?? ''
    const cached = loadSearchFromCache(q, loc)
    if (cached && cached.jobs.length > 0) {
      setResults(cached.jobs)
      setSearched(true)
      setLoading(false)
      setCached(true)

      // SWR: If cache is older than 30 minutes, trigger background refresh silently
      const age = Date.now() - cached.timestamp
      if (age > 30 * 60 * 1000) {
        backgroundRefresh(q, loc)
      }
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
    let loadingTimer: ReturnType<typeof setTimeout> | undefined
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          loadingMore = true
          setDisplayLimit(prev => prev + 25)
          loadingTimer = setTimeout(() => { loadingMore = false }, 500)
        }
      },
      { threshold: 0, rootMargin: '400px' },
    )

    observer.observe(sentinel)
    return () => {
      observer.disconnect()
      if (loadingTimer) clearTimeout(loadingTimer)
    }
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
        url: job.url,
        resume: resume.id,
        addedAt: new Date().toISOString(),
        salary: job.salary,
        jobData: {
          description: job.description,
          descriptionHtml: job.descriptionHtml,
          tags: job.tags,
          locationType: job.locationType,
          visaSponsorship: job.visaSponsorship,
          experienceLevel: job.experienceLevel,
          experienceYears: job.experienceYears,
          employmentType: job.employmentType,
          source: job.source,
          companyLogo: job.companyLogo,
          department: job.department,
          country: job.country,
          region: job.region,
          city: job.city,
          district: job.district,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          salaryCurrency: job.salaryCurrency,
        },
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

  // ── Open detail panel for a job ──
  const handleOpenDetail = (job: ScoredJob) => {
    setPanelJob(scoredJobToPipelineJob(job, resume.skills || []))
  }

  const handleCloseDetail = () => {
    setPanelJob(null)
  }

  // ── Save to Tracker from panel ──
  const handlePanelSave = () => {
    if (!panelJob) return
    createBookmark({ sourceKey: panelJob.key, company: panelJob.company, jobTitle: panelJob.title, jobUrl: panelJob.url, location: panelJob.loc, logoUrl: panelJob.logo, color: panelJob.color, level: panelJob.level, matchScore: panelJob.score, resumeId: panelJob.resume, status: 'bookmarked', salary: panelJob.salary, jobData: panelJob.jobData })
    notify({ message: `Saved: ${panelJob.title} at ${panelJob.company}`, type: 'success' })
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="flex w-full flex-col">
      {/* Search bar */}
      <div className="shrink-0 border-b border-border bg-card px-4 md:px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <RoleAutocomplete
            value={query}
            onChange={setQuery}
            onKeyDownEnter={() => handleSearch()}
          />
          <LocationAutocomplete
            value={location}
            onChange={setLocation}
            countryCode={countryCode}
            onSelectCountryCode={setCountryCode}
            onSelectRemoteOnly={(remote) => {
              setFilters(f => ({ ...f, remoteOnly: remote }))
            }}
            onKeyDownEnter={() => handleSearch()}
          />
          <Button
            variant="default"
            onClick={() => handleSearch()}
            disabled={loading || query.trim().length < 2}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
            {loading ? 'Searching…' : 'Search'}
          </Button>
          {searched && !loading && (
            <Button
              variant="outline"
              onClick={handleRefresh}
              className="flex items-center gap-1 px-2 py-1.5 text-[11px]"
              title="Clear cache & fetch fresh"
            >
              <RefreshCw size={11} /> Fresh
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-1 px-2 py-1.5 text-[11px]',
              (showFilters || activeFilterCount > 0) && 'border-primary bg-accent-soft text-primary',
            )}
          >
            <Filter size={11} /> Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
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

        {/* Synonym pill (cross-lingual explanation) */}
        {thaiSynonyms.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/30 px-2 py-1 rounded-sm border border-border/50">
            <span className="font-medium text-foreground">Including Thai results for:</span>
            {thaiSynonyms.slice(0, 5).map(syn => (
              <span key={syn} className="rounded-xs bg-muted px-1.5 py-0.5 font-mono text-[9px] text-foreground/80">
                {syn}
              </span>
            ))}
          </div>
        )}

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

            {/* Skills search */}
            <FilterGroup label="Skill Search" fullWidth>
              <Input
                value={filters.skillSearch}
                onChange={(e) => setFilters((f) => ({ ...f, skillSearch: e.target.value }))}
                placeholder="Type a skill to filter…"
                className="w-full px-2 py-1 text-[11px]"
              />
            </FilterGroup>

            {/* Clear */}
            {activeFilterCount > 0 && (
              <Button
                variant="link"
                onClick={clearFilters}
                className="col-span-full flex items-center gap-1 text-[10px] text-destructive"
              >
                <X size={10} /> Clear all filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {loading && (
          <div className="flex flex-col gap-3">
            <div className="mb-1 font-mono text-[11px] text-muted-foreground animate-pulse">
              Searching 13 sources…
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-sm border border-border bg-card p-4 animate-pulse">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-2/3 rounded-xs bg-muted" />
                    <div className="h-2.5 w-1/3 rounded-xs bg-muted/70" />
                  </div>
                  <div className="h-5 w-12 rounded-xs bg-muted" />
                </div>
                <div className="mt-2.5 flex gap-1.5">
                  <div className="h-4 w-20 rounded-xs bg-muted/60" />
                  <div className="h-4 w-14 rounded-xs bg-muted/60" />
                  <div className="h-4 w-16 rounded-xs bg-muted/60" />
                </div>
                <div className="mt-2 flex gap-1">
                  <div className="h-3 w-16 rounded-xs bg-success-soft" />
                  <div className="h-3 w-12 rounded-xs bg-success-soft" />
                  <div className="h-3 w-20 rounded-xs bg-success-soft" />
                </div>
              </div>
            ))}
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
            <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
              <span>
                {filtered.length} real job{filtered.length !== 1 ? 's' : ''}
                {displayedJobs.length < filtered.length && ` · showing ${displayedJobs.length}`}
              </span>
              <span>·</span>
              <span>scored against your {resume.skills.length} skills</span>
              {sourceCount > 0 && (
                <>
                  <span>·</span>
                  <span>
                    Results from {sourceCount} of 13 sources
                  </span>
                </>
              )}
              {cached && (
                <>
                  <span>·</span>
                  <Button
                    variant="link"
                    onClick={handleRefresh}
                    disabled={backgroundRefreshing}
                    className="flex items-center gap-0.5 text-[11px]"
                  >
                    {backgroundRefreshing ? (
                      <span className="flex items-center gap-1">
                        <Loader2 size={9} className="animate-spin text-primary" /> Refreshing…
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5">
                        <RefreshCw size={9} /> Cached — refresh
                      </span>
                    )}
                  </Button>
                </>
              )}
            </div>

            {newJobs.length > 0 && (
              <Button
                variant="outline"
                onClick={handleShowNewJobs}
                className="mb-3 flex w-full items-center justify-center gap-1.5 border-primary/30 bg-accent-soft py-2 text-[11px] font-semibold text-primary hover:bg-primary hover:text-primary-foreground animate-pulse"
              >
                🆕 {newJobs.length} new job{newJobs.length !== 1 ? 's' : ''} found since you searched · Show fresh results
              </Button>
            )}

            <div className="flex flex-col gap-3">
              {displayedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  bookmarked={isBookmarked(job.id)}
                  onBookmark={() => handleBookmark(job)}
                  onAts={() => handleAts(job)}
                  onInterview={() => handleInterview(job)}
                  onClick={() => handleOpenDetail(job)}
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


          </>
        )}
      </div>

      {/* Detail Panel */}
      <JobDetailPanel
        job={panelJob}
        mode="search"
        isSaved={panelJob ? isBookmarked(panelJob.key) : false}
        onSaveToTracker={handlePanelSave}
        onClose={handleCloseDetail}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function JobCard({ job, bookmarked, onBookmark, onAts: _onAts, onInterview: _onInterview, onClick }: {
  job: ScoredJob
  bookmarked: boolean
  onBookmark: () => void
  onAts: () => void
  onInterview: () => void
  onClick: () => void
}) {
  void _onAts
  void _onInterview
  return (
    <div
      className="cursor-pointer rounded-sm border border-border bg-card p-4 transition-colors hover:border-primary"
      onClick={onClick}
    >
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
        {/* Location with flag + work policy */}
        <span className="rounded-xs border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
          {job.country && <span className="mr-0.5">{countryToFlag(job.country)}</span>}
          {job.location}
        </span>
        {job.locationType && job.locationType !== 'unknown' && (
          <span className={cn(
            'rounded-xs border px-1.5 py-0.5 text-[11px]',
            job.locationType === 'remote'
              ? 'border-primary/30 bg-accent-soft text-primary'
              : 'border-border bg-background text-muted-foreground'
          )}>
            {job.locationType === 'remote' && <Globe size={9} className="mr-0.5 inline" />}
            {job.locationType === 'remote' ? 'Remote' : job.locationType === 'hybrid' ? 'Hybrid' : 'On-site'}
          </span>
        )}
        <span className="rounded-xs border border-border bg-background px-1.5 py-0.5 text-[11px] uppercase text-muted-foreground">
          {SOURCE_NAMES[job.source] || job.source}
        </span>
        {/* Salary — prefer structured range, fallback to free-text */}
        {(job.salaryMin || job.salary) && (
          <span className="flex items-center gap-0.5 rounded-xs border border-emerald-500/30 bg-emerald-50/50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            <DollarSign size={9} />
            {job.salaryMin && job.salaryMax
              ? `${job.salaryCurrency === 'USD' ? '$' : job.salaryCurrency === 'GBP' ? '£' : job.salaryCurrency === 'EUR' ? '€' : `${job.salaryCurrency ?? ''} `}${Math.round(job.salaryMin / 1000)}k–${Math.round(job.salaryMax / 1000)}k`
              : job.salary}
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
        {job.experienceYears && (
          <span className="flex items-center gap-0.5 rounded-xs border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
            <Briefcase size={9} />
            {job.experienceYears}
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

      {/* Footer: quick bookmark + "click for details" hint */}
      <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2.5">
        <span className="font-mono text-[10px] text-muted-foreground/60">
          Click for details &amp; AI tools
        </span>
        <Button
          variant={bookmarked ? 'default' : 'outline'}
          onClick={(e) => { e.stopPropagation(); onBookmark() }}
          className={cn(
            'flex items-center gap-1 px-2 py-1 text-[11px]',
          )}
        >
          <Bookmark size={11} fill={bookmarked ? 'currentColor' : 'none'} />
          {bookmarked ? 'Saved' : 'Save'}
        </Button>
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
    <Button
      variant={active ? 'default' : 'outline'}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 px-2 py-1 text-[11px] font-medium',
      )}
    >
      {icon}
      {label}
    </Button>
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
    if (isNaN(date.getTime())) return ''
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
  } catch {
    return ''
  }
}
