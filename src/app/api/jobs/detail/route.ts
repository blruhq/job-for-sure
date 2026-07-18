import { NextResponse } from 'next/server'
import { withAuth } from '~/lib/with-auth'
import { z } from 'zod'
import { fetchLinkedInGuestDetail } from '~/lib/job-sources/linkedin-guest'

// ═══════════════════════════════════════════════════════════════
// JOB DETAIL ENDPOINT
//
// Fetches the FULL job description for a single job on-demand.
// Called when user clicks a job card in the detail modal.
//
// For LinkedIn guest jobs: fetches the guest detail endpoint.
// For other sources: descriptions are typically already present
// from the initial search (returned inline). This endpoint is
// mainly for LinkedIn guest + cached results where descriptions
// were stripped to save Redis storage.
// ═══════════════════════════════════════════════════════════════

const DetailBody = z.object({
  source: z.string(),
  jobId: z.string().optional(),
  url: z.string().url().optional(),
})

export const POST = withAuth(async (req) => {
  const body = DetailBody.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json(
      { error: 'Invalid parameters', details: body.error.flatten() },
      { status: 400 },
    )
  }

  const { source, jobId, url } = body.data

  // ── LinkedIn guest: fetch full JD from guest detail endpoint ──
  if (source === 'linkedin-guest' && jobId) {
    try {
      const result = await fetchLinkedInGuestDetail(jobId)

      if (result.job) {
        return NextResponse.json({ success: true, job: result.job })
      }

      return NextResponse.json(
        { success: false, error: result.error || 'Could not fetch job details' },
        { status: 502 },
      )
    } catch {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch job details' },
        { status: 502 },
      )
    }
  }

  // ── Other sources: descriptions should already be in the search result ──
  // If we get here, the client should use whatever description it already has.
  return NextResponse.json({
    success: false,
    error: 'Descriptions for this source are included in search results. Use the cached data.',
    fallbackUrl: url,
  })
}, { rateLimitType: 'general', route: '/api/jobs/detail' })
