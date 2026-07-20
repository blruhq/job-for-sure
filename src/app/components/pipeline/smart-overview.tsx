'use client'

import { useState } from 'react'
import { notify } from '~/lib/toast'
import {
  Sparkles,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Bus,
  DollarSign,
  Building2,
  Lightbulb,
} from 'lucide-react'
import { cn } from '~/lib/utils'
import type { SmartOverviewResult } from '~/types/smart-overview'
import * as Links from '~/lib/area-links'

// ═══════════════════════════════════════════════════════════════
// SmartOverview — AI-powered job analysis shown inside the
// Job Detail Panel (above the raw JD).
//
// States:
//   idle     → "Generate AI Overview" button
//   loading  → Spinner + skeleton
//   complete → Full overview with verdict, salary, commute, etc.
//   error    → Retry button
//
// Phase 2 note: area-links.ts is stubbed until Phase 2 implements
// proper area intelligence. Verification links open to search pages.
// ═══════════════════════════════════════════════════════════════

interface SmartOverviewProps {
  job: {
    company: string
    title: string
    loc: string
    url: string
    score: number
    salary?: string
    jobData?: Record<string, unknown>
  }
  resumeData: Record<string, unknown> | null
  homeLocation?: string
  matchScore: number
  matchedSkills: string[]
  missingSkills: string[]
  applicationId?: string
}

type OverviewState = 'idle' | 'loading' | 'complete' | 'error'

export function SmartOverview(props: SmartOverviewProps) {
  const [state, setState] = useState<OverviewState>('idle')
  const [overview, setOverview] = useState<SmartOverviewResult | null>(null)

  async function generate() {
    setState('loading')
    try {
      const res = await fetch('/api/ai/smart-overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jdText: props.job.jobData?.description || '',
          resumeData: props.resumeData,
          homeLocation: props.homeLocation,
          jobLocation: props.job.loc,
          salary: props.job.salary,
          company: props.job.company,
          jobTitle: props.job.title,
          matchScore: props.matchScore,
          matchedSkills: props.matchedSkills,
          missingSkills: props.missingSkills,
          applicationId: props.applicationId,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate overview')
      }
      setOverview(data)
      setState('complete')
    } catch (err) {
      console.error(err)
      notify({ message: 'Failed to generate AI overview', type: 'error' })
      setState('error')
    }
  }

  // ── STATE 0: Error (AI failed) ──
  if (state === 'error') {
    return (
      <div className="rounded-lg border border-destructive/30 bg-danger-soft p-4">
        <p className="text-xs text-foreground mb-2">
          Couldn&apos;t generate overview. The AI may be busy.
        </p>
        <button
          onClick={generate}
          className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <RefreshCw size={12} />
          Try again
        </button>
      </div>
    )
  }

  // ── STATE 1: Not generated yet ──
  if (state === 'idle' && !overview) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <button
          onClick={generate}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Sparkles size={16} />
          Generate AI Overview
        </button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Get a personalized analysis: match, salary, commute, company
        </p>
      </div>
    )
  }

  // ── STATE 2: Loading ──
  if (state === 'loading') {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          Generating your overview...
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      </div>
    )
  }

  // ── STATE 3: Complete ──
  return (
    <OverviewContent
      overview={overview!}
      onRegenerate={generate}
      company={props.job.company}
      jobLocation={props.job.loc}
      homeLocation={props.homeLocation || ''}
    />
  )
}

// ── OverviewContent: renders the full AI overview ──

function OverviewContent({
  overview,
  onRegenerate,
  company,
  jobLocation,
  homeLocation,
}: {
  overview: SmartOverviewResult
  onRegenerate: () => void
  company: string
  jobLocation: string
  homeLocation: string
}) {
  // Extract city from raw location (e.g. "Bang Rak, Bangkok, Thailand" → "Bangkok")
  const city = Links.extractCity(jobLocation)
  const countryCode = Links.detectCountry(jobLocation)

  return (
    <div className="rounded-lg border border-primary/20 bg-accent-soft/30 p-4 space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Sparkles size={14} className="text-primary" />
          AI Overview
        </div>
        <button
          onClick={onRegenerate}
          className="cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {/* VERDICT (the headline) */}
      <div
        className={cn(
          'rounded-md p-3',
          overview.verdict === 'strong_fit' || overview.verdict === 'good_fit'
            ? 'bg-success-soft'
            : overview.verdict === 'skip' || overview.verdict === 'weak_fit'
              ? 'bg-danger-soft'
              : 'bg-warn-soft',
        )}
      >
        <div className="text-sm font-bold text-foreground">{overview.verdictLabel}</div>
        <div className="text-xs text-muted-foreground">{overview.headline}</div>
      </div>

      {/* MATCH ANALYSIS */}
      <Section icon={<TrendingUp size={12} />} label="Why You Fit">
        {overview.matchAnalysis.strengths.map((s, i) => (
          <div key={i} className="flex items-start gap-1.5 text-xs text-foreground">
            <span className="text-success shrink-0">&#10003;</span>
            <span>{s}</span>
          </div>
        ))}
        {overview.matchAnalysis.gaps.map((g, i) => (
          <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <span className="text-destructive shrink-0">&#10007;</span>
            <span>{g}</span>
          </div>
        ))}
        {overview.matchAnalysis.insight && (
          <div className="flex items-start gap-1.5 text-xs text-primary pt-1">
            <Lightbulb size={12} className="shrink-0 mt-px" />
            <span>{overview.matchAnalysis.insight}</span>
          </div>
        )}
      </Section>

      {/* ROLE SUMMARY */}
      <Section icon={<Building2 size={12} />} label="The Role">
        {overview.roleSummary.map((r, i) => (
          <div key={i} className="text-xs text-foreground">
            &bull; {r}
          </div>
        ))}
      </Section>

      {/* SALARY CHECK */}
      {overview.salaryCheck && (
        <Section icon={<DollarSign size={12} />} label="Salary Check">
          <div className="text-xs text-foreground">
            Listed: {overview.salaryCheck.listed || 'Not specified'}
          </div>
          {overview.salaryCheck.estimate && (
            <div className="text-xs text-muted-foreground">
              Market: {overview.salaryCheck.estimate}
            </div>
          )}
          <div
            className={cn(
              'text-xs font-semibold',
              overview.salaryCheck.assessment === 'above_market' ? 'text-success' : '',
              overview.salaryCheck.assessment === 'below_market' ? 'text-destructive' : '',
              overview.salaryCheck.assessment === 'fair' ? 'text-primary' : '',
            )}
          >
            {salaryIcon(overview.salaryCheck.assessment)}{' '}
            {salaryLabel(overview.salaryCheck.assessment)}
          </div>
          {overview.salaryCheck.note && (
            <div className="text-xs text-muted-foreground italic">{overview.salaryCheck.note}</div>
          )}
          <VerifyLink href={Links.costOfLivingUrl(city, countryCode)} label="Verify on Numbeo" />
        </Section>
      )}

      {/* COMMUTE ESTIMATE */}
      {overview.commuteEstimate && (
        <Section icon={<Bus size={12} />} label="Commute">
          <div className="text-xs text-foreground">{overview.commuteEstimate.summary}</div>
          {overview.commuteEstimate.monthlyCostEstimate && (
            <div className="text-xs text-muted-foreground">
              Est. cost: {overview.commuteEstimate.monthlyCostEstimate}
            </div>
          )}
          <div className="flex gap-1.5 pt-1">
            <VerifyLink href={Links.directionsUrl(homeLocation, jobLocation)} label="Directions" />
            <VerifyLink href={Links.rome2RioUrl(homeLocation, jobLocation)} label="Prices" />
          </div>
        </Section>
      )}

      {/* COMPANY SNAPSHOT */}
      <Section icon={<Building2 size={12} />} label="Company">
        <div className="text-xs text-foreground">{overview.companySnapshot.description}</div>
        {!overview.companySnapshot.known && (
          <div className="text-xs text-muted-foreground italic">
            Limited info &mdash; verify with links below
          </div>
        )}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <VerifyLink href={Links.cultureProfileUrl(company)} label="Culture" />
          <VerifyLink href={Links.redditSearchUrl(company)} label="Reddit" />
          <VerifyLink href={Links.openCorporatesUrl(company)} label="Registry" />
        </div>
      </Section>

      {/* COACH TIP */}
      <div className="rounded-md bg-primary/5 border border-primary/10 p-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
          <Lightbulb size={12} />
          Coach Tip
        </div>
        <div className="text-xs text-foreground">{overview.coachTip}</div>
      </div>

      {/* RECOMMENDED ACTIONS */}
      <div className="flex flex-wrap gap-1.5">
        {overview.recommendedActions.map((action, i) => (
          <ActionBadge key={i} action={action} />
        ))}
      </div>
    </div>
  )
}

// ── Helper components ──

function Section({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="label-mono flex items-center gap-1 pb-1.5">
        {icon} {label}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function VerifyLink({ href, label }: { href: string; label: string }) {
  if (href === '#') return null // don't render broken links for stubbed Phase 2
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary hover:underline"
    >
      {label} &nearr;
    </a>
  )
}

function ActionBadge({
  action,
}: {
  action: SmartOverviewResult['recommendedActions'][number]
}) {
  const colors: Record<string, string> = {
    high: 'bg-primary text-primary-foreground',
    medium: 'bg-accent-soft text-foreground',
    low: 'bg-muted text-muted-foreground',
  }

  const labels: Record<string, string> = {
    tailor_resume: 'Tailor Resume',
    cover_letter: 'Cover Letter',
    practice_interview: 'Practice Interview',
    apply: 'Apply',
    skip: 'Skip',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-xs px-2 py-0.5 text-[10px] font-medium',
        colors[action.priority] || colors.low,
      )}
      title={action.reason}
    >
      {labels[action.action] || action.action}
    </span>
  )
}

// ── Salary helpers ──

function salaryIcon(assessment: string) {
  switch (assessment) {
    case 'above_market':
      return <TrendingUp size={10} className="inline" />
    case 'below_market':
      return <TrendingDown size={10} className="inline" />
    default:
      return <Minus size={10} className="inline" />
  }
}

function salaryLabel(assessment: string): string {
  switch (assessment) {
    case 'above_market':
      return 'Above Market'
    case 'below_market':
      return 'Below Market'
    case 'fair':
      return 'Fair'
    default:
      return 'Unknown'
  }
}
