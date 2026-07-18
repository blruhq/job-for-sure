import { NextResponse } from 'next/server'
import { stripe, STRIPE_PRICES } from '~/lib/stripe'
import { withAuth } from '~/lib/with-auth'

/**
 * POST /api/billing/checkout
 * Creates a Stripe Checkout Session. Redirects the user to Stripe's hosted page.
 *
 * Body: { interval: 'month' | 'year' }
 * Returns: { url: string } — redirect user here
 */
export const POST = withAuth(async (req, { user }) => {
  const body = await req.json()
  const interval = body.interval === 'year' ? 'yearly' : 'monthly'
  const priceId = STRIPE_PRICES[interval]

  if (!priceId) {
    return NextResponse.json({ error: 'Price not configured' }, { status: 500 })
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    integration_identifier: `jfs-checkout-${Math.random().toString(36).slice(2, 10)}`,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    customer_email: user.email,
    metadata: { userId: user.id },
    success_url: `${process.env.BETTER_AUTH_URL}/settings/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BETTER_AUTH_URL}/pricing?checkout=canceled`,
    subscription_data: {
      metadata: { userId: user.id },
    },
  })

  return NextResponse.json({ url: session.url })
}, { rateLimitType: 'general', route: '/api/billing/checkout' })