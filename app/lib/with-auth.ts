import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '~/lib/auth-helpers'
import { checkRateLimit, checkGeneralRateLimit } from '~/lib/ratelimit'
import { captureServerError } from '~/lib/posthog-server'

export interface AuthContext {
  user: { id: string; email: string; name: string }
  params: any
}

type AuthHandler = (
  req: NextRequest,
  ctx: AuthContext,
) => Promise<Response> | Response

/**
 * Higher-order function to wrap API routes with authentication,
 * rate limiting, and global error handling.
 *
 * @example
 * export const POST = withAuth(async (req, { user }) => { ... }, { rateLimitType: 'general' })
 */
export function withAuth(
  handler: AuthHandler,
  opts?: {
    rateLimitType?: 'ai' | 'general'
    route?: string
  },
) {
  return async (req: Request, { params }: { params?: any } = {}) => {
    // NextRequest inherits from Request. Ensure it's treated as NextRequest.
    const nextReq = req as NextRequest
    let userId = 'anonymous'

    try {
      const user = await getSessionUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = user.id

      if (opts?.rateLimitType === 'ai') {
        const limited = await checkRateLimit(user.id)
        if (limited) return limited
      } else if (opts?.rateLimitType === 'general') {
        const limited = await checkGeneralRateLimit(user.id)
        if (limited) return limited
      }

      // Unwrap params Promise if Next.js 15+ sends it as Promise
      let resolvedParams = params
      if (params && typeof params.then === 'function') {
        resolvedParams = await params
      }

      return await handler(nextReq, { user, params: resolvedParams })
    } catch (error) {
      console.error(`[API Error] ${opts?.route || nextReq.url}:`, error)
      await captureServerError(userId, error, { route: opts?.route || nextReq.url })
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Internal Server Error' },
        { status: 500 },
      )
    }
  }
}
