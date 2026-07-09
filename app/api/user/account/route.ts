import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { user } from '~/lib/schema'
import { auth } from '~/lib/auth'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'

async function getSessionUser() {
  const h = await headers()
  const session = await auth.api.getSession({ headers: h })
  return session?.user ?? null
}

// DELETE /api/user/account
export async function DELETE() {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Delete user — all related tables cascade (sessions, accounts, resumes, etc.)
  await db.delete(user).where(eq(user.id, sessionUser.id))

  return NextResponse.json({ success: true })
}
