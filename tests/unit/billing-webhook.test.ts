import { describe, it, expect, vi } from 'vitest'

import type Stripe from 'stripe'

// ── Mock the db helpers ──
const { mockDbInsert, mockDbUpdate } = vi.hoisted(() => {
  const mockDbWhere = vi.fn().mockResolvedValue([])
  const mockDbSet = vi.fn().mockReturnValue({ where: mockDbWhere })
  const mockDbUpdate = vi.fn().mockReturnValue({ set: mockDbSet })

  const mockDbOnConflictDoUpdate = vi.fn().mockResolvedValue([])
  const mockDbValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockDbOnConflictDoUpdate })
  const mockDbInsert = vi.fn().mockReturnValue({ values: mockDbValues })

  return {
    mockDbInsert,
    mockDbUpdate,
  }
})

vi.mock('~/lib/stripe', () => ({
  PRO_PRICE_IDS: new Set(['price_monthly_123']),
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
}))

vi.mock('~/lib/db', () => ({
  db: {
    insert: mockDbInsert,
    update: mockDbUpdate,
  },
}))

vi.mock('~/lib/posthog-server', () => ({
  captureServerEvent: vi.fn().mockResolvedValue(undefined),
}))

import { extractPeriodEnd, upsertSubscription } from '~/lib/billing-sync'

describe('webhook periodEnd', () => {
  it('stores 2026-10-03 for 1791020941, not 1970', async () => {
    // 1791020941 seconds = 2026-10-03 (per spec AC4)
    const sub: Stripe.Subscription = {
      id: 'sub_12345',
      status: 'active',
      cancel_at_period_end: false,
      items: {
        data: [
          {
            price: {
              id: 'price_monthly_123',
              recurring: { interval: 'month', interval_count: 1, meter: 'meter', trial_period_days: null, usage_type: 'metered' },
            },
            current_period_end: 1791020941,
          },
        ],
      },
    } as unknown as Stripe.Subscription

    const res = await upsertSubscription(sub, 'cus_12345', 'user_abc')

    // Should NOT be epoch (1970-01-01T00:00:00.000Z)
    expect(res.periodEnd.getTime()).not.toBe(0)
    expect(res.periodEnd.getTime()).toBeGreaterThan(Date.now())

    // Should be 2026-10-03 (1791020941 seconds from epoch)
    const expected = new Date(1791020941 * 1000)
    expect(res.periodEnd).toEqual(expected)
  })
})

describe('extractPeriodEnd webhook scenarios', () => {
  it('prefers items.data[0].current_period_end', () => {
    const sub = {
      items: {
        data: [{ current_period_end: 1791020941 }],
      },
    } as unknown as Stripe.Subscription
    expect(extractPeriodEnd(sub)).toBe(1791020941)
  })

  it('falls back to snake_case current_period_end', () => {
    const sub = {
      current_period_end: 1791020941,
    } as unknown as Stripe.Subscription
    expect(extractPeriodEnd(sub)).toBe(1791020941)
  })

  it('falls back to camelCase currentPeriodEnd', () => {
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