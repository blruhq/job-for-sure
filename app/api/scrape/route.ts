import { NextResponse } from 'next/server'
import { scrapeJob } from '~/lib/scraper'
import { withAuth } from '~/lib/with-auth'
import { captureServerEvent } from '~/lib/posthog-server'
import { z } from 'zod'

const ScrapeBody = z.object({
  url: z.string().url().max(2048),
})

export const POST = withAuth(async (req, { user }) => {
  const body = ScrapeBody.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Valid URL is required' }, { status: 400 })
  }

  const result = await scrapeJob(body.data.url)
  await captureServerEvent(user.id, 'job_scraped')
  return NextResponse.json(result)
}, { rateLimitType: 'general', route: '/api/scrape' })
