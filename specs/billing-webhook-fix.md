# Spec: billing-webhook-fix — Fix 3 Billing Blockers (Webhook, Fallback, Period-End)

## Section 1 — Product

### Goal & Scope
Fix 3 QA-found billing blockers so Stripe Checkout actually upgrades Free → Pro without manual replay, and cancel date renders correctly. Scope is billing only.

- **B1 CRITICAL — Webhook not registered**: `stripe webhook_endpoints list → []`. Payments succeed (`cs_test_…` paid, sub `active` in Stripe) but `user.plan` stays `free` until manual replay. Fix: document + verify required env + Dashboard registration step + provide verify script; ensure handler is reachable.
- **B2 CRITICAL — /settings/billing ignores ?checkout=success**: `src/app/[locale]/(app)/settings/billing/page.tsx:44-58` loads subscription only via `GET /api/billing/subscription`, never reads `searchParams`. If webhook delayed/missing, user stays Free. Fix: client fallback — on `?checkout=success&session_id=…` verify session server-side via Stripe API, upsert plan/subscription if webhook hasn't arrived, then clean URL.
- **B3 HIGH — Jan 1970 period-end**: Cancel shows `Jan 1, 1970`. Handler `src/app/api/stripe/webhook/route.ts:98-101` reads `(sub as {current_period_end}).current_period_end` but SDK `apiVersion: '2026-06-24.dahlia'` (`src/app/lib/stripe.ts:10`) moved field to `sub.items.data[0].current_period_end`. DB stores `1969-12-31` vs Stripe `1791020941` (2026-10-03). Fix: prefer `items.data[0].current_period_end` with fallbacks and correct `Date` conversion.

### Out of Scope (NOT building)
- Usage bars (already correct) — no change.
- Stripe Customer Portal (works once Pro) — no change.
- Chat blank for fresh user — low-priority UX, explicitly out of scope.
- OCR, PDF, job search, other billing UI redesign.
- Migrating to new Stripe API version or changing price IDs.

### User Stories / Acceptance Criteria
- **AC1 — Checkout upgrades without webhook replay**: Given a Free user completes Checkout with test card `4242 4242 4242 4242`, when Stripe shows `checkout.session.completed` + subscription `active`, then `user.plan='pro'` and `subscriptions` row exists without manual `stripe events resend` / Dashboard replay. Verified via `GET /api/billing/subscription` returns `plan:'pro'`.
- **AC2 — Webhook registered**: `stripe webhook_endpoints list` (or Dashboard → Developers → Webhooks) shows one enabled endpoint `https://<BETTER_AUTH_URL>/api/stripe/webhook` subscribed to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Doc + verify script provided.
- **AC3 — Fallback on success URL**: Visiting `/settings/billing?checkout=success&session_id=cs_test_…` triggers server-side `stripe.checkout.sessions.retrieve(session_id)` (with `expand: ['subscription']`) and `stripe.subscriptions.retrieve` if needed; if `payment_status='paid'` and `session.client_reference_id` or `metadata.userId` matches authed user, then DB is upserted to Pro even if webhook hasn't arrived; query params are cleaned via `router.replace`.
- **AC4 — Cancel date correct**: After subscribing (monthly or yearly), `GET /api/billing/subscription` → `subscription.currentPeriodEnd` is a future date matching Stripe Dashboard (e.g., ~30 days / ~365 days), not `1970-01-01` / `1969-12-31`. Billing page renders `MMM d, yyyy` (e.g., `Oct 3, 2026`) not `Jan 1, 1970`. DB `subscriptions.current_period_end` equals Stripe `current_period_end * 1000`.
- **AC5 — No regression**: Existing 172 unit tests still pass (`pnpm test`). Typecheck `npx tsc --noEmit` passes. Build `pnpm build` passes.
- **AC6 — Idempotent & safe**: Replaying same webhook or hitting fallback twice does not duplicate rows or flip plan incorrectly; `onConflictDoUpdate` on `subscriptions.id` is used.

### Domain Invariant — Gap User Did NOT Mention (will break in prod if ignored)
**Gap: Success-URL fallback never runs if user closes tab before redirect.**
User completes Stripe Checkout but closes browser / loses network before Stripe redirects to `success_url` (`src/app/api/stripe/checkout/route.ts:28`). Then neither webhook (if not registered) nor `?checkout=success` fallback executes → user stays Free indefinitely despite paying. Impact: breaks upgrade for ~5-10% of mobile users who background the tab; support tickets + refunds.
Mitigation in this fix: document gap as open question; fallback also runs on next authenticated `GET /api/billing/subscription` if we add optional `?verify=1` hook, but minimal fix is to ensure webhook registration (B1) is primary and fallback (B2) is best-effort. Follow-up (out of scope for this patch): add a nightly Stripe sync job or verify-on-dashboard-mount. Spec records this as **Open Question** — not blocking ship, but must be tracked.

---

## Section 2 — Engineering Handoff

### 0. Architectural Decision Record & Scaling Tradeoffs
- **Context & Constraints**: Next.js 16 App Router, Neon Postgres + Drizzle, Stripe SDK `22.3.2` with `apiVersion: '2026-06-24.dahlia'` (`src/app/lib/stripe.ts:10`). Webhook is source of truth; `user.plan` denormalized for fast reads (`src/app/lib/schema.ts:28`). External services fail-open except Stripe (must be fail-closed for money). Expected load: <1k checkout/day, webhook burst <10/s. Serverless (Vercel) — maxDuration 30s for webhook.
- **Chosen Architecture**:
  - B1: No code change to handler path; fix is ops doc + ensure `src/app/api/stripe/webhook/route.ts:23` remains `force-dynamic` and `src/proxy.ts:62` matcher already excludes `/api` so webhook not auth-gated. Provide verify script `scripts/verify-stripe-webhook.mjs` using `stripe` client.
  - B2: New `POST /api/billing/verify` (or `GET`) that retrieves Checkout Session + Subscription server-side, validates ownership, reuses webhook's upsert logic (extracted to `src/app/lib/billing-sync.ts`). Billing page `src/app/[locale]/(app)/settings/billing/page.tsx:44-58` adds `useSearchParams` effect to call verify once on `checkout=success`.
  - B3: Fix period extraction to `sub.items.data[0].current_period_end ?? (sub as any).current_period_end ?? (sub as any).currentPeriodEnd`, convert `seconds * 1000` to `Date`, guard `>0` else fallback to `null` handling.
- **Discarded Alternatives**:
  - *Alternative A — Make billing page a Server Component that verifies session directly*: Rejected — page is `'use client'` with Zustand/TanStack, converting would churn layout and break existing `useRouter` from `~/i18n/routing`. Client effect + API route is minimal diff.
  - *Alternative B — Poll Stripe from client directly*: Rejected — exposes `STRIPE_SECRET_KEY` and bypasses ownership check; must be server-side.

### 1. Target Files & Folder Structure
- **Modify**:
  - `src/app/api/stripe/webhook/route.ts` — fix period extraction (lines 96-102), optionally extract shared helper.
  - `src/app/[locale]/(app)/settings/billing/page.tsx` — add `useSearchParams` fallback (lines 44-58), handle `checkout=success` & `session_id`, call verify, clean URL, show toast.
  - `src/app/lib/stripe.ts` — no change (verify apiVersion remains `2026-06-24.dahlia`); ensure exports remain.
  - `src/app/api/billing/subscription/route.ts` — no change (read path), but verify it returns correct `currentPeriodEnd` after fix.
- **Create**:
  - `src/app/api/billing/verify/route.ts` — new endpoint: `POST /api/billing/verify` body `{ sessionId: string }` (or `GET ?session_id=`). Must use `withAuth`, validate session ownership, retrieve Stripe objects, upsert.
  - `src/app/lib/billing-sync.ts` — (optional but recommended) shared `syncSubscriptionToDb(sub: Stripe.Subscription, customerId: string)` + `extractPeriodEnd(sub)` to share between webhook and verify. Keeps ≤300 lines/file.
  - `scripts/verify-stripe-webhook.mjs` — verify script: lists webhook endpoints, checks env, prints Dashboard URL. Used in Verification Exit Criteria.
  - `docs/billing-webhook-setup.md` — (or section in README) manual Dashboard step doc: URL, events, secret.
- **No schema migration**: `subscriptions` table (`src/app/lib/schema.ts:116-141`) already correct; `currentPeriodEnd` is `timestamp` notNull. No `drizzle/` edits.

### 2. Import Definitions & Dependencies
- Existing: `import Stripe from 'stripe'` (`src/app/lib/stripe.ts:1`), `import { stripe, STRIPE_WEBHOOK_SECRET, PRO_PRICE_IDS } from '~/lib/stripe'` (`src/app/api/stripe/webhook/route.ts:3`), `import { db } from '~/lib/db'`, `import { user, subscriptions } from '~/lib/schema'`, `import { eq } from 'drizzle-orm'`, `import { withAuth } from '~/lib/with-auth'`, `import { useSearchParams, useRouter } from '~/i18n/routing'` (or `next/navigation`).
- New verify route: `import { stripe, PRO_PRICE_IDS } from '~/lib/stripe'`, `import { db } from '~/lib/db'`, `import { user, subscriptions } from '~/lib/schema'`, `import { eq } from 'drizzle-orm'`, `import { withAuth } from '~/lib/with-auth'`, `import { NextResponse } from 'next/server'`.
- Billing page: `import { useSearchParams } from 'next/navigation'` (or `~/i18n/routing` if wrapped), `import { toast } from 'sonner'` (or existing toast util `~/lib/toast`).
- No new npm deps. Stripe SDK already `^22.3.2`.

### 3. Database Schema Changes
- **None**. `subscriptions` (`src/app/lib/schema.ts:116-141`) already has `currentPeriodEnd: timestamp(...).notNull()`, `status`, `plan`, `interval`, `cancelAtPeriodEnd`. `user.plan` (`src/app/lib/schema.ts:28`) denormalized. Verify existing indexes cover `subscriptions.userId` and `subscriptions.id` PK for upsert.
- If `extractPeriodEnd` returns `0` (Stripe missing), store `new Date(Date.now() + 30*24*3600*1000)` fallback or keep `new Date(0)` but flag — prefer to throw and let Stripe retry (return 500) so data not corrupted. Spec chooses: if `periodEndSeconds <=0` → log error and use `new Date(Date.now() + 30*24*3600*1000)` as fallback only in verify path; in webhook path return 500 to trigger retry (do not store epoch).

### 4. Step-by-Step Edits

#### Step 1 — Fix B3 period-end extraction (webhook)
File: `src/app/api/stripe/webhook/route.ts:96-102`
Current (buggy):
```ts
const periodEndSeconds =
  (sub as unknown as { current_period_end?: number }).current_period_end ??
  (sub as unknown as { currentPeriodEnd?: number }).currentPeriodEnd ??
  0
const periodEnd = periodEndSeconds > 0 ? new Date(periodEndSeconds * 1000) : new Date(0)
```
Replace with:
```ts
function extractPeriodEnd(sub: Stripe.Subscription): number {
  // apiVersion 2026-06-24.dahlia moved current_period_end to items.data[0]
  const fromItem = (sub.items?.data?.[0] as unknown as { current_period_end?: number })?.current_period_end
  const fromSnake = (sub as unknown as { current_period_end?: number }).current_period_end
  const fromCamel = (sub as unknown as { currentPeriodEnd?: number }).currentPeriodEnd
  return fromItem ?? fromSnake ?? fromCamel ?? 0
}
const periodEndSeconds = extractPeriodEnd(sub)
if (periodEndSeconds <= 0) {
  console.error('[webhook] missing current_period_end for sub', sub.id, JSON.stringify(sub.items?.data?.[0]).slice(0,500))
  // Return 500 to trigger Stripe retry rather than storing epoch
  return NextResponse.json({ error: 'Missing period end' }, { status: 500 })
}
const periodEnd = new Date(periodEndSeconds * 1000)
```
Also extract helper to `src/app/lib/billing-sync.ts` if creating shared file, then import it.

#### Step 2 — Extract shared sync helper (recommended)
File: `src/app/lib/billing-sync.ts` (new, ≤150 lines)
```ts
import type Stripe from 'stripe'
import { PRO_PRICE_IDS } from '~/lib/stripe'
import { db } from '~/lib/db'
import { user, subscriptions } from '~/lib/schema'
import { eq } from 'drizzle-orm'

export function extractPeriodEnd(sub: Stripe.Subscription): number {
  const fromItem = (sub.items?.data?.[0] as unknown as { current_period_end?: number })?.current_period_end
  const fromSnake = (sub as unknown as { current_period_end?: number }).current_period_end
  const fromCamel = (sub as unknown as { currentPeriodEnd?: number }).currentPeriodEnd
  return fromItem ?? fromSnake ?? fromCamel ?? 0
}
export function resolvePlan(sub: Stripe.Subscription): { plan: 'pro'|'free', interval: string|null } {
  const priceId = sub.items?.data?.[0]?.price?.id
  const priceMeta = sub.items?.data?.[0]?.price?.metadata?.plan
  const plan = (priceId && PRO_PRICE_IDS.has(priceId)) || priceMeta === 'pro' ? 'pro' as const : 'free' as const
  const interval = sub.items?.data?.[0]?.price?.recurring?.interval || null
  return { plan, interval }
}
export async function upsertSubscription(sub: Stripe.Subscription, customerId: string, userId: string) {
  const { plan, interval } = resolvePlan(sub)
  const periodEndSeconds = extractPeriodEnd(sub)
  const periodEnd = periodEndSeconds > 0 ? new Date(periodEndSeconds*1000) : new Date(Date.now()+30*24*3600*1000)
  await db.insert(subscriptions).values({ id: sub.id, userId, stripeCustomerId: customerId, status: sub.status, plan, interval, currentPeriodEnd: periodEnd, cancelAtPeriodEnd: sub.cancel_at_period_end }).onConflictDoUpdate({ target: subscriptions.id, set: { status: sub.status, plan, interval, currentPeriodEnd: periodEnd, cancelAtPeriodEnd: sub.cancel_at_period_end, updatedAt: new Date() }})
  const effectivePlan = sub.status === 'active' || sub.status === 'trialing' ? plan : 'free'
  await db.update(user).set({ plan: effectivePlan, planUpdatedAt: new Date() }).where(eq(user.id, userId))
  return { plan: effectivePlan, interval, periodEnd }
}
```
Webhook then imports `extractPeriodEnd` / `upsertSubscription` and simplifies.

#### Step 3 — Create verify endpoint (B2)
File: `src/app/api/billing/verify/route.ts` (new)
```ts
import { NextResponse } from 'next/server'
import { stripe } from '~/lib/stripe'
import { withAuth } from '~/lib/with-auth'
import { db } from '~/lib/db'
import { user } from '~/lib/schema'
import { eq } from 'drizzle-orm'
import { upsertSubscription } from '~/lib/billing-sync' // or inline

export const POST = withAuth(async (req, { user: authUser }) => {
  const { sessionId } = await req.json() as { sessionId?: string }
  if (!sessionId || !sessionId.startsWith('cs_')) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] })
  // Ownership check — fail-closed
  const ownerId = (session.client_reference_id as string) || (session.metadata?.userId as string)
  if (ownerId !== authUser.id) return NextResponse.json({ error: 'Session not owned by user' }, { status: 403 })
  if (session.payment_status !== 'paid' || session.status !== 'complete') return NextResponse.json({ error: 'Session not paid' }, { status: 400 })
  // session.subscription can be string | Subscription | null
  let sub = session.subscription as unknown as import('stripe').Stripe.Subscription | string | null
  if (typeof sub === 'string') sub = await stripe.subscriptions.retrieve(sub)
  if (!sub || typeof sub === 'string') return NextResponse.json({ error: 'No subscription' }, { status: 400 })
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
  // Ensure user.stripeCustomerId is set (idempotent)
  if (session.customer) {
    const cid = typeof session.customer === 'string' ? session.customer : session.customer.id
    await db.update(user).set({ stripeCustomerId: cid }).where(eq(user.id, authUser.id))
  }
  const result = await upsertSubscription(sub as import('stripe').Stripe.Subscription, customerId, authUser.id)
  return NextResponse.json({ verified: true, plan: result.plan, currentPeriodEnd: result.periodEnd })
}, { rateLimitType: 'general', route: '/api/billing/verify' })
```
Also support `GET ?session_id=` for convenience (optional). Must handle `stripe.errors.StripeError` → 500 with retry hint.

#### Step 4 — Billing page fallback (B2 client)
File: `src/app/[locale]/(app)/settings/billing/page.tsx:1-58`
- Add `import { useSearchParams } from 'next/navigation'` and `import { toast } from 'sonner'` (or existing).
- Inside component, add:
```ts
const searchParams = useSearchParams()
useEffect(() => {
  const checkout = searchParams.get('checkout')
  const sessionId = searchParams.get('session_id')
  if (checkout !== 'success' || !sessionId) return
  let cancelled = false
  ;(async () => {
    try {
      const res = await fetch('/api/billing/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) })
      const json = await res.json()
      if (!cancelled && res.ok && json.verified) {
        toast?.success?.('Upgraded to Pro!')
        const updated = await fetch('/api/billing/subscription').then(r=>r.json())
        setData(updated)
      }
    } catch {} finally {
      if (!cancelled) router.replace('/settings/billing') // clean query
    }
  })()
  return () => { cancelled = true }
}, [searchParams, router])
```
- Ensure `load()` still runs on mount; verify effect runs after. Show loading state while verifying (reuse `loading` or add `verifying` state).
- Handle `?checkout=canceled` → show toast "Checkout canceled" and clean URL (optional).

#### Step 5 — Webhook registration doc + verify script (B1)
File: `scripts/verify-stripe-webhook.mjs` (new)
```js
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-06-24.dahlia' })
const endpoints = await stripe.webhookEndpoints.list({ limit: 20 })
console.log('Endpoints:', endpoints.data.map(e=>({ url:e.url, status:e.status, events:e.enabled_events })))
const target = process.env.BETTER_AUTH_URL + '/api/stripe/webhook'
const found = endpoints.data.find(e=>e.url===target)
if (!found) { console.error(`MISSING: Add endpoint ${target} in https://dashboard.stripe.com/webhooks with events: checkout.session.completed, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed`); process.exit(1) }
console.log('OK:', found.url)
```
File: `docs/billing-webhook-setup.md` (or update `specs/billing-webhook-fix.md` appendix) — document:
- Required env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (from Dashboard → Webhooks → Reveal), `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `BETTER_AUTH_URL` (must be public https, not localhost for prod).
- Manual step: Dashboard → Developers → Webhooks → Add endpoint → URL `https://<domain>/api/stripe/webhook` → Select 5 events → Copy `whsec_…` to env.
- Local dev: `stripe listen --forward-to localhost:3000/api/stripe/webhook` (Stripe CLI).
- Verify: `node scripts/verify-stripe-webhook.mjs` and `stripe webhook_endpoints list`.

#### Step 6 — Cleanup checkout route (optional)
File: `src/app/api/stripe/checkout/route.ts:22-23`
- Remove `integration_identifier: \`jfs-checkout-...\`` — not a valid Stripe param; Stripe SDK will throw `Unknown param`. If QA says payments succeeded, Stripe may be ignoring it, but remove to avoid future breakage. Keep `client_reference_id`, `metadata.userId`, `subscription_data.metadata.userId`.

### 4.5 Vertical-Slice Order
1. **Slice 1 — B3 period fix**: Edit webhook extraction → unit test → verify cancel date not 1970. Testable via mocked Stripe event.
2. **Slice 2 — B2 verify endpoint + billing fallback**: Create `billing-sync.ts` + `verify/route.ts` → wire billing page effect → test with `cs_test_…` mock.
3. **Slice 3 — B1 docs + verify script**: Add script + doc → run `node scripts/verify-stripe-webhook.mjs` → manual Dashboard check.

Each slice produces testable path: `pnpm test` + `npx tsc --noEmit` + manual Stripe test.

### 5. Assertion & Testing Requirements
- **Unit Tests** (Vitest, `tests/unit/billing-*.test.ts`):
  - `extractPeriodEnd` prefers `items.data[0].current_period_end` over `current_period_end` and `currentPeriodEnd`; returns 0 if missing.
  - `resolvePlan` returns `pro` only if priceId in `PRO_PRICE_IDS` or `metadata.plan==='pro'`, else `free` (fail-closed).
  - `upsertSubscription` is idempotent (call twice same `sub.id` → no duplicate, second updates).
  - `POST /api/billing/verify` rejects if `sessionId` missing / not `cs_` prefix → 400; rejects if `client_reference_id !== authUser.id` → 403; rejects if `payment_status !== 'paid'` → 400.
  - Webhook handler stores `currentPeriodEnd` as `new Date(1791020941*1000)` not epoch when given Stripe payload with `items.data[0].current_period_end=1791020941`.
- **Integration Tests** (mock Stripe):
  - Mock `stripe.checkout.sessions.retrieve` to return `payment_status:'paid'`, `client_reference_id: user.id`, `subscription: { id:'sub_123', ... }`; call `POST /api/billing/verify` → DB `user.plan='pro'` and `subscriptions` row exists.
  - Webhook `customer.subscription.updated` with `items.data[0].current_period_end=1791020941` → DB `current_period_end` is `2026-10-03` not `1970-01-01`.
- **E2E / Manual** (Stripe test mode):
  - `pnpm dev` → login → `/pricing` → Checkout with `4242 4242 4242 4242` → redirect to `/settings/billing?checkout=success&session_id=cs_test_…` → page shows `Pro` without manual replay → `GET /api/billing/subscription` returns `plan:'pro'`.
  - Cancel → `POST /api/billing/cancel` → billing page shows `Your Pro access ends on Oct 3, 2026` (future date) not `Jan 1, 1970`.

### 6. Verification Commands & Log Files
- Build: `pnpm build`
- Typecheck: `npx tsc --noEmit`
- Tests: `pnpm test` (must show 172 existing + new billing tests passing; no failures)
- Single file: `pnpm vitest run tests/unit/billing-sync.test.ts` (if created)
- Verify webhook: `node scripts/verify-stripe-webhook.mjs` (requires `STRIPE_SECRET_KEY` + `BETTER_AUTH_URL` in env) — should print `OK: https://<domain>/api/stripe/webhook`
- Manual Stripe: `stripe webhook_endpoints list` → shows endpoint; `stripe events list --limit 5` → shows `checkout.session.completed`
- Server logs: `pnpm dev` stderr — webhook logs `[webhook] missing current_period_end` should not appear after fix.

### API Contracts
- **POST /api/billing/verify** (new)
  - Auth: `withAuth` (401 if no session)
  - Rate limit: `general`
  - Request: `{ sessionId: string }` where `sessionId` starts with `cs_` (or `GET ?session_id=cs_…`)
  - Success 200: `{ verified: true, plan: 'pro'|'free', currentPeriodEnd: string (ISO) }`
  - Errors: 400 `{ error: 'Missing sessionId' }` | 400 `{ error: 'Session not paid' }` | 403 `{ error: 'Session not owned by user' }` | 500 Stripe error
  - Side effect: upserts `subscriptions` + updates `user.plan` + `user.stripeCustomerId` (idempotent)
- **GET /api/billing/subscription** (existing, `src/app/api/billing/subscription/route.ts:12`)
  - Returns: `{ plan: 'free'|'pro', stripeCustomerId: string|null, hasActiveSubscription: boolean, subscription: { id, status, plan, interval, currentPeriodEnd: string, cancelAtPeriodEnd: boolean }|null, usage: Record<string, {allowed, remaining, limit, plan}> }`
  - After fix, `currentPeriodEnd` must be ISO string of future date, not epoch.
- **POST /api/stripe/webhook** (existing, `src/app/api/stripe/webhook/route.ts:23`)
  - Header: `stripe-signature` required
  - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
  - Success 200: `{ received: true }`
  - Failure 500: `{ received: true, error: 'Handler failed' }` → Stripe retries
  - Must not store epoch on missing period; return 500 instead.

### Domain Model
- **User** (`src/app/lib/schema.ts:8-31`): `id`, `plan: 'free'|'pro'` (denormalized, updated by webhook + verify), `planUpdatedAt`, `stripeCustomerId: string|null` (unique, set on `checkout.session.completed` or verify).
- **Subscriptions** (`src/app/lib/schema.ts:116-141`): `id` PK (Stripe `sub_…`), `userId` FK, `stripeCustomerId`, `status: 'active'|'past_due'|'canceled'|'trialing'|'incomplete'`, `plan: 'pro'|'free'`, `interval: 'month'|'year'|null`, `currentPeriodEnd: timestamp` (notNull, from Stripe `current_period_end *1000`), `cancelAtPeriodEnd: boolean`.
- Invariants: `user.plan='pro'` iff exists `subscriptions` with `status in ('active','trialing')` and `plan='pro'`; `currentPeriodEnd` never epoch (`1970-01-01`); `PRO_PRICE_IDS` allowlist enforced fail-closed; `stripeCustomerId` unique per user.

### Test Matrix
| Layer | Test | Owner |
|-------|------|-------|
| Unit | extractPeriodEnd prefers items.data[0] | Vitest |
| Unit | resolvePlan fail-closed on unknown price | Vitest |
| Unit | upsert idempotent (onConflictDoUpdate) | Vitest |
| Unit | verify rejects wrong owner / unpaid | Vitest |
| Integration | verify with mocked Stripe → DB pro | Vitest + mock |
| Integration | webhook with 1791020941 → DB 2026-10-03 | Vitest + mock |
| Regression | 172 existing tests still pass | Vitest |
| Security | verify cannot upgrade with other user's session_id | Vitest |
| Performance | verify <500ms (single Stripe retrieve) | Manual |
| Accessibility | billing page shows Pro badge, not 1970 date | Manual |

### Edge Matrix
| Edge | Expected Behavior |
|------|-------------------|
| Empty `session_id` or missing `?checkout=success` | No verify call; page loads normally |
| `session_id` not starting with `cs_` | 400, no DB change |
| Session belongs to different user | 403, no DB change |
| Session `payment_status !== 'paid'` or `status !== 'complete'` | 400, no upgrade |
| Stripe API down / timeout | 500, page shows Free, webhook will retry; fallback can be retried on refresh |
| Duplicate webhook + fallback race | Idempotent upsert, final state Pro, no duplicate rows |
| `current_period_end` missing (0) | Webhook returns 500 (retry); verify uses fallback `now+30d` and logs |
| User closes tab before redirect (gap) | Stays Free until webhook arrives; documented as open question, follow-up sync needed |
| Cancel with no active sub | 400 `No active subscription` |
| Webhook secret missing | 400 `Missing signature or webhook secret` (Stripe retries) |

### Executable Test Contracts (Engineer fills in)
Create `tests/unit/billing-sync.test.ts`:
```ts
describe('extractPeriodEnd', () => {
  it('prefers items.data[0].current_period_end over top-level', () => {})
  it('falls back to current_period_end snake_case', () => {})
  it('falls back to currentPeriodEnd camelCase', () => {})
  it('returns 0 if all missing', () => {})
})
describe('resolvePlan', () => {
  it('returns pro for allowlisted price', () => {})
  it('returns free for unknown price (fail-closed)', () => {})
  it('returns pro for metadata.plan=pro even if price unknown', () => {})
})
describe('POST /api/billing/verify', () => {
  it('400 on missing sessionId', () => {})
  it('403 on session owned by other user', () => {})
  it('400 on unpaid session', () => {})
  it('200 and upserts on paid session owned by caller', () => {})
})
```
Create `tests/unit/billing-webhook.test.ts` (or extend existing):
```ts
describe('webhook periodEnd', () => {
  it('stores 2026-10-03 for 1791020941, not 1970', () => {})
})
```

### Verification Exit Criteria (binary, Engineer MUST self-verify before DONE)
- [ ] `pnpm test` passes — 172 existing + new billing tests, 0 failures — verification: `pnpm test` output shows `Test Files … passed` and `Tests … passed`
- [ ] `npx tsc --noEmit` passes with 0 errors — verification: command exits 0
- [ ] `pnpm build` passes — verification: `pnpm build` exits 0, no type errors
- [ ] Webhook period fix: mocked `customer.subscription.updated` with `items.data[0].current_period_end=1791020941` stores DB `current_period_end` as `2026-10-03` (ISO) not `1970-01-01` — verification: unit test `stores 2026-10-03 for 1791020941` passes and `pnpm vitest run tests/unit/billing-webhook.test.ts` shows pass
- [ ] Fallback verify: `POST /api/billing/verify` with mocked `cs_test_…` (paid, owned) flips `user.plan` to `pro` and creates `subscriptions` row without webhook — verification: integration test `200 and upserts on paid session` passes
- [ ] Billing page fallback: `src/app/[locale]/(app)/settings/billing/page.tsx` reads `useSearchParams` and calls `/api/billing/verify` on `?checkout=success&session_id=` and cleans URL via `router.replace` — verification: `grep -n "useSearchParams" src/app/[locale]/(app)/settings/billing/page.tsx` shows hit and manual `pnpm dev` → visit `/settings/billing?checkout=success&session_id=cs_test_mock` → network tab shows `POST /api/billing/verify` 200
- [ ] Cancel date correct: `GET /api/billing/subscription` returns `currentPeriodEnd` future date (e.g., `2026-10-03T…`) not epoch — verification: `curl` or test shows `currentPeriodEnd` year `2026` and billing page renders `Oct 3, 2026` not `Jan 1, 1970`
- [ ] Webhook registration documented: `scripts/verify-stripe-webhook.mjs` exists and `docs/billing-webhook-setup.md` (or spec appendix) lists required env + Dashboard steps — verification: `ls scripts/verify-stripe-webhook.mjs && ls docs/billing-webhook-setup.md` and `node scripts/verify-stripe-webhook.mjs` prints `OK` or actionable `MISSING` message (when `STRIPE_SECRET_KEY` set)
- [ ] No `integration_identifier` in checkout: `grep -n integration_identifier src/app/api/billing/checkout/route.ts` returns 0 — verification: `pnpm build` still passes and Stripe Checkout still creates session

### Security Verification
- Verify `POST /api/billing/verify` checks `session.client_reference_id === authUser.id` or `session.metadata.userId === authUser.id` before upsert — prevents session_id guessing.
- Webhook still validates `stripe-signature` via `stripe.webhooks.constructEvent` (`src/app/api/stripe/webhook/route.ts:33`) and `STRIPE_WEBHOOK_SECRET` (`src/app/lib/stripe.ts:36`).
- `PRO_PRICE_IDS` allowlist enforced in both webhook and verify (`src/app/lib/stripe.ts:32-34`) — fail-closed.
- `src/proxy.ts:62` matcher excludes `/api` — webhook not blocked by auth redirect; verify endpoint uses `withAuth` so protected.
- No secrets logged; `STRIPE_SECRET_KEY` never sent to client.

### Open Questions (tracked, not blocking)
- Q1: User closes tab before redirect → fallback never runs. Mitigation: ensure B1 webhook registration is primary; follow-up: add `GET /api/billing/sync` that lists Stripe subscriptions for `stripeCustomerId` and syncs on dashboard mount, or nightly cron.
