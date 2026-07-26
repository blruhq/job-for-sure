import { useUIStore } from '~/hooks/use-ui'

/**
 * Handle a 402 "limit reached" response from `/api/ai/smart-overview` by opening
 * the global UpgradeModal. Smart Overview shares the `ats_match` daily AI budget
 * (5/day on Free), so the modal is labelled "AI analyses" to make the shared
 * budget legible to the user.
 *
 * Returns `true` if the response was a 402 and has been handled — the caller
 * MUST bail out (no generic error toast, no 'error' state). Returns `false` for
 * every other status so the caller continues normal success/error handling.
 *
 * Mirrors the 402 transport-interceptor pattern in `chat-view.tsx` and the
 * `handleResumeLimitError` helper in `resume-limit.ts`.
 *
 * Note: this consumes the response body ONLY on a 402. On any other status the
 * body is left untouched for the caller to read.
 */
export async function handleSmartOverviewLimit(res: Response): Promise<boolean> {
  if (res.status !== 402) return false

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
  useUIStore.getState().openUpgradeModal({
    feature: (body.feature as string | undefined) ?? 'ats_match',
    limit: body.limit as number | undefined,
    featureLabel: 'AI analyses',
    period: 'today',
  })
  return true
}
