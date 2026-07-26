import { db } from '~/lib/db'
import { usageEvents, user, resumes } from '~/lib/schema'
import { eq, and, gte, count, isNull } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getRedis } from '~/lib/redis'

// ── Ownership check ──

/**
 * Returns true if `resumeId` exists and belongs to `userId`.
 * Use this on any route that accepts a resumeId in the body to prevent
 * cross-user attachment (defensive — blocks future JOIN-based leaks).
 */
export async function userOwnsResume(userId: string, resumeId: string | null | undefined): Promise<boolean> {
  if (!resumeId) return true // null resumeId is allowed (no attachment)
  const [row] = await db
    .select({ id: resumes.id })
    .from(resumes)
    .where(and(eq(resumes.id, resumeId), eq(resumes.userId, userId)))
    .limit(1)
  return !!row
}

// ── Feature & Limit Types ──

export type PlanTier = 'free' | 'pro'

export type Feature = 'chat' | 'cover_letter' | 'ats_match' | 'interview' | 'resume_create'

export type FeaturePeriod = 'day' | 'week' | 'total'

type FeatureConfig = {
  limit: Record<PlanTier, number> // -1 = unlimited
  period: FeaturePeriod
}

const FEATURES: Record<Feature, FeatureConfig> = {
  chat:           { limit: { free: 15, pro: -1 }, period: 'day' },
  cover_letter:   { limit: { free: 3, pro: -1 },  period: 'week' },
  ats_match:      { limit: { free: 5, pro: -1 },  period: 'day' },
  interview:      { limit: { free: 3, pro: -1 },  period: 'week' },
  resume_create:  { limit: { free: 3, pro: -1 },  period: 'total' },
}

// ── Helpers ──

/**
 * Get the effective plan for a user.
 * Admins always get 'pro'. Everyone else reads from user.plan column.
 */
export function getEffectivePlan(role: string, plan: string): PlanTier {
  if (role === 'admin') return 'pro'
  return plan === 'pro' ? 'pro' : 'free'
}

/**
 * Get the time boundary for a period type.
 */
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

/**
 * Count how many times a user has used a feature in the current period.
 */
async function getFeatureCount(
  userId: string,
  feature: Feature,
  period: FeaturePeriod,
): Promise<number> {
  const since = periodBoundary(period)
  const conditions = [
    eq(usageEvents.userId, userId),
    eq(usageEvents.feature, feature),
  ]
  if (since) {
    conditions.push(gte(usageEvents.createdAt, since))
  }
  const [row] = await db
    .select({ total: count() })
    .from(usageEvents)
    .where(and(...conditions))
  return row?.total ?? 0
}

// ── Public API ──

export type LimitResult = {
  allowed: boolean
  remaining: number
  limit: number
  plan: PlanTier
}

/**
 * Check whether a user can use a feature.
 * Returns detailed limit info for UI consumption.
 */
export async function checkLimit(
  userId: string,
  feature: Feature,
  role: string,
  plan: string,
): Promise<LimitResult> {
  const effectivePlan = getEffectivePlan(role, plan)
  const config = FEATURES[feature]
  const limit = config.limit[effectivePlan]

  // Unlimited (admins or pro)
  if (limit === -1) {
    return { allowed: true, remaining: Infinity, limit: Infinity, plan: effectivePlan }
  }

  const used = feature === 'resume_create'
    ? await getResumeCount(userId)
    : await getFeatureCount(userId, feature, config.period)
  const remaining = Math.max(0, limit - used)

  return {
    allowed: remaining > 0,
    remaining,
    limit,
    plan: effectivePlan,
  }
}

/**
 * Record a feature usage event. Does NOT check limits — call checkLimit first.
 */
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

/**
 * Get usage stats for today/week across all features.
 * Returns { feature: LimitResult } for display.
 */
export async function getUsageBreakdown(
  userId: string,
  role: string,
  plan: string,
): Promise<Record<Feature, LimitResult>> {
  const entries = Object.entries(FEATURES) as [Feature, FeatureConfig][]
  const effectivePlan = getEffectivePlan(role, plan)

  // Batch usage_events counts into two GROUP BY queries:
  //   week-level (covers cover_letter, interview) and day-level (covers chat, ats_match).
  // This replaces N sequential getFeatureCount calls with at most 2 queries.
  const sinceDay = periodBoundary('day')
  const sinceWeek = periodBoundary('week')

  const dayRows = sinceDay
    ? await db
        .select({ feature: usageEvents.feature, total: count() })
        .from(usageEvents)
        .where(and(eq(usageEvents.userId, userId), gte(usageEvents.createdAt, sinceDay)))
        .groupBy(usageEvents.feature)
    : []

  const weekRows = sinceWeek
    ? await db
        .select({ feature: usageEvents.feature, total: count() })
        .from(usageEvents)
        .where(and(eq(usageEvents.userId, userId), gte(usageEvents.createdAt, sinceWeek)))
        .groupBy(usageEvents.feature)
    : []

  const dayUsageMap = new Map(dayRows.map((r) => [r.feature, r.total]))
  const weekUsageMap = new Map(weekRows.map((r) => [r.feature, r.total]))

  const results: Record<Feature, LimitResult> = {} as Record<Feature, LimitResult>

  for (const [feature, config] of entries) {
    const limit = config.limit[effectivePlan]

    // Unlimited
    if (limit === -1) {
      results[feature] = { allowed: true, remaining: Infinity, limit: Infinity, plan: effectivePlan }
      continue
    }

    // resume_create uses actual DB rows, not usage_events
    let used: number
    if (feature === 'resume_create') {
      used = await getResumeCount(userId)
    } else if (config.period === 'day') {
      used = dayUsageMap.get(feature) ?? 0
    } else {
      used = weekUsageMap.get(feature) ?? 0
    }

    const remaining = Math.max(0, limit - used)
    results[feature] = { allowed: remaining > 0, remaining, limit, plan: effectivePlan }
  }

  return results
}

/**
 * Get the total resume count (used by resume_create limit).
 * Counts only non-deleted base resumes — tailored variants and soft-deleted
 * rows do NOT count against the Free-plan limit of 3.
 */
export async function getResumeCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(resumes)
    .where(and(eq(resumes.userId, userId), eq(resumes.isBase, true), isNull(resumes.deletedAt)))
  return row?.total ?? 0
}

// ── API Route Helpers ──

/**
 * Quick read of user.plan from DB.
 * Used by route handlers to get the current plan for limit checks.
 */
export async function getUserPlan(userId: string): Promise<PlanTier> {
  const [row] = await db
    .select({ plan: user.plan })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
  return (row?.plan as PlanTier) ?? 'free'
}

/**
 * Atomic quota claim via Redis INCR (fail-open to DB on Redis outage).
 * Prevents TOCTOU race where N parallel requests all pass checkLimit at count=X.
 * On success the claim is consumed even if the subsequent AI call fails —
 * slightly over-strict for free users, never under-strict (no quota abuse).
 */
async function claimQuotaAtomic(
  userId: string,
  feature: Feature,
  limit: number,
  period: FeaturePeriod,
): Promise<'allowed' | 'denied' | 'unknown'> {
  try {
    const redis = getRedis()
    const since = periodBoundary(period)
    // Day key: YYYY-MM-DD. Week key: ISO of Monday. Total: constant.
    const periodKey =
      period === 'total'
        ? 'all'
        : (since?.toISOString().slice(0, 10) ?? 'all')
    const key = `jfs:quota:${userId}:${feature}:${periodKey}`
    const used = await redis.incr(key)
    if (used === 1) {
      // TTL so keys self-expire when the period rolls over
      const ttl =
        period === 'day' ? 86_400 + 3_600 : // 25h cushion
        period === 'week' ? 604_800 + 3_600 : // 7d + 1h
        365 * 86_400 // total: 1 year
      await redis.expire(key, ttl)
    }
    if (used > limit) {
      // Roll back so permanent over-claim doesn't stick
      await redis.decr(key)
      return 'denied'
    }
    return 'allowed'
  } catch {
    return 'unknown' // Redis down → caller falls back to DB check
  }
}

function limitReachedResponse(feature: Feature, limit: number, plan: PlanTier) {
  return NextResponse.json(
    {
      error: 'Limit reached',
      feature,
      limit,
      plan,
      upgradeUrl: '/pricing',
    },
    { status: 402 },
  )
}

/**
 * Combination check for route handlers.
 * Returns a NextResponse (402) if the user hits a limit, or null if allowed.
 * Uses Redis atomic INCR to prevent parallel-request quota bypass.
 * Callers should still call recordUsage for DB-side usage history.
 *
 *   const gate = await gateFeature(user.id, 'chat', user.role, user.plan)
 *   if (gate) return gate
 *   await recordUsage(user.id, 'chat')
 */
export async function gateFeature(
  userId: string,
  feature: Feature,
  role: string,
  plan: string,
): Promise<NextResponse | null> {
  const effectivePlan = getEffectivePlan(role, plan)
  const config = FEATURES[feature]
  const limit = config.limit[effectivePlan]

  // Unlimited (admins or pro)
  if (limit === -1) return null

  // resume_create is row-count based (DB is source of truth), not event-based
  if (feature === 'resume_create') {
    const used = await getResumeCount(userId)
    if (used >= limit) {
      return limitReachedResponse(feature, limit, effectivePlan)
    }
    return null
  }

  // Atomic claim via Redis
  const claim = await claimQuotaAtomic(userId, feature, limit, config.period)
  if (claim === 'denied') {
    return limitReachedResponse(feature, limit, effectivePlan)
  }
  if (claim === 'allowed') return null

  // Redis unavailable — fall back to non-atomic DB check (fail-open for availability)
  const result = await checkLimit(userId, feature, role, plan)
  if (!result.allowed) {
    return limitReachedResponse(feature, result.limit, result.plan)
  }
  return null
}
