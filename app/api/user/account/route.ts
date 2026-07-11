import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { user } from '~/lib/schema'
import { getSessionUser } from '~/lib/auth-helpers'
import { eq } from 'drizzle-orm'

// DELETE /api/user/account
export async function DELETE() {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Delete user — all related tables cascade (sessions, accounts, resumes, etc.)
  await db.delete(user).where(eq(user.id, sessionUser.id))

  return NextResponse.json({ success: true })
}
