# Stripe Webhook Setup Guide

This guide explains how to configure Stripe Webhooks for **Job For Sure** so that Checkout subscriptions automatically upgrade users to Pro and sync subscription status changes.

---

## 1. Required Environment Variables

Ensure the following variables are configured in your `.env` / deployment environment:

| Variable | Description | Example |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe Secret API Key (test or live) | `sk_test_...` or `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Signing secret from Webhook configuration | `whsec_...` |
| `STRIPE_PRICE_MONTHLY` | Price ID for monthly Pro plan | `price_...` |
| `STRIPE_PRICE_YEARLY` | Price ID for yearly Pro plan | `price_...` |
| `BETTER_AUTH_URL` | Public base URL of the app (https in prod) | `https://jobforsure.ai` or `http://localhost:3000` |

---

## 2. Stripe Dashboard Configuration (Production & Staging)

1. Open the [Stripe Dashboard - Webhooks](https://dashboard.stripe.com/webhooks).
2. Click **Add endpoint** (`+ Add endpoint`).
3. Set the **Endpoint URL** to:
   ```
   https://<YOUR_DOMAIN>/api/stripe/webhook
   ```
   (e.g., `https://jobforsure.ai/api/stripe/webhook`)
4. Select the following **5 events** to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Click **Add endpoint**.
6. Under **Signing secret**, click **Reveal** to obtain the `whsec_...` value.
7. Add this secret as `STRIPE_WEBHOOK_SECRET` in your environment variables.

---

## 3. Local Development with Stripe CLI

To test webhooks locally:

1. Install and login to Stripe CLI:
   ```bash
   stripe login
   ```
2. Forward events to your local Next.js server:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
3. Copy the webhook signing secret printed by the CLI (`whsec_...`) into your `.env` as `STRIPE_WEBHOOK_SECRET`.
4. Trigger test events:
   ```bash
   stripe trigger checkout.session.completed
   ```

---

## 4. Verification Script

To verify that the webhook endpoint is properly registered in Stripe:

```bash
node scripts/verify-stripe-webhook.mjs
```

If properly registered, the script will output `OK: https://<domain>/api/stripe/webhook`.
If missing, it exits with an error listing the missing events and configuration steps.
