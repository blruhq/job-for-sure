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

  // ── Build full resume context string ──
  const r = context?.activeResume
  const resumeContext = r ? `
The user's FULL resume data (use this for ALL questions about their resume):

## Personal Info
- Name: ${r.persona || 'Not specified'}
- Target Role: ${r.role || 'Not specified'}
- Location: ${r.location || 'Not specified'}
- Email: ${r.email || 'N/A'}
- Phone: ${r.phone || 'N/A'}
- GitHub/Portfolio: ${r.github || 'N/A'}

## Professional Summary
${r.summary || 'Not provided'}

## Skills
${r.skills?.join(', ') || 'None listed'}

## Work Experience
${r.experience?.map((exp: any, i: number) => `${i + 1}. ${exp.role || 'Unknown Role'} at ${exp.company || 'Unknown Company'} (${exp.dates || 'N/A'})
${exp.bullets?.map((b: string) => `   - ${b}`).join('\n') || '   (No details)'}`).join('\n\n') || 'None listed'}

## Education
${r.education?.map((edu: any) => `- ${edu.degree || ''} ${edu.field || ''}, ${edu.institution || ''} (${edu.dates || 'N/A'})`).join('\n') || 'None listed'}

## Projects
${r.projects?.map((p: any, i: number) => `${i + 1}. ${p.name || 'Untitled'}${p.link ? ` (${p.link})` : ''}
   ${p.description || 'No description'}
   Tech: ${p.techStack?.join(', ') || 'N/A'}`).join('\n\n') || 'None listed'}

## Certifications
${r.certifications?.map((c: any) => `- ${c.name || ''} — ${c.issuer || ''} (${c.date || 'N/A'})`).join('\n') || 'None listed'}

## Languages
${r.languages?.map((l: any) => `- ${l.name || ''} (${l.proficiency || ''})`).join('\n') || 'None listed'}

## Additional Sections
${r.customSections?.map((s: any) => `### ${s.title}\n${s.bullets?.map((b: string) => `- ${b}`).join('\n') || '(empty)'}`).join('\n\n') || 'None'}
` : ''

  const systemPrompt = `You are Job For Sure — an AI career coach embedded in a job search app.

Your capabilities:
- Analyze resumes and give specific, actionable feedback
- Suggest improvements to skills, summary, and experience descriptions
- Tailor resumes for specific job descriptions
- Provide interview preparation advice
- Give salary negotiation guidance
- Help users decide which roles to target
${resumeContext}
Rules:
- You have the user's FULL resume data above. Reference specific experience, projects, and education when giving feedback.
- NEVER say "No experience" or "No projects" if the data above contains them.
- Be concise and direct. No fluff.
- Use markdown formatting (bold, lists) for readability.
- For salary advice, give specific bands and negotiation tips.
- For interview prep, give specific questions based on their skills and experience.
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
