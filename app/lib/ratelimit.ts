import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Per-user rate limiters for API endpoints.
 *
 * AI endpoints: 20 req/min (expensive — LLM calls)
 * General endpoints: 60 req/min (cheap — DB CRUD)
 *
 * Uses Upstash Redis (serverless, edge-compatible).
 * Requires env vars:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

let _aiRatelimit: Ratelimit | null = null
let _generalRatelimit: Ratelimit | null = null
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

function getAiRatelimit(): Ratelimit {
  if (!_aiRatelimit) {
    _aiRatelimit = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(20, '1 m'),
      prefix: 'jfs:ai',
      analytics: true,
    })
  }
  return _aiRatelimit
}

function getGeneralRatelimit(): Ratelimit {
  if (!_generalRatelimit) {
    _generalRatelimit = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      prefix: 'jfs:gen',
      analytics: true,
    })
  }
  return _generalRatelimit
}

/**
 * Check AI rate limit for a user (20 req/min).
 * Returns null if allowed, or a Response (429) if rate limited.
 */
export async function checkRateLimit(
  userId: string,
): Promise<Response | null> {
  return doLimit(getAiRatelimit(), userId)
}

/**
 * Check general rate limit for a user (60 req/min).
 * Returns null if allowed, or a Response (429) if rate limited.
 */
export async function checkGeneralRateLimit(
  userId: string,
): Promise<Response | null> {
  return doLimit(getGeneralRatelimit(), userId)
}

async function doLimit(
  limiter: Ratelimit,
  userId: string,
): Promise<Response | null> {
  try {
    const { success, reset } = await limiter.limit(userId)
    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000)
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please slow down.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
          },
        },
      )
    }
    return null
  } catch {
    // If Redis is down, allow the request through — don't break the app
    // because of rate limiter failure
    return null
  }
}
