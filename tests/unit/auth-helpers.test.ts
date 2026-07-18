import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted so the mock variable exists when vi.mock factory runs
const { mockGetSession } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
}))
const { mockRedirect } = vi.hoisted(() => ({
  // next/navigation `redirect` throws a specific error to unwind the stack
  mockRedirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  }),
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

// Mock next/navigation — only `redirect` is used by helpers
vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}))

import {
  getSessionUser,
  requireAdmin,
  requireUser,
  requireAdminApi,
} from '~/lib/auth-helpers'
import { headers } from 'next/headers'

function userWith(role: string) {
  return {
    user: {
      id: 'u1',
      email: 'test@test.com',
      name: 'Test',
      role,
      banned: false,
    },
  }
}

describe('auth-helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(headers).mockResolvedValue(new Headers() as any)
  })

  describe('getSessionUser', () => {
    it('returns user when session exists', async () => {
      mockGetSession.mockResolvedValue(userWith('user'))

      const user = await getSessionUser()
      expect(user?.role).toBe('user')
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

  describe('requireAdmin', () => {
    it('returns user when role is admin', async () => {
      mockGetSession.mockResolvedValue(userWith('admin'))
      const user = await requireAdmin()
      expect(user.role).toBe('admin')
    })

    it('redirects to /login when unauthenticated', async () => {
      mockGetSession.mockResolvedValue(null)
      await expect(requireAdmin()).rejects.toThrow('REDIRECT:/login')
    })

    it('redirects to /chat when role is user', async () => {
      mockGetSession.mockResolvedValue(userWith('user'))
      await expect(requireAdmin()).rejects.toThrow('REDIRECT:/chat')
    })
  })

  describe('requireUser', () => {
    it('returns user when role is user', async () => {
      mockGetSession.mockResolvedValue(userWith('user'))
      const user = await requireUser()
      expect(user.role).toBe('user')
    })

    it('redirects to /login when unauthenticated', async () => {
      mockGetSession.mockResolvedValue(null)
      await expect(requireUser()).rejects.toThrow('REDIRECT:/login')
    })

    it('redirects to /admin when role is admin (admins are monitor-only)', async () => {
      mockGetSession.mockResolvedValue(userWith('admin'))
      await expect(requireUser()).rejects.toThrow('REDIRECT:/admin')
    })
  })

  describe('requireAdminApi', () => {
    it('returns user when role is admin', async () => {
      mockGetSession.mockResolvedValue(userWith('admin'))
      const result = await requireAdminApi()
      expect(result).not.toBeInstanceOf(Response)
      expect((result as { role: string }).role).toBe('admin')
    })

    it('returns 401 NextResponse when unauthenticated', async () => {
      mockGetSession.mockResolvedValue(null)
      const result = await requireAdminApi()
      expect(result).toBeInstanceOf(Response)
      expect((result as Response).status).toBe(401)
    })

    it('returns 403 NextResponse when role is user', async () => {
      mockGetSession.mockResolvedValue(userWith('user'))
      const result = await requireAdminApi()
      expect(result).toBeInstanceOf(Response)
      expect((result as Response).status).toBe(403)
    })
  })
})
