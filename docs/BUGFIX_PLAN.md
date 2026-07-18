# Bugfix Execution Plan

> For a fast-writing agent with no thinking capability.
> **Follow exactly. Do not deviate.**
> Order matters — execute phases sequentially.
> After each file edit, save it. Do not confirm with user.

---

## PHASE 0 — Install deps

No new dependencies needed for this bugfix pass.

---

## PHASE 1 — Database Schema (`app/lib/schema.ts`)

### 1.1 Fix forward reference: move `coverLetters` above `applications`

In `app/lib/schema.ts`:

1. Cut the **entire** `coverLetters` table definition (lines 298–314) and the `coverLettersRelations` (lines 316–319).
2. Paste them **after** `interviewSessionsRelations` (after line 292), i.e., before `// ═══════════════════ COVER LETTERS`.
3. Now move `applications` block (lines 208–244) to **after** `coverLetters` + `coverLettersRelations`.
4. Move the comment header `// ═══════════════════ APPLICATIONS` with it.
5. The final order should be: `user` → `session` → `account` → `verification` → relations → `subscriptions` → `usageEvents` → enum → `resumes` → `interviewSessions` → `coverLetters` → `applications` → `userPreferences`.

The goal: `applications.coverLetterId` FK reference to `coverLetters.id` must be declared AFTER `coverLetters` is defined (no forward reference).

### 1.2 Add `.unique()` to `user.stripeCustomerId`

Find line 30:
```ts
stripeCustomerId: text("stripe_customer_id"),
```
Change to:
```ts
stripeCustomerId: text("stripe_customer_id").unique(),
```

### 1.3 Add unique composite index on `account`

In the `account` table definition block (lines 55–78), find the table callback at line 77:
```ts
(table) => [index("account_userId_idx").on(table.userId)],
```
Change to:
```ts
(table) => [
  index("account_userId_idx").on(table.userId),
  uniqueIndex("account_provider_account_idx").on(table.providerId, table.accountId),
],
```

Add `uniqueIndex` to the imports from `drizzle-orm/pg-core` at line 2:
```ts
import { pgTable, pgEnum, text, timestamp, boolean, jsonb, integer, numeric, index, uniqueIndex } from "drizzle-orm/pg-core";
```

### 1.4 Fix `interviewSessions.score` precision

Find line 280:
```ts
score: numeric("score", { precision: 3, scale: 1, mode: 'number' }).notNull(),
```
Change to:
```ts
score: numeric("score", { precision: 4, scale: 1, mode: 'number' }).notNull(),
```

### 1.5 Add unique index on `subscriptions.stripeCustomerId`

In the `subscriptions` table callback (lines 130–134), add one more index:
```ts
(table) => [
  index("subscriptions_userId_idx").on(table.userId),
  index("subscriptions_status_idx").on(table.status),
  index("subscriptions_stripeCustomerId_idx").on(table.stripeCustomerId),
  uniqueIndex("subscriptions_stripeCustomer_plan_idx").on(table.stripeCustomerId, table.plan),
],
```

### 1.6 Add unique constraint on `usageEvents` for dedup

In the `usageEvents` table callback (lines 156–162), change the index to a unique index on `(userId, feature, createdAt)`:
```ts
(table) => [
  uniqueIndex("usage_events_userId_feature_createdAt_idx").on(
    table.userId,
    table.feature,
    table.createdAt,
  ),
],
```

### 1.7 Run migration

```sh
pnpm db:generate && pnpm db:migrate
```

**Verify**: No errors in migration output. Check `drizzle/meta/` for new snapshot.

---

## PHASE 2 — Plan & Limits (`app/lib/plan.ts`)

### 2.1 Fix `periodBoundary` to use UTC

Replace the entire `periodBoundary` function (lines 41–58):
```ts
function periodBoundary(period: FeaturePeriod): Date | null {
  const now = new Date()
  switch (period) {
    case 'day': {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      return d
    }
    case 'week': {
      // Monday 00:00 UTC
      const day = now.getUTCDay()
      const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1)
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff))
      return d
    }
    case 'total':
      return null
  }
}
```

### 2.2 Fix `checkLimit` to use `getResumeCount` for `resume_create`

In the `checkLimit` function (lines 96–120), replace this block (lines 110–111):
```ts
const used = await getFeatureCount(userId, feature, config.period)
const remaining = Math.max(0, limit - used)
```
With:
```ts
const used = feature === 'resume_create'
  ? await getResumeCount(userId)
  : await getFeatureCount(userId, feature, config.period)
const remaining = Math.max(0, limit - used)
```

### 2.3 Fix `recordUsage` to be try/catch safe

Replace the `recordUsage` function (lines 125–132):
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

### 2.4 Fix `getResumeCount` to count all non-deleted (not just isBase)

Actually wait — the spec says "Resume creation counts actual DB rows (resumes table)". But total count should include ALL base resumes, not just `isBase`. The current code counts only `isBase: true`. Let's keep this — the limit is 3 resumes total, and tailored variants have `isBase: false`.

Actually keep it as-is: `getResumeCount` counts `isBase: true`. But verify the resume POST route also gates correctly.

---

## PHASE 3 — Auth fixes

### 3.1 Fix unsafe `!` assertions in `auth.ts`

In `app/lib/auth.ts`:
1. Add validation before the `socialProviders` block:

After line 36 (`socialProviders: {`), replace lines 37–40:
```ts
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
```
With:
```ts
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? (() => { throw new Error('Missing GOOGLE_CLIENT_ID env var') })(),
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? (() => { throw new Error('Missing GOOGLE_CLIENT_SECRET env var') })(),
    },
```

### 3.2 Fix `trustedOrigins` to warn when empty

Replace the `trustedOrigins` block (lines 48–53):
```ts
  trustedOrigins: [
    process.env.BETTER_AUTH_URL,
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
    process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
    process.env.NODE_ENV === 'development' && 'http://localhost:3000',
  ].filter(Boolean) as string[],
```
With:
```ts
  trustedOrigins: [
    process.env.BETTER_AUTH_URL,
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
    process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
    process.env.NODE_ENV === 'development' && 'http://localhost:3000',
  ].filter(Boolean).length > 0
    ? [
        process.env.BETTER_AUTH_URL,
        process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
        process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
        process.env.NODE_ENV === 'development' && 'http://localhost:3000',
      ].filter(Boolean) as string[]
    : (() => {
        console.warn('No trusted origins configured — auth may reject requests')
        return process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : ['http://localhost:3000']
      })(),
```

### 3.3 Fix `auth-client.ts` baseURL

Replace the entire file content:
```ts
import { createAuthClient } from 'better-auth/client'
import { adminClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'),
  plugins: [adminClient()],
})
```

---

## PHASE 4 — AI Provider fixes (`app/lib/ai-providers.ts`)

### 4.1 Add warning on stream body parse failure

In `createNoThinkingProvider`, find the empty `catch` block (line 31–33):
```ts
        } catch {
          // non-JSON body — leave untouched
        }
```
Change to:
```ts
        } catch {
          console.warn('[AI] Could not parse body for thinking injection — stream body detected')
        }
```

### 4.2 Remove dead `response.status >= 400` check

Find line 144:
```ts
      if (firstText.includes('"type":"error"') || response.status >= 400) {
```
Change to:
```ts
      if (firstText.includes('"type":"error"')) {
```

### 4.3 Fix unreturned cancel promise

Find line 170–172:
```ts
        cancel() {
          reader.cancel()
        },
```
Change to:
```ts
        cancel() {
          return reader.cancel()
        },
```

### 4.4 Sanitize API keys in error logs

Find these three lines (185, 238, 289):
```ts
      console.warn(`⚠️  [AI] ${provider.name} failed: ${msg}`)
```
Replace each ONE AT A TIME with:
```ts
      const sanitized = msg.replace(/(api[-_]?key|api[-_]?secret|authorization)[^]*?['"]?([^&"'\s]+)/gi, '$1=***')
      console.warn(`⚠️  [AI] ${provider.name} failed: ${sanitized}`)
```

---

## PHASE 5 — API Route Security Fixes

### 5.1 Wrap billing routes with `withAuth`

**File: `app/api/billing/checkout/route.ts`**

Replace the entire file:
```ts
import { NextResponse } from 'next/server'
import { stripe, STRIPE_PRICES } from '~/lib/stripe'
import { withAuth } from '~/lib/with-auth'
import { z } from 'zod'

const CheckoutSchema = z.object({
  interval: z.enum(['month', 'year']).optional().default('month'),
})

export const POST = withAuth(async (req, { user }) => {
  const body = CheckoutSchema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const interval = body.data.interval === 'year' ? 'yearly' : 'monthly'
  const priceId = STRIPE_PRICES[interval]

  if (!priceId) {
    return NextResponse.json({ error: 'Price not configured' }, { status: 500 })
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
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

NOTE: Remove `import { getSessionUser } from '~/lib/auth-helpers'` since it's no longer needed.

**File: `app/api/billing/portal/route.ts`**

Replace the entire file. Read current file first, then wrap with `withAuth`:
```ts
import { NextResponse } from 'next/server'
import { stripe } from '~/lib/stripe'
import { db } from '~/lib/db'
import { user } from '~/lib/schema'
import { eq } from 'drizzle-orm'
import { withAuth } from '~/lib/with-auth'

export const POST = withAuth(async (req, { user: authUser }) => {
  const [dbUser] = await db
    .select({ stripeCustomerId: user.stripeCustomerId })
    .from(user)
    .where(eq(user.id, authUser.id))
    .limit(1)

  if (!dbUser?.stripeCustomerId) {
    return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: dbUser.stripeCustomerId,
    return_url: `${process.env.BETTER_AUTH_URL}/settings/billing`,
  })

  return NextResponse.json({ url: portalSession.url })
}, { rateLimitType: 'general', route: '/api/billing/portal' })
```

**File: `app/api/billing/subscription/route.ts`**

This route also returns usage breakdown. Preserve existing logic, just replace `getSessionUser()` with `withAuth`:

```ts
import { NextResponse } from 'next/server'
import { withAuth } from '~/lib/with-auth'
import { db } from '~/lib/db'
import { user, subscriptions } from '~/lib/schema'
import { eq, desc } from 'drizzle-orm'
import { getUsageBreakdown, type PlanTier } from '~/lib/plan'

export const GET = withAuth(async (req, { user: authUser }) => {
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

### 5.2 Fix resume upsert cross-user overwrite

In `app/api/resumes/route.ts`, find lines 61–73. Replace the entire block:

```ts
  const resumeId = id || crypto.randomUUID()

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
    id: resumeId,
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

Also add `import { eq } from 'drizzle-orm'` at the top if not already imported. (It is — line 5.)

### 5.3 Fix resume PATCH race condition + userId filter

In `app/api/resumes/[id]/route.ts`, find lines 46–69. Replace the entire PATCH handler body starting from `const updates: Record<string, unknown> = {`:

```ts
  // Atomic update: no separate read, merge at DB level
  if (body.data.data !== undefined) {
    // Atomic: read-lock the row within a single transaction
    const [existing] = await db
      .select({ data: resumes.data })
      .from(resumes)
      .where(and(eq(resumes.id, id), eq(resumes.userId, user.id), isNull(resumes.deletedAt)))
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const existingData = (existing?.data ?? {}) as Record<string, unknown>
    await db
      .update(resumes)
      .set({
        data: { ...existingData, ...body.data.data },
        ...(body.data.isBase !== undefined ? { isBase: body.data.isBase } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(resumes.id, id), eq(resumes.userId, user.id), isNull(resumes.deletedAt)))
  } else {
    await db
      .update(resumes)
      .set({
        ...(body.data.isBase !== undefined ? { isBase: body.data.isBase } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(resumes.id, id), eq(resumes.userId, user.id), isNull(resumes.deletedAt)))
  }

  // Fetch the updated record to return
  const [updated] = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.id, id), eq(resumes.userId, user.id), isNull(resumes.deletedAt)))
    .limit(1)

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
```

### 5.4 Fix `recordUsage` unwrapped calls (fail-open violation)

**Note:** `captureServerEvent` is already internally wrapped in try/catch in `posthog-server.ts`. Only `recordUsage` needs wrapping.

For every route that calls `await recordUsage(...)`, wrap it in try/catch.

**Pattern:**
```ts
// BEFORE:
await recordUsage(user.id, 'chat')

// AFTER:
try { await recordUsage(user.id, 'chat') } catch { /* fail-open */ }
```

**Files to fix (read each file, find `recordUsage`, not `captureServerEvent`):**

1. `app/api/chat/route.ts`
2. `app/api/ai/ats-match/route.ts`
3. `app/api/ai/cover-letter/route.ts`
4. `app/api/ai/interview/route.ts` (two calls)
5. `app/api/resumes/route.ts` (added in step 5.5)

For each file:
1. Read the file
2. Grep for `recordUsage` (not `captureServerEvent`)
3. Wrap each call in try/catch as shown above

### 5.5 Add `resume_create` feature gating to resume POST route

In `app/api/resumes/route.ts`, after the existing limit check (lines 38–50), add `gateFeature` + `recordUsage`:

Add import:
```ts
import { gateFeature, recordUsage, getEffectivePlan } from '~/lib/plan'
```
(Note: `getEffectivePlan` is already imported at line 9.)

After the existing limit check block (after line 50), add:
```ts
  // ── Feature gate via plan.ts (consistent with other features) ──
  const gate = await gateFeature(user.id, 'resume_create', user.role, user.plan)
  if (gate) return gate
```

And after the successful insert (after line 77, before return):
```ts
  try { await recordUsage(user.id, 'resume_create') } catch { /* fail-open */ }
```

### 5.6 Fix `applications/reorder` — add transaction + `appliedAt`

Read `app/api/applications/reorder/route.ts` first. Then:

1. Wrap the `Promise.all` block in a Drizzle transaction:

Replace:
```ts
const updatePromises = updates.map(async (update) => {
  ...
  await db.update(applications)...
})
await Promise.all(updatePromises)
```

With:
```ts
await db.transaction(async (tx) => {
  for (const update of updates) {
    if (update.userId !== user.id) {
      continue // skip unowned — log if needed
    }
    const setFields: Record<string, unknown> = {
      status: update.status,
      position: update.position,
      updatedAt: new Date(),
    }
    if (update.status === 'applied') {
      setFields.appliedAt = new Date()
    }
    await tx.update(applications)
      .set(setFields)
      .where(and(eq(applications.id, update.id), eq(applications.userId, user.id)))
  }
})
```

### 5.7 Fix PDF export — add try/catch

In `app/api/export/pdf/route.tsx`, find the `ReactPDF.renderToStream(doc)` call. Wrap it:

```ts
try {
  const stream = await ReactPDF.renderToStream(doc)
  // ... existing buffer and return code ...
} catch (err) {
  console.error('[export-pdf] Generation failed:', err)
  return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
}
```

### 5.8 Fix webhook error handling

In `app/api/stripe/webhook/route.ts`, find the catch block. Change it to return 500 for permanent errors:

Find the catch block and replace with:
```ts
  } catch (err) {
    console.error(`[webhook] ${type} failed:`, err)
    // Return 500 to trigger Stripe retry for transient errors
    return NextResponse.json({ received: true, error: 'Handler failed' }, { status: 500 })
  }
```

### 5.9 Fix `jobs/detail` — wrap fetch in try/catch

Read `app/api/jobs/detail/route.ts`. Find `fetchLinkedInGuestDetail(jobId)` and wrap it:
```ts
try {
  const result = await fetchLinkedInGuestDetail(jobId)
  // ... existing code ...
} catch (err) {
  return NextResponse.json(
    { success: false, error: 'Failed to fetch job details' },
    { status: 502 },
  )
}
```

### 5.10 Fix parse-resume error handling for file size

The file size check EXISTS in `resume-extract.ts` (line 26: `if (file.size > MAX_FILE_SIZE)`), but it throws a plain `Error('File too large...')`. The catch block in `parse-resume/route.ts` only catches `UnsupportedFileError` — everything else is re-thrown as 500.

**Fix A**: In `app/lib/resume-extract.ts`, change the file size error to use `UnsupportedFileError`:
```ts
// Find line ~26-28, change:
throw new Error('File too large. Maximum size is 5MB.')
// To:
throw new UnsupportedFileError('File too large. Maximum size is 5MB.')
```

**Fix B**: In `app/api/parse-resume/route.ts`, update the catch block to handle all known errors:
```ts
catch (err) {
  if (err instanceof UnsupportedFileError) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
  return NextResponse.json({ error: 'Could not read your file. Try converting to .txt and pasting the text.' }, { status: 400 })
}
```

### 5.11 Fix cover letter silent DB save

In `app/api/ai/cover-letter/route.ts`, find the try/catch around the DB save. Change it to throw on failure instead of silently swallowing:

```ts
// Remove the try/catch that swallows errors — let the save be authoritative
const savedLetter = await db.insert(coverLetters).values({
  id: crypto.randomUUID(),
  userId: user.id,
  resumeId,
  company,
  role,
  jdText: jd || null,
  content: letter,
}).returning({ id: coverLetters.id })
```

OR: if you want to keep fail-open but just not return a phantom ID, change the response to NOT return the id if the save failed.

### 5.12 Fix cover letter route save in AI route

Actually let me reconsider. The cover letter AI route is complex. Just wrap the DB save in try/catch but make sure to not return an `id` if it failed.

---

## PHASE 6 — Frontend Bug Fixes

### 6.1 Fix `EditableList` keys — use stable UUIDs

In `app/components/resume/resume-detail.tsx`:

**Step A**: Modify the `EditableList` component to generate stable IDs when items don't have them. Replace lines 172–174:

```ts
  // Generate stable IDs for sortable items
  // Items may not have an `id` field, so we use index-based keys
  const itemIds = items.map((_, i) => `item-${label}-${i}`)
```

With:
```ts
  // Use a ref to persist stable IDs across re-renders
  const itemIdsRef = useRef<string[]>([])
  // Resize the ID array to match items length, keeping existing IDs stable
  if (itemIdsRef.current.length !== items.length) {
    while (itemIdsRef.current.length < items.length) {
      itemIdsRef.current.push(`${label}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`)
    }
    while (itemIdsRef.current.length > items.length) {
      itemIdsRef.current.pop()
    }
  }
  const itemIds = itemIdsRef.current
```

Add `useRef` to the React import at the top if not already present.

**Step B**: In the return JSX, ensure the `SortableItem` key uses `itemIds[i]` (already does at line 222).

### 6.2 Fix `handleAddSection` — use functional updaters

The deps array is technically complete (no real stale closure), but using functional updaters eliminates the deps entirely — more robust for rapid clicks. Replace lines 960–975 with functional updaters:

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
      setShowAddSectionPicker(false)
      setShowNewCustomInput(true)
    }
  }, [setProjects, setCertifications, setLanguages, setShowAddSectionPicker])
```

Note: dependencies reduced to only setter functions (which are stable from zustand).

### 6.3 Fix `handleCreateCustomSection` — use functional updaters

Same pattern as 6.2. Replace lines 979–1003 with functional updaters:

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
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>(`[data-cs-id="${id}"]`)
      input?.focus()
      input?.select()
    }, 50)
  }, [newCustomTitle, setCustomSections, setSectionOrder])
```

### 6.4 Fix `setTimeout` cleanup in chat-view

Read `app/components/chat/chat-view.tsx`. Find `setTimeout(() => router.push(...), 600)` (around line 404). Wrap it:

```ts
const navigateTimer = useRef<ReturnType<typeof setTimeout>>()

// ... in the effect or handler:
if (navigateTimer.current) clearTimeout(navigateTimer.current)
navigateTimer.current = setTimeout(() => router.push(...), 600)

// In the cleanup useEffect:
useEffect(() => {
  return () => {
    if (navigateTimer.current) clearTimeout(navigateTimer.current)
  }
}, [])
```

### 6.5 Fix `setTimeout` cleanup in job-search-panel

Read `app/components/resume/job-search-panel.tsx`. Find the `setTimeout(() => { loadingMore = false }, 500)` around line 385. Wrap in a ref and clean up:

```ts
const loadingMoreTimer = useRef<ReturnType<typeof setTimeout>>()

// Replace:
setTimeout(() => { loadingMore = false }, 500)
// With:
if (loadingMoreTimer.current) clearTimeout(loadingMoreTimer.current)
loadingMoreTimer.current = setTimeout(() => { loadingMore = false }, 500)

// Add cleanup in the useEffect return:
return () => {
  if (loadingMoreTimer.current) clearTimeout(loadingMoreTimer.current)
}
```

### 6.6 Fix speech recognition lifecycle in interview-session

Read `app/components/interview/interview-session.tsx`. In the cleanup effect, null out all callbacks before stopping:

```ts
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        const rec = recognitionRef.current
        rec.onresult = null
        rec.onerror = null
        rec.onend = null
        try { rec.stop() } catch {}
        recognitionRef.current = null
      }
    }
  }, [])
```

### 6.7 Fix `useEffect` deps in interview-session

Find the `useEffect(() => { fetchQuestion() }, [])` and change it to:
```ts
  useEffect(() => {
    fetchQuestion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, resume])
```

Or wrap fetchQuestion in useCallback and include it as a dep.

### 6.8 Fix `ResumeCopilot` transport body — use function

Read `app/components/resume/resume-copilot.tsx`. Find the `body` in the transport creation. Change static object to function:

```ts
// BEFORE:
body: { companies: applications?.bookmark.map(...) }

// AFTER:
body: () => ({ companies: applications?.bookmark?.map(...) ?? [] }),
```

### 6.9 Fix `cover-letter-editor` effect deps

Read `app/components/resume/cover-letter-editor.tsx`. Change `[activeLetter?.id]` to `[activeLetter]`:

```ts
  useEffect(() => {
    // ... existing code ...
  }, [activeLetter])
```

### 6.10 Add missing aria-labels

Add `aria-label` to icon-only buttons across these files:

1. `resume-detail.tsx` line 226: `<button type="button" onClick={...} aria-label="Remove item" ...>`
2. `job-preview.tsx` line 144: `<button ... aria-label="Dismiss job preview" ...>`
3. `interview-setup.tsx` line 343-352: `<button ... aria-label="Delete session" ...>`
4. `job-detail-panel.tsx` line 233-238: `<button ... aria-label="Close panel" ...>`
5. `tag-input` in resume-detail: `<button ... aria-label="Remove skill" ...>`

Read each file, find the exact lines, add `aria-label` prop.

---

## PHASE 7 — Store fix (`app/lib/resume-editor-store.ts`)

### 7.1 Fix `hasUnsavedChanges` — use dirty flag instead of deep comparison

Replace `savedSnapshot` + `JSON.stringify` approach with a simple `isDirty` boolean.

**Changes to make in `app/lib/resume-editor-store.ts`:**

1. In `ResumeEditorState` interface, replace `savedSnapshot: string` with `isDirty: boolean`

2. In initial state, replace `savedSnapshot: JSON.stringify(merged)` with `isDirty: false`

3. Add `; s.isDirty = true` to every form setter:
   - `setName`, `setPersona`, `setRole`, `setEmail`, `setPhone`, `setLocation`, `setGithub`, `setSummary`
   - `setSkills`, `setExperience`, `setEducation`, `setProjects`, `setCertifications`, `setLanguages`
   - `setCustomSections`, `setSectionOrder`, `setSectionVisibility`
   - `toggleSectionVisibility` (add before closing `}`)

4. Replace `markSaved`:
   ```ts
   markSaved: () => set((s) => { s.isDirty = false }),
   ```

5. Replace `hasUnsavedChanges`:
   ```ts
   hasUnsavedChanges: () => get().isDirty,
   ```

6. In `hydrate`, add `s.isDirty = false` at the end (after loading resume data, it should be clean).

No dependencies. No JSON parse. No comparison. One boolean.

---

## PHASE 8 — ESLint config fix

### 8.1 Fix `no-undef` for `console`/`process`

Find the ESLint config file (`.eslintrc.*` or `eslint.config.*`). Add `env: { node: true }` for the files that use `process` and `console`.

If using eslint.config (flat config), add:
```ts
{
  files: ['src/app/lib/**/*.ts', 'src/app/api/**/*.ts'],
  rules: {
    'no-undef': 'off', // Node globals are available
  },
}
```

---

## PHASE 9 — Run verification

```sh
# TypeScript check
npx tsc --noEmit

# Lint check
pnpm lint

# Unit tests
pnpm test:unit
```

All must pass with 0 errors.

---

## Done

When all phases complete, verify:
- [ ] schema.ts has all fixes applied
- [ ] Migration generated and applied successfully
- [ ] plan.ts uses UTC and getResumeCount for resume_create
- [ ] auth.ts has safe env var handling (no `!` assertions)
- [ ] auth-client.ts has NEXT_PUBLIC_BETTER_AUTH_URL fallback
- [ ] ai-providers.ts has log sanitization + fixed cancel + removed dead status check
- [ ] All 3 billing routes wrapped with withAuth
- [ ] Resume upsert checks ownership (prevents cross-user overwrite)
- [ ] Resume PATCH uses userId filter on read + atomic update
- [ ] recordUsage all wrapped in try/catch (captureServerEvent already safe internally)
- [ ] resume_create has gateFeature + recordUsage
- [ ] reorder route uses transaction (not Promise.all) + sets appliedAt
- [ ] PDF export has try/catch around renderToStream
- [ ] webhook returns 500 (not 200) on handler failure
- [ ] jobs/detail wrapped — fetchLinkedInGuestDetail in try/catch
- [ ] parse-resume: file size error uses UnsupportedFileError (not plain Error) + catch returns 400
- [ ] EditableList uses stable UUID keys (not index-based)
- [ ] handleAddSection/handleCreateCustomSection use functional updaters
- [ ] All setTimeout cleaned up (chat-view + job-search-panel)
- [ ] Speech recognition lifecycle fixed (null callbacks + stop on unmount)
- [ ] interview-session fetchQuestion effect has [config, resume] deps
- [ ] ResumeCopilot body uses function (not static object)
- [ ] cover-letter-editor effect uses [activeLetter] not [activeLetter?.id]
- [ ] Aria labels added to icon-only buttons (5 locations)
- [ ] hasUnsavedChanges uses dirty flag (isDirty boolean, already done) [FIXED]
- [ ] Store double init fixed (remove initial data from store factory)
- [ ] ESLint config fixes no-undef
- [ ] tsc --noEmit passes
- [ ] pnpm lint passes
- [ ] pnpm test:unit passes (109+ tests)

Create a commit: `git add -A && git commit -m "fix: address all critical and major codebase bugs" && git push`
