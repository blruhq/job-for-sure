import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock the UI store so we can assert openUpgradeModal calls ──
const { mockOpenUpgradeModal } = vi.hoisted(() => ({
  mockOpenUpgradeModal: vi.fn(),
}))
vi.mock('~/hooks/use-ui', () => ({
  useUIStore: {
    getState: () => ({ openUpgradeModal: mockOpenUpgradeModal }),
  },
}))

import { handleSmartOverviewLimit } from '~/lib/smart-overview-quota'

describe('handleSmartOverviewLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens the UpgradeModal for a 402 and returns true', async () => {
    const res = new Response(
      JSON.stringify({ error: 'Limit reached', feature: 'ats_match', limit: 5, plan: 'free', upgradeUrl: '/pricing' }),
      { status: 402 },
    )

    const handled = await handleSmartOverviewLimit(res)

    expect(handled).toBe(true)
    expect(mockOpenUpgradeModal).toHaveBeenCalledTimes(1)
    expect(mockOpenUpgradeModal).toHaveBeenCalledWith({
      feature: 'ats_match',
      limit: 5,
      featureLabel: 'AI analyses',
      period: 'today',
    })
  })

  it('falls back to ats_match + undefined limit when the 402 body is unparseable', async () => {
    const res = new Response('not-json', { status: 402 })

    const handled = await handleSmartOverviewLimit(res)

    expect(handled).toBe(true)
    expect(mockOpenUpgradeModal).toHaveBeenCalledWith({
      feature: 'ats_match',
      limit: undefined,
      featureLabel: 'AI analyses',
      period: 'today',
    })
  })

  it('does NOT open the modal for a 503 (AI failure) and returns false', async () => {
    const res = new Response(JSON.stringify({ error: 'Failed to generate overview' }), { status: 503 })

    const handled = await handleSmartOverviewLimit(res)

    expect(handled).toBe(false)
    expect(mockOpenUpgradeModal).not.toHaveBeenCalled()
  })

  it('does NOT open the modal for a 200 success and returns false (body untouched)', async () => {
    const res = new Response(JSON.stringify({ verdict: 'good_fit' }), { status: 200 })

    const handled = await handleSmartOverviewLimit(res)

    expect(handled).toBe(false)
    expect(mockOpenUpgradeModal).not.toHaveBeenCalled()
    // Body must remain readable by the caller on the success path
    const data = await res.json()
    expect(data).toEqual({ verdict: 'good_fit' })
  })
})
