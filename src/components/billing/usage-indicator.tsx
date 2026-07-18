'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '~/lib/utils'
import { authClient } from '~/lib/auth-client'

type UsageIndicatorProps = {
  feature: string
  className?: string
  showIcon?: boolean
}

/**
 * Shows remaining usage for a feature (e.g. "12/15 chats today").
 * Place in the UI near where the user uses the feature.
 *
 * If the user is Pro, shows nothing (no need to indicate limits).
 * If the user hits 0, clicking takes them to /pricing.
 */
export function UsageIndicator({ feature, className, showIcon = true }: UsageIndicatorProps) {
  const router = useRouter()
  const [usage, setUsage] = useState<{ remaining: number; limit: number; plan: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data: session } = await authClient.getSession()
        if (!session) return

        const res = await fetch('/api/billing/subscription')
        if (!res.ok) return
        const json = await res.json()
        const u = json.usage?.[feature]
        if (!cancelled && u) {
          setUsage(u)
        }
      } catch {
        // ignore
      }
    }
    load()
    return () => { cancelled = true }
  }, [feature])

  // Don't show for Pro users
  if (!usage || usage.plan === 'pro' || usage.limit === Infinity) return null

  // Don't show if there's plenty
  const used = usage.limit - usage.remaining
  const isLow = used / usage.limit >= 0.8
  const isCritical = usage.remaining === 0

  if (!isLow) return null

  return (
    <button
      onClick={() => router.push('/pricing')}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors cursor-pointer',
        isCritical
          ? 'bg-red-50 text-red-600 hover:bg-red-100'
          : 'bg-amber-50 text-amber-700 hover:bg-amber-100',
        className,
      )}
    >
      {showIcon && (
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      )}
      <span>
        {isCritical
          ? `${feature === 'chat' ? 'Chat' : feature} limit reached`
          : `${usage.remaining} left (${used}/${usage.limit})`}
      </span>
    </button>
  )
}
