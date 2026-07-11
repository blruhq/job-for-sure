import { NextRequest, NextResponse } from 'next/server'
import { searchJobs } from '~/lib/job-sources'
import type { JobSource } from '~/lib/job-sources'
import { getSessionUser } from '~/lib/auth-helpers'
import { captureServerEvent, captureServerError } from '~/lib/posthog-server'

export const maxDuration = 30 // Greenhouse/Ashby fetch takes time

// POST /api/jobs/search
// Body: { query, location?, skills?, role?, sources?, limit? }
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { query, location, skills, role, sources, limit, fresh, includePaid } = body

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query is required (min 2 characters)' },
        { status: 400 },
      )
    }

    const result = await searchJobs({
      query: query.trim(),
      location: location?.trim() || undefined,
      skills: Array.isArray(skills) ? skills : [],
      role: role || undefined,
      sources: Array.isArray(sources) ? sources as JobSource[] : undefined,
      limit: Math.min(limit || 30, 100),
      fresh: Boolean(fresh),
      includePaid: Boolean(includePaid),
    })

    await captureServerEvent(user.id, 'job_searched', { query, location })
    return NextResponse.json(result)
  } catch (error) {
    console.error('[jobs/search] Error:', error)
    await captureServerError('anonymous', error, { route: '/api/jobs/search' })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Job search failed' },
      { status: 500 },
    )
  }
}
