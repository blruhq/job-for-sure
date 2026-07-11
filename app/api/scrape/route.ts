import { NextRequest, NextResponse } from 'next/server'
import { scrapeJob } from '~/lib/scraper'
import { getSessionUser } from '~/lib/auth-helpers'
import { checkGeneralRateLimit } from '~/lib/ratelimit'
import { captureServerEvent, captureServerError } from '~/lib/posthog-server'
import { z } from 'zod'

const ScrapeBody = z.object({
  url: z.string().url().max(2048),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const limited = await checkGeneralRateLimit(user.id)
    if (limited) return limited

    const body = ScrapeBody.safeParse(await req.json())
    if (!body.success) {
      return NextResponse.json({ error: 'Valid URL is required' }, { status: 400 })
    }

    const result = await scrapeJob(body.data.url)
    await captureServerEvent(user.id, 'job_scraped')
    return NextResponse.json(result)
  } catch (error) {
    await captureServerError('anonymous', error, { route: '/api/scrape' })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Scraping failed' },
      { status: 500 },
    )
  }
}
