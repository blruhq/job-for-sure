import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @upstash/ratelimit
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: {
    slidingWindow: vi.fn(),
  },
}))

// Mock @upstash/redis
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(),
}))

import { checkRateLimit } from '~/lib/ratelimit'

describe('rate limiter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when Redis is unavailable (fail-open)', async () => {
    // Without real Redis credentials, the Ratelimit constructor will throw
    // or limit() will throw — checkRateLimit catches and returns null
    const result = await checkRateLimit('user-123')
    expect(result).toBeNull()
  })

  it('returns null for any user when Redis is down (fail-open)', async () => {
    const result = await checkRateLimit('user-456')
    expect(result).toBeNull()
  })

  it('never throws — always returns null or Response', async () => {
    // This is the critical security property: rate limiter failure
    // should NEVER break the application
    await expect(checkRateLimit('')).resolves.not.toThrow()
  })
})
