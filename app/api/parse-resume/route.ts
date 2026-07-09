import { NextRequest, NextResponse } from 'next/server'
import { generateWithFailover } from '~/lib/ai-providers'

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

    if (!text || text.trim().length < 20) {
      return NextResponse.json(
        { error: 'Resume text is too short. Please paste more content.' },
        { status: 400 },
      )
    }

    const result = await generateWithFailover({
      system: `You are a resume parser. Extract structured information from resume text.

Return ONLY a JSON object (no markdown) with this exact shape:
{
  "name": "Full Name",
  "email": "email@example.com",
  "location": "City, State",
  "summary": "Professional summary (max 2 sentences)",
  "skills": ["Skill1", "Skill2", ...],
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "dates": "Start - End",
      "bullets": ["Achievement 1", "Achievement 2"]
    }
  ],
  "role": "Primary role/title for this person (e.g. 'Senior Frontend Engineer')"
}

Rules:
- Extract ONLY what's in the text. Don't fabricate.
- If a field isn't present, use empty string or empty array.
- Skills should be individual technologies/tools (e.g. "React", not "Frontend Development")
- Keep bullet points concise (one line each)
- Return ONLY the JSON.`,
      prompt: text.slice(0, 8000), // Cap at 8K chars to stay within token limits
      temperature: 0.2,
      maxOutputTokens: 1500,
    })

    const jsonMatch = result.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('AI returned invalid JSON')
    }

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json(parsed)
  } catch (error) {
    console.error('[parse-resume] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse resume' },
      { status: 500 },
    )
  }
}
