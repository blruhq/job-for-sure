'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  X, FileText, Brain, ExternalLink, Bookmark, Globe, Plane,
  Clock, Sparkles, ChevronDown, Zap, Target,
} from 'lucide-react'
import { cn } from '~/lib/utils'
import { useActiveResume } from '~/hooks/use-active-resume'
import { useUpdateApplication } from '~/hooks/use-apps'
import { notify } from '~/lib/toast'
import { countryToFlag } from '~/lib/job-sources/geo'
import { Timeline } from './timeline'
import { JobNotes } from './job-notes'
import type { PipelineJob } from '~/types/resume'

// ═══════════════════════════════════════════════════════════════
// JobDetailPanel — slide-over panel showing everything about a job.
//
// Modes:
//   'search'  → from chat inline cards or search results.
//               Shows AI tools + "Save to Tracker" button.
//   'tracker' → from Kanban board.
//               Same AI tools + status dropdown + timeline + notes.
// ═══════════════════════════════════════════════════════════════

interface JobDetailPanelProps {
  job: PipelineJob | null
  mode: 'search' | 'tracker'
  onClose: () => void
  /** Tracker mode: the current status column this job lives in */
  currentStatus?: string
  /** Search mode: callback when user clicks "Save to Tracker" */
  onSaveToTracker?: () => void
  /** Track whether this job is already saved (search mode) */
  isSaved?: boolean
}

const STATUS_OPTIONS = [
  { value: 'bookmarked', label: 'Saved' },
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offered', label: 'Offered' },
  { value: 'rejected', label: 'Rejected' },
]

export function JobDetailPanel({
  job,
  mode,
  onClose,
  currentStatus,
  onSaveToTracker,
  isSaved,
}: JobDetailPanelProps) {
  const router = useRouter()
  const { activeResume, activeResumeId } = useActiveResume()
  const { mutateAsync: updateApp } = useUpdateApplication()

  const [status, setStatus] = useState(currentStatus || 'bookmarked')
  const [description, setDescription] = useState<string>('')

  // ── Extract description from jobData or from job object ──
  useEffect(() => {
    if (!job) return
    const desc = (job.jobData?.description as string) || ''
    setDescription(desc)
  }, [job])

  // ── Key handlers ──
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (job) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = ''
      }
    }
  }, [job, handleKeyDown])

  if (!job) return null

  // ── Derived data ──
  const missingSkills = (() => {
    const fromJobData = job.jobData?.missingSkills as string[] | undefined
    if (fromJobData && fromJobData.length > 0) return fromJobData

    // Recalculate from jobData.matchedSkills if missingSkills not stored
    const matched = (job.jobData?.matchedSkills as string[]) || []
    if (activeResume?.skills && activeResume.skills.length > 0) {
      const matchedSet = new Set(matched.map((s) => s.toLowerCase()))
      return activeResume.skills.filter((s) => !matchedSet.has(s.toLowerCase()))
    }
    return []
  })()

  const matchedSkills = (job.jobData?.matchedSkills as string[]) || []

  const locationType = (job.jobData?.locationType as string) || ''
  const visaSponsorship = job.jobData?.visaSponsorship as boolean | undefined
  const country = (job.jobData?.country as string) || ''
  const postedAt = (job.jobData?.postedAt as string) || ''

  // ── Status change handler (tracker mode) ──
  const handleStatusChange = async (newStatus: string) => {
    if (!job.applicationId) return
    setStatus(newStatus)
    try {
      await updateApp({ id: job.applicationId, status: newStatus })
      notify({ message: `Status updated to ${STATUS_OPTIONS.find((o) => o.value === newStatus)?.label || newStatus}`, type: 'success' })
    } catch {
      setStatus(status) // revert
      notify({ message: 'Failed to update status', type: 'error' })
    }
  }

  // ── AI action handlers ──
  const handleTailor = () => {
    if (!description || description.length < 50) {
      notify({ message: 'Insufficient job description for tailoring.', type: 'info' })
      return
    }
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('jfs_pending_ats_jd', description)
      sessionStorage.setItem('jfs_pending_ats_company', job.company)
      sessionStorage.setItem('jfs_pending_ats_role', job.title)
    }
    router.push(`/resume/${activeResumeId}?action=tailor`)
    onClose()
  }

  const handleCoverLetter = () => {
    if (!description || description.length < 50) {
      notify({ message: 'Insufficient job description for cover letter.', type: 'info' })
      return
    }
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('jfs_pending_ats_jd', description)
      sessionStorage.setItem('jfs_pending_ats_company', job.company)
      sessionStorage.setItem('jfs_pending_ats_role', job.title)
    }
    router.push(`/resume/${activeResumeId}`)
    onClose()
  }

  const handleAts = () => {
    if (!description || description.length < 50) {
      notify({ message: 'Insufficient job description for ATS match.', type: 'info' })
      return
    }
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('jfs_pending_ats_jd', description)
      sessionStorage.setItem('jfs_pending_ats_company', job.company)
      sessionStorage.setItem('jfs_pending_ats_role', job.title)
    }
    router.push('/ats')
    onClose()
  }

  const handleInterview = () => {
    const params = new URLSearchParams({ company: job.company, role: job.title })
    router.push(`/interview?${params}`)
    onClose()
  }

  const handleApply = () => {
    window.open(job.url, '_blank', 'noopener,noreferrer')
    if (mode === 'tracker' && job.applicationId) {
      updateApp({ id: job.applicationId, status: 'applied' }).catch(() => {
        // Silent fail — non-critical
      })
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div
        className="fixed right-0 top-0 z-[101] flex h-full w-full max-w-lg flex-col border-l border-border bg-card shadow-xl animate-in slide-in-from-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="shrink-0 border-b border-border px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-foreground">{job.title}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{job.company}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  {country && <span>{countryToFlag(country)}</span>}
                  {job.loc}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="cursor-pointer rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>

          {/* Tags row */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span
              className={cn(
                'rounded-xs px-2 py-0.5 font-mono text-xs font-semibold',
                job.score >= 75
                  ? 'bg-success-soft text-success'
                  : job.score >= 50
                    ? 'bg-warn-soft text-[var(--warn)]'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              {job.score}% Match
            </span>
            {job.salary && (
              <span className="rounded-xs border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
                {job.salary}
              </span>
            )}
            {locationType && locationType !== 'unknown' && (
              <span className="flex items-center gap-0.5 rounded-xs border border-border bg-background px-1.5 py-0.5 text-[11px] capitalize text-muted-foreground">
                {locationType === 'remote' && <Globe size={9} />}
                {locationType}
              </span>
            )}
            {visaSponsorship && (
              <span className="flex items-center gap-0.5 rounded-xs bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-primary">
                <Plane size={9} /> Visa Sponsor
              </span>
            )}
            {postedAt && (
              <span className="flex items-center gap-0.5 rounded-xs border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
                <Clock size={9} /> {formatDate(postedAt)}
              </span>
            )}
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Tracker mode: Status dropdown */}
          {mode === 'tracker' && job.applicationId && (
            <div>
              <div className="label-mono mb-1.5">Status</div>
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full cursor-pointer appearance-none rounded-xs border border-border bg-background px-2 py-1.5 text-[12px] outline-none focus:border-primary"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
              </div>
            </div>
          )}

          {/* Matched Skills */}
          {matchedSkills.length > 0 && (
            <div>
              <div className="label-mono mb-1.5 flex items-center gap-1 text-success">
                <Sparkles size={11} /> Matched Skills
              </div>
              <div className="flex flex-wrap gap-1">
                {matchedSkills.slice(0, 12).map((skill) => (
                  <span
                    key={skill}
                    className="rounded-xs bg-success-soft px-1.5 py-0.5 text-[10px] font-medium text-success"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Missing Skills */}
          {missingSkills.length > 0 && (
            <div>
              <div className="label-mono mb-1.5 text-muted-foreground">
                Missing Skills
              </div>
              <div className="flex flex-wrap gap-1">
                {missingSkills.slice(0, 12).map((skill) => (
                  <span
                    key={skill}
                    className="rounded-xs bg-warn-soft px-1.5 py-0.5 text-[10px] text-[var(--warn)]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* JD Text */}
          <div>
            <div className="label-mono mb-1.5">Job Description</div>
            <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90">
              {description || 'No description available.'}
            </div>
          </div>

          {/* Tracker mode extras */}
          {mode === 'tracker' && (
            <>
              {/* Timeline */}
              <Timeline job={job} currentStatus={status} />

              {/* Notes */}
              {job.applicationId && (
                <JobNotes applicationId={job.applicationId} initialNotes={job.notes} />
              )}
            </>
          )}
        </div>

        {/* ── Footer: Actions ── */}
        <div className="shrink-0 border-t border-border bg-background/50 px-5 py-3">
          {/* AI tools grid */}
          <div className="mb-2 grid grid-cols-2 gap-2">
            <button
              onClick={handleTailor}
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xs bg-primary px-3 py-2 text-[12px] font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
            >
              <Zap size={13} /> Tailor Resume
            </button>
            <button
              onClick={handleCoverLetter}
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xs bg-primary px-3 py-2 text-[12px] font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
            >
              <FileText size={13} /> Cover Letter
            </button>
            <button
              onClick={handleAts}
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xs bg-primary px-3 py-2 text-[12px] font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
            >
              <Target size={13} /> ATS Match
            </button>
            <button
              onClick={handleInterview}
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xs bg-primary px-3 py-2 text-[12px] font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
            >
              <Brain size={13} /> Interview
            </button>
          </div>

          {/* Bottom row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {mode === 'search' && (
                <button
                  onClick={onSaveToTracker}
                  className={cn(
                    'flex cursor-pointer items-center gap-1 rounded-xs border px-2.5 py-1.5 text-[11px] transition-all',
                    isSaved
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card hover:border-primary hover:text-primary',
                  )}
                >
                  <Bookmark size={11} fill={isSaved ? 'currentColor' : 'none'} />
                  {isSaved ? 'Saved' : 'Save to Tracker'}
                </button>
              )}
            </div>
            {job.url && (
              <button
                onClick={handleApply}
                className="flex cursor-pointer items-center gap-1 rounded-xs border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                Apply <ExternalLink size={10} />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Helpers ───────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    const date = new Date(iso)
    if (isNaN(date.getTime())) return ''
    const now = Date.now()
    const diffMs = now - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[date.getMonth()]} ${date.getDate()}`
  } catch {
    return ''
  }
}
