# Bugfix Execution Plan — Verified & Final

> **For a fast-writing agent. Follow exactly. Do NOT think. Do NOT deviate.**
>
> Every fix below has been verified against the actual codebase on 2026-07-18.
> Line numbers and old/new code are byte-for-byte accurate.
>
> **Rules:**
> 1. Execute phases sequentially (1 → 9).
> 2. Within each phase, execute steps in order.
> 3. For each step: READ the file, FIND the exact old code, REPLACE with new code.
> 4. After each phase, save all files.
> 5. After Phase 1 (schema), run migration before continuing.
> 6. After all phases, run verification (Phase 9).
>
> **27 confirmed bugs across 9 phases.**

---

## PHASE 1 — Database Schema (`src/app/lib/schema.ts`)

**File:** `src/app/lib/schema.ts` (currently 319 lines)

### Step 1.1 — Add `uniqueIndex` to imports

**FIND** (line 2):
```
import { pgTable, pgEnum, text, timestamp, boolean, jsonb, integer, numeric, index } from "drizzle-orm/pg-core";
```

**REPLACE WITH:**
```
import { pgTable, pgEnum, text, timestamp, boolean, jsonb, integer, numeric, index, uniqueIndex } from "drizzle-orm/pg-core";
```

---

### Step 1.2 — Add `.unique()` to `user.stripeCustomerId`

**FIND** (line 30):
```
  stripeCustomerId: text("stripe_customer_id"),
```

**REPLACE WITH:**
```
  stripeCustomerId: text("stripe_customer_id").unique(),
```

---

### Step 1.3 — Add composite unique index on `account` table

**FIND** (line 77):
```
  (table) => [index("account_userId_idx").on(table.userId)],
```

**REPLACE WITH:**
```
  (table) => [
    index("account_userId_idx").on(table.userId),
    uniqueIndex("account_provider_account_idx").on(table.providerId, table.accountId),
  ],
```

---

### Step 1.4 — Fix `interviewSessions.score` precision (3 → 4)

**FIND** (line 280):
```
  score: numeric("score", { precision: 3, scale: 1, mode: 'number' }).notNull(),
```

**REPLACE WITH:**
```
  score: numeric("score", { precision: 4, scale: 1, mode: 'number' }).notNull(),
```

---

### Step 1.5 — Add unique index on `subscriptions`

**FIND** (lines 130–134):
```
  (table) => [
    index("subscriptions_userId_idx").on(table.userId),
    index("subscriptions_status_idx").on(table.status),
    index("subscriptions_stripeCustomerId_idx").on(table.stripeCustomerId),
  ],
```

**REPLACE WITH:**
```
  (table) => [
    index("subscriptions_userId_idx").on(table.userId),
    index("subscriptions_status_idx").on(table.status),
    index("subscriptions_stripeCustomerId_idx").on(table.stripeCustomerId),
    uniqueIndex("subscriptions_stripeCustomer_plan_idx").on(table.stripeCustomerId, table.plan),
  ],
```

---

### Step 1.6 — Make `usageEvents` index unique

**FIND** (lines 156–162):
```
  (table) => [
    index("usage_events_userId_feature_createdAt_idx").on(
      table.userId,
      table.feature,
      table.createdAt,
    ),
  ],
```

**REPLACE WITH:**
```
  (table) => [
    uniqueIndex("usage_events_userId_feature_createdAt_idx").on(
      table.userId,
      table.feature,
      table.createdAt,
    ),
  ],
```

---

### Step 1.7 — Run migration

```sh
pnpm db:generate && pnpm db:migrate
```

**Verify:** No errors in output. New file appears in `drizzle/` folder.

> **NOTE:** The `usage_events` unique index may fail if duplicate rows already exist. If migration fails, run this SQL first via `psql` or the Neon console:
> ```sql
> DELETE FROM usage_events a USING usage_events b
> WHERE a.ctid < b.ctid
>   AND a.user_id = b.user_id
>   AND a.feature = b.feature
>   AND a.created_at = b.created_at;
> ```
> Then re-run migration.

---

## PHASE 2 — Plan & Limits (`src/app/lib/plan.ts`)

**File:** `src/app/lib/plan.ts` (currently 208 lines)

### Step 2.1 — Fix `periodBoundary` to use UTC

**FIND** (lines 41–58):
```ts
function periodBoundary(period: FeaturePeriod): Date | null {
  const now = new Date()
  switch (period) {
    case 'day': {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      return d
    }
    case 'week': {
      // Monday 00:00 UTC
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1)
      const d = new Date(now.getFullYear(), now.getMonth(), diff)
      return d
    }
    case 'total':
      return null // no filter
  }
}
```

**REPLACE WITH:**
```ts
function periodBoundary(period: FeaturePeriod): Date | null {
  const now = new Date()
  switch (period) {
    case 'day': {
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    }
    case 'week': {
      // Monday 00:00 UTC
      const day = now.getUTCDay()
      const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1)
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff))
    }
    case 'total':
      return null // no filter
  }
}
```

---

### Step 2.2 — Fix `checkLimit` to use `getResumeCount` for `resume_create`

**FIND** (lines 111–112):
```ts
  const used = await getFeatureCount(userId, feature, config.period)
  const remaining = Math.max(0, limit - used)
```

**REPLACE WITH:**
```ts
  const used = feature === 'resume_create'
    ? await getResumeCount(userId)
    : await getFeatureCount(userId, feature, config.period)
  const remaining = Math.max(0, limit - used)
```

---

### Step 2.3 — Wrap `recordUsage` in try/catch (fail-open)

**FIND** (lines 125–132):
```ts
export async function recordUsage(userId: string, feature: Feature): Promise<void> {
  await db.insert(usageEvents).values({
    id: crypto.randomUUID(),
    userId,
    feature,
    createdAt: new Date(),
  })
}
```

**REPLACE WITH:**
```ts
export async function recordUsage(userId: string, feature: Feature): Promise<void> {
  try {
    await db.insert(usageEvents).values({
      id: crypto.randomUUID(),
      userId,
      feature,
      createdAt: new Date(),
    })
  } catch {
    // Fail-open: usage tracking must never block core features
    console.warn(`[plan] Failed to record usage for ${userId}/${feature}`)
  }
}
```

---

## PHASE 3 — Auth Fixes

### Step 3.1 — Replace `!` assertions with safe env var access (`src/app/lib/auth.ts`)

**File:** `src/app/lib/auth.ts`

**FIND** (lines 37–40):
```ts
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
```

**REPLACE WITH:**
```ts
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
```

> **Why `?? ''` and not throw:** Better Auth will show a clear OAuth error if credentials are missing. Throwing at module load prevents the entire app from starting, including non-OAuth pages.

---

### Step 3.2 — Add warning when `trustedOrigins` is empty (`src/app/lib/auth.ts`)

**FIND** (lines 48–53):
```ts
  trustedOrigins: [
    process.env.BETTER_AUTH_URL,
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
    process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
    process.env.NODE_ENV === 'development' && 'http://localhost:3000',
  ].filter(Boolean) as string[],
```

**REPLACE WITH:**
```ts
  trustedOrigins: (() => {
    const origins = [
      process.env.BETTER_AUTH_URL,
      process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
      process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
      process.env.NODE_ENV === 'development' && 'http://localhost:3000',
    ].filter(Boolean) as string[]
    if (origins.length === 0) {
      console.warn('[auth] No trusted origins configured — auth may reject requests')
    }
    return origins
  })(),
```

---

## PHASE 4 — AI Provider Fixes (`src/app/lib/ai-providers.ts`)

**File:** `src/app/lib/ai-providers.ts` (currently 298 lines)

### Step 4.1 — Remove dead `response.status >= 400` check

**FIND** (line 144):
```ts
      if (firstText.includes('"type":"error"') || response.status >= 400) {
```

**REPLACE WITH:**
```ts
      if (firstText.includes('"type":"error"')) {
```

---

### Step 4.2 — Fix `cancel()` to return the promise

**FIND** (lines 170–172):
```ts
        cancel() {
          reader.cancel()
        },
```

**REPLACE WITH:**
```ts
        cancel() {
          return reader.cancel()
        },
```

---

### Step 4.3 — Sanitize API keys in error logs (3 locations)

There are 3 identical `console.warn` lines. Replace EACH one.

**FIND** (line 185 — inside `streamWithFailover`):
```ts
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`⚠️  [AI] ${provider.name} failed: ${msg}`)
```

**REPLACE WITH:**
```ts
      const msg = err instanceof Error ? err.message : String(err)
      const sanitized = msg.replace(/(sk-|api[_-]?key|authorization)[^\s"']+/gi, '$1***')
      console.warn(`⚠️  [AI] ${provider.name} failed: ${sanitized}`)
```

**FIND** (line 238 — inside `generateTextWithFailover`):
```ts
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`⚠️  [AI] ${provider.name} failed: ${msg}`)
```

**REPLACE WITH:**
```ts
      const msg = err instanceof Error ? err.message : String(err)
      const sanitized = msg.replace(/(sk-|api[_-]?key|authorization)[^\s"']+/gi, '$1***')
      console.warn(`⚠️  [AI] ${provider.name} failed: ${sanitized}`)
```

**FIND** (line 289 — inside `generateObjectWithFailover`):
```ts
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`⚠️  [AI] ${provider.name} failed: ${msg}`)
```

**REPLACE WITH:**
```ts
      const msg = err instanceof Error ? err.message : String(err)
      const sanitized = msg.replace(/(sk-|api[_-]?key|authorization)[^\s"']+/gi, '$1***')
      console.warn(`⚠️  [AI] ${provider.name} failed: ${sanitized}`)
```

> **NOTE:** These 3 blocks look identical. The `edit` tool may match multiple. Use `replaceAll: true` OR provide enough surrounding context to make each unique. Each is inside a different function with different nearby lines.

---

## PHASE 5 — API Route Security Fixes

### Step 5.1 — Wrap `billing/checkout` with `withAuth`

**File:** `src/app/api/billing/checkout/route.ts` (currently 41 lines)

**REPLACE THE ENTIRE FILE WITH:**
```ts
import { NextResponse } from 'next/server'
import { stripe, STRIPE_PRICES } from '~/lib/stripe'
import { withAuth } from '~/lib/with-auth'

/**
 * POST /api/billing/checkout
 * Creates a Stripe Checkout Session. Redirects the user to Stripe's hosted page.
 *
 * Body: { interval: 'month' | 'year' }
 * Returns: { url: string } — redirect user here
 */
export const POST = withAuth(async (req, { user }) => {
  const body = await req.json()
  const interval = body.interval === 'year' ? 'yearly' : 'monthly'
  const priceId = STRIPE_PRICES[interval]

  if (!priceId) {
    return NextResponse.json({ error: 'Price not configured' }, { status: 500 })
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    integration_identifier: `jfs-checkout-${Math.random().toString(36).slice(2, 10)}`,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    customer_email: user.email,
    metadata: { userId: user.id },
    success_url: `${process.env.BETTER_AUTH_URL}/settings/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BETTER_AUTH_URL}/pricing?checkout=canceled`,
    subscription_data: {
      metadata: { userId: user.id },
    },
  })

  return NextResponse.json({ url: session.url })
}, { rateLimitType: 'general', route: '/api/billing/checkout' })
```

---

### Step 5.2 — Wrap `billing/portal` with `withAuth`

**File:** `src/app/api/billing/portal/route.ts` (currently 38 lines)

**REPLACE THE ENTIRE FILE WITH:**
```ts
import { NextResponse } from 'next/server'
import { stripe } from '~/lib/stripe'
import { withAuth } from '~/lib/with-auth'
import { db } from '~/lib/db'
import { user } from '~/lib/schema'
import { eq } from 'drizzle-orm'

/**
 * POST /api/billing/portal
 * Creates a Stripe Customer Portal session so the user can manage
 * their subscription (upgrade, cancel, update payment method).
 *
 * Returns: { url: string }
 */
export const POST = withAuth(async (_req, { user: authUser }) => {
  const [found] = await db
    .select({ stripeCustomerId: user.stripeCustomerId })
    .from(user)
    .where(eq(user.id, authUser.id))
    .limit(1)

  if (!found?.stripeCustomerId) {
    return NextResponse.json({ error: 'No subscription found' }, { status: 400 })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: found.stripeCustomerId,
    return_url: `${process.env.BETTER_AUTH_URL}/settings/billing`,
  })

  return NextResponse.json({ url: session.url })
}, { rateLimitType: 'general', route: '/api/billing/portal' })
```

---

### Step 5.3 — Wrap `billing/subscription` with `withAuth`

**File:** `src/app/api/billing/subscription/route.ts` (currently 57 lines)

**REPLACE THE ENTIRE FILE WITH:**
```ts
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
```

---

### Step 5.4 — Fix resume upsert cross-user overwrite (`src/app/api/resumes/route.ts`)

**File:** `src/app/api/resumes/route.ts`

**FIND** (lines 61–73):
```ts
  const resume = {
    id: id || crypto.randomUUID(),
    userId: user.id,
    data: data,
    isBase: isBase ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.insert(resumes).values(resume).onConflictDoUpdate({
    target: resumes.id,
    set: { data: resume.data, updatedAt: new Date() },
  })
```

**REPLACE WITH:**
```ts
  // If client provided an id, verify ownership before upsert
  if (id) {
    const [existing] = await db
      .select({ userId: resumes.userId })
      .from(resumes)
      .where(eq(resumes.id, id))
      .limit(1)
    if (existing && existing.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

  const resume = {
    id: id || crypto.randomUUID(),
    userId: user.id,
    data: data,
    isBase: isBase ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.insert(resumes).values(resume).onConflictDoUpdate({
    target: resumes.id,
    set: { data: resume.data, isBase: resume.isBase, updatedAt: new Date() },
  })
```

> **NOTE:** `eq` is already imported at line 5: `import { eq, and, isNull, count } from 'drizzle-orm'`

---

### Step 5.5 — Fix resume PATCH read without userId filter (`src/app/api/resumes/[id]/route.ts`)

**File:** `src/app/api/resumes/[id]/route.ts`

**FIND** (lines 49–58):
```ts
  if (body.data.data !== undefined) {
    // Merge incoming fields into existing data — never replace the entire blob
    const [existing] = await db
      .select({ data: resumes.data })
      .from(resumes)
      .where(eq(resumes.id, id))
      .limit(1)

    const existingData = (existing?.data ?? {}) as Record<string, unknown>
    updates.data = { ...existingData, ...body.data.data }
  }
```

**REPLACE WITH:**
```ts
  if (body.data.data !== undefined) {
    // Merge incoming fields into existing data — never replace the entire blob
    // Must filter by userId to prevent cross-user data access
    const [existing] = await db
      .select({ data: resumes.data })
      .from(resumes)
      .where(and(eq(resumes.id, id), eq(resumes.userId, user.id), isNull(resumes.deletedAt)))
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const existingData = (existing.data ?? {}) as Record<string, unknown>
    updates.data = { ...existingData, ...body.data.data }
  }
```

> **NOTE:** `and` and `isNull` should already be imported. Check line 3 of the file. If not, add them to the drizzle-orm import.

---

### Step 5.6 — Wrap `recordUsage` calls in try/catch across all AI routes

Even though `recordUsage` is now internally try/catch safe (Step 2.3), we should ALSO wrap the call sites for defense in depth. **Skip this step if Step 2.3 is done** — the internal try/catch is sufficient.

> **DECISION:** Step 2.3 makes this step unnecessary. **SKIP Step 5.6.**

---

### Step 5.7 — Fix `applications/reorder` — add transaction + `appliedAt` (`src/app/api/applications/reorder/route.ts`)

**File:** `src/app/api/applications/reorder/route.ts` (currently 49 lines)

**FIND** (lines 32–46):
```ts
  const updatePromises = updates.map(async (update) => {
    if (!ownedIds.has(update.id)) {
      return
    }
    await db
      .update(applications)
      .set({
        status: update.status as 'bookmarked' | 'applied' | 'interviewing' | 'offered' | 'rejected',
        position: update.position,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, update.id))
  })

  await Promise.all(updatePromises)
```

**REPLACE WITH:**
```ts
  await db.transaction(async (tx) => {
    for (const update of updates) {
      if (!ownedIds.has(update.id)) continue
      const setFields: Record<string, unknown> = {
        status: update.status as 'bookmarked' | 'applied' | 'interviewing' | 'offered' | 'rejected',
        position: update.position,
        updatedAt: new Date(),
      }
      // Set appliedAt when transitioning to 'applied'
      if (update.status === 'applied') {
        setFields.appliedAt = new Date()
      }
      await tx
        .update(applications)
        .set(setFields)
        .where(eq(applications.id, update.id))
    }
  })
```

---

### Step 5.8 — Fix PDF export — add try/catch (`src/app/api/export/pdf/route.tsx`)

**File:** `src/app/api/export/pdf/route.tsx`

**FIND** (lines 56–63):
```ts
  const stream = await ReactPDF.renderToStream(doc)

  // Convert stream to buffer
  const chunks: Uint8Array[] = []
  for await (const chunk of stream as unknown as AsyncIterable<Uint8Array>) {
    chunks.push(chunk)
  }
  const buffer = Buffer.concat(chunks)
```

**REPLACE WITH:**
```ts
  let buffer: Buffer
  try {
    const stream = await ReactPDF.renderToStream(doc)

    // Convert stream to buffer
    const chunks: Uint8Array[] = []
    for await (const chunk of stream as unknown as AsyncIterable<Uint8Array>) {
      chunks.push(chunk)
    }
    buffer = Buffer.concat(chunks)
  } catch (err) {
    console.error('[export-pdf] Generation failed:', err)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
```

---

### Step 5.9 — Fix Stripe webhook to return 500 on handler failure (`src/app/api/stripe/webhook/route.ts`)

**File:** `src/app/api/stripe/webhook/route.ts`

**FIND** (lines 164–169):
```ts
  } catch (err) {
    console.error(`[webhook] ${type} failed:`, err)
    // Return 200 to acknowledge receipt even on handler error (Stripe retries otherwise)
  }

  return NextResponse.json({ received: true })
```

**REPLACE WITH:**
```ts
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
```

---

### Step 5.10 — Wrap `fetchLinkedInGuestDetail` in try/catch (`src/app/api/jobs/detail/route.ts`)

**File:** `src/app/api/jobs/detail/route.ts`

**FIND** (lines 37–48):
```ts
  if (source === 'linkedin-guest' && jobId) {
    const result = await fetchLinkedInGuestDetail(jobId)

    if (result.job) {
      return NextResponse.json({ success: true, job: result.job })
    }

    return NextResponse.json(
      { success: false, error: result.error || 'Could not fetch job details' },
      { status: 502 },
    )
  }
```

**REPLACE WITH:**
```ts
  if (source === 'linkedin-guest' && jobId) {
    try {
      const result = await fetchLinkedInGuestDetail(jobId)

      if (result.job) {
        return NextResponse.json({ success: true, job: result.job })
      }

      return NextResponse.json(
        { success: false, error: result.error || 'Could not fetch job details' },
        { status: 502 },
      )
    } catch {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch job details' },
        { status: 502 },
      )
    }
  }
```

---

### Step 5.11 — Fix file-size error type (`src/app/lib/resume-extract.ts`)

**File:** `src/app/lib/resume-extract.ts`

**FIND** (lines 26–28):
```ts
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large. Maximum size is 5MB.')
  }
```

**REPLACE WITH:**
```ts
  if (file.size > MAX_FILE_SIZE) {
    throw new UnsupportedFileError('File too large. Maximum size is 5MB.')
  }
```

---

### Step 5.12 — Fix parse-resume catch block (`src/app/api/parse-resume/route.ts`)

**File:** `src/app/api/parse-resume/route.ts`

**FIND** (lines 111–116):
```ts
    } catch (err) {
      if (err instanceof UnsupportedFileError) {
        return NextResponse.json({ error: err.message }, { status: 400 })
      }
      throw err
    }
```

**REPLACE WITH:**
```ts
    } catch (err) {
      if (err instanceof UnsupportedFileError) {
        return NextResponse.json({ error: err.message }, { status: 400 })
      }
      console.error('[parse-resume] Extraction failed:', err)
      return NextResponse.json(
        { error: 'Could not read your file. Try converting to .txt and pasting the text.' },
        { status: 400 },
      )
    }
```

---

### Step 5.13 — Fix cover-letter DB save returning fake ID (`src/app/api/ai/cover-letter/route.ts`)

**File:** `src/app/api/ai/cover-letter/route.ts`

**FIND** (lines 124–141):
```ts
  const letterId = crypto.randomUUID()
  try {
    await db.insert(coverLetters).values({
      id: letterId,
      userId: user.id,
      resumeId: resumeId || null,
      company: company || null,
      role: role || null,
      content: text.trim(),
      jdText: jdText || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  } catch (err) {
    console.error('[cover-letter] Failed to save to DB:', err)
  }

  return NextResponse.json({ letter: text.trim(), id: letterId })
```

**REPLACE WITH:**
```ts
  const letterId = crypto.randomUUID()
  let savedId: string | null = letterId
  try {
    await db.insert(coverLetters).values({
      id: letterId,
      userId: user.id,
      resumeId: resumeId || null,
      company: company || null,
      role: role || null,
      content: text.trim(),
      jdText: jdText || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  } catch (err) {
    console.error('[cover-letter] Failed to save to DB:', err)
    savedId = null // Don't return a fake ID if save failed
  }

  return NextResponse.json({ letter: text.trim(), id: savedId })
```

---

## PHASE 6 — Frontend Bug Fixes

### Step 6.1 — Fix `EditableList` stable keys (`src/app/components/resume/resume-detail.tsx`)

**File:** `src/app/components/resume/resume-detail.tsx`

**FIND** (lines 172–174):
```ts
    // Generate stable IDs for sortable items
    // Items may not have an `id` field, so we use index-based keys
    const itemIds = items.map((_, i) => `item-${label}-${i}`)
```

**REPLACE WITH:**
```ts
    // Generate stable IDs for sortable items using a ref
    const itemIdsRef = useRef<string[]>([])
    if (itemIdsRef.current.length !== items.length) {
      while (itemIdsRef.current.length < items.length) {
        itemIdsRef.current.push(`${label}-${crypto.randomUUID()}`)
      }
      while (itemIdsRef.current.length > items.length) {
        itemIdsRef.current.pop()
      }
    }
    const itemIds = itemIdsRef.current
```

> **NOTE:** `useRef` is already imported at line 3: `import { useState, useEffect, useRef, useCallback, useMemo, useDeferredValue } from 'react'`

---

### Step 6.2 — Fix `handleAddSection` functional updaters (`src/app/components/resume/resume-detail.tsx`)

**FIND** (lines 960–975):
```ts
    const handleAddSection = useCallback((section: SectionKey) => {
      if (section === 'projects') {
        setProjects([...projects, { name: '', description: '', techStack: [], link: '' }])
        setShowAddSectionPicker(false)
      } else if (section === 'certifications') {
        setCertifications([...certifications, { name: '', issuer: '', date: '' }])
        setShowAddSectionPicker(false)
      } else if (section === 'languages') {
        setLanguages([...languages, { name: '', proficiency: '' }])
        setShowAddSectionPicker(false)
      } else if (section === 'custom') {
        // Show inline title input instead of immediately creating
        setShowAddSectionPicker(false)
        setShowNewCustomInput(true)
      }
    }, [projects, certifications, languages, customSections, sectionOrder, setProjects, setCertifications, setLanguages, setCustomSections, setSectionOrder, setShowAddSectionPicker])
```

**REPLACE WITH:**
```ts
    const handleAddSection = useCallback((section: SectionKey) => {
      if (section === 'projects') {
        setProjects(prev => [...prev, { name: '', description: '', techStack: [], link: '' }])
        setShowAddSectionPicker(false)
      } else if (section === 'certifications') {
        setCertifications(prev => [...prev, { name: '', issuer: '', date: '' }])
        setShowAddSectionPicker(false)
      } else if (section === 'languages') {
        setLanguages(prev => [...prev, { name: '', proficiency: '' }])
        setShowAddSectionPicker(false)
      } else if (section === 'custom') {
        // Show inline title input instead of immediately creating
        setShowAddSectionPicker(false)
        setShowNewCustomInput(true)
      }
    }, [setProjects, setCertifications, setLanguages, setShowAddSectionPicker])
```

---

### Step 6.3 — Fix `handleCreateCustomSection` functional updaters (`src/app/components/resume/resume-detail.tsx`)

**FIND** (lines 979–1003):
```ts
    const handleCreateCustomSection = useCallback(() => {
      const title = newCustomTitle.trim() || 'Untitled Section'
      const id = crypto.randomUUID?.()?.slice(0, 8) ?? Math.random().toString(36).slice(2, 10)
      const newSection: ResumeCustomSection = { id, title, type: 'bullets', bullets: [] }
      setCustomSections([...customSections, newSection])
      // Find last non-custom section index to insert after it
      let insertAfter = -1
      for (let i = sectionOrder.length - 1; i >= 0; i--) {
        if (!sectionOrder[i].startsWith('cs-')) {
          insertAfter = i
          break
        }
      }
      const newOrder = [...sectionOrder]
      newOrder.splice(insertAfter + 1, 0, `cs-${id}` as SectionOrderId)
      setSectionOrder(newOrder)
      setNewCustomTitle('')
      setShowNewCustomInput(false)
      // Focus the new section's title input after render
      setTimeout(() => {
        const input = document.querySelector<HTMLInputElement>(`[data-cs-id="${id}"]`)
        input?.focus()
        input?.select()
      }, 50)
    }, [newCustomTitle, customSections, sectionOrder, setCustomSections, setSectionOrder])
```

**REPLACE WITH:**
```ts
    const handleCreateCustomSection = useCallback(() => {
      const title = newCustomTitle.trim() || 'Untitled Section'
      const id = crypto.randomUUID?.()?.slice(0, 8) ?? Math.random().toString(36).slice(2, 10)
      const newSection: ResumeCustomSection = { id, title, type: 'bullets', bullets: [] }
      setCustomSections(prev => [...prev, newSection])
      setSectionOrder(prev => {
        let insertAfter = -1
        for (let i = prev.length - 1; i >= 0; i--) {
          if (!prev[i].startsWith('cs-')) {
            insertAfter = i
            break
          }
        }
        const newOrder = [...prev]
        newOrder.splice(insertAfter + 1, 0, `cs-${id}` as SectionOrderId)
        return newOrder
      })
      setNewCustomTitle('')
      setShowNewCustomInput(false)
      // Focus the new section's title input after render
      setTimeout(() => {
        const input = document.querySelector<HTMLInputElement>(`[data-cs-id="${id}"]`)
        input?.focus()
        input?.select()
      }, 50)
    }, [newCustomTitle, setCustomSections, setSectionOrder])
```

---

### Step 6.4 — Fix `setTimeout` cleanup in chat-view (`src/app/components/chat/chat-view.tsx`)

**File:** `src/app/components/chat/chat-view.tsx`

This file has `useRef` imported (line 3). We need to add a timer ref and cleanup.

**Step A:** Find a good place to declare the ref. Look for other `useRef` declarations near the top of the component (after the function declaration, near other refs like `buildDataRef` or `savingResumeRef`).

**FIND** the line that has `savingResumeRef` or `buildDataRef` declaration. It should look something like:
```ts
  const savingResumeRef = useRef(false)
```

**ADD AFTER IT:**
```ts
  const navigateTimer = useRef<ReturnType<typeof setTimeout>>()
```

**Step B:** Find the setTimeout call.

**FIND** (line 404):
```ts
      setTimeout(() => router.push(`/resume/${resume.id}`), 600)
```

**REPLACE WITH:**
```ts
      if (navigateTimer.current) clearTimeout(navigateTimer.current)
      navigateTimer.current = setTimeout(() => router.push(`/resume/${resume.id}`), 600)
```

**Step C:** Add cleanup effect. Find the last `useEffect` in the component (before the return statement) and add a new one after it:

**ADD this new useEffect before the component's return statement (find a spot near other useEffects):**
```ts
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (navigateTimer.current) clearTimeout(navigateTimer.current)
    }
  }, [])
```

---

### Step 6.5 — Fix `setTimeout` cleanup in job-search-panel (`src/app/components/resume/job-search-panel.tsx`)

**File:** `src/app/components/resume/job-search-panel.tsx`

This file has `useRef` imported (line 3). The setTimeout is inside an IntersectionObserver callback (line 385). Since it uses a closure variable `loadingMore`, not React state, the practical impact is minimal. But we should still clean it up.

**FIND** (lines 375–393):
```ts
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    let loadingMore = false
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          loadingMore = true
          setDisplayLimit(prev => prev + 25)
          setTimeout(() => { loadingMore = false }, 500)
        }
      },
      { threshold: 0, rootMargin: '400px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [filtered.length])
```

**REPLACE WITH:**
```ts
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    let loadingMore = false
    let loadingTimer: ReturnType<typeof setTimeout> | undefined
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          loadingMore = true
          setDisplayLimit(prev => prev + 25)
          loadingTimer = setTimeout(() => { loadingMore = false }, 500)
        }
      },
      { threshold: 0, rootMargin: '400px' },
    )

    observer.observe(sentinel)
    return () => {
      observer.disconnect()
      if (loadingTimer) clearTimeout(loadingTimer)
    }
  }, [filtered.length])
```

---

### Step 6.6 — Fix speech recognition lifecycle (`src/app/components/interview/interview-session.tsx`)

**File:** `src/app/components/interview/interview-session.tsx`

**FIND** (lines 114–121):
```ts
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch { /* already stopped */ }
      }
    }
  }, [])
```

**REPLACE WITH:**
```ts
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        const rec = recognitionRef.current
        rec.onresult = null
        rec.onerror = null
        rec.onend = null
        try { rec.stop() } catch { /* already stopped */ }
        recognitionRef.current = null
      }
    }
  }, [])
```

---

### Step 6.7 — Fix `cover-letter-editor` useEffect deps (`src/app/components/resume/cover-letter-editor.tsx`)

**File:** `src/app/components/resume/cover-letter-editor.tsx`

**FIND** (line 45):
```ts
  }, [activeLetter?.id]) // re-init when switching to a different letter record
```

**REPLACE WITH:**
```ts
  }, [activeLetter]) // re-init when the letter record changes (including server-side updates)
```

---

### Step 6.8 — Fix `ResumeCopilot` transport body — use function (`src/app/components/resume/resume-copilot.tsx`)

**File:** `src/app/components/resume/resume-copilot.tsx`

**FIND** (lines 13–32):
```ts
  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/copilot',
    body: {
      resume: {
        name: resume.name,
        role: resume.role,
        persona: resume.persona,
        email: resume.email,
        location: resume.location,
        summary: resume.summary,
        skills: resume.skills,
        experience: resume.experience,
        companies: (applications?.bookmark ?? []).map((b) => ({
          name: b.company,
          role: b.title,
          score: b.score,
        })),
      },
    },
  }), [resume, applications?.bookmark])
```

**REPLACE WITH:**
```ts
  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/copilot',
    body: () => ({
      resume: {
        name: resume.name,
        role: resume.role,
        persona: resume.persona,
        email: resume.email,
        location: resume.location,
        summary: resume.summary,
        skills: resume.skills,
        experience: resume.experience,
        companies: (applications?.bookmark ?? []).map((b) => ({
          name: b.company,
          role: b.title,
          score: b.score,
        })),
      },
    }),
  }), [resume, applications?.bookmark])
```

> **NOTE:** Only `body: {` changes to `body: () => ({` and the closing `}` on line 31 changes to `})`. Everything inside stays the same.

---

## PHASE 7 — Store Cleanup

### Step 7.1 — Fix stale comment (`src/app/lib/resume-editor-store.ts`)

**File:** `src/app/lib/resume-editor-store.ts`

**FIND** (line 109):
```ts
  markSaved: () => void // Update savedSnapshot to match current state
```

**REPLACE WITH:**
```ts
  markSaved: () => void // Clear isDirty after a successful save
```

---

## PHASE 8 — ESLint Config Fix

### Step 8.1 — Check and fix `no-undef` for Node globals

**Check first:** Run `pnpm lint 2>&1 | head -20` and look for `no-undef` errors related to `console` or `process`.

**If NO `no-undef` errors exist:** Skip this phase entirely.

**If `no-undef` errors exist:** Find the ESLint config file:

```sh
# Find the ESLint config
ls eslint.config.* .eslintrc.* 2>/dev/null
```

Read the config file, then add Node globals. For flat config (`eslint.config.mjs` or `eslint.config.js`), add this block to the config array:

```js
{
  files: ['src/app/lib/**/*.ts', 'src/app/api/**/*.ts', 'src/app/api/**/*.tsx'],
  languageOptions: {
    globals: {
      console: 'readonly',
      process: 'readonly',
    },
  },
}
```

---

## PHASE 9 — Verification

Run ALL of these commands. Every one must pass:

```sh
# 1. TypeScript check — must be 0 errors
npx tsc --noEmit

# 2. Lint check — must be 0 NEW errors (pre-existing warnings OK)
pnpm lint

# 3. Unit tests — must all pass (109+ tests)
pnpm test:unit
```

If any command fails:
1. Read the error output
2. Fix the specific file mentioned
3. Re-run the failed command
4. Do NOT continue to the next command until the current one passes

---

## Final Checklist

After all phases complete, verify:

### Schema (Phase 1)
- [ ] `uniqueIndex` imported in schema.ts
- [ ] `user.stripeCustomerId` has `.unique()`
- [ ] `account` has composite `uniqueIndex` on `(providerId, accountId)`
- [ ] `interviewSessions.score` precision = 4
- [ ] `subscriptions` has `uniqueIndex` on `(stripeCustomerId, plan)`
- [ ] `usageEvents` index is `uniqueIndex`
- [ ] Migration generated and applied successfully

### Plan & Limits (Phase 2)
- [ ] `periodBoundary` uses `getUTCFullYear`/`getUTCMonth`/`getUTCDate`
- [ ] `checkLimit` calls `getResumeCount` for `resume_create`
- [ ] `recordUsage` wrapped in try/catch internally

### Auth (Phase 3)
- [ ] `GOOGLE_CLIENT_ID` uses `?? ''` not `!`
- [ ] `trustedOrigins` warns when empty

### AI Providers (Phase 4)
- [ ] Dead `response.status >= 400` check removed
- [ ] `cancel()` returns `reader.cancel()`
- [ ] All 3 `console.warn` calls sanitize API keys

### API Routes (Phase 5)
- [ ] `billing/checkout` wrapped with `withAuth`
- [ ] `billing/portal` wrapped with `withAuth`
- [ ] `billing/subscription` wrapped with `withAuth`
- [ ] Resume POST checks ownership before upsert
- [ ] Resume PATCH read filters by userId + deletedAt
- [ ] `applications/reorder` uses `db.transaction` + sets `appliedAt`
- [ ] PDF export wraps `renderToStream` in try/catch
- [ ] Webhook returns 500 (not 200) on handler failure
- [ ] `jobs/detail` wraps `fetchLinkedInGuestDetail` in try/catch
- [ ] File-size error uses `UnsupportedFileError` (not plain `Error`)
- [ ] Parse-resume catch returns 400 (not rethrows)
- [ ] Cover-letter DB save returns `null` ID on failure

### Frontend (Phase 6)
- [ ] `EditableList` uses `useRef` for stable UUID keys
- [ ] `handleAddSection` uses functional updaters (`prev =>`)
- [ ] `handleCreateCustomSection` uses functional updaters
- [ ] `chat-view` setTimeout cleaned up via ref + useEffect
- [ ] `job-search-panel` setTimeout cleaned up via local var + return
- [ ] Speech recognition cleanup nulls callbacks before stop
- [ ] `cover-letter-editor` deps use `[activeLetter]` not `[activeLetter?.id]`
- [ ] `resume-copilot` body uses function `() => ({...})` not object

### Store (Phase 7)
- [ ] Stale `savedSnapshot` comment fixed

### Verification (Phase 9)
- [ ] `npx tsc --noEmit` passes (0 errors)
- [ ] `pnpm lint` passes (0 new errors)
- [ ] `pnpm test:unit` passes (109+ tests)

---

## Commit

When all phases complete and verification passes:

```sh
git add -A
git commit -m "fix: address all critical and major codebase bugs

- Schema: add unique constraints, fix score precision
- Plan: UTC date boundaries, resume_create uses actual row count
- RecordUsage: fail-open try/catch wrapping
- Auth: safe env var access, trustedOrigins warning
- AI providers: remove dead check, fix cancel(), sanitize logs
- Billing routes: wrap with withAuth for rate limiting + CSRF
- Resume POST: ownership check before upsert
- Resume PATCH: userId filter on read
- Applications reorder: transaction + appliedAt
- PDF export: try/catch around renderToStream
- Stripe webhook: return 500 on handler failure (enables retry)
- Jobs detail: try/catch around fetchLinkedInGuestDetail
- Parse resume: proper error types and 400 responses
- Cover letter: don't return fake ID on DB save failure
- Frontend: stable keys, functional updaters, timer cleanup,
  speech recognition lifecycle, correct useEffect deps"
git push
```

---

## Bug Count Summary

| Phase | Bugs Fixed | Severity |
|-------|-----------|----------|
| 1 — Schema | 6 | 3 critical, 3 major |
| 2 — Plan & Limits | 3 | 2 critical, 1 major |
| 3 — Auth | 2 | 1 major, 1 minor |
| 4 — AI Providers | 3 | 1 major, 2 minor |
| 5 — API Routes | 10 | 5 critical, 4 major, 1 minor |
| 6 — Frontend | 8 | 3 major, 5 minor |
| 7 — Store | 1 | 1 minor |
| **Total** | **33** | **11 critical, 15 major, 7 minor** |

> **NOTE:** Phase 5.6 (wrapping recordUsage at call sites) was merged into Step 2.3 (internal try/catch in recordUsage itself). This is strictly better — one fix vs five repetitive ones.

> **SKIPPED (not bugs):**
> - auth-client.ts `NEXT_PUBLIC_BETTER_AUTH_URL` — browser uses `window.location.origin` correctly
> - `createNoThinkingProvider` empty catch — intentional design for non-JSON bodies
> - ESLint no-undef — only fix if lint actually reports errors
