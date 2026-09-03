import { NextResponse } from 'next/server'
import { stripe } from '~/lib/stripe'
import { withAuth } from '~/lib/with-auth'
import { db } from '~/lib/db'
import { user } from '~/lib/schema'
import { eq } from 'drizzle-orm'
import { upsertSubscription } from '~/lib/billing-sync'

export const POST = withAuth(
  async (req, { user: authUser }) => {
    let body: { sessionId?: string } = {}
    try {
      body = (await req.json()) as { sessionId?: string }
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { sessionId } = body
    if (!sessionId || !sessionId.startsWith('cs_')) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription'],
      })

      // Ownership check — fail-closed
      const ownerId =
        (session.client_reference_id as string) || (session.metadata?.userId as string)
      if (ownerId !== authUser.id) {
        return NextResponse.json({ error: 'Session not owned by user' }, { status: 403 })
      }

      if (session.payment_status !== 'paid' || session.status !== 'complete') {
        return NextResponse.json({ error: 'Session not paid' }, { status: 400 })
      }

      // session.subscription can be string | Subscription | null
      let sub = session.subscription as unknown as import('stripe').Stripe.Subscription | string | null
      if (typeof sub === 'string') {
        sub = await stripe.subscriptions.retrieve(sub)
      }

      if (!sub || typeof sub === 'string') {
        return NextResponse.json({ error: 'No subscription' }, { status: 400 })
      }

      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

      // Ensure user.stripeCustomerId is set (idempotent)
      if (session.customer) {
        const cid = typeof session.customer === 'string' ? session.customer : session.customer.id
        await db.update(user).set({ stripeCustomerId: cid }).where(eq(user.id, authUser.id))
      }

      const result = await upsertSubscription(
        sub as import('stripe').Stripe.Subscription,
        customerId,
        authUser.id
      )

      return NextResponse.json({
        verified: true,
        plan: result.plan,
        currentPeriodEnd: result.periodEnd.toISOString(),
      })
    } catch (err: unknown) {
      console.error('[billing/verify] verification failed:', err)
      const message = err instanceof Error ? err.message : 'Stripe verification error'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  },
  { rateLimitType: 'general', route: '/api/billing/verify' }
)
