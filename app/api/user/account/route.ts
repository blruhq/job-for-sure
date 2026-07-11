import { NextRequest, NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { user } from '~/lib/schema'
import { getSessionUser } from '~/lib/auth-helpers'
import { checkGeneralRateLimit } from '~/lib/ratelimit'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const DeleteAccountBody = z.object({
  confirm: z.literal('DELETE'),
})

// DELETE /api/user/account — requires { confirm: 'DELETE' } in body
export async function DELETE(req: NextRequest) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = await checkGeneralRateLimit(sessionUser.id)
  if (limited) return limited

  const body = DeleteAccountBody.safeParse(await req.json().catch(() => ({})))
  if (!body.success) {
    return NextResponse.json(
      { error: 'Confirmation required. Send { confirm: "DELETE" }.' },
      { status: 400 },
    )
  }

  // Delete user — all related tables cascade (sessions, accounts, resumes, etc.)
  await db.delete(user).where(eq(user.id, sessionUser.id))

  return NextResponse.json({ success: true })
}
