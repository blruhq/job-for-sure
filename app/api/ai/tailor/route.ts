import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function POST(req: NextRequest) {
  try {
    const { resume, job } = await req.json()

    const { text } = await generateText({
      model: openai.chat('glm-4.5-air'),
      messages: [
        {
          role: 'system',
          content: `You are a professional resume optimization expert. 
You receive a candidate's resume data and a job description.
You return a JSON object with two fields:
1. "optimized": the full ResumeData object with rewritten content optimized for the job
2. "changes": an array of {field, before, after} objects describing what changed

Rules:
- NEVER fabricate experience, skills, or credentials not in the original resume
- Rewrite experience bullets to use keywords and terminology from the job description
- Reorder skills so the most relevant ones for this job appear first
- Adjust the professional summary to reflect the target role
- Keep the same length or shorter than original
- Preserve all dates, company names, institutions, and factual data`,
        },
        {
          role: 'user',
          content: JSON.stringify({ resume, job }),
        },
      ],
    })

    const result = JSON.parse(text)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to tailor resume' },
      { status: 500 },
    )
  }
}
