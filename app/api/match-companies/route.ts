import { NextRequest, NextResponse } from 'next/server'
import { generateObjectWithFailover } from '~/lib/ai-providers'
import { companyColor, companyLogo } from '~/lib/company-data'
import { auth } from '~/lib/auth'
import { headers } from 'next/headers'
import { z } from 'zod'

export const maxDuration = 60

async function getSessionUser() {
  const h = await headers()
  const session = await auth.api.getSession({ headers: h })
  return session?.user ?? null
}

const MatchSchema = z.object({
  score: z.number().min(0).max(100),
  direct: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      loc: z.string(),
      work: z.string(),
      visa: z.boolean(),
      salary: z.string(),
      score: z.number().min(0).max(100),
      level: z.string(),
      url: z.string(),
      missing: z.array(z.string()),
      transferable: z.array(z.string()),
    })
  ),
  stretch: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      loc: z.string(),
      work: z.string(),
      visa: z.boolean(),
      salary: z.string(),
      score: z.number().min(0).max(100),
      level: z.string(),
      url: z.string(),
      missing: z.array(z.string()),
      transferable: z.array(z.string()),
    })
  ),
})

type MatchResult = z.infer<typeof MatchSchema>

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { skills, role, summary, experience } = await req.json()

    const result = await generateObjectWithFailover<MatchResult>({
      system: `You are a technical recruiter and career advisor. Given a candidate's skills, role, and experience, you suggest REAL companies that are currently hiring or commonly hire for these skills.

Rules:
- Suggest 3-4 direct matches (score 75-95%) and 2-3 stretch matches (score 50-74%)
- Use REAL, well-known tech companies (not made-up ones)
- Base the match score on actual skill overlap, not random numbers
- The "missing" array should list SPECIFIC skills the JD would require that the candidate doesn't have
- The "url" should be the actual careers page URL`,
      prompt: JSON.stringify({
        role: role || 'Software Engineer',
        skills: skills || [],
        summary: summary || 'Not provided',
        experience: experience || [],
      }),
      schema: MatchSchema,
      temperature: 0.4,
      maxOutputTokens: 2048,
    })

    // Enrich with UI helpers (logo initials, colors)
    const enrich = (companies: any[]) => (companies || []).map((c) => ({
      ...c,
      logo: companyLogo(c.name),
      color: companyColor(c.name),
    }))

    return NextResponse.json({
      score: result.score || 0,
      direct: enrich(result.direct),
      stretch: enrich(result.stretch),
    })
  } catch (error) {
    console.error('[match-companies] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate matches' },
      { status: 500 },
    )
  }
}
