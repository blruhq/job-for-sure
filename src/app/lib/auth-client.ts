import { createAuthClient } from 'better-auth/client'
import { adminClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  // Use the current origin in the browser — works for any domain.
  // On the server (SSR), fall back to the BETTER_AUTH_URL env var.
  baseURL: typeof window !== 'undefined'
    ? window.location.origin
    : process.env.BETTER_AUTH_URL,
  plugins: [adminClient()],
})
