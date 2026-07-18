import { db } from '~/lib/db'
import { usageEvents, user, resumes } from '~/lib/schema'
import { eq, and, gte, count } from 'drizzle-orm'
import { NextResponse } from 'next/server'

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

  const used = await getFeatureCount(userId, feature, config.period)
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
  await db.insert(usageEvents).values({
    id: crypto.randomUUID(),
    userId,
    feature,
    createdAt: new Date(),
  })
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
  const results: Record<Feature, LimitResult> = {} as any

  for (const [feature] of entries) {
    results[feature] = await checkLimit(userId, feature, role, plan)
  }

  return results
}

/**
 * Get the total resume count (used by resume_create limit).
 */
export async function getResumeCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(resumes)
    .where(and(eq(resumes.userId, userId), eq(resumes.isBase, true)))
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
 * Combination check + record for route handlers.
 * Returns a NextResponse (402/429) if the user hits a limit, or null if allowed.
 * Callers should check the result and short-circuit:
 *
 *   const gate = await gateFeature(user.id, 'chat')
 *   if (gate) return gate
 *   await recordUsage(user.id, 'chat')
 */
export async function gateFeature(
  userId: string,
  feature: Feature,
  role: string,
  plan: string,
): Promise<NextResponse | null> {
  const result = await checkLimit(userId, feature, role, plan)
  if (!result.allowed) {
    return NextResponse.json(
      {
        error: 'Limit reached',
        feature,
        limit: result.limit,
        plan: result.plan,
        upgradeUrl: '/pricing',
      },
      { status: 402 },
    )
  }
  return null
}
