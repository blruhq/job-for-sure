import { PostHog } from 'posthog-node'

let client: PostHog | null = null

function getPostHog() {
  if (!client) {
    client = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
      flushAt: 1,
      flushInterval: 0,
    })
  }
  return client
}

/**
 * Capture a server-side event in an API route.
 * Call this AFTER a successful operation, right before returning the response.
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
    const ph = getPostHog()
    ph.capture({ distinctId, event, properties })
    await ph.shutdown()
  } catch {
    // Silently fail — analytics should never break the app
  }
}
