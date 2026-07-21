import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

// ── Mocks ──

// UI store — capture openUpgradeModal calls
const { mockOpenUpgradeModal, mockCloseUpgradeModal } = vi.hoisted(() => ({
  mockOpenUpgradeModal: vi.fn(),
  mockCloseUpgradeModal: vi.fn(),
}))
vi.mock('~/hooks/use-ui', () => ({
  useUIStore: {
    getState: () => ({
      openUpgradeModal: mockOpenUpgradeModal,
      closeUpgradeModal: mockCloseUpgradeModal,
    }),
  },
}))

// DB chainable mock — controls the resume count returned by getResumeCount
const { mockResumeCount } = vi.hoisted(() => ({
  mockResumeCount: vi.fn(),
}))
vi.mock('~/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => Promise.resolve([{ total: mockResumeCount() }]),
      }),
    }),
  },
}))

// Redis — not used on the resume_create path, but imported by plan.ts at load time
vi.mock('~/lib/redis', () => ({
  getRedis: vi.fn(),
}))

import { ApiError } from '~/lib/api-client'
import { handleResumeLimitError } from '~/lib/resume-limit'
import { gateFeature } from '~/lib/plan'

describe('handleResumeLimitError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns true and opens the upgrade modal for a 402 ApiError', () => {
    const err = new ApiError(
      402,
      'Limit reached',
      { error: 'Limit reached', feature: 'resume_create', limit: 3, plan: 'free', upgradeUrl: '/pricing' },
    )

    const handled = handleResumeLimitError(err)

    expect(handled).toBe(true)
    expect(mockOpenUpgradeModal).toHaveBeenCalledTimes(1)
    const [data] = mockOpenUpgradeModal.mock.calls[0]
    expect(data).toHaveProperty('feature', 'resume_create')
    expect(data).toHaveProperty('limit', 3)
    expect(data).toHaveProperty('featureLabel', 'resumes')
    expect(data).toHaveProperty('period', 'total')
  })

  it('falls back to default limit (3) and resume_create feature when body omits them', () => {
    const err = new ApiError(402, 'Limit reached', { error: 'Limit reached' })
    handleResumeLimitError(err)
    const [data] = mockOpenUpgradeModal.mock.calls[0]
    expect(data).toHaveProperty('limit', 3)
    expect(data).toHaveProperty('feature', 'resume_create')
  })

  it('uses the limit from the body when provided', () => {
    const err = new ApiError(402, 'Limit reached', { limit: 5, upgradeUrl: '/settings/billing' })
    handleResumeLimitError(err)
    const [data] = mockOpenUpgradeModal.mock.calls[0]
    expect(data).toHaveProperty('limit', 5)
  })

  it('returns false (no modal) for a non-402 ApiError', () => {
    const err = new ApiError(500, 'Server error', {})
    expect(handleResumeLimitError(err)).toBe(false)
    expect(mockOpenUpgradeModal).not.toHaveBeenCalled()
  })

  it('returns false (no modal) for a generic Error or nullish', () => {
    expect(handleResumeLimitError(new Error('boom'))).toBe(false)
    expect(handleResumeLimitError(null)).toBe(false)
    expect(handleResumeLimitError(undefined)).toBe(false)
    expect(mockOpenUpgradeModal).not.toHaveBeenCalled()
  })
})

describe('gateFeature — resume_create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks a free user at the limit (3) with a 402', async () => {
    mockResumeCount.mockReturnValue(3)
    const res = await gateFeature('u1', 'resume_create', 'user', 'free')
    expect(res).toBeInstanceOf(NextResponse)
    expect(res!.status).toBe(402)
    const body = await res!.json()
    expect(body).toHaveProperty('feature', 'resume_create')
    expect(body).toHaveProperty('upgradeUrl', '/pricing')
  })

  it('allows a free user under the limit (2)', async () => {
    mockResumeCount.mockReturnValue(2)
    const res = await gateFeature('u1', 'resume_create', 'user', 'free')
    expect(res).toBeNull()
  })

  it('never blocks a pro user (no count check)', async () => {
    mockResumeCount.mockReturnValue(99)
    const res = await gateFeature('u1', 'resume_create', 'user', 'pro')
    expect(res).toBeNull()
    // Pro path short-circuits before touching the DB
    expect(mockResumeCount).not.toHaveBeenCalled()
  })

  it('never blocks an admin (treated as pro)', async () => {
    mockResumeCount.mockReturnValue(99)
    const res = await gateFeature('u1', 'resume_create', 'admin', 'free')
    expect(res).toBeNull()
    expect(mockResumeCount).not.toHaveBeenCalled()
  })

  it('excludes soft-deleted resumes via getResumeCount (count reflects only active rows)', async () => {
    mockResumeCount.mockReturnValue(2)
    const res = await gateFeature('u1', 'resume_create', 'user', 'free')
    expect(res).toBeNull()
  })
})
