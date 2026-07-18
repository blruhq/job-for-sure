import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──
const { mockGetSessionUser } = vi.hoisted(() => ({
  mockGetSessionUser: vi.fn(),
}))

const { mockGetUserPlan } = vi.hoisted(() => ({
  mockGetUserPlan: vi.fn(),
}))

const { mockCheckRateLimit, mockCheckGeneralRateLimit } = vi.hoisted(() => ({
  mockCheckRateLimit: vi.fn(),
  mockCheckGeneralRateLimit: vi.fn(),
}))

const { mockCaptureServerError } = vi.hoisted(() => ({
  mockCaptureServerError: vi.fn(),
}))

vi.mock('~/lib/auth-helpers', () => ({
  getSessionUser: mockGetSessionUser,
}))

vi.mock('~/lib/plan', () => ({
  getUserPlan: mockGetUserPlan,
}))

vi.mock('~/lib/ratelimit', () => ({
  checkRateLimit: mockCheckRateLimit,
  checkGeneralRateLimit: mockCheckGeneralRateLimit,
}))

vi.mock('~/lib/posthog-server', () => ({
  captureServerError: mockCaptureServerError,
}))

import { withAuth } from '~/lib/with-auth'

describe('withAuth wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSessionUser.mockResolvedValue({ id: 'u1', email: 'test@test.com', name: 'Test', role: 'user', banned: false })
    mockGetUserPlan.mockResolvedValue('free')
    mockCheckRateLimit.mockResolvedValue(null)
    mockCheckGeneralRateLimit.mockResolvedValue(null)
  })

  it('returns 401 when user is not authenticated', async () => {
    mockGetSessionUser.mockResolvedValue(null)

    const handler = withAuth(async () => new Response('ok'), {})
    const res = await handler(new Request('https://example.com/api/test'), {})

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('passes user to handler when authenticated', async () => {
    const handler = withAuth(async (_req, { user }) => {
      return new Response(JSON.stringify({ userId: user.id }), { headers: { 'Content-Type': 'application/json' } })
    }, {})

    const res = await handler(new Request('https://example.com/api/test'), {})
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.userId).toBe('u1')
  })

  it('checks AI rate limit when rateLimitType is "ai"', async () => {
    const handler = withAuth(async () => new Response('ok'), { rateLimitType: 'ai' })
    await handler(new Request('https://example.com/api/test'), {})

    expect(mockCheckRateLimit).toHaveBeenCalledWith('u1')
    expect(mockCheckGeneralRateLimit).not.toHaveBeenCalled()
  })

  it('checks general rate limit when rateLimitType is "general"', async () => {
    const handler = withAuth(async () => new Response('ok'), { rateLimitType: 'general' })
    await handler(new Request('https://example.com/api/test'), {})

    expect(mockCheckGeneralRateLimit).toHaveBeenCalledWith('u1')
    expect(mockCheckRateLimit).not.toHaveBeenCalled()
  })

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockResolvedValue(new Response('{"error":"Rate limited"}', { status: 429 }))

    const handler = withAuth(async () => new Response('ok'), { rateLimitType: 'ai' })
    const res = await handler(new Request('https://example.com/api/test'), {})

    expect(res.status).toBe(429)
  })

  it('catches handler errors and returns 500', async () => {
    const handler = withAuth(async () => {
      throw new Error('Something broke')
    }, { route: '/api/test' })

    const res = await handler(new Request('https://example.com/api/test'), {})
    expect(res.status).toBe(500)
    expect(mockCaptureServerError).toHaveBeenCalled()
  })

  it('resolves async params (Next.js 15+ style)', async () => {
    const handler = withAuth<{ id: string }>(async (_req, { params }) => {
      return new Response(JSON.stringify({ params }), { headers: { 'Content-Type': 'application/json' } })
    }, {})

    const res = await handler(new Request('https://example.com/api/test'), {
      params: Promise.resolve({ id: 'abc123' }),
    })
    const body = await res.json()
    expect(body.params).toEqual({ id: 'abc123' })
  })

  it('handles plain object params (Next.js 14 style)', async () => {
    const handler = withAuth<{ id: string }>(async (_req, { params }) => {
      return new Response(JSON.stringify({ params }), { headers: { 'Content-Type': 'application/json' } })
    }, {})

    const res = await handler(new Request('https://example.com/api/test'), {
      params: { id: 'xyz' },
    })
    const body = await res.json()
    expect(body.params).toEqual({ id: 'xyz' })
  })
})
