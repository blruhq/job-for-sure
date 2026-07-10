import { NextRequest, NextResponse } from 'next/server'
import { generateWithFailover } from '~/lib/ai-providers'
import { auth } from '~/lib/auth'
import { headers } from 'next/headers'

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

    const text = await generateWithFailover({
      system: `You are an ATS (Applicant Tracking System) expert.
You analyze a resume against a job description and return a JSON object with:
{
  "score": number (0-100),
  "matched": string[] (keywords found in both),
  "missing": string[] (keywords from the JD not found in the resume),
  "suggestions": string[] (specific improvement tips)
}

Be strict but fair. Only count a keyword as "matched" if it appears with similar meaning.
Group related terms (e.g., "React" and "React.js" should match).

Return ONLY the JSON object, no markdown formatting.`,
      prompt: `Resume: ${JSON.stringify(resume)}\n\nJob Description: ${jdText}`,
      temperature: 0.3,
      maxOutputTokens: 800,
    })

    // Extract JSON from the response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'ATS analysis failed' },
      { status: 500 },
    )
  }
}
