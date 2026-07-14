import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '~/lib/auth-helpers'
import { checkRateLimit, checkGeneralRateLimit } from '~/lib/ratelimit'
import { captureServerError } from '~/lib/posthog-server'

export interface AuthContext<P = Record<string, string>> {
  user: { id: string; email: string; name: string }
  params: P
}

type AuthHandler<P> = (
  req: NextRequest,
  ctx: AuthContext<P>,
) => Promise<Response> | Response

/**
 * Higher-order function to wrap API routes with authentication,
 * rate limiting, and global error handling.
 *
 * @example
 * export const POST = withAuth(async (req, { user }) => { ... }, { rateLimitType: 'general' })
 * export const GET = withAuth<{ id: string }>(async (req, { user, params }) => { ... })
 */
export function withAuth<P = Record<string, string>>(
  handler: AuthHandler<P>,
  opts?: {
    rateLimitType?: 'ai' | 'general'
    route?: string
  },
) {
  return async (
    req: Request,
    { params }: { params?: P | Promise<P> } = {},
  ): Promise<Response> => {
    const nextReq = req as NextRequest
    let userId = 'anonymous'

    try {
      // 1. Auth check
      const user = await getSessionUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = user.id

      // 1b. Origin check — defense against CSRF on custom API routes
      const method = nextReq.method.toUpperCase()
      if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
        const origin = nextReq.headers.get('origin')
        const host = nextReq.headers.get('host')
        if (origin && host && !origin.includes(host)) {
          return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 })
        }
      }

      // 2. Rate limit (fail-open)
      if (opts?.rateLimitType === 'ai') {
        const limited = await checkRateLimit(user.id)
        if (limited) return limited
      } else if (opts?.rateLimitType === 'general') {
        const limited = await checkGeneralRateLimit(user.id)
        if (limited) return limited
      }

      // 3. Resolve Next.js 15+ async params
      let resolvedParams: P
      if (params && typeof (params as Promise<P>).then === 'function') {
        resolvedParams = await (params as Promise<P>)
      } else {
        resolvedParams = (params ?? {} as P) as P
      }

      // 4. Execute handler
      return await handler(nextReq, { user, params: resolvedParams })
    } catch (error) {
      console.error(`[API Error] ${opts?.route || nextReq.url}:`, error)
      await captureServerError(userId, error, {
        route: opts?.route || nextReq.url,
      })

      // Never leak internal error details in production
      const message =
        process.env.NODE_ENV === 'production'
          ? 'Internal Server Error'
          : error instanceof Error
            ? error.message
            : 'Unknown error'

      return NextResponse.json({ error: message }, { status: 500 })
    }
  }
}
