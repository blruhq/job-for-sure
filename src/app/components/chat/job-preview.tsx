'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from '~/i18n/routing'
import {
  Bookmark, ExternalLink, Loader2, ChevronRight, MessageSquare, Plane, X, Brain,
} from 'lucide-react'
import { cn } from '~/lib/utils'
import { useApplications, useCreateApplication, useDeleteApplication } from '~/hooks/use-apps'
import { useBookmarkJob } from '~/hooks/use-bookmark'
import { notify } from '~/lib/toast'
import { companyColor, companyLogo } from '~/lib/company-data'
import type { Resume, PipelineJob } from '~/types/resume'
import type { ScoredJob, SearchResult, JobSource } from '~/lib/job-sources/types'
import { JobDetailPanel } from '~/components/pipeline/job-detail-panel'
import { scoredJobToPipelineJob } from '~/lib/job-utils'
import { SOURCE_SHORT } from '~/lib/source-names'

// ═══════════════════════════════════════════════════════════════
// JobPreview — shows up to 10 real job cards inline in the chat
// after the user uploads/builds a resume. Has "View All →" button
// that navigates to the full Find Jobs search panel.
// ═══════════════════════════════════════════════════════════════

export function JobPreview({ resume, onDismiss, onLoadComplete }: { resume: Resume; onDismiss?: () => void; onLoadComplete?: () => void }) {
  const router = useRouter()
  const { data: applications } = useApplications()
  const { mutateAsync: createBookmark } = useCreateApplication()
  const { mutateAsync: deleteBookmark } = useDeleteApplication()

  const isBookmarked = (key: string) => applications?.bookmark.some((j) => j.key === key) ?? false

  const bookmarkJob = (job: { key: string; logo?: string; color?: string; company: string; title: string; loc: string; score: number; level: string; time?: string; url: string; resume: string; addedAt?: string; salary?: string; jobData?: Record<string, unknown> }) => {
    createBookmark({ sourceKey: job.key, company: job.company, jobTitle: job.title, jobUrl: job.url, location: job.loc, level: job.level, matchScore: job.score, resumeId: job.resume, status: 'bookmarked', salary: job.salary, jobData: job.jobData })
  }

  const toggleBookmark = (key: string) => {
    const existing = applications?.bookmark.find((j) => j.key === key)
    if (existing?.applicationId) deleteBookmark(existing.applicationId)
  }

  const [jobs, setJobs] = useState<ScoredJob[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState(false)
  const lastSearchKeyRef = useRef('')

  // ── Detail panel ──
  const [panelJob, setPanelJob] = useState<PipelineJob | null>(null)

  const fetchJobs = useCallback(async () => {
    // Guard: skip if search params haven't changed (e.g. React Query
    // returned a new resume object ref from onSettled invalidation).
    const searchKey = `${resume.role}|${resume.location ?? ''}|${[...(resume.skills ?? [])].sort().join(',')}`
    if (searchKey === lastSearchKeyRef.current) return
    lastSearchKeyRef.current = searchKey

    setLoading(true)
    setError(false)
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
  }, [fetchJobs])

  // Notify parent when loading completes (success or error)
  const onLoadCompleteRef = useRef(onLoadComplete)
  onLoadCompleteRef.current = onLoadComplete
  useEffect(() => {
    if (!loading) {
      onLoadCompleteRef.current?.()
    }
  }, [loading])

  // ── Loading ──
  if (loading) {
    return (
      <div className="w-full rounded-md border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 size={12} className="animate-spin text-primary" />
            <span className="font-mono text-[11px]">
              Searching real jobs across 9 sources…
            </span>
          </div>
          {onDismiss && (
            <button onClick={onDismiss} className="cursor-pointer text-muted-foreground hover:text-foreground">
              <X size={13} />
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
    <div className="w-full rounded-md border border-border bg-card p-4">
      <div>
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

        {/* Job cards (top 5) */}
        <div className="grid grid-cols-1 gap-2">
          {jobs.slice(0, 5).map((job) => {
            const key = job.id
            const bm = isBookmarked(key)
            return (
              <div
                key={key}
                className="cursor-pointer rounded-sm border border-border bg-background p-2.5 transition-colors hover:border-primary/40"
                onClick={() => setPanelJob(scoredJobToPipelineJob(job, resume.skills || []))}
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
                <div className="mt-2 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
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
                            employmentType: job.employmentType,
                            source: job.source,
                            companyLogo: job.companyLogo,
                            department: job.department,
                            country: job.country,
                            region: job.region,
                            city: job.city,
                            district: job.district,
                          },
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
                  <button
                    onClick={() => setPanelJob(scoredJobToPipelineJob(job, resume.skills || []))}
                    className="ml-auto flex cursor-pointer items-center gap-0.5 rounded-xs bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground transition-all hover:opacity-90"
                  >
                    Details <ChevronRight size={8} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* View more */}
        {jobs.length > 5 && (
          <button
            onClick={() => router.push(`/resume/${resume.id}`)}
            className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1 rounded-sm border border-dashed border-border py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            +{jobs.length - 5} more jobs · View all <ChevronRight size={11} />
          </button>
        )}

      </div>

      {/* Detail Panel */}
      <JobDetailPanel
        job={panelJob}
        mode="search"
        isSaved={panelJob ? isBookmarked(panelJob.key) : false}
        onSaveToTracker={() => {
          if (!panelJob) return
          const pj = panelJob
          if (isBookmarked(pj.key)) {
            toggleBookmark(pj.key)
          } else {
            createBookmark({
              sourceKey: pj.key,
              company: pj.company,
              jobTitle: pj.title,
              jobUrl: pj.url,
              location: pj.loc,
              logoUrl: pj.logo,
              color: pj.color,
              level: pj.level,
              matchScore: pj.score,
              resumeId: resume.id,
              status: 'bookmarked',
              salary: pj.salary,
              jobData: pj.jobData,
            })
            notify({ message: `Saved: ${pj.title}`, type: 'success' })
          }
        }}
        onClose={() => setPanelJob(null)}
      />
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
  } catch {
    return ''
  }
}
