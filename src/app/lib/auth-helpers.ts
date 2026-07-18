import { auth } from '~/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'

/**
 * The authenticated user shape returned by helpers.
 * Includes the admin-plugin fields (role, banned, …).
 */
export type SessionUser = {
  id: string
  email: string
  name: string
  role: string
  banned: boolean
}

/**
 * Get the authenticated user from the current request session.
 * Returns null if not authenticated.
 *
 * Usage in API routes:
 *   const user = await getSessionUser()
 *   if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const h = await headers()
  const session = await auth.api.getSession({ headers: h })
  return (session?.user as SessionUser) ?? null
}

/**
 * Server-component guard. Redirects to /login if unauthenticated,
 * redirects to /admin if the user is an admin (admins are monitor-only).
 *
 * Use in (app) pages that should be locked from admins.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role === 'admin') redirect('/admin')
  return user
}

/**
 * Server-component guard. Redirects to /login if unauthenticated,
 * redirects to /chat if the user is NOT an admin.
 *
 * Use in /admin pages.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'admin') redirect('/chat')
  return user
}

/**
 * API-route guard. Returns the user or a 401/403 NextResponse.
 *
 *   const user = await requireAdminApi()
 *   if (user instanceof NextResponse) return user
 */
export async function requireAdminApi(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return user
}
