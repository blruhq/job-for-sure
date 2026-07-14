import { getRedis } from '~/lib/redis'

// ═══════════════════════════════════════════════════════════════
// SEARCH CACHE — Upstash Redis with TTL
//
// Key: hash(query + location + sources)
// TTL: 6 hours (jobs don't change that fast)
//
// Upstash Redis is serverless-friendly (HTTP-based, pay-per-request).
// Works on Vercel edge and Node.js runtimes.
// ═══════════════════════════════════════════════════════════════

const TTL_SECONDS = 2 * 60 * 60 // 2 hours — shorter TTL reduces Redis storage pressure.
// Previously 6h. Descriptions are stripped from cache (see index.ts) for ~80% space savings.

// Bump when JobResult schema changes (e.g., added country/region fields).
// Old cache entries with the previous version key are never hit and expire naturally.
const CACHE_VERSION = 'v2'

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const data = await getRedis().get<T>(`jfs:cache:${key}`)
    return data
  } catch {
    // Redis down → cache miss, don't break the app
    return null
  }
}

export async function setCached<T>(key: string, data: T): Promise<void> {
  try {
    await getRedis().set(`jfs:cache:${key}`, data, { ex: TTL_SECONDS })
  } catch {
    // Redis down → skip caching, don't break the app
  }
}

export function cacheKey(query: string, location?: string, sources?: string[]): string {
  const srcKey = sources ? '-' + [...sources].sort().join(',') : ''
  return `${CACHE_VERSION}:${query.toLowerCase().trim()}::${(location || '').toLowerCase().trim()}${srcKey}`
}
