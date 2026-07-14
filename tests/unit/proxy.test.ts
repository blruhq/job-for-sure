import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mock next-intl middleware ──
const { mockIntlMiddleware } = vi.hoisted(() => ({
  mockIntlMiddleware: vi.fn() as any,
}))

vi.mock('next-intl/middleware', () => ({
  default: () => mockIntlMiddleware,
}))

// ── Mock the routing config (avoids loading next/navigation) ──
vi.mock('@/app/i18n/routing', () => ({
  routing: {
    locales: ['en', 'th'],
    defaultLocale: 'en',
    localePrefix: 'always',
  },
}))

// ── Mock better-auth cookies ──
const { mockGetSessionCookie } = vi.hoisted(() => ({
  mockGetSessionCookie: vi.fn(() => false),
}))

vi.mock('better-auth/cookies', () => ({
  getSessionCookie: mockGetSessionCookie,
}))

import { proxy, config } from '../../src/proxy'

function makeRequest(pathname: string) {
  const url = `https://example.com${pathname}`
  return new NextRequest(url)
}

describe('proxy middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIntlMiddleware.mockReturnValue(null)
    mockGetSessionCookie.mockReturnValue(false)
  })

  describe('config.matcher', () => {
    it('excludes API routes, _next, and static files', () => {
      expect(config.matcher).toBeDefined()
      expect(config.matcher[0]).toContain('api')
      expect(config.matcher[0]).toContain('_next')
    })
  })

  describe('locale handling', () => {
    it('returns intl redirect when intl middleware redirects', async () => {
      const redirectResponse = new Response(null, { status: 307, headers: { Location: '/en/dashboard' } })
      mockIntlMiddleware.mockReturnValue(redirectResponse)

      const req = makeRequest('/dashboard')
      const res = await proxy(req)

      expect(res).toBe(redirectResponse)
    })
  })

  describe('protected routes', () => {
    it('redirects unauthenticated user from /en/chat to login', async () => {
      mockGetSessionCookie.mockReturnValue(false)
      mockIntlMiddleware.mockReturnValue(null)

      const req = makeRequest('/en/chat')
      const res = await proxy(req)

      expect(res.status).toBe(307)
      const location = res.headers.get('location')
      expect(location).toContain('/login')
    })

    it('redirects unauthenticated user from /en/dashboard to login', async () => {
      const req = makeRequest('/en/dashboard')
      const res = await proxy(req)

      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toContain('/login')
    })

    it('redirects unauthenticated user from /en/resume/123 to login', async () => {
      const req = makeRequest('/en/resume/123')
      const res = await proxy(req)

      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toContain('/login')
    })
  })

  describe('public routes', () => {
    it('redirects authenticated user away from /en/login to chat', async () => {
      mockGetSessionCookie.mockReturnValue(true)

      const req = makeRequest('/en/login')
      const res = await proxy(req)

      expect(res.status).toBe(307)
      const location = res.headers.get('location')
      expect(location).toContain('/chat')
    })

    it('does not redirect unauthenticated user from login', async () => {
      mockGetSessionCookie.mockReturnValue(false)
      mockIntlMiddleware.mockReturnValue(null)

      const req = makeRequest('/en/login')
      const res = await proxy(req)

      // Should not redirect to chat
      if (res.status === 307) {
        expect(res.headers.get('location')).not.toContain('/chat')
      }
    })
  })

  describe('stripLocale logic', () => {
    it('handles /th/ prefix correctly (Thai locale)', async () => {
      mockGetSessionCookie.mockReturnValue(false)

      const req = makeRequest('/th/chat')
      const res = await proxy(req)

      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toContain('/th/login')
    })

    it('handles non-locale paths (defaults to en)', async () => {
      mockGetSessionCookie.mockReturnValue(false)

      const req = makeRequest('/chat')
      const res = await proxy(req)

      expect(res.status).toBe(307)
    })
  })
})
