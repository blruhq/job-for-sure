import { NextResponse } from 'next/server'
import { db } from '~/lib/db'
import { user, subscriptions } from '~/lib/schema'
import { withAuth } from '~/lib/with-auth'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { stripe } from '~/lib/stripe'

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

  // Cancel any active Stripe subscription before deleting the user.
  // If we skip this, the customer keeps getting charged forever and can no
  // longer self-serve (no portal access without an account).
  try {
    const activeSubs = await db
      .select({ id: subscriptions.id, status: subscriptions.status })
      .from(subscriptions)
      .where(eq(subscriptions.userId, sessionUser.id))
    for (const sub of activeSubs) {
      if (sub.status === 'active' || sub.status === 'trialing') {
        await stripe.subscriptions.cancel(sub.id)
      }
    }
  } catch (err) {
    // Log but don't block deletion — user wants their account gone.
    console.error('[account-delete] Failed to cancel Stripe subscription:', err)
  }

  await db.delete(user).where(eq(user.id, sessionUser.id))

  return NextResponse.json({ success: true })
}, { rateLimitType: 'general', route: '/api/user/account' })
