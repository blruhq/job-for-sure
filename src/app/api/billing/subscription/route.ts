import { NextResponse } from 'next/server'
import { getSessionUser } from '~/lib/auth-helpers'
import { db } from '~/lib/db'
import { user, subscriptions } from '~/lib/schema'
import { eq, desc } from 'drizzle-orm'
import { getUsageBreakdown, type PlanTier } from '~/lib/plan'

/**
 * GET /api/billing/subscription
 * Returns the current user's subscription status + usage breakdown.
 *
 * Used by /settings/billing page to render state.
 */
export async function GET() {
  const userData = await getSessionUser()
  if (!userData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Current subscription
  const [currentUser] = await db
    .select({
      plan: user.plan,
      stripeCustomerId: user.stripeCustomerId,
    })
    .from(user)
    .where(eq(user.id, userData.id))
    .limit(1)

  const subscription = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userData.id))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1)
    .then((rows) => rows[0] ?? null)

  // Usage breakdown
  const usage = await getUsageBreakdown(userData.id, userData.role, currentUser?.plan ?? 'free')

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
}
