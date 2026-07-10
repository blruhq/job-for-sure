// ═══════════════════════════════════════════════════════════════
// SEARCH CACHE — in-memory with TTL
//
// Key: hash(query + location)
// TTL: 6 hours (jobs don't change that fast)
//
// Note: This works for persistent Node servers (next start).
// For serverless (Vercel), swap this for a Postgres cache table
// or Redis/Upstash. The interface stays the same.
// ═══════════════════════════════════════════════════════════════

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const TTL_MS = 6 * 60 * 60 * 1000 // 6 hours
const cache = new Map<string, CacheEntry<unknown>>()

// Cleanup expired entries every 30 minutes (lazy)
let lastCleanup = Date.now()
function maybeCleanup() {
  const now = Date.now()
  if (now - lastCleanup > 30 * 60 * 1000) {
    for (const [key, entry] of cache) {
      if (entry.expiresAt < now) cache.delete(key)
    }
    lastCleanup = now
  }
}

export function getCached<T>(key: string): T | null {
  maybeCleanup()
  const entry = cache.get(key)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

export function setCached<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + TTL_MS,
  })
}

export function cacheKey(query: string, location?: string, sources?: string[]): string {
  const srcKey = sources ? '-' + [...sources].sort().join(',') : ''
  return `${query.toLowerCase().trim()}::${(location || '').toLowerCase().trim()}${srcKey}`
}
