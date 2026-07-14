import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { user } from '~/lib/schema'
import { withAuth } from '~/lib/with-auth'
import { eq } from 'drizzle-orm'
import { auth } from '~/lib/auth'
import { headers } from 'next/headers'
import { z } from 'zod'

const EmailBody = z.object({
  email: z.string().email().max(254),
})

export const PUT = withAuth(async (req, { user: sessionUser }) => {
  const body = EmailBody.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Valid email address required' }, { status: 400 })
  }

  const { email } = body.data

  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1)
    .then(rows => rows[0])

  if (existing && existing.id !== sessionUser.id) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }

  await db
    .update(user)
    .set({ email, emailVerified: false })
    .where(eq(user.id, sessionUser.id))

  try {
    await auth.api.sendVerificationEmail({
      headers: await headers(),
      body: { email },
    })
  } catch {
    // Non-blocking — user can request verification manually
  }

  return NextResponse.json({ success: true, message: 'Email updated. Verification email sent.' })
}, { rateLimitType: 'general', route: '/api/user/email' })
