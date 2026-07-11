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

import { getSessionUser, requireUser } from '~/lib/auth-helpers'
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

  describe('requireUser', () => {
    it('returns user when authenticated', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'u1', email: 'test@test.com', name: 'Test' },
      })

      const user = await requireUser()
      expect(user).toEqual({ id: 'u1', email: 'test@test.com', name: 'Test' })
    })

    it('throws a 401 Response when not authenticated', async () => {
      mockGetSession.mockResolvedValue(null)

      await expect(requireUser()).rejects.toThrow()
      try {
        await requireUser()
      } catch (e) {
        expect(e).toBeInstanceOf(Response)
        expect((e as Response).status).toBe(401)
        const body = await (e as Response).json()
        expect(body.error).toBe('Unauthorized')
      }
    })
  })
})
