'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '~/lib/auth-client'
import { cn } from '~/lib/utils'

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Get started with the basics',
    features: [
      '3 resumes',
      '15 AI chats / day',
      '3 cover letters / week',
      '5 ATS matches / day',
      '3 interview preps / week',
      'All templates + PDF export',
      'Full job board access',
    ],
    cta: 'Get Started',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$4',
    period: '/ month',
    description: 'Unlock everything',
    features: [
      'Unlimited resumes & variants',
      'Unlimited AI chats',
      'Unlimited cover letters',
      'Unlimited ATS matches',
      'Unlimited interview prep',
      'Priority AI speed',
      'Early access to new features',
    ],
    yearlyNote: 'or $29 / year (save 40%)',
    cta: 'Subscribe',
    highlight: true,
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState<'monthly' | 'yearly' | null>(null)

  async function handleSubscribe(interval: 'month' | 'year') {
    setLoading(interval === 'month' ? 'monthly' : 'yearly')

    // Check auth first
    const { data: session } = await authClient.getSession()
    if (!session) {
      router.push('/login?redirect=/pricing')
      return
    }

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      // fallback
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Simple, transparent pricing
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Start free. Upgrade when you need more.
          </p>
        </div>

        {/* Plan cards */}
        <div className="isolate mx-auto mt-12 grid max-w-md grid-cols-1 gap-6 lg:max-w-2xl lg:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                'rounded-xl border p-6',
                plan.highlight
                  ? 'border-primary/40 bg-card ring-1 ring-primary/20'
                  : 'border-border bg-card',
              )}
            >
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {plan.name}
              </h2>
              <p className="mt-1 text-3xl font-bold text-foreground">
                {plan.price}
                <span className="text-sm font-normal text-muted-foreground">{plan.period}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>

              {plan.yearlyNote && (
                <p className="mt-1 text-xs font-medium text-primary">{plan.yearlyNote}</p>
              )}

              <ul className="mt-4 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-foreground">
                    <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {plan.name === 'Free' ? (
                <button
                  onClick={() => router.push('/chat')}
                  className="mt-6 w-full rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  {plan.cta}
                </button>
              ) : (
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    onClick={() => handleSubscribe('month')}
                    disabled={loading === 'monthly'}
                    className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                  >
                    {loading === 'monthly' ? 'Redirecting…' : `${plan.price}${plan.period}`}
                  </button>
                  <button
                    onClick={() => handleSubscribe('year')}
                    disabled={loading === 'yearly'}
                    className="w-full rounded-lg border border-primary/30 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {loading === 'yearly' ? 'Redirecting…' : '$29 / year (save 40%)'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Cancel anytime. All plans include a 30-day grace period after non-payment.
        </p>
      </div>
    </div>
  )
}
