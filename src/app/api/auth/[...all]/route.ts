import { auth } from '~/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'
import { NextResponse } from 'next/server'
import { checkAuthIpRateLimit, getClientIp } from '~/lib/ratelimit'

// Better Auth exposes GET (session reads, OAuth callbacks) and POST
// (sign-in, sign-up, password reset, verification). The expensive and
// abuse-prone paths are all POST, so we apply an IP rate limit there.
// GET is left unthrottled to avoid breaking OAuth round-trips.

const { GET, POST: rawPost } = toNextJsHandler(auth)

async function POST(req: Request): Promise<Response> {
  const ip = getClientIp(req)
  const blocked = await checkAuthIpRateLimit(ip)
  if (blocked) return blocked
  return rawPost(req)
}

export { GET, POST }
