import { NextResponse } from 'next/server'
import { stripe } from '~/lib/stripe'
import { withAuth } from '~/lib/with-auth'
import { db } from '~/lib/db'
import { subscriptions } from '~/lib/schema'
import { eq, desc } from 'drizzle-orm'

/**
 * POST /api/billing/cancel
 * Cancels the subscription at the current period end.
 * The user keeps Pro access until currentPeriodEnd.
 */
export const POST = withAuth(async (_req, { user }) => {
  // Find the active subscription
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1)

  if (!sub || (sub.status !== 'active' && sub.status !== 'trialing')) {
    return NextResponse.json({ error: 'No active subscription' }, { status: 400 })
  }

  // Cancel at period end in Stripe
  await stripe.subscriptions.update(sub.id, {
    cancel_at_period_end: true,
  })

  // Update local state
  await db
    .update(subscriptions)
    .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
    .where(eq(subscriptions.id, sub.id))

  return NextResponse.json({ canceled: true, accessUntil: sub.currentPeriodEnd })
}, { rateLimitType: 'general', route: '/api/billing/cancel' })
