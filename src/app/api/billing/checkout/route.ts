import { NextResponse } from 'next/server'
import { stripe, STRIPE_PRICES } from '~/lib/stripe'
import { getSessionUser } from '~/lib/auth-helpers'

/**
 * POST /api/billing/checkout
 * Creates a Stripe Checkout Session. Redirects the user to Stripe's hosted page.
 *
 * Body: { interval: 'month' | 'year' }
 * Returns: { url: string } — redirect user here
 */
export async function POST(req: Request) {
  const userData = await getSessionUser()
  if (!userData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const interval = body.interval === 'year' ? 'yearly' : 'monthly'
  const priceId = STRIPE_PRICES[interval]

  if (!priceId) {
    return NextResponse.json({ error: 'Price not configured' }, { status: 500 })
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: userData.id,
    customer_email: userData.email,
    metadata: { userId: userData.id },
    success_url: `${process.env.BETTER_AUTH_URL}/settings/billing?checkout=success`,
    cancel_url: `${process.env.BETTER_AUTH_URL}/pricing?checkout=canceled`,
    subscription_data: {
      metadata: { userId: userData.id },
    },
  })

  return NextResponse.json({ url: session.url })
}
