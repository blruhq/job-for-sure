#!/usr/bin/env node
/**
 * One-time setup: creates the Pro product + monthly/yearly prices in Stripe.
 * Idempotent: if a price with the right amount/interval exists, reuses it.
 *
 * Run: pnpm db:setup-stripe
 *
 * After running, this script prints the env vars to add to .env.local:
 *   STRIPE_PRICE_MONTHLY=price_xxx
 *   STRIPE_PRICE_YEARLY=price_xxx
 */
import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not set in .env.local')
  process.exit(1)
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-06-24.dahlia',
})

const PRODUCT_NAME = 'Job For Sure Pro'
const PRODUCT_DESC = 'Unlimited resumes, AI chats, cover letters, ATS matching, and interview prep.'

async function setup() {
  // ── Find or create product ──
  const existing = await stripe.products.list({ active: true, limit: 100 })
  let product = existing.data.find((p) => p.name === PRODUCT_NAME)

  if (!product) {
    product = await stripe.products.create({
      name: PRODUCT_NAME,
      description: PRODUCT_DESC,
      metadata: { app: 'job-for-sure' },
    })
    console.log(`✓ Created product: ${product.id}`)
  } else {
    console.log(`✓ Reusing product: ${product.id}`)
  }

  // ── Find or create monthly price ($4 USD/month) ──
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 })
  let monthly = prices.data.find(
    (p) => p.type === 'recurring' && p.recurring?.interval === 'month' && p.unit_amount === 400,
  )
  if (!monthly) {
    monthly = await stripe.prices.create({
      product: product.id,
      currency: 'usd',
      unit_amount: 400, // $4.00
      recurring: { interval: 'month' },
      metadata: { plan: 'pro', interval: 'month' },
    })
    console.log(`✓ Created monthly price: ${monthly.id} ($4/mo)`)
  } else {
    console.log(`✓ Reusing monthly price: ${monthly.id}`)
  }

  // ── Find or create yearly price ($29 USD/year) ──
  let yearly = prices.data.find(
    (p) => p.type === 'recurring' && p.recurring?.interval === 'year' && p.unit_amount === 2900,
  )
  if (!yearly) {
    yearly = await stripe.prices.create({
      product: product.id,
      currency: 'usd',
      unit_amount: 2900, // $29.00
      recurring: { interval: 'year' },
      metadata: { plan: 'pro', interval: 'year' },
    })
    console.log(`✓ Created yearly price: ${yearly.id} ($29/yr)`)
  } else {
    console.log(`✓ Reusing yearly price: ${yearly.id}`)
  }

  console.log('\n──────────────────────────────────────────────────────────')
  console.log('Add these to .env.local:')
  console.log(`STRIPE_PRICE_MONTHLY=${monthly.id}`)
  console.log(`STRIPE_PRICE_YEARLY=${yearly.id}`)
  console.log('──────────────────────────────────────────────────────────\n')

  // Auto-write to .env.local if missing (optional convenience)
  const fs = await import('node:fs')
  const path = './.env.local'
  if (fs.existsSync(path)) {
    let env = fs.readFileSync(path, 'utf8')
    let changed = false

    if (!env.includes('STRIPE_PRICE_MONTHLY=')) {
      env = env.trimEnd() + `\n\n# Stripe price IDs (auto-added by setup script)\nSTRIPE_PRICE_MONTHLY=${monthly.id}\nSTRIPE_PRICE_YEARLY=${yearly.id}\n`
      changed = true
    } else {
      // Update if values differ
      env = env.replace(/STRIPE_PRICE_MONTHLY=.*/m, `STRIPE_PRICE_MONTHLY=${monthly.id}`)
      env = env.replace(/STRIPE_PRICE_YEARLY=.*/m, `STRIPE_PRICE_YEARLY=${yearly.id}`)
      changed = true
    }

    if (changed) {
      fs.writeFileSync(path, env)
      console.log('✓ Updated .env.local with price IDs')
    }
  }
}

setup().catch((err) => {
  console.error('❌ Setup failed:', err.message)
  process.exit(1)
})
