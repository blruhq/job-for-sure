import { NextResponse } from 'next/server'
import { searchJobs } from '~/lib/job-sources'
import type { JobSource } from '~/lib/job-sources'
import { withAuth } from '~/lib/with-auth'
import { captureServerEvent } from '~/lib/posthog-server'
import { z } from 'zod'

export const maxDuration = 30

const SearchBody = z.object({
  query: z.string().min(2).max(200),
  location: z.string().max(100).optional(),
  countryCode: z.string().length(2).optional(),
  skills: z.array(z.string().max(80)).max(50).optional(),
  role: z.string().max(100).optional(),
  sources: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  fresh: z.boolean().optional(),
})

export const POST = withAuth(async (req, { user }) => {
  const body = SearchBody.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json(
      { error: 'Invalid search parameters', details: body.error.flatten() },
      { status: 400 },
    )
  }

  const { query, location, countryCode, skills, role, sources, limit, fresh } = body.data

  const result = await searchJobs({
    query: query.trim(),
    location: location?.trim() || undefined,
    countryCode: countryCode || undefined,
    skills: skills || [],
    role: role || undefined,
    sources: sources as JobSource[] | undefined,
    limit: limit || 30,
    fresh: fresh || false,
  })

  await captureServerEvent(user.id, 'job_search_run', { query: query || '', location: location || '', result_count: result.total })
  return NextResponse.json(result)
}, { rateLimitType: 'general', route: '/api/jobs/search' })
