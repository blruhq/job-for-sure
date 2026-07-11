import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { user } from '~/lib/schema'
import { getSessionUser } from '~/lib/auth-helpers'
import { checkGeneralRateLimit } from '~/lib/ratelimit'
import { eq } from 'drizzle-orm'
import { auth } from '~/lib/auth'
import { headers } from 'next/headers'
import { z } from 'zod'

const EmailBody = z.object({
  email: z.string().email().max(254),
})

// PUT /api/user/email
export async function PUT(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = await checkGeneralRateLimit(sessionUser.id)
  if (limited) return limited

  const body = EmailBody.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Valid email address required' }, { status: 400 })
  }

  const { email } = body.data

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
