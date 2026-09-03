import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('Error: STRIPE_SECRET_KEY is required in environment')
  process.exit(1)
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-06-24.dahlia',
})

try {
  const endpoints = await stripe.webhookEndpoints.list({ limit: 20 })
  console.log(
    'Endpoints:',
    endpoints.data.map((e) => ({
      url: e.url,
      status: e.status,
      events: e.enabled_events,
    }))
  )

  const betterAuthUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000'
  const target = `${betterAuthUrl}/api/stripe/webhook`
  const found = endpoints.data.find((e) => e.url === target)

  if (!found) {
    console.error(
      `MISSING: Add endpoint ${target} in https://dashboard.stripe.com/webhooks with events: checkout.session.completed, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed`
    )
    process.exit(1)
  }

  console.log('OK:', found.url)
} catch (err) {
  console.error('Failed to verify Stripe webhook endpoints:', err)
  process.exit(1)
}