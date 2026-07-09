import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function POST(req: NextRequest) {
  try {
    const { resume, jdText } = await req.json()

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      messages: [
        {
          role: 'system',
          content: `You are an ATS (Applicant Tracking System) expert.
You analyze a resume against a job description and return a JSON object with:
{
  "score": number (0-100),
  "matched": string[] (keywords found in both),
  "missing": string[] (keywords from the JD not found in the resume),
  "suggestions": string[] (specific improvement tips)
}

Be strict but fair. Only count a keyword as "matched" if it appears with similar meaning.
Group related terms (e.g., "React" and "React.js" should match).`,
        },
        {
          role: 'user',
          content: JSON.stringify({ resume, jobDescription: jdText }),
        },
      ],
    })

    const result = JSON.parse(text)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'ATS analysis failed' },
      { status: 500 },
    )
  }
}
