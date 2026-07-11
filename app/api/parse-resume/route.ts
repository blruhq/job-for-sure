import { NextRequest, NextResponse } from 'next/server'
import { generateObjectWithFailover } from '~/lib/ai-providers'
import { getSessionUser } from '~/lib/auth-helpers'
import { checkRateLimit } from '~/lib/ratelimit'
import { z } from 'zod'
import { captureServerEvent } from '~/lib/posthog-server'

export const maxDuration = 60

const ParseResumeSchema = z.object({
  name: z.string().default(''),
  email: z.string().default(''),
  phone: z.string().default(''),
  location: z.string().default(''),
  github: z.string().default(''),
  summary: z.string().default(''),
  skills: z.array(z.string()).default([]),
  experience: z.array(
    z.object({
      company: z.string().default(''),
      role: z.string().default(''),
      dates: z.string().default(''),
      bullets: z.array(z.string()).default([]),
    })
  ).default([]),
  education: z.array(
    z.object({
      institution: z.string().default(''),
      degree: z.string().default(''),
      field: z.string().default(''),
      dates: z.string().default(''),
    })
  ).default([]),
  projects: z.array(
    z.object({
      name: z.string().default(''),
      description: z.string().default(''),
      techStack: z.array(z.string()).default([]),
      link: z.string().default(''),
    })
  ).default([]),
  certifications: z.array(
    z.object({
      name: z.string().default(''),
      issuer: z.string().default(''),
      date: z.string().default(''),
    })
  ).default([]),
  languages: z.array(
    z.object({
      name: z.string().default(''),
      proficiency: z.string().default(''),
    })
  ).default([]),
  role: z.string().default(''),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const limited = await checkRateLimit(user.id)
    if (limited) return limited

    const { text } = await req.json()

    if (!text || text.trim().length < 20) {
      return NextResponse.json(
        { error: 'Resume text is too short. Please paste more content.' },
        { status: 400 },
      )
    }

    const parsed = await generateObjectWithFailover<z.infer<typeof ParseResumeSchema>>({
      system: `You are a resume parser. Extract ALL structured information from resume text.

Rules:
- Extract EVERY section present in the text: experience, education, projects, certifications, languages.
- Extract ONLY what's in the text. Don't fabricate.
- If a field isn't present, use empty string or empty array.
- Skills should be individual technologies/tools (e.g. "React", not "Frontend Development")
- Keep bullet points concise (one line each)
- Return VALID JSON matching the provided schema.`,
      prompt: text.slice(0, 12000), // Cap at 12K chars
      schema: ParseResumeSchema,
      temperature: 0.2,
      maxOutputTokens: 3000,
    })

    await captureServerEvent(user.id, 'resume_uploaded')
    return NextResponse.json(parsed)
  } catch (error) {
    console.error('[parse-resume] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse resume' },
      { status: 500 },
    )
  }
}
