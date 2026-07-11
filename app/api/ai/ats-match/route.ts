import { NextRequest, NextResponse } from 'next/server'
import { generateObjectWithFailover } from '~/lib/ai-providers'
import { getSessionUser } from '~/lib/auth-helpers'
import { checkRateLimit } from '~/lib/ratelimit'
import { z } from 'zod'
import { captureServerError } from '~/lib/posthog-server'

export const maxDuration = 60

const AtsInputBody = z.object({
  resume: z.record(z.unknown()),
  jdText: z.string().min(10).max(20000),
})

const AtsSchema = z.object({
  score: z.number().min(0).max(100),
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

    const result = await generateObjectWithFailover<z.infer<typeof AtsSchema>>({
      system: `You are an ATS (Applicant Tracking System) expert.
You analyze a resume against a job description.

Be strict but fair. Only count a keyword as "matched" if it appears with similar meaning.
Group related terms (e.g., "React" and "React.js" should match).`,
      prompt: `Resume: ${JSON.stringify(resume)}\n\nJob Description: ${jdText}`,
      schema: AtsSchema,
      temperature: 0.3,
      maxOutputTokens: 800,
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
