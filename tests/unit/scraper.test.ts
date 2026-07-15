import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock cheerio to avoid loading in unit tests
vi.mock('cheerio', () => ({
  default: {
    load: vi.fn(() => vi.fn()),
  },
}))

// We need to test the validateUrl function indirectly through scrapeJob
// since it's not exported. scrapeJob calls validateUrl before any fetch.

import { scrapeJob } from '~/lib/scraper'

describe('scraper SSRF protection', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('blocks AWS metadata endpoint (169.254.169.254)', async () => {
    const result = await scrapeJob('http://169.254.169.254/latest/meta-data/')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Blocked|Invalid/)
  })

  it('blocks localhost', async () => {
    const result = await scrapeJob('http://localhost:3000/api/admin')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Blocked/)
  })

  it('blocks 127.0.0.1 (loopback)', async () => {
    const result = await scrapeJob('http://127.0.0.1:3000')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Blocked/)
  })

  it('blocks 10.x.x.x (private)', async () => {
    const result = await scrapeJob('http://10.0.0.1')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Blocked/)
  })

  it('blocks 192.168.x.x (private)', async () => {
    const result = await scrapeJob('http://192.168.1.1')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Blocked/)
  })

  it('blocks 172.16.x.x-172.31.x.x (private)', async () => {
    const result = await scrapeJob('http://172.16.0.1')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Blocked/)
  })

  it('blocks 0.0.0.0', async () => {
    const result = await scrapeJob('http://0.0.0.0')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Blocked/)
  })

  it('blocks file:// protocol', async () => {
    const result = await scrapeJob('file:///etc/passwd')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Blocked protocol|Invalid/)
  })

  it('blocks data: protocol', async () => {
    const result = await scrapeJob('data:text/html,<h1>hello</h1>')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Blocked protocol|Invalid/)
  })

  it('blocks metadata.google.internal', async () => {
    const result = await scrapeJob('http://metadata.google.internal/computeMetadata/v1/')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Blocked/)
  })

  it('allows valid public HTTPS URL (LinkedIn returns known error)', async () => {
    const result = await scrapeJob('https://linkedin.com/jobs/view/123')
    expect(result.success).toBe(false)
    expect(result.source).toBe('linkedin')
    expect(result.error).toContain('LinkedIn requires authentication')
  })

  it('returns error for malformed URL', async () => {
    const result = await scrapeJob('not-a-url')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Invalid URL/)
  })

  it('does NOT block 172.32.x.x (outside private range)', async () => {
    // 172.32.x.x is public, should pass validation
    // Mock fetch to avoid real network call — will return a 404-like response
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ENOTFOUND')))
    const result = await scrapeJob('http://172.32.0.1')
    // Should pass SSRF check — the error should be a network error, not "Blocked"
    expect(result.error).not.toMatch(/Blocked/)
  })
})
