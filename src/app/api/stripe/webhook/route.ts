import { NextResponse } from 'next/server'
import { stripe, STRIPE_WEBHOOK_SECRET } from '~/lib/stripe'
import { db } from '~/lib/db'
import { user, subscriptions } from '~/lib/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * Stripe webhook handler.
 *
 * Source of truth for subscription state. Every subscription change from Stripe
 * flows through here and is mirrored to the DB.
 *
 * Events handled:
 *   - checkout.session.completed   → set user.stripeCustomerId
 *   - customer.subscription.created/updated → UPSERT subscriptions + update user.plan
 *   - customer.subscription.deleted → set user.plan='free', mark sub canceled
 *   - invoice.payment_failed       → mark sub as past_due (3-day grace by Stripe)
 */
export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const { type, data } = event

  try {
    switch (type) {
      // ── Checkout completed → link customer to user ──
      case 'checkout.session.completed': {
        const session = data.object as any
        const userId = session.client_reference_id
        const customerId = session.customer

        if (userId && customerId) {
          await db
            .update(user)
            .set({ stripeCustomerId: customerId })
            .where(eq(user.id, userId))
        }
        break
      }

      // ── Subscription created/updated → mirror to DB ──
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = data.object as any
        const customerId = sub.customer

        // Find the user by stripeCustomerId
        const [found] = await db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.stripeCustomerId, customerId))
          .limit(1)
        if (!found) {
          // Edge case: checkout.session.completed fires before this for new customers.
          // But the customer ID might not be on the user yet if the webhook order is different.
          // Try by sub.metadata.userId as fallback.
          if (sub.metadata?.userId) {
            await db
              .update(user)
              .set({ stripeCustomerId: customerId })
              .where(eq(user.id, sub.metadata.userId))
          } else {
            return NextResponse.json({ error: 'No user found for subscription' }, { status: 200 })
          }
        }

        const userId = found?.id ?? sub.metadata?.userId
        if (!userId) {
          return NextResponse.json({ error: 'No userId' }, { status: 200 })
        }

        // Determine plan from the subscription items
        const plan = sub.items?.data?.[0]?.price?.metadata?.plan || 'pro'
        const interval = sub.items?.data?.[0]?.price?.recurring?.interval || null

        // UPSERT subscription
        await db
          .insert(subscriptions)
          .values({
            id: sub.id,
            userId,
            stripeCustomerId: customerId,
            status: sub.status,
            plan,
            interval,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          })
          .onConflictDoUpdate({
            target: subscriptions.id,
            set: {
              status: sub.status,
              plan,
              interval,
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
              updatedAt: new Date(),
            },
          })

        // Sync user.plan (source of truth is active subscription status)
        const effectivePlan = sub.status === 'active' || sub.status === 'trialing' ? plan : 'free'
        await db
          .update(user)
          .set({
            plan: effectivePlan,
            planUpdatedAt: new Date(),
          })
          .where(eq(user.id, userId))

        break
      }

      // ── Subscription deleted → downgrade user ──
      case 'customer.subscription.deleted': {
        const canceledSub = data.object as any
        await db
          .update(subscriptions)
          .set({ status: 'canceled', updatedAt: new Date() })
          .where(eq(subscriptions.id, canceledSub.id))

        // Find user and downgrade
        const [subUser] = await db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.stripeCustomerId, canceledSub.customer))
          .limit(1)
        if (subUser) {
          await db
            .update(user)
            .set({ plan: 'free', planUpdatedAt: new Date() })
            .where(eq(user.id, subUser.id))
        }
        break
      }

      // ── Invoice payment failed → mark as past_due ──
      case 'invoice.payment_failed': {
        const invoice = data.object as any
        const subId = invoice.subscription
        if (subId) {
          await db
            .update(subscriptions)
            .set({ status: 'past_due', updatedAt: new Date() })
            .where(eq(subscriptions.id, subId))
        }
        break
      }

      default:
        // Unhandled event — acknowledge receipt without action
        break
    }
  } catch (err) {
    console.error(`[webhook] ${type} failed:`, err)
    // Return 500 to trigger Stripe retry for transient DB errors.
    // Do NOT return 200 — that tells Stripe the event was delivered.
    return NextResponse.json(
      { received: true, error: 'Handler failed' },
      { status: 500 },
    )
  }

  return NextResponse.json({ received: true })
}
