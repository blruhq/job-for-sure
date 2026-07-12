import { streamWithFailover } from '~/lib/ai-providers'
import { withAuth } from '~/lib/with-auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const maxDuration = 30

const CopilotBody = z.object({
  messages: z.array(z.any()).max(50),
  resume: z.any().optional(),
})

export const POST = withAuth(async (req, { user: _user }) => {
  const body = CopilotBody.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { messages, resume } = body.data

  const systemPrompt = `You are an AI Resume Co-Pilot embedded in a resume editor. You help the user improve their resume in real-time.

The user is currently editing this resume:
- Resume Title (Filename): ${resume?.name || 'Unknown'}
- Target Role / Job Title: ${resume?.role || 'Not set'}
- Candidate Name: ${resume?.persona || 'Not set'}
- Email: ${resume?.email || 'Not set'}
- Location: ${resume?.location || 'Not set'}
- Summary: ${resume?.summary || 'Not set'}
- Skills: ${(resume?.skills || []).join(', ')}
- Experience: ${(resume?.experience || []).map((e: any) => `${e.role} at ${e.company} (${e.dates}): ${e.bullets?.join('; ')}`).join(' | ') || 'None'}

Target companies this resume is matched against:
${(resume?.companies || []).map((c: any) => `- ${c.name} — ${c.role} (${c.score}% match, missing: ${(c.missing || []).join(', ') || 'nothing'})`).join('\n')}

Your capabilities:
1. Rewrite resume sections (summary, bullet points, skills) to be more impactful
2. Add missing keywords that match target job requirements
3. Generate new experience bullet points using the XYZ formula (Accomplished X as measured by Y by doing Z)
4. Tailor content for specific companies or roles
5. Suggest improvements to tone, clarity, and impact

Rules:
- Be concise. Show the rewritten text directly in a code block so the user can copy it.
- Use strong action verbs (Led, Architected, Spearheaded, Optimized).
- Quantify achievements whenever possible (%, $, time saved, users impacted).
- When rewriting bullet points, output them one per line.
- Keep responses under 150 words unless the user asks for detail.
- If the user asks to "add keywords", list the keywords and show where to add them.`

  return streamWithFailover({
    system: systemPrompt,
    messages,
    temperature: 0.7,
    maxOutputTokens: 800,
  })
}, { rateLimitType: 'ai', route: '/api/copilot' })
