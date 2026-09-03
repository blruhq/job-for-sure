import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ──
const {
  mockGetSessionUser,
  mockRetrieveSession,
  mockRetrieveSubscription,
  mockUpsertSubscription,
  mockDbUpdate,
  mockDbSet,
  mockDbWhere,
} = vi.hoisted(() => {
  const mockDbWhere = vi.fn().mockResolvedValue([])
  const mockDbSet = vi.fn().mockReturnValue({ where: mockDbWhere })
  const mockDbUpdate = vi.fn().mockReturnValue({ set: mockDbSet })

  return {
    mockGetSessionUser: vi.fn(),
    mockRetrieveSession: vi.fn(),
    mockRetrieveSubscription: vi.fn(),
    mockUpsertSubscription: vi.fn(),
    mockDbUpdate,
    mockDbSet,
    mockDbWhere,
  }
})

vi.mock('~/lib/auth-helpers', () => ({
  getSessionUser: mockGetSessionUser,
}))

vi.mock('~/lib/plan', () => ({
  getUserPlan: vi.fn().mockResolvedValue('free'),
}))

vi.mock('~/lib/ratelimit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue(null),
  checkGeneralRateLimit: vi.fn().mockResolvedValue(null),
}))

vi.mock('~/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        retrieve: mockRetrieveSession,
      },
    },
    subscriptions: {
      retrieve: mockRetrieveSubscription,
    },
  },
  PRO_PRICE_IDS: new Set(['price_monthly_123']),
}))

vi.mock('~/lib/db', () => ({
  db: {
    update: mockDbUpdate,
  },
}))

vi.mock('~/lib/billing-sync', () => ({
  upsertSubscription: mockUpsertSubscription,
}))

import { POST } from '~/api/billing/verify/route'

describe('POST /api/billing/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSessionUser.mockResolvedValue({
      id: 'user_123',
      email: 'user@example.com',
      name: 'Test User',
      role: 'user',
      banned: false,
    })
  })

  it('returns 400 on missing sessionId', async () => {
    const req = new Request('http://localhost:3000/api/billing/verify', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, {})
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Missing sessionId')
  })

  it('returns 400 on sessionId not starting with cs_', async () => {
    const req = new Request('http://localhost:3000/api/billing/verify', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'sub_12345' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, {})
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Missing sessionId')
  })

  it('returns 403 on session owned by other user', async () => {
    mockRetrieveSession.mockResolvedValue({
      id: 'cs_test_other_user',
      client_reference_id: 'user_other',
      metadata: { userId: 'user_other' },
      payment_status: 'paid',
      status: 'complete',
      subscription: { id: 'sub_123', customer: 'cus_123' },
    })

    const req = new Request('http://localhost:3000/api/billing/verify', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'cs_test_other_user' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, {})
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('Session not owned by user')
  })

  it('returns 400 on unpaid session', async () => {
    mockRetrieveSession.mockResolvedValue({
      id: 'cs_test_unpaid',
      client_reference_id: 'user_123',
      payment_status: 'unpaid',
      status: 'open',
      subscription: { id: 'sub_123', customer: 'cus_123' },
    })

    const req = new Request('http://localhost:3000/api/billing/verify', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'cs_test_unpaid' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, {})
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Session not paid')
  })

  it('returns 200 and upserts on paid session owned by caller', async () => {
    const mockPeriodEnd = new Date('2026-10-03T00:00:00.000Z')
    mockRetrieveSession.mockResolvedValue({
      id: 'cs_test_paid',
      client_reference_id: 'user_123',
      customer: 'cus_123',
      payment_status: 'paid',
      status: 'complete',
      subscription: { id: 'sub_123', customer: 'cus_123' },
    })

    mockUpsertSubscription.mockResolvedValue({
      plan: 'pro',
      interval: 'month',
      periodEnd: mockPeriodEnd,
    })

    const req = new Request('http://localhost:3000/api/billing/verify', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'cs_test_paid' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, {})
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.verified).toBe(true)
    expect(json.plan).toBe('pro')
    expect(json.currentPeriodEnd).toBe(mockPeriodEnd.toISOString())
    expect(mockUpsertSubscription).toHaveBeenCalled()
  })
})
