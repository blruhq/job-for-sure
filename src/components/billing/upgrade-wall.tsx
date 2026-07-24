'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '~/lib/auth-client'

type UpgradeWallProps = {
  /** The feature the user hit the limit on */
  feature: string
  /** Called when the user chooses to use a remaining free attempt (if any) */
  onContinue?: () => void
}

/**
 * Full-screen modal shown when a free user hits a feature limit.
 * Offers upgrade to Pro or the option to use the last remaining attempt.
 *
 * Usage:
 *   const [showWall, setShowWall] = useState(false)
 *   // ... check limit, if not allowed → setShowWall(true)
 *   {showWall && <UpgradeWall feature="chat" onContinue={() => setShowWall(false)} />}
 */
export function UpgradeWall({ feature, onContinue }: UpgradeWallProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const featureLabel = {
    chat: 'AI career chat',
    cover_letter: 'cover letter',
    ats_match: 'ATS match',
    interview: 'interview prep',
    resume_create: 'resume',
  }[feature] || feature

  async function handleUpgrade() {
    setLoading(true)
    const { data: session } = await authClient.getSession()
    if (!session) {
      router.push('/login')
      return
    }
    router.push('/pricing')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-xl neuro-modal p-6">
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>

          <h2 className="mt-3 text-sm font-semibold text-foreground">Limit reached</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            You&apos;ve used all your free {featureLabel} for this period.
            Upgrade to Pro for unlimited access.
          </p>

          <div className="mt-4 flex w-full flex-col gap-2">
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Loading…' : 'Upgrade to Pro — $4/mo'}
            </button>

            {onContinue && (
              <button
                onClick={onContinue}
                className="w-full rounded-lg neuro-inset px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Try again later
              </button>
            )}
          </div>

          <p className="mt-3 text-[10px] text-muted-foreground">
            All plans include a 30-day grace period
          </p>
        </div>
      </div>
    </div>
  )
}
