'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '24px',
          fontFamily: 'system-ui, sans-serif',
          background: 'hsl(0 0% 3.9%)',
          color: 'hsl(0 0% 98%)',
        }}>
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <h1 style={{ fontSize: 48, fontWeight: 700, margin: '0 0 8px' }}>
              500
            </h1>
            <p style={{ fontSize: 14, opacity: 0.7, margin: '0 0 24px' }}>
              Something went wrong on our end. The error has been logged.
            </p>
            <button
              onClick={reset}
              style={{
                padding: '10px 24px',
                fontSize: 13,
                fontWeight: 500,
                border: '1px solid hsl(0 0% 14.9%)',
                borderRadius: 8,
                background: 'hsl(0 0% 9%)',
                color: 'hsl(0 0% 98%)',
                cursor: 'pointer',
                marginRight: 8,
              }}
            >
              Try again
            </button>
            <Link
              href="/"
              style={{
                display: 'inline-block',
                padding: '10px 24px',
                fontSize: 13,
                fontWeight: 500,
                textDecoration: 'none',
                color: 'hsl(0 0% 98%)',
              }}
            >
              Go home
            </Link>
          </div>
        </div>
      </body>
    </html>
  )
}
