# PLAN: PostHog Monitoring Integration

> **For the implementing agent:** Follow every step in order. Do NOT skip steps. Do NOT improvise. Copy code EXACTLY as written. Ask if confused — do not guess.

---

## Overview

Add PostHog monitoring to the Job For Sure Next.js app. This covers:
- Client-side analytics (autocapture ON)
- Session replay (ON by default)
- Error tracking (ON by default)
- 8 manual custom events
- User identification

**Packages:** `posthog-js` (client) + `posthog-node` (server API routes)
**Region:** US (`https://us.i.posthog.com`)

---

## Step 1 — Install packages

Run this exact command:

```bash
pnpm add posthog-js posthog-node
```

Verify both are in `package.json` dependencies before proceeding.

---

## Step 2 — Add env vars

### File: `.env.example`

Append these lines at the end of the file:

```
# ── PostHog (Analytics + Error Tracking + Session Replay) ──
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### File: `.env.local`

Append these lines at the end of the file (user will fill in the token):

```
# PostHog
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

**IMPORTANT:** Do NOT add the token value. Leave it empty. The user will fill it in.

---

## Step 3 — Create `instrumentation-client.ts` (PROJECT ROOT)

Create file at: `/Users/pantorn/satori/projects/job-for-sure/instrumentation-client.ts`

This goes NEXT TO `next.config.ts` — NOT inside `app/`.

Exact content:

```ts
import posthog from 'posthog-js'

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
  defaults: '2026-05-30',
})
```

That's it. Autocapture is ON. Session replay is ON. Error tracking is ON. All by default.

---

## Step 4 — Create server-side PostHog helper

Create file at: `app/lib/posthog-server.ts`

Exact content:

```ts
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
```

---

## Step 5 — Add user identification in AuthGuard

### File: `app/(app)/layout.tsx`

In the `AuthGuard` function, the `check()` function currently looks like this (lines ~17-34):

```ts
    async function check() {
      try {
        const { authClient } = await import('~/lib/auth-client')
        const { data: session } = await authClient.getSession()
        if (!cancelled) {
          if (session) {
            setChecked(true)
            return
          }
          router.replace('/login')
        }
      } catch {
        // Auth not configured or API unavailable
        if (!cancelled) {
          router.replace('/login')
        }
      }
    }
```

CHANGE the `if (session)` block to identify the user in PostHog:

```ts
        if (!cancelled) {
          if (session) {
            // Identify user in PostHog
            try {
              const posthog = (await import('posthog-js')).default
              posthog.identify(session.user.id, {
                email: session.user.email,
                name: session.user.name,
              })
            } catch {
              // PostHog not loaded yet — skip
            }
            setChecked(true)
            return
          }
          router.replace('/login')
        }
```

**What changed:** Added `posthog.identify()` call between `if (session) {` and `setChecked(true)`.

---

## Step 6 — Track `user_signed_up` in register page

### File: `app/(auth)/register/page.tsx`

In the `handleRegister` function, find this block (around line 22-26):

```ts
      const { data, error: authError } = await authClient.signUp.email({ name, email, password })
      if (authError) {
        setError(authError.message || 'Registration failed')
      } else if (data) {
        router.push('/dashboard')
      }
```

CHANGE to:

```ts
      const { data, error: authError } = await authClient.signUp.email({ name, email, password })
      if (authError) {
        setError(authError.message || 'Registration failed')
      } else if (data) {
        try {
          const posthog = (await import('posthog-js')).default
          posthog.identify(data.user.id, { email, name })
          posthog.capture('user_signed_up', { method: 'email' })
        } catch {
          // PostHog not loaded — skip
        }
        router.push('/dashboard')
      }
```

---

## Step 7 — Track `user_signed_in` in login page

### File: `app/(auth)/login/page.tsx`

In the `handleLogin` function, find this block (around line 22-26):

```ts
      const { data, error: authError } = await authClient.signIn.email({ email, password })
      if (authError) {
        setError(authError.message || 'Invalid credentials')
      } else if (data) {
        router.push('/dashboard')
      }
```

CHANGE to:

```ts
      const { data, error: authError } = await authClient.signIn.email({ email, password })
      if (authError) {
        setError(authError.message || 'Invalid credentials')
      } else if (data) {
        try {
          const posthog = (await import('posthog-js')).default
          posthog.identify(data.user.id, { email })
          posthog.capture('user_signed_in', { method: 'email' })
        } catch {
          // PostHog not loaded — skip
        }
        router.push('/dashboard')
      }
```

---

## Step 8 — Track `resume_uploaded` (server-side)

### File: `app/api/parse-resume/route.ts`

**Step A:** Add import at top of file, after existing imports:

```ts
import { captureServerEvent } from '~/lib/posthog-server'
```

Add it after the `import { z } from 'zod'` line.

**Step B:** Find the successful response line (around line 92):

```ts
    return NextResponse.json(parsed)
```

CHANGE to:

```ts
    await captureServerEvent(user.id, 'resume_uploaded')
    return NextResponse.json(parsed)
```

---

## Step 9 — Track `chat_message_sent` (server-side)

### File: `app/api/chat/route.ts`

**Step A:** Add import after `import { NextResponse } from 'next/server'`:

```ts
import { captureServerEvent } from '~/lib/posthog-server'
```

**Step B:** Find this block (around line 46-51):

```ts
  return streamWithFailover({
    system: systemPrompt,
    messages,
    temperature: 0.7,
    maxOutputTokens: 1024,
  })
```

ADD capture event BEFORE the return:

```ts
  await captureServerEvent(user.id, 'chat_message_sent')

  return streamWithFailover({
    system: systemPrompt,
    messages,
    temperature: 0.7,
    maxOutputTokens: 1024,
  })
```

---

## Step 10 — Track `cover_letter_created` (server-side)

### File: `app/api/ai/cover-letter/route.ts`

**Step A:** Add import after `import { headers } from 'next/headers'`:

```ts
import { captureServerEvent } from '~/lib/posthog-server'
```

**Step B:** Find this line (around line 63):

```ts
    return NextResponse.json({ letter: text.trim() })
```

CHANGE to:

```ts
    await captureServerEvent(user.id, 'cover_letter_created', { company, role })
    return NextResponse.json({ letter: text.trim() })
```

---

## Step 11 — Track `interview_started` (server-side)

### File: `app/api/ai/interview/route.ts`

**Step A:** Add import after `import { z } from 'zod'`:

```ts
import { captureServerEvent } from '~/lib/posthog-server'
```

**Step B:** Find the `if (action === 'question')` block (around line 65-130). Find the successful response at the end of that block (around line 130):

```ts
      return NextResponse.json(result)
```

**IMPORTANT:** There are MULTIPLE `return NextResponse.json(result)` lines in this file. You must find the one INSIDE the `if (action === 'question')` block (the FIRST one, around line 130). Change it to:

```ts
      await captureServerEvent(user.id, 'interview_started', { company, role, type, difficulty })
      return NextResponse.json(result)
```

---

## Step 12 — Track `job_searched` (server-side)

### File: `app/api/jobs/search/route.ts`

**Step A:** Add import after `import { headers } from 'next/headers'`:

```ts
import { captureServerEvent } from '~/lib/posthog-server'
```

**Step B:** Find this line (around line 42):

```ts
    return NextResponse.json(result)
```

CHANGE to:

```ts
    await captureServerEvent(user.id, 'job_searched', { query, location })
    return NextResponse.json(result)
```

---

## Step 13 — Track `pipeline_updated` (server-side)

### File: `app/api/pipeline/route.ts`

**Step A:** Add import after `import { headers } from 'next/headers'`:

```ts
import { captureServerEvent } from '~/lib/posthog-server'
```

**Step B:** Find the POST handler's success response (around line 46):

```ts
  return NextResponse.json({ success: true })
```

CHANGE to:

```ts
  await captureServerEvent(user.id, 'pipeline_updated')
  return NextResponse.json({ success: true })
```

---

## Step 14 — Track `job_scraped` (server-side)

### File: `app/api/scrape/route.ts`

**Step A:** Add import after `import { headers } from 'next/headers'`:

```ts
import { captureServerEvent } from '~/lib/posthog-server'
```

**Step B:** Find this line (around line 24):

```ts
    return NextResponse.json(result)
```

CHANGE to:

```ts
    await captureServerEvent(user.id, 'job_scraped')
    return NextResponse.json(result)
```

---

## Step 15 — Verify build

Run:

```bash
pnpm build
```

If there are TypeScript errors, fix them. Common issues:
- `Cannot find module 'posthog-js'` → package not installed, re-run `pnpm add posthog-js posthog-node`
- `Cannot find module '~/lib/posthog-server'` → file not created at correct path

---

## Step 16 — Test locally

1. Ask the user to fill in `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` in `.env.local`
2. Run `pnpm dev`
3. Open browser, go to `http://localhost:3000`
4. Open PostHog dashboard in another tab
5. Verify:
   - Page view events appear in PostHog Activity
   - Sign up → `user_signed_up` event appears
   - Send a chat → `chat_message_sent` appears
   - Any console errors → appear in PostHog Error Tracking

---

## Step 17 — Git commit + push

```bash
git add -A
git commit -m "feat: add PostHog analytics, error tracking, and session replay

- Install posthog-js + posthog-node
- Add instrumentation-client.ts for client-side init
- Add posthog-server.ts helper for API route events
- Track 8 key events: signup, signin, resume upload, chat,
  cover letter, interview, job search, pipeline update, job scrape
- Identify users in AuthGuard after session check
- Autocapture ON, session replay ON, error tracking ON"
git push
```

---

## Summary of all files

| # | File | Action |
|---|------|--------|
| 1 | `package.json` | Auto-updated by pnpm add |
| 2 | `.env.example` | Append 2 env vars |
| 3 | `.env.local` | Append 2 env vars (empty token) |
| 4 | `instrumentation-client.ts` (root) | **CREATE** — PostHog init |
| 5 | `app/lib/posthog-server.ts` | **CREATE** — Server helper |
| 6 | `app/(app)/layout.tsx` | MODIFY — Add identify in AuthGuard |
| 7 | `app/(auth)/register/page.tsx` | MODIFY — Add capture + identify |
| 8 | `app/(auth)/login/page.tsx` | MODIFY — Add capture + identify |
| 9 | `app/api/parse-resume/route.ts` | MODIFY — Add capture |
| 10 | `app/api/chat/route.ts` | MODIFY — Add capture |
| 11 | `app/api/ai/cover-letter/route.ts` | MODIFY — Add capture |
| 12 | `app/api/ai/interview/route.ts` | MODIFY — Add capture |
| 13 | `app/api/jobs/search/route.ts` | MODIFY — Add capture |
| 14 | `app/api/pipeline/route.ts` | MODIFY — Add capture |
| 15 | `app/api/scrape/route.ts` | MODIFY — Add capture |

**Total: 2 new files, 13 modified files, 2 packages installed.**

---

## Events tracked

| Event | Where | Side |
|-------|-------|------|
| `user_signed_up` | register/page.tsx | Client |
| `user_signed_in` | login/page.tsx | Client |
| `resume_uploaded` | api/parse-resume/route.ts | Server |
| `chat_message_sent` | api/chat/route.ts | Server |
| `cover_letter_created` | api/ai/cover-letter/route.ts | Server |
| `interview_started` | api/ai/interview/route.ts | Server |
| `job_searched` | api/jobs/search/route.ts | Server |
| `pipeline_updated` | api/pipeline/route.ts | Server |
| `job_scraped` | api/scrape/route.ts | Server |
| `$identify` | (app)/layout.tsx AuthGuard | Client |
| Autocapture (all clicks/views) | instrumentation-client.ts | Client |
| Session replay | instrumentation-client.ts | Client |
| Error tracking | instrumentation-client.ts | Client |

---

## DO NOT DO

- Do NOT create a PostHogProvider wrapper component — the `instrumentation-client.ts` pattern replaces it in Next.js 16
- Do NOT add posthog-node to `instrumentation.ts` — we use it directly in API routes
- Do NOT fill in the PostHog token value — leave it empty for the user
- Do NOT add feature flags, A/B tests, or surveys — not needed yet
- Do NOT modify any existing logic — only ADD tracking code
- Do NOT remove or change existing imports — only ADD new imports
- Do NOT touch `.env.local` existing values — only append new vars
