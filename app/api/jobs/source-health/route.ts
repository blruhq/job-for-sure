import { NextResponse } from 'next/server'
import { fetchRemoteOK } from '~/lib/job-sources/remoteok'
import { fetchHimalayas } from '~/lib/job-sources/himalayas'
import { fetchRemotive } from '~/lib/job-sources/remotive'
import { fetchTheMuse } from '~/lib/job-sources/themuse'
import { fetchArbeitnow } from '~/lib/job-sources/arbeitnow'
import { fetchAdzuna } from '~/lib/job-sources/adzuna'
import { fetchJSearch } from '~/lib/job-sources/jsearch'
import { fetchJobbKK } from '~/lib/job-sources/jobbkk'
import { fetchGreenhouseCompany } from '~/lib/job-sources/greenhouse'
import { fetchAshbyCompany } from '~/lib/job-sources/ashby'
import { GREENHOUSE_COMPANIES, ASHBY_COMPANIES } from '~/lib/job-sources/companies'
import { auth } from '~/lib/auth'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// ── Test all job sources with a simple query ──
// Each source runs independently; one failure doesn't block others.
// Only accessible by admin.

const TEST_QUERY = 'software engineer'
const TIMEOUT_MS = 10_000

type SourceStatus = {
  source: string
  label: string
  ok: boolean
  count: number
  error?: string
  took?: number
}

const SOURCE_LABELS: Record<string, string> = {
  remoteok: 'RemoteOK',
  himalayas: 'Himalayas',
  remotive: 'Remotive',
  themuse: 'The Muse',
  arbeitnow: 'Arbeitnow',
  adzuna: 'Adzuna',
  jsearch: 'JSearch',
  jobbkk: 'JobbKK',
  greenhouse: 'Greenhouse',
  ashby: 'Ashby',
}

async function testSource(
  name: string,
  fn: () => Promise<{ jobs: unknown[]; error?: string }>,
): Promise<SourceStatus> {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const result = await fn()
    clearTimeout(timer)
    return {
      source: name,
      label: SOURCE_LABELS[name] || name,
      ok: !result.error,
      count: result.jobs.length,
      error: result.error || undefined,
      took: Date.now() - start,
    }
  } catch (err) {
    return {
      source: name,
      label: SOURCE_LABELS[name] || name,
      ok: false,
      count: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
      took: Date.now() - start,
    }
  }
}

export async function GET() {
  // ── Admin auth gate ──
  const h = await headers()
  const session = await auth.api.getSession({ headers: h })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tests = await Promise.allSettled([
    // Fast single-call sources
    testSource('remoteok', async () => {
      const jobs = await fetchRemoteOK()
      return { jobs }
    }),
    testSource('himalayas', () => fetchHimalayas(TEST_QUERY)),
    testSource('remotive', () => fetchRemotive(TEST_QUERY)),
    testSource('themuse', () => fetchTheMuse(TEST_QUERY)),
    testSource('arbeitnow', () => fetchArbeitnow(TEST_QUERY)),
    testSource('adzuna', () => fetchAdzuna(TEST_QUERY)),
    testSource('jsearch', () => fetchJSearch(TEST_QUERY)),
    testSource('jobbkk', () => fetchJobbKK(TEST_QUERY)),

    // Multi-company ATS sources (test single company each)
    testSource('greenhouse', async () => {
      const slug = GREENHOUSE_COMPANIES[0]?.slug
      if (!slug) return { jobs: [], error: 'No companies configured' }
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
      const jobs = await fetchGreenhouseCompany(slug, { signal: controller.signal })
      clearTimeout(timer)
      return { jobs }
    }),
    testSource('ashby', async () => {
      const slug = ASHBY_COMPANIES[0]?.slug
      if (!slug) return { jobs: [], error: 'No companies configured' }
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
      const jobs = await fetchAshbyCompany(slug, { signal: controller.signal })
      clearTimeout(timer)
      return { jobs }
    }),
  ])

  const sources: SourceStatus[] = tests.map((t) => {
    if (t.status === 'fulfilled') return t.value
    return {
      source: 'unknown',
      label: 'Unknown',
      ok: false,
      count: 0,
      error: t.reason instanceof Error ? t.reason.message : 'Test crashed',
    }
  })

  // Also check env vars for key-gated sources
  const envChecks = {
    adzuna: !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),
    jsearch: !!process.env.OPENWEBNINJA_API_KEY,
    apify: !!process.env.APIFY_TOKEN,
  }

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    query: TEST_QUERY,
    sources,
    envChecks,
  })
}
