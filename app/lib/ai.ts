import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import type { ResumeData, JobDescription } from '~/types/resume'

/**
 * Tailor a resume to match a specific job description.
 * Uses AI to rewrite experience bullets, reorder skills, and adjust summary.
 */
export async function tailorResume(
  resume: ResumeData,
  job: JobDescription,
): Promise<{
  optimized: ResumeData
  changes: { field: string; before: string; after: string }[]
}> {
  const prompt = buildTailorPrompt(resume, job)

  const { text } = await generateText({
    model: openai('gpt-4o-mini'),
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
- Preserve all dates, company names, institutions, and factual data
- If a section has no changes, keep the original content`,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.3,
    maxOutputTokens: 4096,
  })

  // Parse the JSON response
  const result = parseAIResponse(text)

  return {
    optimized: result.optimized,
    changes: result.changes,
  }
}

/**
 * Analyze a resume against a JD and return an ATS match score + keyword gaps.
 */
export async function analyzeAtsMatch(
  resume: ResumeData,
  jobDescription: string,
): Promise<{
  score: number
  matchedKeywords: string[]
  missingKeywords: string[]
  suggestions: string[]
}> {
  const prompt = `You are an ATS (Applicant Tracking System) expert.

Analyze how well this resume matches the job description.

Resume skills: ${resume.skills.map(s => s.name).join(', ')}
Resume summary: ${resume.summary}
Resume experience roles: ${resume.experience.map(e => `${e.role} at ${e.company}`).join('; ')}

Job Description:
${jobDescription}

Return a JSON object with:
{
  "score": <number 0-100>,
  "matchedKeywords": <array of keywords found in both>,
  "missingKeywords": <array of keywords in JD but missing from resume>,
  "suggestions": <array of 3-5 specific suggestions to improve match>
}`

  const { text } = await generateText({
    model: openai('gpt-4o-mini'),
    messages: [
      {
        role: 'system',
        content: 'You are an ATS optimization expert. Return only valid JSON.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.2,
    maxOutputTokens: 2048,
  })

  return JSON.parse(cleanJSON(text))
}

// ─── Helpers ────────────────────────────────────────────────

function buildTailorPrompt(resume: ResumeData, job: JobDescription): string {
  return `Optimize this resume for the target job.

## Target Job
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description: ${job.description}
Requirements: ${job.requirements.join('; ')}
Qualifications: ${job.qualifications.join('; ')}

## Original Resume (JSON)
${JSON.stringify(resume, null, 2)}

Return the optimized resume as a valid JSON object shaped exactly like the ResumeData interface, plus a "changes" array.`
}

function parseAIResponse(text: string): { optimized: ResumeData; changes: { field: string; before: string; after: string }[] } {
  const cleaned = cleanJSON(text)
  try {
    const parsed = JSON.parse(cleaned)
    return {
      optimized: parsed.optimized || parsed,
      changes: parsed.changes || [],
    }
  } catch {
    // If parsing fails, return original resume with empty changes
    return {
      optimized: JSON.parse(cleaned),
      changes: [],
    }
  }
}

function cleanJSON(text: string): string {
  // Strip markdown code fences if present
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/```(?:json)?\n?/g, '').trim()
  }
  return cleaned
}

/**
 * Generate interview questions based on the job description and resume.
 */
export async function generateInterviewQuestions(
  job: JobDescription,
  resume: ResumeData,
): Promise<string[]> {
  const { text } = await generateText({
    model: openai('gpt-4o-mini'),
    messages: [
      {
        role: 'system',
        content: 'You are an interview preparation expert. Generate likely interview questions based on the job and candidate background.',
      },
      {
        role: 'user',
        content: `Job: ${job.title} at ${job.company}
JD: ${job.description}

Candidate background: ${resume.experience.map(e => `${e.role} at ${e.company}`).join('; ')}
Skills: ${resume.skills.map(s => s.name).join(', ')}

Generate 5 likely interview questions as a JSON array of strings.`,
      },
    ],
    temperature: 0.5,
    maxOutputTokens: 1024,
  })

  try {
    return JSON.parse(cleanJSON(text))
  } catch {
    return text.split('\n').filter(l => l.trim().startsWith('"')).map(l => l.replace(/^["\s]+|["\s,]+$/g, ''))
  }
}
