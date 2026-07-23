import { useState, useEffect } from 'react'
import { useRouter } from '~/i18n/routing'
import {
  FileText, Brain, ExternalLink, Bookmark, Globe, Plane,
  Clock, Sparkles, Zap, Target, DollarSign, Briefcase,
} from 'lucide-react'
import { cn } from '~/lib/utils'
import { useActiveResume } from '~/hooks/use-active-resume'
import { useUpdateApplication } from '~/hooks/use-apps'
import { notify } from '~/lib/toast'
import { countryToFlag } from '~/lib/job-sources/geo'
import { Timeline } from './timeline'
import { JobNotes } from './job-notes'
import type { PipelineJob } from '~/types/resume'
import { SmartOverview } from './smart-overview'
import { AreaIntelligence } from './area-intelligence'
import { CompanyIntelligence } from './company-intelligence'
import { extractCity, extractDistrict, detectCountry } from '~/lib/area-links'
import { Button } from '~/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '~/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '~/components/ui/sheet'

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
  const [homeLocation, setHomeLocation] = useState<string>('')

  // ── Load home location from user preferences ──
  useEffect(() => {
    fetch('/api/user/preferences')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.homeLocation) setHomeLocation(data.homeLocation)
      })
      .catch(() => {})
  }, [])

  // ── Extract description from jobData or from job object ──
  useEffect(() => {
    if (!job) return
    const desc = (job.jobData?.description as string) || ''
    setDescription(desc)
  }, [job])

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
  const experienceYears = (job.jobData?.experienceYears as string) || ''
  const salaryMin = job.jobData?.salaryMin as number | undefined
  const salaryMax = job.jobData?.salaryMax as number | undefined
  const salaryCurrency = (job.jobData?.salaryCurrency as string) || 'USD'

  // ── Structured location ──
  const city = extractCity(job.loc) || (job.jobData?.city as string) || ''
  const district = job.district || (job.jobData?.district as string) || extractDistrict(job.loc)
  const countryCode = detectCountry(job.loc) || (job.jobData?.country as string) || ''

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
    <Sheet open={!!job} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="w-full max-w-2xl flex flex-col p-0 gap-0">
        {/* ── Header ── */}
        <SheetHeader className="shrink-0 border-b border-border px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base">{job.title}</SheetTitle>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{job.company}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  {country && <span>{countryToFlag(country)}</span>}
                  {job.loc}
                </span>
              </div>
            </div>
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
            {(salaryMin || job.salary) && (
              <span className="flex items-center gap-0.5 rounded-xs border border-emerald-500/30 bg-emerald-50/50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                <DollarSign size={10} />
                {salaryMin && salaryMax
                  ? `${salaryCurrency === 'USD' ? '$' : salaryCurrency === 'GBP' ? '£' : salaryCurrency === 'EUR' ? '€' : `${salaryCurrency} `}${Math.round(salaryMin / 1000)}k–${Math.round(salaryMax / 1000)}k`
                  : job.salary}
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
            {experienceYears && (
              <span className="flex items-center gap-0.5 rounded-xs border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
                <Briefcase size={10} />
                {experienceYears}
              </span>
            )}
            {postedAt && (
              <span className="flex items-center gap-0.5 rounded-xs border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
                <Clock size={9} /> {formatDate(postedAt)}
              </span>
            )}
          </div>
        </SheetHeader>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Tracker mode: Status select */}
          {mode === 'tracker' && job.applicationId && (
            <div>
              <div className="label-mono mb-1.5">Status</div>
              <Select value={status} onValueChange={(v) => handleStatusChange(v || 'bookmarked')}>
                <SelectTrigger className="w-full rounded-xs px-2 py-1.5 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ── Smart AI Overview ── */}
          {description && description.length >= 50 && (
            <SmartOverview
              job={{
                company: job.company,
                title: job.title,
                loc: job.loc,
                url: job.url,
                score: job.score,
                salary: job.salary,
                jobData: job.jobData,
              }}
              resumeData={activeResume as unknown as Record<string, unknown> | null}
              homeLocation={homeLocation}
              matchScore={job.score}
              matchedSkills={matchedSkills}
              missingSkills={missingSkills}
              applicationId={job.applicationId}
            />
          )}

          {/* Area & Company Intelligence */}
          <AreaIntelligence
            job={{ company: job.company, loc: job.loc, title: job.title }}
            homeLocation={homeLocation}
            city={city}
            district={district}
            countryCode={countryCode}
            onHomeLocationChange={async (location) => {
              setHomeLocation(location)
              try {
                await fetch('/api/user/preferences', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ homeLocation: location || null }),
                })
              } catch {
                console.error('Failed to save home location')
                notify({ message: 'Failed to save home location', type: 'error' })
              }
            }}
          />
          <CompanyIntelligence
            company={job.company}
            countryCode={countryCode}
          />

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

          {/* JD Text (collapsible) */}
          <details className="group">
            <summary className="label-mono cursor-pointer list-none text-muted-foreground hover:text-foreground transition-colors">
              <span className="group-open:hidden">&#9654; Show full job description</span>
              <span className="hidden group-open:inline">&#9660; Hide job description</span>
            </summary>
            <div className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90">
              {description || 'No description available.'}
            </div>
          </details>

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
        <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-5 py-4">
          {/* AI tools grid */}
          <div className="mb-2 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={handleTailor} className="flex items-center justify-center gap-1.5 rounded-xs px-3 py-2.5 text-sm">
              <Zap size={13} /> Tailor Resume
            </Button>
            <Button variant="secondary" onClick={handleCoverLetter} className="flex items-center justify-center gap-1.5 rounded-xs px-3 py-2.5 text-sm">
              <FileText size={13} /> Cover Letter
            </Button>
            <Button variant="secondary" onClick={handleAts} className="flex items-center justify-center gap-1.5 rounded-xs px-3 py-2.5 text-sm">
              <Target size={13} /> ATS Match
            </Button>
            <Button variant="secondary" onClick={handleInterview} className="flex items-center justify-center gap-1.5 rounded-xs px-3 py-2.5 text-sm">
              <Brain size={13} /> Interview
            </Button>
          </div>

          {/* Bottom row — primary actions */}
          <div className="flex items-center gap-3 mt-3">
            {mode === 'search' && (
              <Button
                variant={isSaved ? 'default' : 'outline'}
                onClick={onSaveToTracker}
                className={cn('flex flex-1 items-center justify-center gap-2 rounded-xs h-11 text-sm font-semibold')}
              >
                <Bookmark size={14} fill={isSaved ? 'currentColor' : 'none'} />
                {isSaved ? 'Saved to Tracker' : 'Save to Tracker'}
              </Button>
            )}
            {job.url && (
              <Button
                variant="default"
                onClick={handleApply}
                className="flex flex-1 items-center justify-center gap-2 rounded-xs h-11 text-sm font-semibold"
              >
                Apply <ExternalLink size={14} />
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
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
    console.error('Failed to format date')
    return ''
  }
}
