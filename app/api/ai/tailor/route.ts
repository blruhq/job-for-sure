import { NextRequest, NextResponse } from 'next/server'
import { generateObjectWithFailover } from '~/lib/ai-providers'
import { getSessionUser } from '~/lib/auth-helpers'
import { checkRateLimit } from '~/lib/ratelimit'
import { z } from 'zod'
import { captureServerError } from '~/lib/posthog-server'

export const maxDuration = 60

const TailorSchema = z.object({
  optimized: z.object({
    name: z.string(),
    persona: z.string().optional(),
    summary: z.string(),
    skills: z.array(z.string()),
    experience: z.array(
      z.object({
        company: z.string(),
        role: z.string(),
        dates: z.string(),
        bullets: z.array(z.string()),
      })
    ),
  }).passthrough(),
  changes: z.array(
    z.object({
      field: z.string(),
      before: z.string(),
      after: z.string(),
    })
  ),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const limited = await checkRateLimit(user.id)
    if (limited) return limited

    const { resume, job } = await req.json()

    const result = await generateObjectWithFailover<z.infer<typeof TailorSchema>>({
      system: `You are a professional resume optimization expert. 
You receive a candidate's resume data and optimization instructions.
You return a JSON object with:
1. "optimized": the full resume object with rewritten content optimized for the target job instructions
2. "changes": an array of {field, before, after} objects describing what changed

Rules:
- NEVER fabricate experience, skills, or credentials not in the original resume
- Rewrite experience bullets to use keywords and terminology from the instructions/job details
- Reorder skills so the most relevant ones appear first
- Adjust the professional summary to reflect the target role
- Keep the same length or shorter than original
- Preserve all dates, company names, and factual data
- Always output the optimized resume fields (summary, experience bullets, skills, persona) in the same language as the INPUT resume. Do not translate the resume content to another language. If the input resume is in Thai, output in Thai. If in English, output in English.`,
      prompt: JSON.stringify({ resume, job }),
      schema: TailorSchema,
      temperature: 0.4,
      maxOutputTokens: 2048,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[tailor] Error:', error)
    await captureServerError('anonymous', error, { route: '/api/ai/tailor' })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to tailor resume' },
      { status: 500 },
    )
  }
}
