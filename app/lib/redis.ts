import { Redis } from '@upstash/redis'

/**
 * Shared Upstash Redis singleton.
 *
 * Callers (ratelimit.ts, cache.ts) are responsible for fail-open behavior
 * via try/catch — this function will throw if env vars are missing.
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
