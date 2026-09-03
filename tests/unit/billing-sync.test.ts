import { describe, it, expect, vi, beforeEach } from 'vitest'
import type Stripe from 'stripe'

// ── Hoisted mocks ──
const { mockDbInsert, mockDbOnConflictDoUpdate, mockDbUpdate } = vi.hoisted(() => {
  const mockDbWhere = vi.fn().mockResolvedValue([])
  const mockDbSet = vi.fn().mockReturnValue({ where: mockDbWhere })
  const mockDbUpdate = vi.fn().mockReturnValue({ set: mockDbSet })

  const mockDbOnConflictDoUpdate = vi.fn().mockResolvedValue([])
  const mockDbValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockDbOnConflictDoUpdate })
  const mockDbInsert = vi.fn().mockReturnValue({ values: mockDbValues })

  return {
    mockDbInsert,
    mockDbOnConflictDoUpdate,
    mockDbUpdate,
  }
})

vi.mock('~/lib/db', () => ({
  db: {
    insert: mockDbInsert,
    update: mockDbUpdate,
  },
}))

vi.mock('~/lib/stripe', () => ({
  PRO_PRICE_IDS: new Set(['price_monthly_123', 'price_yearly_456']),
}))

import { extractPeriodEnd, resolvePlan, upsertSubscription } from '~/lib/billing-sync'

describe('extractPeriodEnd', () => {
  it('prefers items.data[0].current_period_end over top-level', () => {
    const sub = {
      items: {
        data: [{ current_period_end: 1791020941 }],
      },
      current_period_end: 1000000000,
    } as unknown as Stripe.Subscription

    expect(extractPeriodEnd(sub)).toBe(1791020941)
  })

  it('falls back to current_period_end snake_case', () => {
    const sub = {
      current_period_end: 1791020941,
    } as unknown as Stripe.Subscription

    expect(extractPeriodEnd(sub)).toBe(1791020941)
  })

  it('falls back to currentPeriodEnd camelCase', () => {
    const sub = {
      currentPeriodEnd: 1791020941,
    } as unknown as Stripe.Subscription

    expect(extractPeriodEnd(sub)).toBe(1791020941)
  })

  it('returns 0 if all missing', () => {
    const sub = {} as unknown as Stripe.Subscription
    expect(extractPeriodEnd(sub)).toBe(0)
  })
})

describe('resolvePlan', () => {
  it('returns pro for allowlisted price', () => {
    const sub = {
      items: {
        data: [
          {
            price: {
              id: 'price_monthly_123',
              recurring: { interval: 'month' },
            },
          },
        ],
      },
    } as unknown as Stripe.Subscription

    const result = resolvePlan(sub)
    expect(result.plan).toBe('pro')
    expect(result.interval).toBe('month')
  })

  it('returns free for unknown price (fail-closed)', () => {
    const sub = {
      items: {
        data: [
          {
            price: {
              id: 'price_random_unknown',
              recurring: { interval: 'month' },
            },
          },
        ],
      },
    } as unknown as Stripe.Subscription

    const result = resolvePlan(sub)
    expect(result.plan).toBe('free')
  })

  it('returns pro for metadata.plan=pro even if price unknown', () => {
    const sub = {
      items: {
        data: [
          {
            price: {
              id: 'price_custom',
              metadata: { plan: 'pro' },
              recurring: { interval: 'year' },
            },
          },
        ],
      },
    } as unknown as Stripe.Subscription

    const result = resolvePlan(sub)
    expect(result.plan).toBe('pro')
    expect(result.interval).toBe('year')
  })
})

describe('upsertSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('upserts subscription and updates user plan to pro when active', async () => {
    const sub = {
      id: 'sub_test_123',
      status: 'active',
      cancel_at_period_end: false,
      items: {
        data: [
          {
            price: { id: 'price_monthly_123', recurring: { interval: 'month' } },
            current_period_end: 1791020941,
          },
        ],
      },
    } as unknown as Stripe.Subscription

    const res = await upsertSubscription(sub, 'cus_123', 'user_abc')

    expect(res.plan).toBe('pro')
    expect(res.interval).toBe('month')
    expect(res.periodEnd).toEqual(new Date(1791020941 * 1000))
    expect(mockDbInsert).toHaveBeenCalled()
    expect(mockDbOnConflictDoUpdate).toHaveBeenCalled()
    expect(mockDbUpdate).toHaveBeenCalled()
  })

  it('updates user plan to free when subscription is not active or trialing', async () => {
    const sub = {
      id: 'sub_test_123',
      status: 'canceled',
      cancel_at_period_end: false,
      items: {
        data: [
          {
            price: { id: 'price_monthly_123', recurring: { interval: 'month' } },
            current_period_end: 1791020941,
          },
        ],
      },
    } as unknown as Stripe.Subscription

    const res = await upsertSubscription(sub, 'cus_123', 'user_abc')
    expect(res.plan).toBe('free')
  })
})
