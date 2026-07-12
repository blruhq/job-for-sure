import { PostHog } from 'posthog-node'

let client: PostHog | null = null

function getPostHog(): PostHog {
  if (!client) {
    client = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
      flushAt: 20,
      flushInterval: 10_000,
    })
  }
  return client
}

/**
 * Capture a server-side event in an API route.
 * Call this AFTER a successful operation, right before returning the response.
 *
 * The client is a singleton — do NOT call shutdown() after each event.
 * On Vercel serverless, the runtime flushes the buffer on beforeExit.
 *
 * @example
 * await captureServerEvent(user.id, 'chat_message_sent')
 */
export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
) {
  try {
    getPostHog().capture({ distinctId, event, properties })
  } catch {
    // Silently fail — analytics should never break the app
  }
}

/**
 * Capture a server-side exception (like Sentry).
 * Use this in API route catch blocks.
 *
 * @example
 * } catch (error) {
 *   await captureServerError(user?.id ?? 'anonymous', error, { route: '/api/chat' })
 *   return NextResponse.json({ error: 'Failed' }, { status: 500 })
 * }
 */
export async function captureServerError(
  distinctId: string,
  error: unknown,
  properties?: Record<string, unknown>,
) {
  try {
    getPostHog().captureException(error, distinctId, properties)
  } catch {
    // Silently fail — error tracking should never break the app
  }
}
