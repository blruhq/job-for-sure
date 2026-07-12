'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bookmark, ExternalLink, Loader2, ChevronRight, MessageSquare, Plane, X, Briefcase, Brain,
} from 'lucide-react'
import { cn } from '~/lib/utils'
import { useAppStore } from '~/lib/store'
import { notify } from '~/lib/toast'
import { companyColor, companyLogo } from '~/lib/company-data'
import type { Resume } from '~/types/resume'
import type { ScoredJob, SearchResult, JobSource } from '~/lib/job-sources/types'

const SOURCE_SHORT: Record<JobSource, string> = {
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
  linkedin: 'LinkedIn',
  indeed: 'Indeed',
  jobsdb: 'JobsDB',
}

// ═══════════════════════════════════════════════════════════════
// JobPreview — shows up to 10 real job cards inline in the chat
// after the user uploads/builds a resume. Has "View All →" button
// that navigates to the full Find Jobs search panel.
// ═══════════════════════════════════════════════════════════════

export function JobPreview({ resume, onDismiss }: { resume: Resume; onDismiss?: () => void }) {
  const router = useRouter()
  const { isBookmarked, bookmarkJob, toggleBookmark } = useAppStore()

  const [jobs, setJobs] = useState<ScoredJob[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState(false)
  const [paidLoading, setPaidLoading] = useState(false)
  const [paidLoaded, setPaidLoaded] = useState(false)

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          query: resume.role,
          location: resume.location || undefined,
          skills: resume.skills,
          role: resume.role,
          limit: 10,
        }),
      })
      if (!res.ok) throw new Error('Search failed')
      const data: SearchResult = await res.json()
      setJobs(data.jobs)
      setTotal(data.total)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [resume.role, resume.location, resume.skills])

  useEffect(() => {
    fetchJobs()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadPaid = useCallback(async () => {
    if (paidLoading || paidLoaded) return
    setPaidLoading(true)
    try {
      const res = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          query: resume.role,
          location: resume.location || undefined,
          skills: resume.skills,
          role: resume.role,
          sources: ['linkedin' as const, 'indeed' as const, 'jobsdb' as const],
          includePaid: true,
          limit: 20,
        }),
      })
      if (res.ok) {
        const data: SearchResult = await res.json()
        setJobs(prev => {
          const seen = new Set(prev.map(j => j.id))
          const merged = [...prev, ...data.jobs.filter(j => !seen.has(j.id))]
          return merged.sort((a, b) => b.score - a.score)
        })
        setTotal(prev => prev + data.total)
        setPaidLoaded(true)
      }
    } catch {
      // silent
    } finally {
      setPaidLoading(false)
    }
  }, [resume, paidLoading, paidLoaded])

  // ── Loading ──
  if (loading) {
    return (
      <div className="shrink-0 border-b border-border/50 bg-card px-4 py-2 md:px-8">
        <div className="mx-auto flex max-w-[680px] items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 size={11} className="animate-spin text-primary" />
            <span className="font-mono text-[10px]">
              Searching real jobs across 9 sources…
            </span>
          </div>
          {onDismiss && (
            <button onClick={onDismiss} className="cursor-pointer text-muted-foreground hover:text-foreground">
              <X size={12} />
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Error ──
  if (error || jobs.length === 0) {
    return null // silently hide — user can search manually from Find Jobs tab
  }

  // ── Results ──
  return (
    <div className="shrink-0 max-h-[45vh] overflow-y-auto border-b border-border/50 bg-card px-4 py-2.5 md:px-8">
      <div className="mx-auto max-w-[680px]">
        {/* Header */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-semibold text-foreground">
              {total > jobs.length ? `${total} real jobs` : `${jobs.length} real job${jobs.length !== 1 ? 's' : ''}`}
            </span>
            <span className="text-[11px] text-muted-foreground">
              for &ldquo;{resume.role}&rdquo;
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/resume/${resume.id}`)}
              className="flex cursor-pointer items-center gap-0.5 text-[11px] font-medium text-primary hover:underline"
            >
              View all <ChevronRight size={12} />
            </button>
            {onDismiss && (
              <button onClick={onDismiss} className="cursor-pointer text-muted-foreground hover:text-foreground">
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Job cards (top 10) */}
        <div className="grid grid-cols-1 gap-2">
          {jobs.slice(0, 10).map((job) => {
            const key = job.id
            const bm = isBookmarked(key)
            return (
              <div
                key={key}
                className="rounded-sm border border-border bg-background p-2.5 transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-xs font-mono text-[9px] font-bold text-white"
                        style={{ background: companyColor(job.company) }}
                      >
                        {companyLogo(job.company)}
                      </span>
                      <span className="truncate text-[12px] font-semibold">{job.title}</span>
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {job.company} · {job.location}
                    </div>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-xs px-1.5 py-0.5 font-mono text-[10px] font-semibold',
                      job.score >= 75 ? 'bg-success-soft text-success' : job.score >= 50 ? 'bg-warn-soft text-[var(--warn)]' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {job.score}%
                  </span>
                </div>

                {/* Tags */}
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="rounded-xs bg-muted/50 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                    {SOURCE_SHORT[job.source] || job.source}
                  </span>
                  {job.salary && (
                    <span className="rounded-xs bg-muted/50 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                      {job.salary}
                    </span>
                  )}
                  {job.visaSponsorship && (
                    <span className="rounded-xs bg-accent-soft px-1.5 py-0.5 text-[9px] font-medium text-primary">
                      <Plane size={8} className="mr-0.5 inline" />Visa
                    </span>
                  )}
                  {job.postedAt && (
                    <span className="rounded-xs bg-muted/50 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                      {formatDate(job.postedAt)}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-2 flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (bm) {
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
                          resume: resume.role,
                        })
                        notify({ message: `Bookmarked: ${job.title}`, type: 'success' })
                      }
                    }}
                    className={cn(
                      'flex cursor-pointer items-center gap-0.5 rounded-xs border px-1.5 py-0.5 text-[10px] transition-all',
                      bm ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary',
                    )}
                  >
                    <Bookmark size={9} fill={bm ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        sessionStorage.setItem('jfs_pending_ats_jd', job.description)
                        sessionStorage.setItem('jfs_pending_ats_company', job.company)
                        sessionStorage.setItem('jfs_pending_ats_role', job.title)
                      }
                      router.push('/ats')
                    }}
                    className="flex cursor-pointer items-center gap-0.5 rounded-xs border border-border bg-card px-1.5 py-0.5 text-[10px] transition-colors hover:border-primary hover:text-primary"
                  >
                    <span>🎯 ATS Fit</span>
                  </button>
                  <button
                    onClick={() => {
                      router.push(`/interview?company=${encodeURIComponent(job.company)}&role=${encodeURIComponent(job.title)}`)
                    }}
                    className="flex cursor-pointer items-center gap-0.5 rounded-xs border border-border bg-card px-1.5 py-0.5 text-[10px] transition-colors hover:border-primary hover:text-primary"
                  >
                    <Brain size={9} /> Interview
                  </button>
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto flex cursor-pointer items-center gap-0.5 rounded-xs bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground transition-all hover:opacity-90"
                  >
                    Apply <ExternalLink size={8} />
                  </a>
                </div>
              </div>
            )
          })}
        </div>

        {/* View more */}
        {jobs.length > 10 && (
          <button
            onClick={() => router.push(`/resume/${resume.id}`)}
            className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1 rounded-sm border border-dashed border-border py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            +{jobs.length - 10} more jobs · View all <ChevronRight size={11} />
          </button>
        )}

        {/* Paid sources */}
        {!paidLoaded && (
          <button
            onClick={handleLoadPaid}
            disabled={paidLoading}
            className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-sm border border-primary/30 bg-accent-soft py-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
          >
            {paidLoading ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Briefcase size={11} />
            )}
            {paidLoading ? 'Loading…' : 'Search LinkedIn, Indeed & JobsDB'}
          </button>
        )}
      </div>
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
    if (days <= 0) return 'today'
    if (days === 1) return '1d ago'
    if (days < 7) return `${days}d ago`
    if (days < 30) return `${Math.floor(days / 7)}w ago`
    return `${Math.floor(days / 30)}mo ago`
  } catch {
    return ''
  }
}
