import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockGetSessionUser,
  mockCheckRateLimit,
  mockGenerateObjectWithFailover,
  mockSelect,
  mockInsert,
} = vi.hoisted(() => ({
  mockGetSessionUser: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockGenerateObjectWithFailover: vi.fn(),
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
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

// Mock Drizzle DB
const mockOrderBy = vi.fn()
const mockWhere = vi.fn()
const mockFrom = vi.fn()
const mockValues = vi.fn()

mockSelect.mockReturnValue({
  from: mockFrom.mockReturnValue({
    where: mockWhere.mockReturnValue({
      orderBy: mockOrderBy,
    }),
  }),
})

mockInsert.mockReturnValue({
  values: mockValues,
})

vi.mock('~/lib/db', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
  },
}))

import { GET, POST } from '~/api/ai/interview/route'

describe('Interview API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckRateLimit.mockResolvedValue(null) // Not rate limited by default
  })

  describe('GET', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockGetSessionUser.mockResolvedValue(null)

      const req = new NextRequest('http://localhost/api/ai/interview')
      const res = await GET(req)
      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.error).toBe('Unauthorized')
    })

    it('returns interview history on success', async () => {
      mockGetSessionUser.mockResolvedValue({ id: 'u1', email: 'test@mail.com', name: 'Test' })
      const mockHistory = [
        {
          id: 'int_1',
          userId: 'u1',
          company: 'Stripe',
          role: 'Engineer',
          type: 'technical',
          difficulty: 'senior',
          score: '8.5',
          exchanges: [],
        },
      ]
      mockOrderBy.mockResolvedValue(mockHistory)

      const req = new NextRequest('http://localhost/api/ai/interview')
      const res = await GET(req)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toEqual(mockHistory)
      expect(mockSelect).toHaveBeenCalled()
    })
  })

  describe('POST', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockGetSessionUser.mockResolvedValue(null)

      const req = new NextRequest('http://localhost/api/ai/interview', {
        method: 'POST',
        body: JSON.stringify({ action: 'question' }),
      })
      const res = await POST(req)
      expect(res.status).toBe(401)
    })

    it('returns 400 when body does not match validation schema for action: question', async () => {
      mockGetSessionUser.mockResolvedValue({ id: 'u1', email: 'test@mail.com', name: 'Test' })

      const req = new NextRequest('http://localhost/api/ai/interview', {
        method: 'POST',
        body: JSON.stringify({ action: 'question' }), // Missing config/target
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBe('Invalid question request')
    })

    it('generates question when action: question is requested', async () => {
      mockGetSessionUser.mockResolvedValue({ id: 'u1', email: 'test@mail.com', name: 'Test' })
      mockGenerateObjectWithFailover.mockResolvedValue({
        question: 'Explain reconciliation in React.',
        category: 'technical',
        tags: ['react', 'performance'],
      })

      const req = new NextRequest('http://localhost/api/ai/interview', {
        method: 'POST',
        body: JSON.stringify({
          action: 'question',
          target: { company: 'Stripe', role: 'Engineer' },
          config: { type: 'technical', difficulty: 'senior' },
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.question).toBe('Explain reconciliation in React.')
      expect(mockGenerateObjectWithFailover).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('expert interviewer at Stripe'),
        })
      )
    })

    it('evaluates answer when action: evaluate is requested', async () => {
      mockGetSessionUser.mockResolvedValue({ id: 'u1', email: 'test@mail.com', name: 'Test' })
      mockGenerateObjectWithFailover.mockResolvedValue({
        score: 8,
        strengths: ['Clear terminology'],
        improvements: ['Include fiber details'],
        modelAnswer: 'Reconciliation is...',
      })

      const req = new NextRequest('http://localhost/api/ai/interview', {
        method: 'POST',
        body: JSON.stringify({
          action: 'evaluate',
          target: { company: 'Stripe', role: 'Engineer' },
          question: 'Explain reconciliation',
          answer: 'It compares virtual DOM trees.',
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.score).toBe(8)
      expect(mockGenerateObjectWithFailover).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('expert interview evaluator'),
        })
      )
    })

    it('batch-evaluates all answers when action: batch-evaluate is requested', async () => {
      mockGetSessionUser.mockResolvedValue({ id: 'u1', email: 'test@mail.com', name: 'Test' })
      mockGenerateObjectWithFailover.mockResolvedValue({
        evaluations: [
          {
            questionIndex: 0,
            score: 7,
            strengths: ['Clear explanation'],
            improvements: ['Add more detail'],
            modelAnswer: 'Ideal answer here',
          },
          {
            questionIndex: 1,
            score: 8,
            strengths: ['Good structure'],
            improvements: ['Quantify results'],
            modelAnswer: 'Another ideal answer',
          },
        ],
        overallScore: 7.5,
        summary: 'Solid performance with room for growth.',
      })

      const req = new NextRequest('http://localhost/api/ai/interview', {
        method: 'POST',
        body: JSON.stringify({
          action: 'batch-evaluate',
          target: { company: 'Stripe', role: 'Engineer' },
          difficulty: 'senior',
          qaPairs: [
            { question: 'Explain React reconciliation', answer: 'It compares virtual DOM trees.' },
            { question: 'Design a URL shortener', answer: 'Use a hash function and store mappings.' },
          ],
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.evaluations).toHaveLength(2)
      expect(json.overallScore).toBe(7.5)
      expect(json.summary).toBeDefined()
      expect(mockGenerateObjectWithFailover).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('expert interview evaluation panel'),
        })
      )
    })

    it('saves session when action: save is requested', async () => {
      mockGetSessionUser.mockResolvedValue({ id: 'u1', email: 'test@mail.com', name: 'Test' })
      mockValues.mockResolvedValue({ success: true })

      const req = new NextRequest('http://localhost/api/ai/interview', {
        method: 'POST',
        body: JSON.stringify({
          action: 'save',
          company: 'Stripe',
          role: 'Engineer',
          type: 'technical',
          difficulty: 'senior',
          score: '8.5',
          exchanges: [],
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.id).toBeDefined()
      expect(mockInsert).toHaveBeenCalled()
      expect(mockValues).toHaveBeenCalled()
    })
  })
})
