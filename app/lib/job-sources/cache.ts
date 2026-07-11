import { Redis } from '@upstash/redis'

// ═══════════════════════════════════════════════════════════════
// SEARCH CACHE — Upstash Redis with TTL
//
// Key: hash(query + location + sources)
// TTL: 6 hours (jobs don't change that fast)
//
// Upstash Redis is serverless-friendly (HTTP-based, pay-per-request).
// Works on Vercel edge and Node.js runtimes.
// ═══════════════════════════════════════════════════════════════

const TTL_SECONDS = 6 * 60 * 60 // 6 hours

let _redis: Redis | null = null

function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }
  return _redis
}

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
  return `${query.toLowerCase().trim()}::${(location || '').toLowerCase().trim()}${srcKey}`
}
