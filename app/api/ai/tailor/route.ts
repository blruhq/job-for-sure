import { NextResponse } from 'next/server'
import { generateObjectWithFailover } from '~/lib/ai-providers'
import { withAuth } from '~/lib/with-auth'
import { ResumeDataSchema, JobDataSchema } from '~/lib/schemas'
import { z } from 'zod'

export const maxDuration = 60

const TailorInputBody = z.object({
  resume: ResumeDataSchema,
  job: JobDataSchema,
})

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

export const POST = withAuth(async (req, { user: _user }) => {
  const body = TailorInputBody.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const { resume, job } = body.data

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
    prompt: `<resume>${JSON.stringify(resume)}</resume>\n<job>${JSON.stringify(job)}</job>`,
    schema: TailorSchema,
    temperature: 0.4,
    maxOutputTokens: 2048,
  })

  return NextResponse.json(result)
}, { rateLimitType: 'ai', route: '/api/ai/tailor' })
