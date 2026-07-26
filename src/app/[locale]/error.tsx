'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '~/components/ui/button'

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[LocaleError]', error)
    // Capture error in PostHog (fail-open)
    import('posthog-js').then(({ default: ph }) => {
      try {
        ph.captureException(error, { error_type: 'locale_error_boundary' })
      } catch { /* fail-open */ }
    }).catch(() => {})
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center neuro-surface px-6 text-center">
      <div className="max-w-sm">
        <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          An unexpected error occurred. The error has been logged.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button
            onClick={reset}
            className="rounded-md px-4 py-2 text-xs font-medium active:scale-[0.98]"
          >
            Try again
          </Button>
          <Link
            href="/"
            className="cursor-pointer rounded-md neuro-pill px-4 py-2 text-xs font-medium text-foreground transition-shadow"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
