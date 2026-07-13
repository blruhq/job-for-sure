import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted so the mock variable exists when vi.mock factory runs
const { mockGetSession } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
}))

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn(),
}))

// Mock ~/lib/auth
vi.mock('~/lib/auth', () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}))

import { getSessionUser } from '~/lib/auth-helpers'
import { headers } from 'next/headers'

describe('auth-helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(headers).mockResolvedValue(new Headers() as any)
  })

  describe('getSessionUser', () => {
    it('returns user when session exists', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'u1', email: 'test@test.com', name: 'Test' },
      })

      const user = await getSessionUser()
      expect(user).toEqual({ id: 'u1', email: 'test@test.com', name: 'Test' })
    })

    it('returns null when no session', async () => {
      mockGetSession.mockResolvedValue(null)

      const user = await getSessionUser()
      expect(user).toBeNull()
    })

    it('returns null when session has no user', async () => {
      mockGetSession.mockResolvedValue({})

      const user = await getSessionUser()
      expect(user).toBeNull()
    })
  })

})
