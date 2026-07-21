import { useUIStore } from '~/hooks/use-ui'
import { ApiError } from '~/lib/api-client'

/**
 * Default Free-plan resume limit shown in the upgrade modal when the server
 * response omits a `limit` field. Kept in sync with `resume_create` in plan.ts.
 */
const DEFAULT_FREE_RESUME_LIMIT = 3

/**
 * Inspect a mutation/promise error and, if it's a 402 "resume limit reached"
 * response, open the global UpgradeModal (via the UI store) and return `true`
 * so the caller knows it was handled and can skip a generic fallback error.
 *
 * Returns `false` for any non-402 error so callers surface those normally.
 *
 * Uses the Zustand store's getState() so it works from anywhere — react-query
 * onError callbacks, event handlers, custom fetch wrappers — without needing
 * React component context.
 */
export function handleResumeLimitError(err: unknown): boolean {
  if (!(err instanceof ApiError) || err.status !== 402) return false

  const limit =
    (err.body.limit as number | undefined) ?? DEFAULT_FREE_RESUME_LIMIT

  useUIStore.getState().openUpgradeModal({
    feature: (err.body.feature as string | undefined) ?? 'resume_create',
    limit,
    featureLabel: 'resumes',
    period: 'total',
  })

  return true
}
