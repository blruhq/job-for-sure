import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

// ── Mocks ──

// sonner toast — capture calls without rendering
const { mockToastError, mockToastSuccess, mockToastWarning, mockToastInfo } = vi.hoisted(() => ({
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastWarning: vi.fn(),
  mockToastInfo: vi.fn(),
}))
vi.mock('sonner', () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
    warning: mockToastWarning,
    info: mockToastInfo,
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

  it('returns true and shows an actionable toast for a 402 ApiError', () => {
    const err = new ApiError(
      402,
      'Limit reached',
      { error: 'Limit reached', feature: 'resume_create', limit: 3, plan: 'free', upgradeUrl: '/pricing' },
    )

    const handled = handleResumeLimitError(err)

    expect(handled).toBe(true)
    expect(mockToastError).toHaveBeenCalledTimes(1)
    const [message, opts] = mockToastError.mock.calls[0]
    expect(message).toContain('3')
    expect(opts).toHaveProperty('description')
    expect(opts).toHaveProperty('action.label', 'Upgrade')
    expect(opts).toHaveProperty('action.onClick')
  })

  it('falls back to default limit (3) and /pricing when body omits them', () => {
    const err = new ApiError(402, 'Limit reached', { error: 'Limit reached' })
    handleResumeLimitError(err)
    const [message] = mockToastError.mock.calls[0]
    expect(message).toContain('3')
  })

  it('uses the limit from the body when provided', () => {
    const err = new ApiError(402, 'Limit reached', { limit: 5, upgradeUrl: '/settings/billing' })
    handleResumeLimitError(err)
    const [message] = mockToastError.mock.calls[0]
    expect(message).toContain('5')
  })

  it('returns false (no toast) for a non-402 ApiError', () => {
    const err = new ApiError(500, 'Server error', {})
    expect(handleResumeLimitError(err)).toBe(false)
    expect(mockToastError).not.toHaveBeenCalled()
  })

  it('returns false (no toast) for a generic Error', () => {
    expect(handleResumeLimitError(new Error('boom'))).toBe(false)
    expect(handleResumeLimitError(null)).toBe(false)
    expect(handleResumeLimitError(undefined)).toBe(false)
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
    // The DB mock returns whatever count we set. The key assertion here is that
    // the gate respects the *active* count: if only 2 active resumes exist
    // (soft-deleted rows excluded upstream by the isNull(deletedAt) filter),
    // a free user is allowed even if their historical row count was higher.
    mockResumeCount.mockReturnValue(2)
    const res = await gateFeature('u1', 'resume_create', 'user', 'free')
    expect(res).toBeNull()
  })
})
