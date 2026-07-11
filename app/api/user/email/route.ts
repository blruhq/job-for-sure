import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { user } from '~/lib/schema'
import { getSessionUser } from '~/lib/auth-helpers'
import { eq } from 'drizzle-orm'
import { auth } from '~/lib/auth'
import { headers } from 'next/headers'

// PUT /api/user/email
export async function PUT(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email } = await request.json()

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  // Check if email already taken
  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1)
    .then(rows => rows[0])

  if (existing && existing.id !== sessionUser.id) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }

  // Update email in database and mark unverified
  await db
    .update(user)
    .set({ email, emailVerified: false })
    .where(eq(user.id, sessionUser.id))

  // Send verification email via Better Auth
  try {
    await auth.api.sendVerificationEmail({
      headers: await headers(),
      body: { email },
    })
  } catch {
    // Non-blocking — user can request verification manually
  }

  return NextResponse.json({ success: true, message: 'Email updated. Verification email sent.' })
}
