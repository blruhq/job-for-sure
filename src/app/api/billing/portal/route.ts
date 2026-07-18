import { NextResponse } from 'next/server'
import { stripe } from '~/lib/stripe'
import { withAuth } from '~/lib/with-auth'
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
export const POST = withAuth(async (_req, { user: authUser }) => {
  const [found] = await db
    .select({ stripeCustomerId: user.stripeCustomerId })
    .from(user)
    .where(eq(user.id, authUser.id))
    .limit(1)

  if (!found?.stripeCustomerId) {
    return NextResponse.json({ error: 'No subscription found' }, { status: 400 })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: found.stripeCustomerId,
    return_url: `${process.env.BETTER_AUTH_URL}/settings/billing`,
  })

  return NextResponse.json({ url: session.url })
}, { rateLimitType: 'general', route: '/api/billing/portal' })