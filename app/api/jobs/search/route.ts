import { NextRequest, NextResponse } from 'next/server'
import { searchJobs } from '~/lib/job-sources'
import type { JobSource } from '~/lib/job-sources'
import { getSessionUser } from '~/lib/auth-helpers'
import { checkGeneralRateLimit } from '~/lib/ratelimit'
import { captureServerEvent, captureServerError } from '~/lib/posthog-server'
import { z } from 'zod'

export const maxDuration = 30

const SearchBody = z.object({
  query: z.string().min(2).max(200),
  location: z.string().max(100).optional(),
  skills: z.array(z.string().max(80)).max(50).optional(),
  role: z.string().max(100).optional(),
  sources: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  fresh: z.boolean().optional(),
  includePaid: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const limited = await checkGeneralRateLimit(user.id)
    if (limited) return limited

    const body = SearchBody.safeParse(await req.json())
    if (!body.success) {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: body.error.flatten() },
        { status: 400 },
      )
    }

    const { query, location, skills, role, sources, limit, fresh, includePaid } = body.data

    const result = await searchJobs({
      query: query.trim(),
      location: location?.trim() || undefined,
      skills: skills || [],
      role: role || undefined,
      sources: sources as JobSource[] | undefined,
      limit: limit || 30,
      fresh: fresh || false,
      includePaid: includePaid || false,
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
