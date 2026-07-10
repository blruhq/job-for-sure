import { NextRequest, NextResponse } from 'next/server'
import { generateObjectWithFailover } from '~/lib/ai-providers'
import { auth } from '~/lib/auth'
import { headers } from 'next/headers'
import { z } from 'zod'

export const maxDuration = 60

async function getSessionUser() {
  const h = await headers()
  const session = await auth.api.getSession({ headers: h })
  return session?.user ?? null
}

const ParseResumeSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  github: z.string(),
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
  education: z.array(
    z.object({
      institution: z.string(),
      degree: z.string(),
      field: z.string(),
      dates: z.string(),
    })
  ),
  projects: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      techStack: z.array(z.string()),
      link: z.string(),
    })
  ),
  certifications: z.array(
    z.object({
      name: z.string(),
      issuer: z.string(),
      date: z.string(),
    })
  ),
  languages: z.array(
    z.object({
      name: z.string(),
      proficiency: z.string(),
    })
  ),
  role: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
- Keep bullet points concise (one line each)`,
      prompt: text.slice(0, 12000), // Cap at 12K chars
      schema: ParseResumeSchema,
      temperature: 0.2,
      maxOutputTokens: 3000,
    })

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('[parse-resume] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse resume' },
      { status: 500 },
    )
  }
}
