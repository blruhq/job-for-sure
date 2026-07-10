import { NextRequest, NextResponse } from 'next/server'
import { auth } from '~/lib/auth'
import { headers } from 'next/headers'
import { generateWithFailover } from '~/lib/ai-providers'

async function getSessionUser() {
  const h = await headers()
  const session = await auth.api.getSession({ headers: h })
  return session?.user ?? null
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
3. Return your response in STRICT JSON format matching the schema below. No conversational text outside JSON. No markdown backticks.
4. If type is technical, ask a programming, architecture, or domain-specific problem. If behavioral, ask a scenario-based or past-experience question. If mixed, choose one.
5. Identify a category ('behavioral' or 'technical') and 1-3 tags (e.g. "system-design", "leadership", "react", "conflict-resolution").

Response Schema:
{
  "question": "The question text here...",
  "category": "behavioral" | "technical",
  "tags": ["tag1", "tag2"]
}`

      const text = await generateWithFailover({
        system: systemPrompt,
        prompt: 'Generate the next targeted interview question.',
        temperature: 0.7,
        maxOutputTokens: 800,
      })

      const jsonMatch = text.match(/\{[\s\S]*\}/)
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text)
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

Return your response in STRICT JSON format matching the schema below. Provide a fair, constructive evaluation. No markdown wrapper outside the JSON.

Response Schema:
{
  "score": 1-10 (integer rating of the answer quality),
  "strengths": ["bullet point 1", "bullet point 2"],
  "improvements": ["bullet point 1", "bullet point 2"],
  "modelAnswer": "An example of a high-scoring, target-role aligned response to the question."
}`

      const text = await generateWithFailover({
        system: systemPrompt,
        prompt: 'Evaluate the candidate answer.',
        temperature: 0.3,
        maxOutputTokens: 800,
      })

      const jsonMatch = text.match(/\{[\s\S]*\}/)
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text)
      return NextResponse.json(result)
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
