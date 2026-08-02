'use client'

import { useEffect } from 'react'

/**
 * Dev-only React Scan — shows render performance overlay.
 * Automatically disabled in production builds.
 * Shows which components re-render and how long they take.
 */
export function ReactScan() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return

    import('react-scan').then(({ scan }) => {
      scan({
        enabled: true,
        showToolbar: true,
      })
    }).catch(() => {
      // Silently fail — never block the app
    })

    return () => {
      // react-scan cleanup handled internally
    }
  }, [])

  return null
}
