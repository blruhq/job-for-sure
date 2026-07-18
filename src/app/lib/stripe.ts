import Stripe from 'stripe'

/**
 * Server-only Stripe client. Throws if a client bundle tries to import it.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil' as any,
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
