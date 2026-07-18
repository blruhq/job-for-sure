import { NextResponse } from 'next/server'
import { stripe } from '~/lib/stripe'
import { getSessionUser } from '~/lib/auth-helpers'
import { db } from '~/lib/db'
import { user } from '~/lib/schema'
import { eq } from 'drizzle-orm'

/**
 * POST /api/billing/portal
 * Creates a Stripe Customer Portal session so the user can manage
 * their subscription (upgrade, cancel, update payment method).
 *
 * Returns: { url: string }
 */
export async function POST() {
  const userData = await getSessionUser()
  if (!userData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [found] = await db
    .select({ stripeCustomerId: user.stripeCustomerId })
    .from(user)
    .where(eq(user.id, userData.id))
    .limit(1)

  if (!found?.stripeCustomerId) {
    // User has no Stripe customer yet (never subscribed)
    return NextResponse.json({ error: 'No subscription found' }, { status: 400 })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: found.stripeCustomerId,
    return_url: `${process.env.BETTER_AUTH_URL}/settings/billing`,
  })

  return NextResponse.json({ url: session.url })
}
