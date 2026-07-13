import { auth } from '~/lib/auth'
import { headers } from 'next/headers'
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


