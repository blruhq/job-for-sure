'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from '~/i18n/routing'
import {
  Bookmark, Loader2, ChevronRight, Plane, X, Brain,
  DollarSign, Briefcase,
} from 'lucide-react'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import { useApplications, useCreateApplication, useDeleteApplication } from '~/hooks/use-apps'
import { notify } from '~/lib/toast'
import { companyColor, companyLogo } from '~/lib/company-data'
import type { Resume, PipelineJob } from '~/types/resume'
import type { ScoredJob, SearchResult } from '~/lib/job-sources/types'
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
      <div className="w-full rounded-md neuro-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 size={12} className="animate-spin text-primary" />
            <span className="font-mono text-xs">
              Searching real jobs across 9 sources…
            </span>
          </div>
          {onDismiss && (
            <Button variant="ghost" size="icon" onClick={onDismiss} className="h-5 w-5 text-muted-foreground hover:text-foreground">
              <X size={13} />
            </Button>
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
    <div className="w-full rounded-md neuro-card p-4">
      <div>
        {/* Header */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground">
              {total > jobs.length ? `${total} real jobs` : `${jobs.length} real job${jobs.length !== 1 ? 's' : ''}`}
            </span>
            <span className="text-xs text-muted-foreground">
              for &ldquo;{resume.role}&rdquo;
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="link"
              onClick={() => router.push(`/resume/${resume.id}`)}
              className="flex items-center gap-0.5 text-xs"
            >
              View all <ChevronRight size={12} />
            </Button>
            {onDismiss && (
              <Button variant="ghost" size="icon" onClick={onDismiss} className="h-5 w-5 text-muted-foreground hover:text-foreground">
                <X size={13} />
              </Button>
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
                className="cursor-pointer rounded-sm border border-border bg-background p-2.5 transition-colors hover:border-brand/40"
                onClick={() => setPanelJob(scoredJobToPipelineJob(job, resume.skills || []))}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-xs font-mono text-[10px] font-bold text-white"
                        style={{ background: companyColor(job.company) }}
                      >
                        {companyLogo(job.company)}
                      </span>
                      <span className="truncate text-xs font-semibold">{job.title}</span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
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
                  <span className="rounded-xs bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {SOURCE_SHORT[job.source] || job.source}
                  </span>
                  {(job.salaryMin || job.salary) && (
                    <span className="flex items-center gap-0.5 rounded-xs bg-emerald-50/50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                      <DollarSign size={8} />
                      {job.salaryMin && job.salaryMax
                        ? `${job.salaryCurrency === 'USD' ? '$' : job.salaryCurrency === 'GBP' ? '£' : job.salaryCurrency === 'EUR' ? '€' : `${job.salaryCurrency ?? ''} `}${Math.round(job.salaryMin / 1000)}k–${Math.round(job.salaryMax / 1000)}k`
                        : job.salary}
                    </span>
                  )}
                  {job.visaSponsorship && (
                    <span className="rounded-xs bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      <Plane size={8} className="mr-0.5 inline" />Visa
                    </span>
                  )}
                  {job.experienceYears && (
                    <span className="flex items-center gap-0.5 rounded-xs bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      <Briefcase size={8} />
                      {job.experienceYears}
                    </span>
                  )}
                  {job.postedAt && (
                    <span className="rounded-xs bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {formatDate(job.postedAt)}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-2 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant={bm ? 'default' : 'outline'}
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
                        notify({ message: `Bookmarked: ${job.title}`, type: 'success' })
                      }
                    }}
                    className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px]"
                  >
                    <Bookmark size={9} fill={bm ? 'currentColor' : 'none'} />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        sessionStorage.setItem('jfs_pending_ats_jd', job.description)
                        sessionStorage.setItem('jfs_pending_ats_company', job.company)
                        sessionStorage.setItem('jfs_pending_ats_role', job.title)
                      }
                      router.push('/ats')
                    }}
                    className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px]"
                  >
                    <span>🎯 ATS Fit</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      router.push(`/interview?company=${encodeURIComponent(job.company)}&role=${encodeURIComponent(job.title)}`)
                    }}
                    className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px]"
                  >
                    <Brain size={9} /> Interview
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => setPanelJob(scoredJobToPipelineJob(job, resume.skills || []))}
                    className="ml-auto flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium"
                  >
                    Details <ChevronRight size={8} />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        {/* View more */}
        {jobs.length > 5 && (
          <Button
            variant="outline"
            onClick={() => router.push(`/resume/${resume.id}`)}
            className="mt-2 flex w-full items-center justify-center gap-1 border-dashed py-1.5 text-xs"
          >
            +{jobs.length - 5} more jobs · View all <ChevronRight size={11} />
          </Button>
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
