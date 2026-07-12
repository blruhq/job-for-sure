import { NextRequest, NextResponse } from 'next/server'
import { generateObjectWithFailover } from '~/lib/ai-providers'
import { getSessionUser } from '~/lib/auth-helpers'
import { checkRateLimit } from '~/lib/ratelimit'
import { extractTextFromFile, UnsupportedFileError } from '~/lib/resume-extract'
import { z } from 'zod'
import { captureServerEvent, captureServerError } from '~/lib/posthog-server'

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

/**
 * POST /api/parse-resume
 *
 * Accepts TWO content types:
 * 1. multipart/form-data with "file" field → server extracts text
 * 2. application/json with { text: string } → use text directly (backward compat)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const limited = await checkRateLimit(user.id)
    if (limited) return limited

    // ── Determine input mode ──
    const contentType = req.headers.get('content-type') || ''
    let text: string

    if (contentType.includes('multipart/form-data')) {
      // File upload mode — server extracts text
      const formData = await req.formData()
      const file = formData.get('file')

      if (!file || !(file instanceof File)) {
        return NextResponse.json(
          { error: 'No file provided. Upload a .pdf, .docx, .txt, or .md file.' },
          { status: 400 },
        )
      }

      try {
        text = await extractTextFromFile(file)
      } catch (err) {
        if (err instanceof UnsupportedFileError) {
          return NextResponse.json({ error: err.message }, { status: 400 })
        }
        throw err
      }
    } else {
      // JSON text mode (backward compat for paste-text paths)
      const body = z.object({ text: z.string().min(20).max(50000) }).safeParse(await req.json())
      if (!body.success) {
        return NextResponse.json(
          { error: 'Resume text is too short or too long.' },
          { status: 400 },
        )
      }
      text = body.data.text
    }

    // ── Debug Logging ──
    console.log('[parse-resume] Extracted text length:', text.length)
    console.log('[parse-resume] Extracted text preview (first 500 chars):')
    console.log('--------------------------------------------------')
    console.log(text.slice(0, 500))
    console.log('--------------------------------------------------')

    // ── AI parse ──
    const parsed = await generateObjectWithFailover<z.infer<typeof ParseResumeSchema>>({
      system: `You are a resume parser. Extract ALL structured information from resume text.

Rules:
- Extract EVERY section present in the text: experience, education, projects, certifications, languages, open source contributions.
- "role" field is REQUIRED. NEVER return empty string. Infer the primary job title from the candidate's experience, summary, or skills.
  Examples: "Software Engineer", "Frontend Developer", "Data Analyst", "Product Manager", "UX Designer".
- Extract ONLY what's in the text. Don't fabricate.
- If a field isn't present, use empty string or empty array.
- Skills should be individual technologies/tools (e.g. "React", not "Frontend Development").
- Keep bullet points concise (one line each).
- For projects, extract name, description, tech stack, and link if available.
- Return VALID JSON matching the provided schema.`,
      prompt: text.slice(0, 20000), // Cap at 20K chars
      schema: ParseResumeSchema,
      temperature: 0.2,
      maxOutputTokens: 4000,
    })

    // ── Safety net: if AI still returns empty role, infer from skills/summary ──
    if (!parsed.role) {
      const skillsLower = parsed.skills.join(' ').toLowerCase()
      if (skillsLower.includes('frontend') || skillsLower.includes('react') || skillsLower.includes('vue')) {
        parsed.role = 'Frontend Developer'
      } else if (skillsLower.includes('backend') || skillsLower.includes('node') || skillsLower.includes('go') || skillsLower.includes('python')) {
        parsed.role = 'Software Engineer'
      } else if (skillsLower.includes('data') || skillsLower.includes('sql') || skillsLower.includes('python')) {
        parsed.role = 'Data Analyst'
      } else if (parsed.experience.length > 0 && parsed.experience[0].role) {
        parsed.role = parsed.experience[0].role
      } else {
        parsed.role = 'Software Engineer'
      }
    }

    await captureServerEvent(user.id, 'resume_uploaded')
    return NextResponse.json(parsed)
  } catch (error) {
    console.error('[parse-resume] Error:', error)
    await captureServerError('anonymous', error, { route: '/api/parse-resume' })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse resume' },
      { status: 500 },
    )
  }
}
