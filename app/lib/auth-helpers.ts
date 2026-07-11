import { auth } from '~/lib/auth'
import { headers } from 'next/headers'
import type { User } from 'better-auth'

/**
 * Get the authenticated user from the current request session.
 * Returns null if not authenticated.
 *
 * Usage in API routes:
 *   const user = await getSessionUser()
 *   if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 */
export async function getSessionUser(): Promise<{ id: string; email: string; name: string } | null> {
  const h = await headers()
  const session = await auth.api.getSession({ headers: h })
  return session?.user ?? null
}

/**
 * Require authentication or return a 401 response.
 * Throws a NextResponse-like object that should be returned directly.
 *
 * Usage:
 *   const user = await requireUser()
 *   // user is guaranteed non-null here
 */
export async function requireUser(): Promise<{ id: string; email: string; name: string }> {
  const user = await getSessionUser()
  if (!user) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return user
}
