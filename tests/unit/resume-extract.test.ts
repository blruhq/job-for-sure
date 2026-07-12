import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock unpdf
vi.mock('unpdf', () => ({
  getDocumentProxy: vi.fn(),
}))

// Mock mammoth (dynamic import in source)
vi.mock('mammoth', () => ({
  extractRawText: vi.fn().mockResolvedValue({ value: 'mock docx content' }),
}))

import { extractTextFromFile, UnsupportedFileError } from '~/lib/resume-extract'

describe('resume-extract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('file type detection', () => {
    it('rejects .doc files with UnsupportedFileError', async () => {
      const file = new File(['test'], 'resume.doc', { type: 'application/msword' })
      await expect(extractTextFromFile(file)).rejects.toThrow(UnsupportedFileError)
      await expect(extractTextFromFile(file)).rejects.toThrow(/Legacy .doc format/)
    })

    it('rejects unknown file extensions', async () => {
      const file = new File(['test'], 'resume.xyz', { type: 'application/octet-stream' })
      await expect(extractTextFromFile(file)).rejects.toThrow(UnsupportedFileError)
    })

    it('rejects files larger than 5MB', async () => {
      const largeBlob = new Blob([new Uint8Array(6 * 1024 * 1024)])
      const file = new File([largeBlob], 'resume.pdf', { type: 'application/pdf' })
      await expect(extractTextFromFile(file)).rejects.toThrow(/File too large/)
    })
  })

  describe('text extraction from TXT', () => {
    it('extracts text from plain text files', async () => {
      const content = 'John Doe\nSoftware Engineer\n5 years of experience in React and TypeScript.'
      const file = new File([content], 'resume.txt', { type: 'text/plain' })
      const result = await extractTextFromFile(file)
      expect(result).toBe(content)
    })

    it('extracts text from markdown files', async () => {
      const content = '# John Doe\n\n## Experience\n\n- Senior Engineer at Acme (5 years)\n- Built React applications.'
      const file = new File([content], 'resume.md', { type: 'text/markdown' })
      const result = await extractTextFromFile(file)
      expect(result).toContain('John Doe')
      expect(result).toContain('Senior Engineer')
    })
  })

  describe('minimum text length validation', () => {
    it('throws when extracted text is too short (< 50 chars)', async () => {
      const file = new File(['short text', 'x'.repeat(30)], 'resume.txt', { type: 'text/plain' })
      await expect(extractTextFromFile(file)).rejects.toThrow(/Could not extract enough text/)
    })

    it('succeeds when text is exactly 50+ chars', async () => {
      const content = 'x'.repeat(55)
      const file = new File([content], 'resume.txt', { type: 'text/plain' })
      const result = await extractTextFromFile(file)
      expect(result.length).toBe(55)
    })
  })
})
