import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'

// Mock the 'ai' SDK
const mockGenerateText = vi.fn()
const mockGenerateObject = vi.fn()
const mockConvertToModelMessages = vi.fn()

vi.mock('ai', () => ({
  streamText: vi.fn(),
  generateText: (...args: unknown[]) => mockGenerateText(...args),
  generateObject: (...args: unknown[]) => mockGenerateObject(...args),
  convertToModelMessages: (...args: unknown[]) => mockConvertToModelMessages(...args),
}))

// Mock @ai-sdk/openai
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => ({
    chat: vi.fn(() => ({ modelId: 'mock-model' })),
  })),
}))

import { generateTextWithFailover, generateObjectWithFailover } from '~/lib/ai-providers'

describe('ai-providers failover', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConvertToModelMessages.mockResolvedValue([])
  })

  describe('generateTextWithFailover', () => {
    it('returns text from first provider on success', async () => {
      mockGenerateText.mockResolvedValue({ text: 'Hello world' })

      const result = await generateTextWithFailover({
        system: 'You are helpful',
        prompt: 'Say hello',
      })

      expect(result).toBe('Hello world')
      expect(mockGenerateText).toHaveBeenCalledTimes(1)
    })

    it('falls over to second provider when first fails', async () => {
      mockGenerateText
        .mockRejectedValueOnce(new Error('Provider 1 down'))
        .mockResolvedValueOnce({ text: 'Hello from provider 2' })

      const result = await generateTextWithFailover({
        system: 'You are helpful',
        prompt: 'Say hello',
      })

      expect(result).toBe('Hello from provider 2')
      expect(mockGenerateText).toHaveBeenCalledTimes(2)
    })

    it('throws when all providers fail', async () => {
      mockGenerateText
        .mockRejectedValueOnce(new Error('Provider 1 down'))
        .mockRejectedValueOnce(new Error('Provider 2 down'))

      await expect(
        generateTextWithFailover({
          system: 'test',
          prompt: 'test',
        }),
      ).rejects.toThrow('Provider 2 down')
    })
  })

  describe('generateObjectWithFailover', () => {
    const schema = z.object({
      name: z.string(),
      score: z.number(),
    })

    it('returns parsed object from first provider on success', async () => {
      mockGenerateObject.mockResolvedValue({
        object: { name: 'Test', score: 85 },
      })

      const result = await generateObjectWithFailover<{
        name: string
        score: number
      }>({
        system: 'Return JSON',
        prompt: 'test',
        schema,
      })

      expect(result).toEqual({ name: 'Test', score: 85 })
      expect(mockGenerateObject).toHaveBeenCalledTimes(1)
    })

    it('falls over to second provider when first fails', async () => {
      mockGenerateObject
        .mockRejectedValueOnce(new Error('Provider 1 schema error'))
        .mockResolvedValueOnce({ object: { name: 'Test2', score: 90 } })

      const result = await generateObjectWithFailover<{
        name: string
        score: number
      }>({
        system: 'test',
        prompt: 'test',
        schema,
      })

      expect(result).toEqual({ name: 'Test2', score: 90 })
      expect(mockGenerateObject).toHaveBeenCalledTimes(2)
    })

    it('throws when all providers fail', async () => {
      mockGenerateObject
        .mockRejectedValueOnce(new Error('Provider 1 failed'))
        .mockRejectedValueOnce(new Error('Provider 2 failed'))

      await expect(
        generateObjectWithFailover({
          system: 'test',
          prompt: 'test',
          schema,
        }),
      ).rejects.toThrow('Provider 2 failed')
    })
  })
})
