import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Per-user rate limiter for AI endpoints.
 * Allows 20 requests per minute per user — enough for normal usage,
 * blocks automated abuse that could rack up API costs.
 *
 * Uses Upstash Redis (serverless, edge-compatible).
 * Requires env vars:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

let _ratelimit: Ratelimit | null = null

function getRatelimit(): Ratelimit {
  if (!_ratelimit) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
    _ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '1 m'),
      prefix: 'jfs:ai',
      analytics: true,
    })
  }
  return _ratelimit
}

/**
 * Check rate limit for a user. Returns null if allowed,
 * or a Response (429) if rate limited.
 *
 * Usage in API routes:
 *   const limited = await checkRateLimit(user.id)
 *   if (limited) return limited
 */
export async function checkRateLimit(
  userId: string,
): Promise<Response | null> {
  try {
    const { success, reset } = await getRatelimit().limit(userId)
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
