import type Stripe from 'stripe'
import { PRO_PRICE_IDS } from '~/lib/stripe'
import { db } from '~/lib/db'
import { user, subscriptions } from '~/lib/schema'
import { eq } from 'drizzle-orm'

export function extractPeriodEnd(sub: Stripe.Subscription): number {
  // apiVersion 2026-06-24.dahlia moved current_period_end to items.data[0]
  const fromItem = (sub.items?.data?.[0] as unknown as { current_period_end?: number })?.current_period_end
  const fromSnake = (sub as unknown as { current_period_end?: number }).current_period_end
  const fromCamel = (sub as unknown as { currentPeriodEnd?: number }).currentPeriodEnd
  return fromItem ?? fromSnake ?? fromCamel ?? 0
}

export function resolvePlan(sub: Stripe.Subscription): { plan: 'pro' | 'free'; interval: string | null } {
  const priceId = sub.items?.data?.[0]?.price?.id
  const priceMeta = sub.items?.data?.[0]?.price?.metadata?.plan
  const plan = (priceId && PRO_PRICE_IDS.has(priceId)) || priceMeta === 'pro' ? ('pro' as const) : ('free' as const)
  const interval = sub.items?.data?.[0]?.price?.recurring?.interval || null
  return { plan, interval }
}

export async function upsertSubscription(sub: Stripe.Subscription, customerId: string, userId: string) {
  const { plan, interval } = resolvePlan(sub)
  const periodEndSeconds = extractPeriodEnd(sub)
  const periodEnd =
    periodEndSeconds > 0
      ? new Date(periodEndSeconds * 1000)
      : new Date(Date.now() + 30 * 24 * 3600 * 1000)

  await db
    .insert(subscriptions)
    .values({
      id: sub.id,
      userId,
      stripeCustomerId: customerId,
      status: sub.status,
      plan,
      interval,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    })
    .onConflictDoUpdate({
      target: subscriptions.id,
      set: {
        status: sub.status,
        plan,
        interval,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        updatedAt: new Date(),
      },
    })

  const effectivePlan = sub.status === 'active' || sub.status === 'trialing' ? plan : 'free'
  await db
    .update(user)
    .set({
      plan: effectivePlan,
      planUpdatedAt: new Date(),
    })
    .where(eq(user.id, userId))

  return { plan: effectivePlan, interval, periodEnd }
}
