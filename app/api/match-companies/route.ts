import { NextRequest, NextResponse } from 'next/server'
import { generateWithFailover } from '~/lib/ai-providers'
import { companyColor, companyLogo } from '~/lib/company-data'

export async function POST(req: NextRequest) {
  try {
    const { skills, role, summary, experience } = await req.json()

    const text = await generateWithFailover({
      system: `You are a technical recruiter and career advisor. Given a candidate's skills, role, and experience, you suggest REAL companies that are currently hiring or commonly hire for these skills.

Return ONLY a JSON object (no markdown) with this exact shape:
{
  "score": number (overall employability score 0-100 based on skill relevance and market demand),
  "direct": [
    {
      "name": "Company Name",
      "role": "Specific Role Title",
      "loc": "City, State or Remote",
      "work": "remote" | "hybrid" | "onsite",
      "visa": boolean (do they sponsor visas?),
      "salary": "$XXX-XXXk",
      "score": number (0-100 match for this candidate),
      "level": "high" | "mid",
      "url": "careers page URL",
      "missing": ["skills the candidate lacks for this specific role"],
      "transferable": ["candidate skills that partially apply"]
    }
  ],
  "stretch": [
    // Same shape as direct, but roles where candidate has <75% match
  ]
}

Rules:
- Suggest 3-4 direct matches (score 75-95%) and 2-3 stretch matches (score 50-74%)
- Use REAL, well-known tech companies (not made-up ones)
- Base the match score on actual skill overlap, not random numbers
- The "missing" array should list SPECIFIC skills the JD would require that the candidate doesn't have
- The "url" should be the actual careers page URL
- Return ONLY the JSON, no explanation`,
      prompt: JSON.stringify({
        role: role || 'Software Engineer',
        skills: skills || [],
        summary: summary || 'Not provided',
        experience: experience || [],
      }),
      temperature: 0.4,
      maxOutputTokens: 2048,
    })

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('AI returned invalid JSON')
    }

    const result = JSON.parse(jsonMatch[0])

    // Enrich with UI helpers (logo initials, colors)
    const enrich = (companies: any[]) => (companies || []).map((c) => ({
      ...c,
      logo: companyLogo(c.name),
      color: companyColor(c.name),
    }))

    return NextResponse.json({
      score: result.score || 0,
      direct: enrich(result.direct),
      stretch: enrich(result.stretch),
    })
  } catch (error) {
    console.error('[match-companies] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate matches' },
      { status: 500 },
    )
  }
}
