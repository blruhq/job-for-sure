import { toast } from 'sonner'
import { ApiError } from '~/lib/api-client'

/**
 * Default Free-plan resume limit shown in the upgrade toast when the server
 * response omits a `limit` field. Kept in sync with `resume_create` in plan.ts.
 */
const DEFAULT_FREE_RESUME_LIMIT = 3
const DEFAULT_UPGRADE_URL = '/pricing'

/**
 * Inspect a mutation/promise error and, if it's a 402 "resume limit reached"
 * response, show an actionable sonner toast (with an Upgrade action) and
 * return `true` so the caller knows it was handled and can skip a generic
 * fallback error toast.
 *
 * Returns `false` for any non-402 error so callers surface those normally.
 *
 * Framework-agnostic: navigation uses window.location so this works from any
 * client component, hook, or event handler.
 */
export function handleResumeLimitError(err: unknown): boolean {
  if (!(err instanceof ApiError) || err.status !== 402) return false

  const limit =
    (err.body.limit as number | undefined) ?? DEFAULT_FREE_RESUME_LIMIT
  const upgradeUrl =
    (err.body.upgradeUrl as string | undefined) ?? DEFAULT_UPGRADE_URL

  toast.error(`Free plan allows up to ${limit} resumes.`, {
    description: 'Delete a resume to make room, or upgrade for unlimited.',
    duration: 6000,
    action: {
      label: 'Upgrade',
      onClick: () => {
        if (typeof window !== 'undefined') {
          window.location.assign(upgradeUrl)
        }
      },
    },
  })

  return true
}
