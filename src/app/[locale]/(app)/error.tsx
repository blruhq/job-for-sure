'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '~/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[AppError]', error)
    // Capture error in PostHog (fail-open)
    import('posthog-js').then(({ default: ph }) => {
      try {
        ph.captureException(error, { error_type: 'app_error_boundary' })
      } catch { /* fail-open */ }
    }).catch(() => {})
  }, [error])

  return (
    <div className="flex flex-1 flex-col items-center justify-center neuro-surface px-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-destructive">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-foreground">Something went wrong</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          An unexpected error occurred. Try again, or go back to a safe page.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button
            onClick={reset}
            className="rounded-md px-4 py-2 text-xs font-medium active:scale-[0.98]"
          >
            Try again
          </Button>
          <Link
            href="/chat"
            className="cursor-pointer rounded-md border border-border bg-background px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            Career Coach
          </Link>
        </div>
      </div>
    </div>
  )
}
