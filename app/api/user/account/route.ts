import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { user } from '~/lib/schema'
import { withAuth } from '~/lib/with-auth'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const DeleteAccountBody = z.object({
  confirm: z.literal('DELETE'),
})

export const DELETE = withAuth(async (req, { user: sessionUser }) => {
  const body = DeleteAccountBody.safeParse(await req.json().catch(() => ({})))
  if (!body.success) {
    return NextResponse.json(
      { error: 'Confirmation required. Send { confirm: "DELETE" }.' },
      { status: 400 },
    )
  }

  await db.delete(user).where(eq(user.id, sessionUser.id))

  return NextResponse.json({ success: true })
}, { rateLimitType: 'general', route: '/api/user/account' })
