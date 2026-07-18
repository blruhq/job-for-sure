import { NextResponse } from 'next/server'
import { withAuth } from '~/lib/with-auth'
import { db } from '~/lib/db'
import { user, subscriptions } from '~/lib/schema'
import { eq, desc } from 'drizzle-orm'
import { getUsageBreakdown, type PlanTier } from '~/lib/plan'

/**
 * GET /api/billing/subscription
 * Returns the current user's subscription status + usage breakdown.
 */
export const GET = withAuth(async (_req, { user: authUser }) => {
  const [currentUser] = await db
    .select({
      plan: user.plan,
      stripeCustomerId: user.stripeCustomerId,
    })
    .from(user)
    .where(eq(user.id, authUser.id))
    .limit(1)

  const subscription = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, authUser.id))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1)
    .then((rows) => rows[0] ?? null)

  const usage = await getUsageBreakdown(authUser.id, authUser.role, currentUser?.plan ?? 'free')

  return NextResponse.json({
    plan: currentUser?.plan ?? 'free' as PlanTier,
    stripeCustomerId: currentUser?.stripeCustomerId ?? null,
    hasActiveSubscription: subscription?.status === 'active' || subscription?.status === 'trialing',
    subscription: subscription
      ? {
          id: subscription.id,
          status: subscription.status,
          plan: subscription.plan,
          interval: subscription.interval,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        }
      : null,
    usage,
  })
}, { rateLimitType: 'general', route: '/api/billing/subscription' })