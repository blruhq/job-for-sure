import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted so the mock variables exist when vi.mock factory runs
const { mockCapture, mockCaptureException } = vi.hoisted(() => ({
  mockCapture: vi.fn(),
  mockCaptureException: vi.fn(),
}))

// Use class-based mock — vi.fn(() => ({})) does NOT work with `new` keyword
vi.mock('posthog-node', () => ({
  PostHog: class MockPostHog {
    capture = mockCapture
    captureException = mockCaptureException
  },
}))

import { captureServerEvent, captureServerError } from '~/lib/posthog-server'

// Set env vars for tests
process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = 'test-token'
process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://test.posthog.com'

describe('posthog-server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('captureServerEvent', () => {
    it('calls posthog.capture with correct params', async () => {
      await captureServerEvent('user-1', 'test_event', { foo: 'bar' })

      expect(mockCapture).toHaveBeenCalledWith({
        distinctId: 'user-1',
        event: 'test_event',
        properties: { foo: 'bar' },
      })
    })

    it('works without properties', async () => {
      await captureServerEvent('user-1', 'test_event')

      expect(mockCapture).toHaveBeenCalledWith({
        distinctId: 'user-1',
        event: 'test_event',
        properties: undefined,
      })
    })

    it('does NOT throw on error (silently fails)', async () => {
      mockCapture.mockImplementationOnce(() => {
        throw new Error('PostHog down')
      })

      await expect(captureServerEvent('user-1', 'test')).resolves.toBeUndefined()
    })
  })

  describe('captureServerError', () => {
    it('calls posthog.captureException with error + distinctId + properties', async () => {
      const error = new Error('Test error')
      await captureServerError('user-1', error, { route: '/api/test' })

      expect(mockCaptureException).toHaveBeenCalledWith(error, 'user-1', { route: '/api/test' })
    })

    it('works without properties', async () => {
      const error = new Error('Test error')
      await captureServerError('user-1', error)

      expect(mockCaptureException).toHaveBeenCalledWith(error, 'user-1', undefined)
    })

    it('does NOT throw on error (silently fails)', async () => {
      mockCaptureException.mockImplementationOnce(() => {
        throw new Error('PostHog down')
      })

      await expect(captureServerError('user-1', new Error('x'))).resolves.toBeUndefined()
    })
  })
})
