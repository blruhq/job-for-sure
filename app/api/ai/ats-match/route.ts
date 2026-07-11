import { NextRequest, NextResponse } from 'next/server'
import { generateObjectWithFailover } from '~/lib/ai-providers'
import { getSessionUser } from '~/lib/auth-helpers'
import { checkRateLimit } from '~/lib/ratelimit'
import { z } from 'zod'
import { captureServerError } from '~/lib/posthog-server'

export const maxDuration = 60

const AtsInputBody = z.object({
  resume: z.record(z.unknown()),
  jdText: z.string().max(20000).optional().nullable(),
})

const AtsSchema = z.object({
  score: z.number().min(0).max(100),
  categories: z.array(
    z.object({
      name: z.string(),
      score: z.number().min(0).max(100),
      evidence: z.string(),
    })
  ),
  matched: z.array(z.string()),
  missing: z.array(z.string()),
  suggestions: z.array(z.string()),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const limited = await checkRateLimit(user.id)
    if (limited) return limited

    const body = AtsInputBody.safeParse(await req.json())
    if (!body.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    const { resume, jdText } = body.data
    const hasJd = !!jdText && jdText.trim().length > 0

    const systemPrompt = hasJd
      ? `You are an ATS (Applicant Tracking System) expert.
You analyze a resume against a target job description (JD) to evaluate match quality and gaps.
Be strict but fair. Only count a keyword/skill as "matched" if it appears with similar meaning.
Provide a multi-dimensional match score with the following categories:
1. "Skills Match" (0-100): How well do the technical and soft skills align with requirements.
2. "Experience Fit" (0-100): Does their work history demonstrate the correct domain and seniority.
3. "Impact Relevance" (0-100): Are accomplishments framed in ways that matter for this specific role.

List matched and missing keywords/skills from the JD, and provide concrete suggestions on how to improve the resume for this job.`
      : `You are a professional resume reviewer and ATS format auditor.
You analyze a resume in isolation to evaluate its overall quality, formatting, and impact.
Provide a multi-dimensional health score with the following categories:
1. "ATS Format" (0-100): Readability, standard sections, clean layout structure, parsing capability.
2. "Impact Language" (0-100): Use of action verbs, metrics, percentages, and quantifiable achievements.
3. "Skills Density" (0-100): Clearly labeled and well-structured skills presentation.
4. "Completeness" (0-100): Presence of summary, contact details, work history, and education.

List matched/strong areas as "matched", weaknesses/missing aspects as "missing", and provide concrete suggestions for improvements.`

    const userPrompt = hasJd
      ? `Resume Data: ${JSON.stringify(resume)}\n\nJob Description: ${jdText}`
      : `Resume Data: ${JSON.stringify(resume)}`

    const result = await generateObjectWithFailover<z.infer<typeof AtsSchema>>({
      system: systemPrompt,
      prompt: userPrompt,
      schema: AtsSchema,
      temperature: 0.3,
      maxOutputTokens: 1000,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[ats-match] Error:', error)
    await captureServerError('anonymous', error, { route: '/api/ai/ats-match' })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'ATS analysis failed' },
      { status: 500 },
    )
  }
}
