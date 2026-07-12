import { Redis } from '@upstash/redis'

/**
 * Shared Redis singleton — used by both ratelimit.ts and cache.ts.
 * Fail-open: if env vars are missing, exports null and callers handle it.
 */
let _redis: Redis | null = null

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }
  return _redis
}
