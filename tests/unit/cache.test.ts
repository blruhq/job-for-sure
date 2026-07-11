import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted so the mock variables exist when vi.mock factory runs
const { mockGet, mockSet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockSet: vi.fn(),
}))

// Use class-based mock — vi.fn(() => ({})) does NOT work with `new` keyword
vi.mock('@upstash/redis', () => ({
  Redis: class MockRedis {
    get = mockGet
    set = mockSet
  },
}))

import { getCached, setCached, cacheKey } from '~/lib/job-sources/cache'

process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

describe('cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('cacheKey', () => {
    it('generates key from query + location', () => {
      const key = cacheKey('React Developer', 'Bangkok')
      expect(key).toBe('react developer::bangkok')
    })

    it('handles undefined location', () => {
      const key = cacheKey('React Developer')
      expect(key).toBe('react developer::')
    })

    it('includes sorted sources in key', () => {
      const key = cacheKey('React', undefined, ['greenhouse', 'ashby'])
      expect(key).toBe('react::-ashby,greenhouse')
    })

    it('normalizes case', () => {
      const key = cacheKey('  REACT  ', '  BANGKOK  ')
      expect(key).toBe('react::bangkok')
    })
  })

  describe('getCached', () => {
    it('returns null when Redis returns null (cache miss)', async () => {
      mockGet.mockResolvedValue(null)
      const result = await getCached('test-key')
      expect(result).toBeNull()
      expect(mockGet).toHaveBeenCalledWith('jfs:cache:test-key')
    })

    it('returns data when Redis has it', async () => {
      const mockData = { jobs: [{ id: '1' }], total: 1 }
      mockGet.mockResolvedValue(mockData)
      const result = await getCached('test-key')
      expect(result).toEqual(mockData)
    })

    it('returns null when Redis throws (fail-open)', async () => {
      mockGet.mockRejectedValue(new Error('Redis down'))
      const result = await getCached('test-key')
      expect(result).toBeNull()
    })
  })

  describe('setCached', () => {
    it('stores data with TTL', async () => {
      mockSet.mockResolvedValue('OK')
      await setCached('test-key', { foo: 'bar' })
      expect(mockSet).toHaveBeenCalledWith(
        'jfs:cache:test-key',
        { foo: 'bar' },
        { ex: 21600 }, // 6 hours
      )
    })

    it('does NOT throw when Redis throws', async () => {
      mockSet.mockRejectedValue(new Error('Redis down'))
      await expect(setCached('test-key', { foo: 'bar' })).resolves.toBeUndefined()
    })
  })
})
