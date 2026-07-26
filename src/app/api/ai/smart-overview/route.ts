import { NextResponse } from 'next/server'
import { generateObjectWithFailover } from '~/lib/ai-providers'
import { withAuth } from '~/lib/with-auth'
import { captureServerEvent } from '~/lib/posthog-server'
import { getRedis } from '~/lib/redis'
import { gateFeature, recordUsage } from '~/lib/plan'
import { z } from 'zod'

export const maxDuration = 60

// ── Response schema ──
const SmartOverviewSchema = z.object({
  verdict: z.enum(['strong_fit', 'good_fit', 'stretch', 'weak_fit', 'skip']),
  verdictLabel: z.string(),
  headline: z.string(),
  matchAnalysis: z.object({
    strengths: z.array(z.string()).max(5),
    gaps: z.array(z.string()).max(5),
    insight: z.string(),
  }),
  roleSummary: z.array(z.string()).max(4),
  salaryCheck: z
    .object({
      listed: z.string().optional(),
      estimate: z.string().optional(),
      assessment: z.enum(['above_market', 'fair', 'below_market', 'unknown']),
      note: z.string().optional(),
    })
    .optional(),
  commuteEstimate: z
    .object({
      summary: z.string(),
      monthlyCostEstimate: z.string().optional(),
      note: z.string().optional(),
    })
    .optional(),
  companySnapshot: z.object({
    description: z.string(),
    known: z.boolean(),
    note: z.string().optional(),
  }),
  coachTip: z.string(),
  recommendedActions: z
    .array(
      z.object({
        action: z.enum(['tailor_resume', 'cover_letter', 'practice_interview', 'apply', 'skip']),
        priority: z.enum(['high', 'medium', 'low']),
        reason: z.string(),
      }),
    )
    .max(4),
})

// ── Input body schema ──
const InputBody = z.object({
  jdText: z.string().max(20000).optional().default(''),
  resumeData: z.any().optional().nullable(),
  homeLocation: z.string().optional().nullable(),
  jobLocation: z.string().optional().nullable(),
  salary: z.string().optional().nullable(),
  company: z.string(),
  jobTitle: z.string(),
  matchScore: z.number().optional().nullable(),
  matchedSkills: z.array(z.string()).optional().default([]),
  missingSkills: z.array(z.string()).optional().default([]),
  applicationId: z.string().optional().nullable(),
})

export const POST = withAuth(
  async (req, { user }) => {
    const body = InputBody.safeParse(await req.json())
    if (!body.success) {
      return NextResponse.json({ error: 'Invalid request', details: body.error.flatten() }, { status: 400 })
    }

    const {
      jdText,
      resumeData,
      homeLocation,
      jobLocation,
      salary,
      company,
      jobTitle,
      matchScore,
      matchedSkills,
      missingSkills,
      applicationId,
    } = body.data

    // ── Cache key ──
    const cacheKey = `smart_overview::${user.id}::${applicationId || `${company}::${jobTitle}`}`

    // ── Check Redis cache (fail-open) ──
    try {
      const redis = getRedis()
      const cached = await redis.get(cacheKey)
      if (cached) {
        return NextResponse.json(typeof cached === 'string' ? JSON.parse(cached) : cached)
      }
    } catch {
      // fail-open: continue to generate if Redis is down
    }

    // Gate as 'ats_match' — smart overview is the same daily AI budget.
    // Only gate cache misses so free users can re-open cached overviews.
    const gate = await gateFeature(user.id, 'ats_match', user.role, user.plan)
    if (gate) return gate

    // ── Build prompt ──
    const systemPrompt = `You are an expert career coach analyzing a job for a specific candidate.
You have the candidate's resume, the job description, and match data.

Be DIRECT and HONEST. If the fit is bad, say so. If salary is low, say so.
The candidate trusts you to be truthful, not encouraging.

For salary estimates: use your knowledge of typical salaries for this role in this location.
For commute estimates: use your knowledge of the geography and transit systems.
For company info: if you don't know the company, say so honestly (known: false).

Keep everything concise. This is a quick-read overview, not an essay.

Return a JSON object with EXACTLY this structure:
{
  "verdict": "strong_fit" | "good_fit" | "stretch" | "weak_fit" | "skip",
  "verdictLabel": "short 2-4 word label e.g. Strong Fit, Stretch, Skip",
  "headline": "one punchy sentence summarizing the opportunity",
  "matchAnalysis": {
    "strengths": ["up to 5 concrete strengths"],
    "gaps": ["up to 5 critical gaps"],
    "insight": "one sentence on overall fit trajectory"
  },
  "roleSummary": ["up to 4 bullet points summarizing what the role involves"],
  "salaryCheck": {
    "listed": "the listed salary string or 'Not specified'",
    "estimate": "your market estimate e.g. 'THB 25,000 - 35,000/mo' or omit if truly unknown",
    "assessment": "above_market" | "fair" | "below_market" | "unknown",
    "note": "optional short note on the salary"
  },
  "commuteEstimate": {
    "summary": "one sentence on the commute reality",
    "monthlyCostEstimate": "optional e.g. 'THB 1,500/mo BTS'",
    "note": "optional caveat"
  },
  "companySnapshot": {
    "description": "1-2 sentences on the company if known, or 'Limited public information available.'",
    "known": true | false,
    "note": "optional"
  },
  "coachTip": "one actionable sentence of tough-love advice",
  "recommendedActions": [
    {
      "action": "tailor_resume" | "cover_letter" | "practice_interview" | "apply" | "skip",
      "priority": "high" | "medium" | "low",
      "reason": "why this action and why this priority"
    }
  ]
}

Field rules:
- verdict, verdictLabel, headline, matchAnalysis, roleSummary, companySnapshot, coachTip, recommendedActions are REQUIRED.
- salaryCheck and commuteEstimate are OPTIONAL — include them if you have enough signal, otherwise omit.
- recommendedActions: include 1-4 actions, most important first.
- Be direct and honest. If the fit is bad, verdict should be "weak_fit" or "skip".

You must respond with valid JSON matching the exact schema provided. Do not include markdown, code fences, or any text outside the JSON object.`

    const experienceText =
      resumeData?.experience
        ?.map((e: { role?: string; company?: string; dates?: string }) => `${e.role || ''} at ${e.company || ''} (${e.dates || ''})`)
        .join('; ') || 'None'

    const userPrompt = `Analyze this job for this candidate:

CANDIDATE RESUME:
- Role: ${resumeData?.role || 'Unknown'}
- Skills: ${resumeData?.skills?.join(', ') || 'None listed'}
- Experience: ${experienceText}
- Summary: ${resumeData?.summary || 'None'}

JOB:
- Title: ${jobTitle}
- Company: ${company}
- Location: ${jobLocation || 'Not specified'}
- Salary: ${salary || 'Not listed'}

MATCH DATA (already computed):
- Match score: ${matchScore ?? 'Unknown'}%
- Matched skills: ${matchedSkills.join(', ') || 'None'}
- Missing skills: ${missingSkills.join(', ') || 'None'}

CANDIDATE HOME: ${homeLocation || 'Not set'}

JOB DESCRIPTION:
${jdText?.substring(0, 3000) || 'Not available'}

Provide your analysis as JSON matching the schema.`

    // ── Call AI ──
    let result: z.infer<typeof SmartOverviewSchema>
    try {
      result = await generateObjectWithFailover({
        schema: SmartOverviewSchema,
        system: systemPrompt,
        prompt: userPrompt,
        maxOutputTokens: 4096,
      })
    } catch (err) {
      console.error('[smart-overview] AI generation failed:', err)
      return NextResponse.json(
        { error: 'Failed to generate overview. Please try again.' },
        { status: 503 },
      )
    }

    // ── Cache for 7 days (fail-open) ──
    try {
      const redis = getRedis()
      await redis.set(cacheKey, JSON.stringify(result), { ex: 7 * 24 * 60 * 60 })
    } catch {
      // fail-open: return result even if cache fails
    }

    await recordUsage(user.id, 'ats_match')
    await captureServerEvent(user.id, 'smart_overview_generated')

    return NextResponse.json(result)
  },
  { rateLimitType: 'ai', route: '/api/ai/smart-overview' },
)
