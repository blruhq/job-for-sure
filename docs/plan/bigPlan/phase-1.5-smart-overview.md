# Phase 1.5 — Smart AI Overview

> **Time:** 1-2 days
> **Depends on:** Phase 0 (schema fix for jobData) + Phase 1 (panel exists)
> **Status:** Built INTO the Job Detail Panel from Phase 1

> **PHASE 2 DEPENDENCY:** The verification link buttons in this component call URL
> builders from Phase 2 (`~/lib/area-links.ts`). If Phase 2 is not yet implemented,
> either (a) implement Phase 2 first (2-3 hours), or (b) stub the `Links.*` functions
> as no-ops that return `#` and add a TODO comment. The component uses:
> - `Links.costOfLivingUrl(city)` — Numbeo link
> - `Links.directionsUrl(origin, destination)` — Google Maps directions
> - `Links.rome2RioUrl(origin, destination)` — Rome2Rio travel prices
> - `Links.cultureProfileUrl(company)` — jobsbyculture.com link
> - `Links.redditSearchUrl(company)` — Reddit search link
> - `Links.openCorporatesUrl(company)` — OpenCorporates link
>
> **Type file:** Create `src/app/types/smart-overview.ts` and export
> `SmartOverviewResult` from there. Import it in both the component and the API route.

## What & Why

When a user clicks a job (from search results OR Kanban tracker), they see raw JD text + match score + a bunch of link buttons. That's DATA. But the user wants an OPINION: "Should I apply for this job?"

The Smart AI Overview is ONE AI call that synthesizes everything the app knows — JD text, user's resume, match score, salary, location — into a personalized **"Should you apply?" analysis**. It's what your AI career coach would say if you pasted the JD into chat and asked "is this worth my time?"

**This appears in the SAME Job Detail Panel from Phase 1**, which opens from BOTH the job search results AND the Kanban tracker.

## How It Works (Architecture)

```
USER CLICKS "⚡ Generate AI Overview"
         │
         ▼
┌──────────────────────────────────────────────────┐
│ SERVER gathers data you ALREADY HAVE:            │
│                                                  │
│  1. JD text       ← applications.jobData         │
│  2. Resume data   ← active resume from store     │
│  3. Home location ← user settings                │
│  4. Job location  ← applications.location        │
│  5. Salary text   ← applications.salary          │
│  6. Company name  ← applications.company         │
│                                                  │
│  All REAL data from your database.              │
│  ZERO external API calls.                       │
│                                                  │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│ COMBINE INTO ONE AI PROMPT + call DeepSeek V4   │
│ Flash via generateObjectWithFailover()          │
│                                                  │
│ The AI uses:                                     │
│  • REAL DATA from your prompt (resume, match)   │
│  • TRAINING KNOWLEDGE for estimates (salary     │
│    ranges, commute times, company info)         │
│                                                  │
│ ⏱️ 3-5 seconds                                  │
│ 💰 ~$0.002 per call                             │
│ 🔗 ZERO external API calls                      │
│                                                  │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│ CACHE in Redis                                   │
│ Key: smart_overview::{userId}::{applicationId}   │
│ TTL: 7 days (JD doesn't change)                  │
│                                                  │
│ Next time user opens this job → instant (cached)│
│                                                  │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│ DISPLAY in Job Detail Panel                      │
│                                                  │
│ AI sections shown ABOVE raw JD                   │
│ Each AI section has verification LINK next to it │
│                                                  │
│ AI says:  "Salary ~฿85k median for Bangkok"     │
│ Link says: [📊 Verify on Numbeo →]              │
│                                                  │
└──────────────────────────────────────────────────┘
```

## Files to Create

### 1. `src/app/api/ai/smart-overview/route.ts` (NEW)

```typescript
import { NextResponse } from 'next/server'
import { generateObjectWithFailover } from '~/lib/ai-providers'
import { withAuth } from '~/lib/with-auth'
import { captureServerEvent } from '~/lib/posthog-server'
import { getRedis } from '~/lib/redis'
import { z } from 'zod'

// ── Response schema ──
const SmartOverviewSchema = z.object({
  verdict: z.enum(['strong_fit', 'good_fit', 'stretch', 'weak_fit', 'skip']),
  verdictLabel: z.string(), // "GOOD FIT — APPLY WITH CONFIDENCE"
  headline: z.string(), // "78% match · Fair salary · 12 min commute"
  matchAnalysis: z.object({
    strengths: z.array(z.string()).max(5),
    gaps: z.array(z.string()).max(5),
    insight: z.string(), // "Lead with your performance optimization experience"
  }),
  roleSummary: z.array(z.string()).max(4), // ["Build React app", "Lead team of 3", ...]
  salaryCheck: z.object({
    listed: z.string().optional(),
    estimate: z.string().optional(),
    assessment: z.enum(['above_market', 'fair', 'below_market', 'unknown']),
    note: z.string().optional(),
  }).optional(),  // optional — AI may skip if no salary data available
  commuteEstimate: z.object({
    summary: z.string(), // "~12 min by BTS (8 km)"
    monthlyCostEstimate: z.string().optional(), // "~฿1,936/month"
    note: z.string().optional(),
  }).optional(),
  companySnapshot: z.object({
    description: z.string(), // "Series B fintech, 500-1000 employees"
    known: z.boolean(), // false if AI doesn't know the company
    note: z.string().optional(),
  }),
  coachTip: z.string(), // "Apply with Modern template. Add Docker..."
  recommendedActions: z.array(z.object({
    action: z.enum(['tailor_resume', 'cover_letter', 'practice_interview', 'apply', 'skip']),
    priority: z.enum(['high', 'medium', 'low']),
    reason: z.string(),
  })).max(4),
})

export const POST = withAuth(async (req, { user }) => {
  const body = await req.json()
  const { jdText, resumeData, homeLocation, jobLocation, salary, company, jobTitle, matchScore, missingSkills, matchedSkills } = body

  // ── Check Redis cache first ──
  // WARNING: redis.ts exports getRedis() factory, NOT a redis object.
  // Also wrap in try/catch — throws if env vars missing (fail-open per guardrails).
  const cacheKey = `smart_overview::${user.id}::${body.applicationId || company + jobTitle}`
  try {
    const redis = getRedis()
    const cached = await redis.get(cacheKey)
    if (cached) {
      return NextResponse.json(JSON.parse(cached))
    }
  } catch {
    // fail-open: continue to generate if Redis is down
  }

  // ── Build prompt ──
  const systemPrompt = `You are an expert career coach analyzing a job for a specific candidate.
You have the candidate's resume, the job description, and match data.

Be DIRECT and HONEST. If the fit is bad, say so. If salary is low, say so.
The candidate trusts you to be truthful, not encouraging.

For salary estimates: use your knowledge of typical salaries for this role in this location.
For commute estimates: use your knowledge of the geography and transit systems.
For company info: if you don't know the company, say so honestly (known: false).

Keep everything concise. This is a quick-read overview, not an essay.`

  const userPrompt = `Analyze this job for this candidate:

CANDIDATE RESUME:
- Role: ${resumeData?.role || 'Unknown'}
- Skills: ${resumeData?.skills?.join(', ') || 'None listed'}
- Experience: ${resumeData?.experience?.map((e: any) => `${e.role} at ${e.company} (${e.dates})`).join('; ') || 'None'}
- Summary: ${resumeData?.summary || 'None'}

JOB:
- Title: ${jobTitle}
- Company: ${company}
- Location: ${jobLocation || 'Not specified'}
- Salary: ${salary || 'Not listed'}

MATCH DATA (already computed):
- Match score: ${matchScore || 'Unknown'}%
- Matched skills: ${matchedSkills?.join(', ') || 'None'}
- Missing skills: ${missingSkills?.join(', ') || 'None'}

CANDIDATE HOME: ${homeLocation || 'Not set'}

JOB DESCRIPTION:
${jdText?.substring(0, 3000) || 'Not available'}

Provide your analysis as a structured overview.`

  // ── Call AI ──
  // WARNING: generateObjectWithFailover uses { system, prompt, schema }
  // NOT { systemPrompt, userPrompt, schema }
  let result
  try {
    result = await generateObjectWithFailover({
      schema: SmartOverviewSchema,
      system: systemPrompt,
      prompt: userPrompt,
    })
  } catch (err) {
    // AI failed (both primary + fallback down, or invalid output)
    console.error('[smart-overview] AI generation failed:', err)
    return NextResponse.json(
      { error: 'Failed to generate overview. Please try again.' },
      { status: 503 }
    )
  }

  // ── Cache for 7 days ──
  try {
    const redis = getRedis()
    await redis.set(cacheKey, JSON.stringify(result), { ex: 7 * 24 * 60 * 60 })
  } catch {
    // fail-open: return result even if cache fails
  }

  await captureServerEvent(user.id, 'smart_overview_generated')

  return NextResponse.json(result)
}, { rateLimitType: 'ai', route: '/api/ai/smart-overview' })
```

### 2. `src/app/components/pipeline/smart-overview.tsx` (NEW)

The Smart Overview UI component. Shown inside the Job Detail Panel.

**Three states:**

```tsx
'use client'

import { useState } from 'react'
import { Sparkles, RefreshCw, Loader2, TrendingUp, TrendingDown, Minus, Bus, DollarSign, Building2, Lightbulb } from 'lucide-react'
import { cn } from '~/lib/utils'
import type { SmartOverviewResult } from '~/types/smart-overview'
import * as Links from '~/lib/area-links'  // Phase 2 dependency — see warning at top

interface SmartOverviewProps {
  // Job data for generating
  job: {
    company: string
    title: string
    loc: string
    url: string
    score: number
    salary?: string
    jobData?: Record<string, unknown>
  }
  // User data
  resumeData: Record<string, unknown> | null
  homeLocation?: string  // optional — from Phase 2 settings. If empty, commute estimate is skipped.
  // Match data (from existing ats-match or job scoring)
  matchScore: number
  matchedSkills: string[]
  missingSkills: string[]
  // Application ID (for caching)
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
      setOverview(data)
      setState('complete')
    } catch {
      setState('error')
    }
  }

  // ── STATE 0: Error (AI failed) ──
  if (state === 'error') {
    return (
      <div className="rounded-lg border border-destructive/30 bg-danger-soft/20 p-4">
        <p className="text-xs text-foreground mb-2">
          ⚠️ Couldn't generate overview. The AI may be busy.
        </p>
        <button
          onClick={generate}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
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
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
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

function OverviewContent({
  overview,
  onRegenerate,
  company,
  jobLocation,
  homeLocation,
}: {
  overview: SmartOverviewResult
  onRegenerate: () => void
  company: string       // from job.company — used for verification link URLs
  jobLocation: string   // from job.loc — used for verification link URLs
  homeLocation: string  // from settings — used for commute direction URLs
}) {
  return (
    <div className="rounded-lg border border-primary/20 bg-accent-soft/30 p-4 space-y-4">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Sparkles size={14} className="text-primary" />
          AI Overview
        </div>
        <button onClick={onRegenerate} className="text-muted-foreground hover:text-foreground">
          <RefreshCw size={12} />
        </button>
      </div>

      {/* VERDICT (the headline) */}
      <div className={cn(
        'rounded-md p-3',
        overview.verdict === 'strong_fit' || overview.verdict === 'good_fit'
          ? 'bg-success-soft'
          : overview.verdict === 'skip' || overview.verdict === 'weak_fit'
          ? 'bg-danger-soft'
          : 'bg-warn-soft'
      )}>
        <div className="text-sm font-bold text-foreground">{overview.verdictLabel}</div>
        <div className="text-xs text-muted-foreground">{overview.headline}</div>
      </div>

      {/* MATCH ANALYSIS */}
      <Section icon={<TrendingUp size={12} />} label="Why You Fit">
        {overview.matchAnalysis.strengths.map((s, i) => (
          <div key={i} className="flex items-start gap-1.5 text-xs text-foreground">
            <span className="text-success shrink-0">✓</span>
            <span>{s}</span>
          </div>
        ))}
        {overview.matchAnalysis.gaps.map((g, i) => (
          <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <span className="text-destructive shrink-0">✗</span>
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
          <div key={i} className="text-xs text-foreground">• {r}</div>
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
          <div className={cn(
            'text-xs font-semibold',
            overview.salaryCheck.assessment === 'above_market' ? 'text-success' : '',
            overview.salaryCheck.assessment === 'below_market' ? 'text-destructive' : '',
            overview.salaryCheck.assessment === 'fair' ? 'text-primary' : '',
          )}>
            {salaryIcon(overview.salaryCheck.assessment)} {salaryLabel(overview.salaryCheck.assessment)}
          </div>
          {overview.salaryCheck.note && (
            <div className="text-xs text-muted-foreground italic">{overview.salaryCheck.note}</div>
          )}
          {/* Verification link — build URL from Phase 2 area-links.ts */}
          <VerifyLink href={Links.costOfLivingUrl(jobLocation)} label="Verify on Numbeo" />
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
          {/* Verification links — build URLs from Phase 2 area-links.ts */}
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
            Limited info — verify with links below
          </div>
        )}
        {/* Verification links — build URLs from Phase 2 area-links.ts */}
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

function Section({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label-mono flex items-center gap-1 pb-1.5">{icon} {label}</div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function VerifyLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary hover:underline"
    >
      {label} ↗
    </a>
  )
}
```

### 3. Types for Smart Overview result

Add to `src/app/types/resume.ts` or create `src/app/types/smart-overview.ts`:

```typescript
export interface SmartOverviewResult {
  verdict: 'strong_fit' | 'good_fit' | 'stretch' | 'weak_fit' | 'skip'
  verdictLabel: string
  headline: string
  matchAnalysis: {
    strengths: string[]
    gaps: string[]
    insight: string
  }
  roleSummary: string[]
  salaryCheck?: {
    listed?: string
    estimate?: string
    assessment: 'above_market' | 'fair' | 'below_market' | 'unknown'
    note?: string
  }
  commuteEstimate?: {
    summary: string
    monthlyCostEstimate?: string
    note?: string
  }
  companySnapshot: {
    description: string
    known: boolean
    note?: string
  }
  coachTip: string
  recommendedActions: {
    action: 'tailor_resume' | 'cover_letter' | 'practice_interview' | 'apply' | 'skip'
    priority: 'high' | 'medium' | 'low'
    reason: string
  }[]
}
```

## Files to Edit

### 4. `src/app/components/pipeline/job-detail-panel.tsx` (EDIT)

Import and render the Smart Overview at the TOP of the panel (below header, above JD):

```tsx
import { SmartOverview } from './smart-overview'

// Inside the panel render, AFTER header, BEFORE JD:
<SmartOverview
  job={job}
  resumeData={activeResume}
  homeLocation={homeLocation}
  matchScore={job.score}
  matchedSkills={job.jobData?.matchedSkills || []}
  missingSkills={job.jobData?.missingSkills || []}
  applicationId={job.applicationId}
/>

// Raw JD goes BELOW (collapsible after overview is generated):
<details className="...">
  <summary className="text-xs text-muted-foreground cursor-pointer">
    Show full job description
  </summary>
  <div className="mt-2 text-xs text-foreground whitespace-pre-wrap">
    {job.jobData?.description || 'No description available'}
  </div>
</details>
```

### 5. Settings page — ensure home location field exists (from Phase 2)

The Smart Overview needs the user's home location to generate commute estimates. This field is added in Phase 2 but the Smart Overview depends on it. If Phase 2 hasn't been done yet, the overview will show `commuteEstimate: undefined` when home location is empty.

## UI Layout — where everything sits

```
┌─────────────────────────────────────────────────┐
│ Header: title, company, location, score   [×]  │
│ Status dropdown                                  │
╞═════════════════════════════════════════════════╡
│                                                  │
│  ┌── ⚡ SMART OVERVIEW ──────────────────────┐  │ ← AI section (top)
│  │                                           │  │
│  │  ⭐ VERDICT: "Good fit — apply"          │  │
│  │  78% match · Fair salary · 12 min        │  │
│  │                                           │  │
│  │  WHY YOU FIT                              │  │
│  │  ✓ React, TypeScript — your core stack   │  │ ← AI content
│  │  ✗ Docker — missing but optional         │  │ ← AI content
│  │  💡 Lead with performance experience      │  │ ← AI coach tip
│  │                                           │  │
│  │  THE ROLE                                 │  │
│  │  • Build React app serving 2M users      │  │ ← AI content
│  │  • Lead team of 3                         │  │ ← AI content
│  │                                           │  │
│  │  SALARY CHECK                             │  │
│  │  Listed: ฿90-110k                         │  │ ← AI estimate
│  │  Market: ~฿85k (above market)            │  │ ← AI estimate
│  │  [📊 Verify on Numbeo ↗]                 │  │ ← verification link
│  │                                           │  │
│  │  COMMUTE                                  │  │
│  │  ~12 min by BTS (8 km)                   │  │ ← AI estimate
│  │  ~฿1,936/month                           │  │ ← AI estimate
│  │  [🚇 Directions ↗] [💰 Prices ↗]        │  │ ← verification links
│  │                                           │  │
│  │  COMPANY                                  │  │
│  │  Series B fintech, 500-1000 people      │  │ ← AI info (if known)
│  │  [🎭 Culture ↗] [💬 Reddit ↗]            │  │ ← verification links
│  │                                           │  │
│  │  💡 COACH TIP                             │  │
│  │  "Add Docker to resume. Schedule         │  │ ← AI advice
│  │   mock interview for system design."      │  │
│  │                                           │  │
│  │  [✏️ Tailor] [🧠 Interview] [⚡ Apply]  │  │ ← action buttons
│  │                                           │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
╞═════════════════════════════════════════════════╡
│                                                  │
│  [▼ Show full job description]                  │ ← collapsed (raw JD)
│                                                  │
╞═════════════════════════════════════════════════╡
│                                                  │
│  ALL EXTERNAL LINKS (Phase 2 links grouped)     │ ← all links at bottom
│  [Directions] [Prices] [Numbeo] [Hipflat]       │
│  [Culture] [Reddit] [Registry] [Background]     │
│                                                  │
╞═════════════════════════════════════════════════╡
│                                                  │
│  TIMELINE  ● Jul 10 Saved  ● Jul 12 Applied    │
│  NOTES     [Recruiter: Jane Doe...]            │
│                                                  │
└─────────────────────────────────────────────────┘
```

## The relationship between AI content and external links

Each AI section has its verification link **INLINE** (right next to it):

| AI Section | AI says (estimate) | Link says (verification) |
|---|---|---|
| Salary Check | "~฿85k median" | [Verify on Numbeo ↗] |
| Commute | "~12 min by BTS" | [Directions ↗] [Prices ↗] |
| Company | "Series B fintech" | [Culture ↗] [Reddit ↗] |
| Match | "78% match, 3 gaps" | (no link — uses your real ats-match data) |

ALL links also appear at the BOTTOM in a grouped section for quick access.

The AI does NOT call these links. The links are for the USER to verify the AI's estimates.

## Caching

| What | Where | TTL | Key |
|---|---|---|---|
| Smart Overview result | Redis | 7 days | `smart_overview::{userId}::{applicationId}` |
| Match score | Already cached by ats-match | existing | existing |

The overview is generated ONCE per user+job. After that it's instant (cached). User can click [⟳ Regenerate] to force a new generation.

## Verification

```bash
npx tsc --noEmit
pnpm lint
```

Manual tests:
1. Open job from search results → see "Generate AI Overview" button
2. Open job from Kanban tracker → see "Generate AI Overview" button (SAME panel)
3. Click "Generate" → loading spinner for 3-5 seconds
4. Overview appears with: verdict, match analysis, role summary, salary, commute, company, coach tip
5. Each section has verification links next to it
6. Click "Verify on Numbeo" → opens Numbeo in new tab
7. Click "Directions" → opens Google Maps in new tab
8. Close panel, reopen → overview is cached (instant)
9. Click "Regenerate" → new overview generated
10. Raw JD is collapsed below the overview
11. Expand "Show full job description" → JD text visible

## Acceptance Criteria

- [ ] POST `/api/ai/smart-overview` returns structured JSON
- [ ] Uses `generateObjectWithFailover` (NOT direct AI SDK)
- [ ] Uses REAL data (resume, match score, JD text) from your database
- [ ] Uses AI TRAINING KNOWLEDGE for estimates (salary, commute, company)
- [ ] ZERO external API calls in the route
- [ ] Cached in Redis (7-day TTL, key: `smart_overview::{userId}::{applicationId}`)
- [ ] Fail-open if Redis is down (still returns result)
- [ ] Smart Overview component shows in the Job Detail Panel
- [ ] Three states: idle (button), loading (spinner), complete (overview)
- [ ] Verdict is the HEADLINE (colored by fit quality)
- [ ] Each AI section has verification link(s) next to it
- [ ] Verification links open in new tab (`target="_blank" rel="noopener"`)
- [ ] Raw JD is collapsible BELOW the overview
- [ ] Regenerate button works
- [ ] Overview appears in BOTH search results panel AND Kanban panel
- [ ] Rate limited (rateLimitType: 'ai')
- [ ] `npx tsc --noEmit` passes
- [ ] `pnpm lint` passes
