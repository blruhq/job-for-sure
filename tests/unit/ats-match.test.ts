import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockGetSessionUser, mockCheckRateLimit, mockGenerateObjectWithFailover } = vi.hoisted(() => ({
  mockGetSessionUser: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockGenerateObjectWithFailover: vi.fn(),
}))

vi.mock('~/lib/auth-helpers', () => ({
  getSessionUser: mockGetSessionUser,
}))

vi.mock('~/lib/ratelimit', () => ({
  checkRateLimit: mockCheckRateLimit,
}))

vi.mock('~/lib/ai-providers', () => ({
  generateObjectWithFailover: mockGenerateObjectWithFailover,
}))

import { POST } from '~/api/ai/ats-match/route'

describe('ATS Match API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckRateLimit.mockResolvedValue(null) // Not rate limited by default
  })

  it('returns 401 when user is not authenticated', async () => {
    mockGetSessionUser.mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/ai/ats-match', {
      method: 'POST',
      body: JSON.stringify({ resume: { name: 'Resume' } }),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 400 when body does not match validation schema', async () => {
    mockGetSessionUser.mockResolvedValue({ id: 'u1', email: 'test@mail.com', name: 'Test' })

    const req = new NextRequest('http://localhost/api/ai/ats-match', {
      method: 'POST',
      body: JSON.stringify({}), // Missing resume
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid request')
  })

  it('runs baseline health check when jdText is missing or empty', async () => {
    mockGetSessionUser.mockResolvedValue({ id: 'u1', email: 'test@mail.com', name: 'Test' })
    mockGenerateObjectWithFailover.mockResolvedValue({
      score: 85,
      categories: [
        { name: 'ATS Format', score: 90, evidence: 'Standard sections' },
        { name: 'Impact Language', score: 80, evidence: 'Action verbs' },
        { name: 'Skills Density', score: 85, evidence: 'Grouped clearly' },
        { name: 'Completeness', score: 85, evidence: 'Contact info exists' },
      ],
      matched: ['React'],
      missing: ['Kubernetes'],
      suggestions: ['Add more metrics'],
    })

    const req = new NextRequest('http://localhost/api/ai/ats-match', {
      method: 'POST',
      body: JSON.stringify({ resume: { name: 'Test Resume', skills: ['React'] } }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.score).toBe(85)
    expect(json.categories).toHaveLength(4)
    expect(json.categories[0].name).toBe('ATS Format')
    expect(mockGenerateObjectWithFailover).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('ATS format auditor'),
      })
    )
  })

  it('runs job description match when jdText is provided', async () => {
    mockGetSessionUser.mockResolvedValue({ id: 'u1', email: 'test@mail.com', name: 'Test' })
    mockGenerateObjectWithFailover.mockResolvedValue({
      score: 72,
      categories: [
        { name: 'Skills Match', score: 80, evidence: 'React/TS matched' },
        { name: 'Experience Fit', score: 70, evidence: 'Senior role match' },
        { name: 'Impact Relevance', score: 65, evidence: 'Needs more metrics' },
      ],
      matched: ['React', 'TypeScript'],
      missing: ['Node.js'],
      suggestions: ['Show Node.js in work history'],
    })

    const req = new NextRequest('http://localhost/api/ai/ats-match', {
      method: 'POST',
      body: JSON.stringify({
        resume: { name: 'Test Resume', skills: ['React', 'TypeScript'] },
        jdText: 'Stripe is looking for a Senior React Engineer with Node.js experience.',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.score).toBe(72)
    expect(json.categories).toHaveLength(3)
    expect(json.categories[0].name).toBe('Skills Match')
    expect(mockGenerateObjectWithFailover).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('ATS (Applicant Tracking System) expert'),
        prompt: expect.stringContaining('Stripe is looking for'),
      })
    )
  })
})
