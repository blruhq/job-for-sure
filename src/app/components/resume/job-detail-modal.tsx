'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  X, Loader2, ExternalLink, Bookmark, FileText, Target, Brain,
  Globe, Plane, MapPin, Clock, Sparkles, Zap,
} from 'lucide-react'
import { cn } from '~/lib/utils'
import { notify } from '~/lib/toast'
import { countryToFlag } from '~/lib/job-sources/geo'
import type { ScoredJob } from '~/lib/job-sources/types'
import type { Resume } from '~/types/resume'

// ═══════════════════════════════════════════════════════════════
// JobDetailModal — in-app job detail with AI actions surfaced.
//
// Replaces the old "click → open in new tab" flow.
// The #1 UX fix: keeps users IN the app at the moment of intent.
//
// Hierarchy:
//   PRIMARY   → AI tools (Tailor Resume, Cover Letter, ATS Match)
//   SECONDARY → Apply (external), Save, Pass
// ═══════════════════════════════════════════════════════════════

interface JobDetailModalProps {
  job: ScoredJob | null
  resume: Resume
  open: boolean
  onClose: () => void
  bookmarked: boolean
  onBookmark: () => void
}

export function JobDetailModal({
  job,
  resume,
  open,
  onClose,
  bookmarked,
  onBookmark,
}: JobDetailModalProps) {
  const router = useRouter()
  const [description, setDescription] = useState<string>('')
  const [loadingDesc, setLoadingDesc] = useState(false)

  // ── Fetch JD on-demand when modal opens ──
  useEffect(() => {
    if (!open || !job) return

    // If description already exists (non-empty), use it directly
    if (job.description && job.description.length > 50) {
      setDescription(job.description)
      setLoadingDesc(false)
      return
    }

    // Otherwise fetch from detail endpoint (LinkedIn guest / cached)
    setLoadingDesc(true)
    setDescription('')

    async function fetchDetail() {
      if (!job) return
      try {
        // Extract LinkedIn job ID from the job's id or URL
        const linkedinMatch = job.id.match(/linkedin-guest:(.+)/)
        const jobIdFromUrl = job.url.match(/\/jobs\/view\/(\d+)/)

        if (job.source === 'linkedin-guest' || linkedinMatch || jobIdFromUrl) {
          const id = linkedinMatch?.[1] || jobIdFromUrl?.[1] || ''
          if (!id) {
            setLoadingDesc(false)
            setDescription('Job description not available. Click "View Source" to read it on the original site.')
            return
          }

          const res = await fetch('/api/jobs/detail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: 'linkedin-guest', jobId: id, url: job.url }),
          })

          if (res.ok) {
            const data = await res.json()
            if (data.job?.description) {
              setDescription(data.job.description)
              setLoadingDesc(false)
              return
            }
          }
        }

        // Fallback message for sources without on-demand detail
        setLoadingDesc(false)
        setDescription('Full description not cached. Click "View Source" to read the original posting.')
      } catch {
        setLoadingDesc(false)
        setDescription('Could not load job description. Try viewing the original posting.')
      }
    }

    fetchDetail()
  }, [open, job])

  // ── Escape to close ──
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = ''
      }
    }
  }, [open, handleKeyDown])

  if (!open || !job) return null

  // ── AI Actions ──
  const handleTailor = () => {
    if (!description || description.length < 50) {
      notify({ message: 'Waiting for job description to load…', type: 'info' })
      return
    }
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('jfs_pending_ats_jd', description)
      sessionStorage.setItem('jfs_pending_ats_company', job.company)
      sessionStorage.setItem('jfs_pending_ats_role', job.title)
    }
    router.push(`/resume/${resume.id}?action=tailor`)
    onClose()
  }

  const handleCoverLetter = () => {
    if (!description || description.length < 50) {
      notify({ message: 'Waiting for job description to load…', type: 'info' })
      return
    }
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('jfs_pending_ats_jd', description)
      sessionStorage.setItem('jfs_pending_ats_company', job.company)
      sessionStorage.setItem('jfs_pending_ats_role', job.title)
    }
    router.push(`/resume/${resume.id}?action=cover-letter`)
    onClose()
  }

  const handleAts = () => {
    if (!description || description.length < 50) {
      notify({ message: 'Waiting for job description to load…', type: 'info' })
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
    router.push(`/interview?company=${encodeURIComponent(job.company)}&role=${encodeURIComponent(job.title)}`)
    onClose()
  }

  // ── User's skills that are NOT in this job (missing skills) ──
  const matchedSet = new Set(job.matchedSkills.map(s => s.toLowerCase()))
  const missingSkills = (resume.skills || []).filter(s => !matchedSet.has(s.toLowerCase()))

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border border-border bg-card shadow-xl"
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
                  {job.country && <span>{countryToFlag(job.country)}</span>}
                  {job.location}
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
            {job.locationType && job.locationType !== 'unknown' && (
              <span className="flex items-center gap-0.5 rounded-xs border border-border bg-background px-1.5 py-0.5 text-[11px] capitalize text-muted-foreground">
                {job.locationType === 'remote' && <Globe size={9} />}
                {job.locationType}
              </span>
            )}
            {job.experienceLevel && (
              <span className="rounded-xs border border-border bg-background px-1.5 py-0.5 text-[11px] capitalize text-muted-foreground">
                {job.experienceLevel}
              </span>
            )}
            {job.employmentType && (
              <span className="rounded-xs border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
                {job.employmentType}
              </span>
            )}
            {job.salary && (
              <span className="rounded-xs border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
                {job.salary}
              </span>
            )}
            {job.visaSponsorship && (
              <span className="flex items-center gap-0.5 rounded-xs bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-primary">
                <Plane size={9} /> Visa Sponsor
              </span>
            )}
            {job.postedAt && (
              <span className="flex items-center gap-0.5 rounded-xs border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
                <Clock size={9} /> {formatPostedDate(job.postedAt)}
              </span>
            )}
          </div>
        </div>

        {/* ── Body: Score breakdown + JD ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Matched skills */}
          {job.matchedSkills.length > 0 && (
            <div className="mb-3">
              <div className="label-mono mb-1.5 flex items-center gap-1 text-success">
                <Sparkles size={11} /> Matched Skills
              </div>
              <div className="flex flex-wrap gap-1">
                {job.matchedSkills.slice(0, 12).map((skill) => (
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

          {/* Missing skills */}
          {missingSkills.length > 0 && missingSkills.length <= 12 && (
            <div className="mb-3">
              <div className="label-mono mb-1.5 text-muted-foreground">
                Skills You Have (Not in JD)
              </div>
              <div className="flex flex-wrap gap-1">
                {missingSkills.slice(0, 8).map((skill) => (
                  <span
                    key={skill}
                    className="rounded-xs bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* JD text */}
          <div className="mb-2">
            <div className="label-mono mb-1.5">Job Description</div>
            {loadingDesc ? (
              <div className="flex items-center gap-2 py-8 text-muted-foreground">
                <Loader2 size={14} className="animate-spin text-primary" />
                <span className="text-xs">Loading job description…</span>
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90">
                {description || 'No description available.'}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer: AI CTAs (PRIMARY) + Actions (SECONDARY) ── */}
        <div className="shrink-0 border-t border-border bg-background/50 px-5 py-3">
          {/* PRIMARY: AI actions */}
          <div className="mb-2 grid grid-cols-3 gap-2">
            <button
              onClick={handleTailor}
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-sm bg-primary px-3 py-2 text-[12px] font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
            >
              <Zap size={13} /> Tailor Resume
            </button>
            <button
              onClick={handleCoverLetter}
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-sm bg-primary px-3 py-2 text-[12px] font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
            >
              <FileText size={13} /> Cover Letter
            </button>
            <button
              onClick={handleAts}
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-sm bg-primary px-3 py-2 text-[12px] font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
            >
              <Target size={13} /> ATS Match
            </button>
          </div>

          {/* SECONDARY: Apply, Save, Interview */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={onBookmark}
                className={cn(
                  'flex cursor-pointer items-center gap-1 rounded-xs border px-2.5 py-1.5 text-[11px] transition-all',
                  bookmarked
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card hover:border-primary hover:text-primary',
                )}
              >
                <Bookmark size={11} fill={bookmarked ? 'currentColor' : 'none'} />
                {bookmarked ? 'Saved' : 'Save'}
              </button>
              <button
                onClick={handleInterview}
                className="flex cursor-pointer items-center gap-1 rounded-xs border border-border bg-card px-2.5 py-1.5 text-[11px] transition-colors hover:border-primary hover:text-primary"
              >
                <Brain size={11} /> Mock Interview
              </button>
            </div>
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex cursor-pointer items-center gap-1 rounded-xs border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              Apply on {job.source === 'linkedin-guest' ? 'LinkedIn' : 'Source'} <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────

function formatPostedDate(iso: string): string {
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
