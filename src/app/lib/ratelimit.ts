import { Ratelimit } from '@upstash/ratelimit'
import { getRedis } from '~/lib/redis'

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
let _authIpRatelimit: Ratelimit | null = null
let _pdfRatelimit: Ratelimit | null = null

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

function getAuthIpRatelimit(): Ratelimit {
  if (!_authIpRatelimit) {
    _authIpRatelimit = new Ratelimit({
      redis: getRedis(),
      // 10 req/min per IP — blocks brute-force and signup email-bombing
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      prefix: 'jfs:auth-ip',
      analytics: true,
    })
  }
  return _authIpRatelimit
}

function getPdfRatelimit(): Ratelimit {
  if (!_pdfRatelimit) {
    _pdfRatelimit = new Ratelimit({
      redis: getRedis(),
      // 10 req/min — CPU-intensive @react-pdf/renderer renders
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      prefix: 'jfs:pdf',
      analytics: true,
    })
  }
  return _pdfRatelimit
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

/**
 * Check auth rate limit by IP (10 req/min).
 * Used for unauthenticated auth endpoints (login, signup, password reset)
 * to prevent brute-force and email-bombing.
 * Returns null if allowed, or a Response (429) if rate limited.
 */
export async function checkAuthIpRateLimit(
  ip: string,
): Promise<Response | null> {
  return doLimit(getAuthIpRatelimit(), ip)
}

/**
 * Check PDF rate limit for a user (10 req/min).
 * CPU-intensive @react-pdf/renderer renders should not be hammered.
 * Returns null if allowed, or a Response (429) if rate limited.
 */
export async function checkPdfRateLimit(
  userId: string,
): Promise<Response | null> {
  return doLimit(getPdfRatelimit(), userId)
}

/**
 * Extract client IP from request headers.
 * Checks XFF (Vercel, Cloudflare) and X-Real-IP.
 * Falls back to 'unknown' if all headers are missing.
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    // First hop is the client
    return xff.split(',')[0].trim()
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
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
