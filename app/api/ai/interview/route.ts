import { NextRequest, NextResponse } from 'next/server'
import { auth } from '~/lib/auth'
import { headers } from 'next/headers'
import { generateObjectWithFailover } from '~/lib/ai-providers'
import { captureServerEvent } from '~/lib/posthog-server'
import { db } from '~/lib/db'
import { interviewSessions } from '~/lib/schema'
import { eq, desc, and } from 'drizzle-orm'
import { z } from 'zod'

export const maxDuration = 60

async function getSessionUser() {
  const h = await headers()
  const session = await auth.api.getSession({ headers: h })
  return session?.user ?? null
}

const InterviewQuestionSchema = z.object({
  question: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
})

const InterviewEvaluateSchema = z.object({
  score: z.number().min(1).max(10),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  modelAnswer: z.string(),
})

// GET /api/ai/interview - Retrieve past interview history for the logged-in user
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const history = await db
      .select()
      .from(interviewSessions)
      .where(eq(interviewSessions.userId, user.id))
      .orderBy(desc(interviewSessions.createdAt))

    return NextResponse.json(history)
  } catch (error) {
    console.error('Interview history fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch interview history' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action } = body

    if (action === 'question') {
      const { resume, target, config, previousQuestions = [] } = body
      const { company, role } = target
      const { type, difficulty, missingSkills = [], transferableSkills = [], matchScore } = config

      // Base resume information (summary + list of skills + basic experience description)
      const resumeContext = resume
        ? `Resume Summary: ${resume.summary || 'None'}
Skills: ${(resume.skills || []).join(', ')}
Experience: ${(resume.experience || []).map((exp: any) => `${exp.role} at ${exp.company} (${exp.dates || ''}): ${exp.bullets ? exp.bullets.join('; ') : ''}`).join('\n')}`
        : 'No resume provided.'

      const missingSection = missingSkills.length > 0
        ? `Here are the candidate's skill gaps (missing from their profile but highly relevant for this role):
${missingSkills.map((s: string) => `- ${s}`).join('\n')}
Please weight the generated question toward testing or probing these missing skills, particularly system design, if relevant for technical interviews.`
        : ''

      const transferableSection = transferableSkills.length > 0
        ? `Here are some transferable skills the candidate possesses:
${transferableSkills.map((s: string) => `- ${s}`).join('\n')}
You may choose to validate these skills and see how they apply to the target role.`
        : ''

      const matchScoreSection = matchScore !== undefined
        ? `The candidate's overall ATS match score for this role is ${matchScore}/100.`
        : ''

      const avoidSection = previousQuestions.length > 0
        ? `DO NOT repeat or generate any of the following questions that were already asked:
${previousQuestions.map((q: string) => `- ${q}`).join('\n')}`
        : ''

      const systemPrompt = `You are an expert interviewer at ${company} interviewing for the ${role} position.
Your goal is to conduct a realistic, high-quality interview.
Generate exactly ONE interview question.

Candidate Context:
${resumeContext}
${matchScoreSection}

Interview Configuration:
- Focus Type: ${type} (can be 'behavioral', 'technical', or 'mixed')
- Difficulty Level: ${difficulty} (entry, mid, or senior)

Targeted Assessment Info:
${missingSection}
${transferableSection}

${avoidSection}

Instructions:
1. Generate ONE realistic interview question appropriate for ${company} and ${role}.
2. Ensure the question matches the requested difficulty (${difficulty}) and type (${type}).
3. If type is technical, ask a programming, architecture, or domain-specific problem. If behavioral, ask a scenario-based or past-experience question. If mixed, choose one.
4. Identify a category ('behavioral' or 'technical') and 1-3 tags (e.g. "system-design", "leadership", "react", "conflict-resolution").`

      const result = await generateObjectWithFailover<z.infer<typeof InterviewQuestionSchema>>({
        system: systemPrompt,
        prompt: 'Generate the next targeted interview question.',
        schema: InterviewQuestionSchema,
        temperature: 0.7,
        maxOutputTokens: 800,
      })

      await captureServerEvent(user.id, 'interview_started', { company, role, type, difficulty })
      return NextResponse.json(result)

    } else if (action === 'evaluate') {
      const { target, question, answer } = body
      const { company, role } = target

      const systemPrompt = `You are an expert interview evaluator.
Your job is to evaluate a candidate's answer to an interview question for the role of ${role} at ${company}.

Question: ${question}
Candidate's Answer: ${answer}

Evaluation criteria:
1. STAR structure (Situation, Task, Action, Result) for behavioral questions.
2. Specificity and depth of technical/domain knowledge for technical questions.
3. Quantification of results (e.g., "reduced latency by 20%", "led a team of 4").
4. Relevance to the role of ${role} at ${company}.

Return your evaluation as a raw JSON object with exactly these fields:
- "score": a number from 1 to 10
- "strengths": an array of strings, listing what the candidate did well
- "improvements": an array of strings, listing specific areas to improve
- "modelAnswer": a string containing an ideal answer the candidate could have given`

      const result = await generateObjectWithFailover<z.infer<typeof InterviewEvaluateSchema>>({
        system: systemPrompt,
        prompt: 'Evaluate the candidate answer.',
        schema: InterviewEvaluateSchema,
        temperature: 0.3,
        maxOutputTokens: 800,
      })

      return NextResponse.json(result)
    } else if (action === 'save') {
      const { resumeId, company, role, type, difficulty, score, exchanges } = body
      if (!company || !role || !score || !exchanges) {
        return NextResponse.json({ error: 'Missing required session parameters' }, { status: 400 })
      }
      const id = 'int_' + Date.now() + '_' + Math.random().toString(36).substring(7)
      await db.insert(interviewSessions).values({
        id,
        userId: user.id,
        resumeId: resumeId || null,
        company,
        role,
        type,
        difficulty,
        score: String(score),
        exchanges,
      })
      return NextResponse.json({ success: true, id })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Interview API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Interview operation failed' },
      { status: 500 },
    )
  }
}
