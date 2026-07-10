import { streamWithFailover } from '~/lib/ai-providers'
import { auth } from '~/lib/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export const maxDuration = 30

async function getSessionUser() {
  const h = await headers()
  const session = await auth.api.getSession({ headers: h })
  return session?.user ?? null
}

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messages, context } = await req.json()

  const systemPrompt = `You are Job For Sure — an AI career coach embedded in a job search app.

Your capabilities:
- Analyze resumes and give specific, actionable feedback
- Suggest improvements to skills, summary, and experience descriptions
- Tailor resumes for specific job descriptions
- Provide interview preparation advice
- Give salary negotiation guidance
- Help users decide which roles to target

${context?.activeResume ? `
The user's active resume profile:
- Name: ${context.activeResume.name}
- Skills: ${context.activeResume.skills?.join(', ') || 'None listed'}
- Summary: ${context.activeResume.summary || 'Not provided'}
` : ''}

Rules:
- Be concise and direct. No fluff.
- Use markdown formatting (bold, lists) for readability.
- Reference the user's skills and experience from the conversation.
- For salary advice, give specific bands and negotiation tips.
- For interview prep, give specific questions based on their skills.
- If the user shares their resume details, remember them for the conversation.
- Keep responses under 200 words unless the user asks for detail.`

  return streamWithFailover({
    system: systemPrompt,
    messages,
    temperature: 0.7,
    maxOutputTokens: 1024,
  })
}
