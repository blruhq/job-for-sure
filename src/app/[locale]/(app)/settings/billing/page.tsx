'use client'

import { useEffect, useState } from 'react'
import { useRouter } from '~/i18n/routing'
import { Skeleton } from '~/components/ui/skeleton'

type UsageData = {
  allowed: boolean
  remaining: number
  limit: number
  plan: string
}

type SubResponse = {
  plan: string
  stripeCustomerId: string | null
  hasActiveSubscription: boolean
  subscription: {
    id: string
    status: string
    plan: string
    interval: string | null
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
  } | null
  usage: Record<string, UsageData>
}

const FEATURE_LABELS: Record<string, string> = {
  chat: 'AI Chats',
  cover_letter: 'Cover Letters',
  ats_match: 'ATS Matches',
  interview: 'Interview Prep',
  resume_create: 'Resumes',
}

export default function BillingPage() {
  const router = useRouter()
  const [data, setData] = useState<SubResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [canceling, setCanceling] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/billing/subscription')
        if (res.ok) {
          setData(await res.json())
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handlePortal() {
    const res = await fetch('/api/billing/portal', { method: 'POST' })
    const json = await res.json()
    if (json.url) window.location.href = json.url
  }

  async function handleCancel() {
    setCanceling(true)
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' })
      if (res.ok) {
        // Reload to reflect updated state
        const updated = await fetch('/api/billing/subscription').then((r) => r.json())
        setData(updated)
      }
    } finally {
      setCanceling(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  const isPro = data?.plan === 'pro'
  const isCanceled = data?.subscription?.cancelAtPeriodEnd
  const endDate = data?.subscription?.currentPeriodEnd
    ? new Date(data.subscription.currentPeriodEnd).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Billing</h1>
        <p className="mt-1 text-xs text-muted-foreground">Manage your subscription and usage</p>
      </div>

      {/* Current plan card */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Current Plan</p>
            <p className="mt-1 text-2xl font-bold text-foreground capitalize">{data?.plan}</p>
            {isPro && data?.subscription && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {data.subscription.interval === 'year' ? 'Yearly' : 'Monthly'} billing
              </p>
            )}
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
              isPro
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {isPro ? 'Active' : 'Free'}
          </span>
        </div>

        {isCanceled && endDate && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Your Pro access ends on {endDate}. After that, you&apos;ll be downgraded to Free.
          </p>
        )}

        <div className="mt-4 flex items-center gap-3">
          {isPro ? (
            <button
              onClick={handlePortal}
              className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Manage in Stripe
            </button>
          ) : (
            <button
              onClick={() => router.push('/pricing')}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
            >
              Upgrade to Pro
            </button>
          )}
          {isPro && !isCanceled && (
            <button
              onClick={handleCancel}
              disabled={canceling}
              className="rounded-lg border border-border px-4 py-2 text-xs text-muted-foreground hover:text-red-500 hover:border-red-200 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {canceling ? 'Canceling…' : 'Cancel subscription'}
            </button>
          )}
        </div>
      </div>

      {/* Usage breakdown */}
      {!isPro && data?.usage && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Usage this period
          </h2>
          <div className="mt-3 space-y-3">
            {Object.entries(data.usage).map(([feature, u]) => {
              if (u.limit === Infinity) return null
              const label = FEATURE_LABELS[feature] || feature
              const used = u.limit - u.remaining
              const pct = u.limit > 0 ? Math.round((used / u.limit) * 100) : 0
              return (
                <div key={feature}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{label}</span>
                    <span className="text-muted-foreground">
                      {used} / {u.limit}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-primary'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
