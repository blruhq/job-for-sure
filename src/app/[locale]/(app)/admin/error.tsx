'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[AdminError]', error)
  }, [error])

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-destructive">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-foreground">Admin panel error</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          The admin panel encountered an error. This is usually a temporary database issue.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={reset}
            className="cursor-pointer rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.98]"
          >
            Try again
          </button>
          <Link
            href="/chat"
            className="cursor-pointer rounded-md border border-border bg-background px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            Back to app
          </Link>
        </div>
      </div>
    </div>
  )
}
