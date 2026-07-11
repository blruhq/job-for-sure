import { NextRequest, NextResponse } from 'next/server'
import { scrapeJob } from '~/lib/scraper'
import { getSessionUser } from '~/lib/auth-helpers'
import { captureServerEvent, captureServerError } from '~/lib/posthog-server'

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { url } = await req.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const result = await scrapeJob(url)
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
