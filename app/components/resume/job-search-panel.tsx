'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Bookmark, ExternalLink, MapPin, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useAppStore } from '~/lib/store'
import { notify } from '~/lib/toast'
import { companyColor, companyLogo } from '~/lib/company-data'
import type { Resume } from '~/types/resume'
import type { ScoredJob, SearchResult, JobSource } from '~/lib/job-sources/types'

// ─────────────────────────────────────────────────────────────────
// JobSearchPanel — replaces the hallucinated "Recommended Jobs" tab.
// Searches REAL job postings via /api/jobs/search (free ATS + board APIs).
// ─────────────────────────────────────────────────────────────────

interface SourceMeta {
  source: JobSource
  count: number
  error?: string
}

export function JobSearchPanel({ resume }: { resume: Resume }) {
  const router = useRouter()
  const { isBookmarked, bookmarkJob, toggleBookmark, addResume, setActiveResumeId } = useAppStore()

  const [query, setQuery] = useState(resume.persona || resume.name || '')
  const [location, setLocation] = useState('')
  const [results, setResults] = useState<ScoredJob[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [sources, setSources] = useState<SourceMeta[]>([])
  const [cached, setCached] = useState(false)
  const [scoreFilter, setScoreFilter] = useState(0)

  const handleSearch = useCallback(async (q?: string, loc?: string) => {
    const searchQuery = (q ?? query).trim()
    if (searchQuery.length < 2) return

    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          location: (loc ?? location).trim() || undefined,
          skills: resume.skills,
          role: resume.persona || resume.name,
          limit: 30,
        }),
      })

      if (!res.ok) throw new Error('Search failed')
      const data: SearchResult = await res.json()

      setResults(data.jobs)
      setSources(data.sources)
      setCached(data.cached)
    } catch (err) {
      console.error('[job-search] Error:', err)
      notify({ message: 'Job search failed. Try again.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [query, location, resume.skills, resume.persona, resume.name])

  // Auto-search on mount if resume has skills
  useEffect(() => {
    if (resume.skills.length > 0 && !searched) {
      handleSearch()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Filter results by score
  const filtered = results.filter((j) => j.score >= scoreFilter)

  const handleBookmark = (job: ScoredJob) => {
    const key = job.id
    const isBm = isBookmarked(key)
    if (isBm) {
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
        resume: resume.name,
      })
      notify({ message: `Bookmarked: ${job.title} at ${job.company}`, type: 'success' })
    }
  }

  const handleTailor = (job: ScoredJob) => {
    const tailored = {
      ...resume,
      id: String(Date.now()),
      name: `${resume.name} → ${job.company}`,
      updated: 'just now',
    }
    addResume(tailored)
    setActiveResumeId(tailored.id)
    router.push(`/resume/${tailored.id}`)
    notify({ message: `Cloned resume for ${job.company}. Edit it in the Resume Editor.`, type: 'success' })
  }

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
              placeholder="Remote, SF, …"
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
              onClick={() => handleSearch()}
              className="flex cursor-pointer items-center gap-1 rounded-sm border border-border bg-card px-2 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
              title="Refresh results"
            >
              <RefreshCw size={11} />
            </button>
          )}
        </div>

        {/* Source badges + score filter */}
        {searched && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {sources.map((s) => (
              <span
                key={s.source}
                className={cn(
                  'rounded-xs border px-1.5 py-0.5 font-mono text-[10px]',
                  s.error
                    ? 'border-destructive/30 bg-destructive/5 text-destructive'
                    : 'border-border bg-background text-muted-foreground',
                )}
                title={s.error || `${s.count} jobs from ${s.source}`}
              >
                {s.source}: {s.error ? '⚠' : s.count}
              </span>
            ))}
            {cached && (
              <span className="rounded-xs bg-accent-soft px-1.5 py-0.5 font-mono text-[10px] text-primary">
                cached
              </span>
            )}
            <div className="ml-auto flex items-center gap-1">
              <span className="font-mono text-[10px] text-muted-foreground">min score:</span>
              {[0, 50, 75].map((s) => (
                <button
                  key={s}
                  onClick={() => setScoreFilter(s)}
                  className={cn(
                    'rounded-xs px-1.5 py-0.5 font-mono text-[10px] transition-all',
                    scoreFilter === s
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {s === 0 ? 'all' : `${s}%`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 size={20} className="animate-spin text-primary" />
            <div className="font-mono text-[11px] text-muted-foreground">
              Fetching real jobs from Greenhouse, Ashby, RemoteOK…
            </div>
          </div>
        )}

        {/* Empty state — pre-search */}
        {!loading && !searched && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
            <Search size={24} className="text-muted-foreground/40" />
            <div className="text-sm text-muted-foreground">
              Search for real jobs matching your skills.
            </div>
            <div className="text-[11px] text-muted-foreground/70">
              Powered by Greenhouse, Ashby &amp; RemoteOK — all live listings.
            </div>
          </div>
        )}

        {/* No results */}
        {!loading && searched && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
            <AlertCircle size={20} className="text-muted-foreground/40" />
            <div className="text-sm text-muted-foreground">
              {results.length === 0
                ? 'No jobs found. Try different keywords.'
                : `No jobs at ${scoreFilter}%+ match. Lower the filter.`}
            </div>
          </div>
        )}

        {/* Job cards */}
        {!loading && filtered.length > 0 && (
          <>
            <div className="mb-3 text-[11px] text-muted-foreground">
              {filtered.length} real job{filtered.length !== 1 ? 's' : ''} found
              {cached && ' (cached)'} · scored against your {resume.skills.length} skills
            </div>
            <div className="flex flex-col gap-3">
              {filtered.map((job) => {
                const bm = isBookmarked(job.id)
                return (
                  <div
                    key={job.id}
                    className="rounded-sm border border-border bg-card p-4 transition-colors hover:border-primary"
                  >
                    <div className="mb-0.5 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-[13px] font-semibold">{job.title}</span>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {job.company}
                        </div>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded-xs px-2 py-0.5 font-mono text-xs font-semibold',
                          job.score >= 75
                            ? 'bg-success-soft text-success'
                            : job.score >= 50
                              ? 'bg-warn-soft text-[var(--warn)]'
                              : 'bg-muted text-muted-foreground',
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
                        {job.source}
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
                    </div>

                    {/* Matched skills */}
                    {job.matchedSkills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {job.matchedSkills.slice(0, 8).map((skill) => (
                          <span
                            key={skill}
                            className="rounded-xs bg-success-soft px-1.5 py-0.5 text-[10px] font-medium text-success"
                          >
                            ✓ {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-3 flex items-center justify-end gap-2 border-t border-border/50 pt-3">
                      <button
                        onClick={() => handleBookmark(job)}
                        className={cn(
                          'flex cursor-pointer items-center gap-1 rounded-xs border px-2 py-1 text-[11px] transition-all hover:scale-[1.02] active:scale-[0.98]',
                          bm
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-card hover:border-primary hover:text-primary',
                        )}
                      >
                        <Bookmark size={11} fill={bm ? 'currentColor' : 'none'} />
                        {bm ? 'Bookmarked' : 'Bookmark'}
                      </button>
                      <button
                        onClick={() => handleTailor(job)}
                        className="cursor-pointer rounded-xs border border-border bg-card px-2 py-1 text-[11px] transition-colors hover:border-primary hover:text-primary"
                      >
                        Tailor Resume
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
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────────

function formatPostedDate(iso: string): string {
  try {
    const date = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (days === 0) return 'today'
    if (days === 1) return 'yesterday'
    if (days < 7) return `${days}d ago`
    if (days < 30) return `${Math.floor(days / 7)}w ago`
    return `${Math.floor(days / 30)}mo ago`
  } catch {
    return ''
  }
}
