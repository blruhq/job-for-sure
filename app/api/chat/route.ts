import { streamWithFailover } from '~/lib/ai-providers'
import { getSessionUser } from '~/lib/auth-helpers'
import { checkRateLimit } from '~/lib/ratelimit'
import { NextResponse } from 'next/server'
import { captureServerEvent, captureServerError } from '~/lib/posthog-server'
import { z } from 'zod'

export const maxDuration = 30

const ChatBody = z.object({
  messages: z.array(z.any()),
  context: z.any().optional(),
})

export async function POST(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const limited = await checkRateLimit(user.id)
    if (limited) return limited

    const body = ChatBody.safeParse(await req.json())
    if (!body.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { messages, context } = body.data

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
- Display Name: ${context.activeResume.name}
- Target Role: ${context.activeResume.role}
- Candidate Name: ${context.activeResume.persona}
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
- Keep responses under 200 words unless the user asks for detail.
- Respond in the same language the user uses to chat with you (e.g., if they write in Thai, reply in Thai. If they write in English, reply in English). Never switch languages mid-conversation unless the user explicitly asks you to translate something.`

  await captureServerEvent(user.id, 'chat_message_sent')

  return streamWithFailover({
    system: systemPrompt,
    messages,
    temperature: 0.7,
    maxOutputTokens: 1024,
  })
  } catch (error) {
    await captureServerError('anonymous', error, { route: '/api/chat' })
    return NextResponse.json(
      { error: 'Chat failed. Please try again.' },
      { status: 500 },
    )
  }
}
