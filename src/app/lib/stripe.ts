import Stripe from 'stripe'

/**
 * Server-only Stripe client. Throws if a client bundle tries to import it.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Stripe SDK ships types keyed to a specific apiVersion literal. The running
  // account may be on a slightly different version; cast through `unknown`
  // to satisfy the SDK's strict literal type without resorting to `any`.
  apiVersion: '2026-06-24.dahlia' as unknown as Stripe.LatestApiVersion,
  typescript: true,
  appInfo: {
    name: 'Job For Sure',
    version: '1.0.0',
  },
})

/**
 * Price IDs created via `pnpm db:setup-stripe` (or set manually in Stripe dashboard).
 * Used by /api/billing/checkout to know which price to charge.
 */
export const STRIPE_PRICES = {
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  yearly: process.env.STRIPE_PRICE_YEARLY,
} as const

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!
