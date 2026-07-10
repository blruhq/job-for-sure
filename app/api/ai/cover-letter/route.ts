import { NextRequest, NextResponse } from 'next/server'
import { generateTextWithFailover } from '~/lib/ai-providers'
import { auth } from '~/lib/auth'
import { headers } from 'next/headers'

export const maxDuration = 60

async function getSessionUser() {
  const h = await headers()
  const session = await auth.api.getSession({ headers: h })
  return session?.user ?? null
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { resume, jdText } = await req.json()

    let prompt = `Resume:\n${JSON.stringify(resume)}\n\n`
    if (jdText) {
      prompt += `Job Description:\n${jdText}`
    } else {
      const topCompany = resume.companies?.[0]
      if (topCompany) {
        prompt += `Target Role: ${topCompany.role} at ${topCompany.name}. Write a tailored cover letter for this company and position.`
      } else {
        prompt += `Target Role/Persona: ${resume.persona}. Write a professional, general cover letter for roles matching this profile.`
      }
    }

    const text = await generateTextWithFailover({
      system: `You are an expert career coach and professional writer.
You write persuasive, polished, and natural-sounding cover letters.
Write a 3-4 paragraph, 300-400 word cover letter tailored to the provided resume and target job description/role.

Rules:
- Write in a professional, engaging, and confident tone.
- Do NOT use generic placeholder cliches. Keep it punchy and outcome-oriented.
- Highlight specific experience and skills from the resume that match the job description/role.
- Use standard business letter formatting:
  - Salutation (e.g., "Dear Hiring Manager," or "Dear Hiring Team,")
  - Opening paragraph (hooking the reader, stating the role applied for)
  - Body paragraphs (demonstrating value, explaining fit, citing 1-2 major achievements from experience)
  - Closing paragraph (call to action, express enthusiasm, thank them for consideration)
  - Sign-off (e.g., "Sincerely,") followed by the candidate's name (which is ${resume.name}).
- Return ONLY the cover letter text itself. No extra markdown explanation, conversational intro/outro, or styling.`,
      prompt,
      temperature: 0.7,
      maxOutputTokens: 1024,
    })

    return NextResponse.json({ letter: text.trim() })
  } catch (error) {
    console.error('[cover-letter] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cover letter generation failed' },
      { status: 500 },
    )
  }
}
