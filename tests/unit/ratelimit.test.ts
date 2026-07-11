import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @upstash/ratelimit — Ratelimit must be a constructor (used with `new`)
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    static slidingWindow = vi.fn()
    limit = vi.fn().mockRejectedValue(new Error('Redis not available'))
  },
}))

// Mock @upstash/redis
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(),
}))

import { checkRateLimit, checkGeneralRateLimit } from '~/lib/ratelimit'

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

  it('general rate limiter also fails open', async () => {
    const result = await checkGeneralRateLimit('user-789')
    expect(result).toBeNull()
  })
})
