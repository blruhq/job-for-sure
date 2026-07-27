# Implementation Spec & Plan: Auth & Performance P0/P1 Fixes

> Source audit: `specs/auth-perf-audit.md`. This plan covers P0-1, P0-2, P1-1, P1-2, P1-3.

### 0. Architectural Decision Record (ADR) & Scaling Tradeoffs

- **Context & Constraints**: The app is a Next.js 16 client-rendered SPA within the `(app)` route group. The layout component (`layout.tsx`) persists across client navigations. Better Auth's `useSession()` hook uses an in-memory nanostores atom + React `useSyncExternalStore` (bundled by better-auth, no `@nanostores/react` needed). TanStack Query v5 with provider-level defaults (`staleTime: 60s`, `refetchOnWindowFocus: false`).
- **Chosen Architecture**: (1) Replace manual `getSession()` effect with `authClient.useSession()` — fetches once, caches in memory, no re-fetch on navigation. (2) Eliminate all raw `fetch()` GET calls for server data — route through TanStack Query hooks with stable keys. (3) DB indices already present — no migration.
- **Discarded Alternatives**:
  - *SessionContext provider*: Rejected — `useSession()` already provides the same singleton cache without a wrapper component.
  - *Fetch-once + useState cache*: Rejected — doesn't handle automatic token refresh / re-auth that `useSession()` provides.
  - *Installing `@nanostores/react`*: Not needed — better-auth bundles its own React adapter using `useSyncExternalStore`.

### 1. Target Files & Folder Structure

**New files:**
- `src/app/hooks/use-user-preferences.ts` — TanStack Query hook for `/api/user/preferences`
- `src/app/hooks/use-interview-history.ts` — TanStack Query hook for `/api/ai/interview` (GET history)

**Modified files:**
- `src/app/[locale]/(app)/layout.tsx` — P0-1: Replace AuthGuard session logic
- `src/app/[locale]/(app)/cover-letter/page.tsx` — P0-2: Remove duplicate raw GET fetch
- `src/app/components/pipeline/job-detail-panel.tsx` — P1-1: Use `useUserPreferences` hook
- `src/app/[locale]/(app)/settings/page.tsx` — P1-1: Use `useUserPreferences` hook
- `src/app/components/interview/interview-view.tsx` — P1-2: Use `useInterviewHistory` hook

**No changes needed:**
- `src/app/components/layout/query-provider.tsx` — Already has `staleTime: 60_000, refetchOnWindowFocus: false`. Adequate.
- `src/app/lib/schema.ts` — DB indices already present (`session_userId_idx`, `token` unique, `resumes_userId_deletedAt_idx`). P1-3 satisfied.
- `src/app/lib/auth-client.ts` — No changes needed. `useSession` is available on the client object.

### 2. Import Definitions & Dependencies

- `authClient` from `~/lib/auth-client` — provides `useSession()` hook (no new package needed)
- `useQuery, useMutation, useQueryClient` from `@tanstack/react-query` — already installed
- `useRouter, usePathname` from `~/i18n/routing` — already used in layout
- `notify` from `~/lib/toast` — already used in components
- `InterviewSessionRow` type from `~/types/interview`
- No new npm packages required.

### 3. Database Schema Changes

**None.** Indices already present:
- `session`: `session_userId_idx` on `userId` (line 52), `token` column has `.unique()` (line 38)
- `resumes`: `resumes_userId_deletedAt_idx` on `(userId, deletedAt)` (line 205)

### 4. Step-by-Step Edits

---

#### Step 1: P0-1 — Fix AuthGuard session re-fetch loop

**File**: `src/app/[locale]/(app)/layout.tsx`

**Current problem**: The `AuthGuard` component has a `useEffect` with deps `[router, pathname]` that calls `authClient.getSession()` on every navigation. This causes 8+ network requests to `/api/auth/get-session`.

**Fix**: Replace with `authClient.useSession()` hook.

Replace the ENTIRE `AuthGuard` function (lines 16-93) with:

```tsx
function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, isPending } = authClient.useSession()

  // Redirect to login if session is missing after initial load completes.
  // useSession() caches the session in memory — this does NOT re-fetch
  // on client navigations within the (app) route group.
  useEffect(() => {
    if (!isPending && !session) {
      router.replace('/login')
    }
  }, [isPending, session, router])

  // Role-based routing + PostHog identify.
  // Reads the CACHED session from useSession() — no network call.
  // Only reacts to pathname changes for role enforcement.
  useEffect(() => {
    if (isPending || !session) return

    // Identify user in PostHog (with plan for segmentation)
    try {
      const plan = (session.user as { plan?: string }).plan ?? 'free'
      import('posthog-js').then(({ default: posthog }) => {
        posthog.identify(session.user.id, {
          email: session.user.email,
          name: session.user.name,
          plan,
        })
      }).catch(() => {
        // PostHog not loaded yet — skip
      })
    } catch {
      // PostHog not loaded yet — skip
    }

    // Role-based routing
    const stripped = pathname || '/'
    const isAdmin = (session.user as { role?: string }).role === 'admin'

    if (isAdmin && !ADMIN_ALLOWED.has(stripped)) {
      router.replace('/admin')
      return
    }
    if (!isAdmin && stripped === '/admin') {
      router.replace('/chat')
      return
    }
  }, [session, pathname, router, isPending])

  if (isPending || !session) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 neuro-surface">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-[3px]" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: '0ms' }} />
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: '150ms' }} />
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">Verifying session…</span>
      </div>
    )
  }

  return <>{children}</>
}
```

**Key changes**:
1. `const { data: session, isPending } = authClient.useSession()` replaces manual `getSession()` + `useState(checked)`.
2. Two separate effects: one for login redirect, one for role routing + PostHog. Neither makes a network call on navigation.
3. The `isPending` flag is true only on the very first mount. After session resolves, it stays false. Navigation within `(app)` does NOT reset it because the layout component persists.
4. The loading skeleton shows when `isPending || !session` (covers both initial load and redirect-in-progress).

**Also update the imports** (line 3): Remove `useState` if no longer used elsewhere in the file. Check: `useState` is NOT used elsewhere in this file after the AuthGuard change. The `AppShell` and `AppLayout` functions don't use `useState`. So change line 3 from:
```tsx
import { useEffect, useState } from 'react'
```
to:
```tsx
import { useEffect } from 'react'
```

---

#### Step 2: P1-1 — Create `useUserPreferences` hook

**New file**: `src/app/hooks/use-user-preferences.ts`

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface UserPreferences {
  emailNotifications: boolean
  weeklyDigest: boolean
  marketingEmails: boolean
  homeLocation: string | null
}

/**
 * Fetch user preferences via TanStack Query.
 * Replaces raw fetch('/api/user/preferences') calls in job-detail-panel and settings page.
 * staleTime: 5 minutes — preferences change rarely.
 */
export function useUserPreferences() {
  return useQuery({
    queryKey: ['user-preferences'],
    queryFn: async (): Promise<UserPreferences | null> => {
      const res = await fetch('/api/user/preferences')
      if (!res.ok) return null
      return res.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Update user preferences. Invalidates the query cache on success.
 */
export function useUpdateUserPreferences() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<UserPreferences>): Promise<UserPreferences | null> => {
      const res = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to update preferences')
      return res.ok ? res.json() : null
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] })
    },
  })
}
```

---

#### Step 3: P1-1 — Update `job-detail-panel.tsx` to use `useUserPreferences`

**File**: `src/app/components/pipeline/job-detail-panel.tsx`

1. Add import at top (after existing imports, around line 22):
```tsx
import { useUserPreferences } from '~/hooks/use-user-preferences'
```

2. Inside `JobDetailPanel` component (after line 64, where `useUpdateApplication` is called), add:
```tsx
  const { data: prefsData } = useUserPreferences()
```

3. Replace the raw fetch useEffect (lines 70-78):
```tsx
  // ── Load home location from user preferences ──
  useEffect(() => {
    fetch('/api/user/preferences')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.homeLocation) setHomeLocation(data.homeLocation)
      })
      .catch(() => {})
  }, [])
```
Replace with:
```tsx
  // ── Sync home location from cached user preferences ──
  useEffect(() => {
    if (prefsData?.homeLocation) setHomeLocation(prefsData.homeLocation)
  }, [prefsData])
```

4. The `onHomeLocationChange` handler (lines 297-309) does a raw PUT to `/api/user/preferences`. After the PUT succeeds, invalidate the query so the cache stays fresh. Add at top of component:
```tsx
  const queryClient = useQueryClient()
```
Wait — better approach: use the `useUpdateUserPreferences` mutation hook. But the handler also sets local state immediately. Let's keep the raw PUT but add invalidation:

Actually, simplest approach: import `useQueryClient` and invalidate after the PUT. Add import:
```tsx
import { useQueryClient } from '@tanstack/react-query'
```
Add inside component:
```tsx
  const queryClient = useQueryClient()
```
Then in the `onHomeLocationChange` callback (around line 297-309), after the `fetch PUT` succeeds, add:
```tsx
              queryClient.invalidateQueries({ queryKey: ['user-preferences'] })
```

The full updated `onHomeLocationChange` callback:
```tsx
            onHomeLocationChange={async (location) => {
              setHomeLocation(location)
              try {
                await fetch('/api/user/preferences', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ homeLocation: location || null }),
                })
                queryClient.invalidateQueries({ queryKey: ['user-preferences'] })
              } catch {
                console.error('Failed to save home location')
                notify({ message: 'Failed to save home location', type: 'error' })
              }
            }}
```

---

#### Step 4: P1-1 — Update `settings/page.tsx` to use `useUserPreferences`

**File**: `src/app/[locale]/(app)/settings/page.tsx`

1. Add import at top (after line 10):
```tsx
import { useUserPreferences } from '~/hooks/use-user-preferences'
```

2. Inside `SettingsPage` component (after line 70, the `useNotify` call), add:
```tsx
  const { data: prefsData } = useUserPreferences()
```

3. Replace the preferences loading inside the `load()` function (lines 105-112). The current code:
```tsx
      try {
        const res = await fetch('/api/user/preferences')
        if (res.ok) {
          const data = await res.json()
          setPrefs(data)
          setHomeLocation(data.homeLocation || '')
        }
      } catch { notify('Failed to load settings', 'error') }
```
Replace with: remove this block entirely. Instead, add a separate `useEffect` that syncs from the hook data:
```tsx
  // Sync preferences from TanStack Query cache
  useEffect(() => {
    if (prefsData) {
      setPrefs(prefsData)
      setHomeLocation(prefsData.homeLocation || '')
    }
  }, [prefsData])
```

The `load()` function should now ONLY handle session loading and set `loading` to false. Keep the session part (lines 93-103) but the `setLoading(false)` at line 114 should be moved OUTSIDE the try block or kept at the end of `load()`.

Actually, simplest: keep the `load()` function for session only, and add the prefs sync effect. The `setLoading(false)` at line 114 stays.

4. The `handleTogglePref`, `handleSaveHomeLocation`, and `handleDetectLocation` functions all do raw PUT to `/api/user/preferences`. After each succeeds, invalidate the query. Add:
```tsx
import { useQueryClient } from '@tanstack/react-query'
```
Inside component:
```tsx
  const queryClient = useQueryClient()
```
Then in `handleTogglePref` (after the PUT succeeds, around line 196), add:
```tsx
        queryClient.invalidateQueries({ queryKey: ['user-preferences'] })
```
In `handleSaveHomeLocation` (after `res.ok` check, around line 216), add:
```tsx
        queryClient.invalidateQueries({ queryKey: ['user-preferences'] })
```
In `handleDetectLocation` (after `res.ok` check, around line 238), add:
```tsx
        queryClient.invalidateQueries({ queryKey: ['user-preferences'] })
```

---

#### Step 5: P1-2 — Create `useInterviewHistory` hook

**New file**: `src/app/hooks/use-interview-history.ts`

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { InterviewSessionRow } from '~/types/interview'

/**
 * Fetch interview session history via TanStack Query.
 * Replaces raw fetch('/api/ai/interview') in interview-view.tsx.
 */
export function useInterviewHistory() {
  return useQuery({
    queryKey: ['interview-history'],
    queryFn: async (): Promise<InterviewSessionRow[]> => {
      const res = await fetch('/api/ai/interview')
      if (!res.ok) throw new Error('Failed to fetch interview history')
      return res.json()
    },
  })
}

/**
 * Delete an interview session. Invalidates history query on success.
 */
export function useDeleteInterviewSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await fetch(`/api/ai/interview/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || 'Failed to delete session')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-history'] })
    },
  })
}
```

---

#### Step 6: P1-2 — Update `interview-view.tsx` to use `useInterviewHistory`

**File**: `src/app/components/interview/interview-view.tsx`

1. Add imports at top (after line 10):
```tsx
import { useInterviewHistory } from '~/hooks/use-interview-history'
import { useQueryClient } from '@tanstack/react-query'
```

2. Inside `InterviewView` component (after line 13, where `useActiveResume` is called), replace the history state management:

**Remove** these lines (18-22):
```tsx
  // History states
  const [history, setHistory] = useState<InterviewSessionRow[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [selectedPastSession, setSelectedPastSession] = useState<InterviewSessionRow | null>(null)
```

**Remove** the `fetchHistory` function (lines 25-38) entirely.

**Remove** the `useEffect` that calls `fetchHistory()` (lines 40-42).

**Add** in their place:
```tsx
  const queryClient = useQueryClient()
  const { data: history = [], isLoading: loadingHistory } = useInterviewHistory()
  const [selectedPastSession, setSelectedPastSession] = useState<InterviewSessionRow | null>(null)
```

3. In `handleEndSession` (line 50-83), after the successful POST save (after line 77 `notify(...)`), replace `fetchHistory()` call (line 78) with:
```tsx
      queryClient.invalidateQueries({ queryKey: ['interview-history'] })
```

4. In the `InterviewSetup` props (line 104), the `onDeleteSession` prop is currently `fetchHistory`. Since `useInterviewHistory` now manages the data via TanStack Query, the delete handler in `interview-setup.tsx` needs to invalidate the query. 

**Option A (simpler, less invasive)**: Pass a callback that invalidates the query:
```tsx
            onDeleteSession={() => queryClient.invalidateQueries({ queryKey: ['interview-history'] })}
```

This works because `interview-setup.tsx` already calls `onDeleteSession?.()` after the DELETE succeeds (line 384). The actual DELETE fetch is in `interview-setup.tsx`. After it completes, it calls `onDeleteSession`, which will now invalidate the query, causing the history list to refetch automatically.

5. Clean up unused imports: `InterviewSessionRow` type may still be needed for `selectedPastSession` state type. Keep it. But `useEffect` import might become unused — check. `useEffect` is imported from React (line 3). After removing the `fetchHistory` useEffect, check if `useEffect` is used elsewhere. Looking at the file — `useEffect` is only used for the `fetchHistory` call. Wait, let me re-check... Actually `useState` is still used for `phase`, `config`, `exchanges`, `selectedPastSession`. And `useEffect` — after removing the fetchHistory effect, is it used anywhere else? Looking at the component, no. But `Suspense` is still used (line 3, line 94). 

Actually, looking more carefully at line 3: `import { useState, useEffect, Suspense } from 'react'`. After removing the `useEffect` for fetchHistory, `useEffect` is no longer used in this file. Remove it from the import:
```tsx
import { useState, Suspense } from 'react'
```

---

#### Step 7: P0-2 — Remove duplicate cover-letters GET in cover-letter page

**File**: `src/app/[locale]/(app)/cover-letter/page.tsx`

**Problem**: This page has BOTH a raw `fetch('/api/cover-letters')` GET (lines 60-73) AND `useCoverLetters()` hook (line 76). This causes 2x network calls for the same data.

**Fix**: Remove the raw GET fetch. Derive `savedLetters` from the TanStack Query data.

1. Add `useQueryClient` import (line 3 area):
```tsx
import { useQueryClient } from '@tanstack/react-query'
```

2. Inside the component (after line 24, where `useCreateResume` is), add:
```tsx
  const queryClient = useQueryClient()
```

3. **Remove** the `savedLetters` state (lines 39-45):
```tsx
  const [savedLetters, setSavedLetters] = useState<Array<{...}>>([])
```

4. **Remove** the raw fetch useEffect (lines 60-73):
```tsx
  // Fetch saved cover letters
  useEffect(() => {
    async function loadLetters() { ... }
    loadLetters()
  }, [])
```

5. The existing hook call (line 76) stays:
```tsx
  const { data: coverLettersData = [] } = useCoverLetters()
```

6. **Derive** `savedLetters` from `coverLettersData`. After line 76, add:
```tsx
  const savedLetters = coverLettersData.map((l) => ({
    id: l.id,
    company: l.company ?? null,
    role: l.role ?? null,
    content: l.content ?? '',
    createdAt: l.createdAt ?? new Date().toISOString(),
  }))
```

7. In `handleGenerate` (line 134-187), after successful generation (after line 177), replace the local `setSavedLetters` update (lines 166-176) with query invalidation:
Remove lines 166-176 (the `setSavedLetters(prev => ...)` block). Instead, after the `notify` on line 177, add:
```tsx
        queryClient.invalidateQueries({ queryKey: ['cover-letters'] })
```
Also, keep the `setActiveLetterId(data.id)` and `setLetterText(data.letter)` calls — those are local UI state, not server data.

Wait, let me be more precise. The current generate success block (lines 161-180):
```tsx
      const data = await res.json()
      if (data.letter) {
        setLetterText(data.letter)
        // Add to saved letters list
        if (data.id) {
          setActiveLetterId(data.id)
          setSavedLetters(prev => [
            {
              id: data.id,
              company: mode === 'quick' ? company : null,
              role: mode === 'quick' ? role : null,
              content: data.letter,
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ])
        }
        notify({ message: 'Cover letter generated & saved!', type: 'success' })
      } else {
        throw new Error('No letter content returned')
      }
```

Replace with:
```tsx
      const data = await res.json()
      if (data.letter) {
        setLetterText(data.letter)
        if (data.id) {
          setActiveLetterId(data.id)
        }
        queryClient.invalidateQueries({ queryKey: ['cover-letters'] })
        notify({ message: 'Cover letter generated & saved!', type: 'success' })
      } else {
        throw new Error('No letter content returned')
      }
```

8. In `handleSave` (lines 189-231), after successful PATCH or POST, add invalidation. After line 230 (`notify`), add:
```tsx
    queryClient.invalidateQueries({ queryKey: ['cover-letters'] })
```
Actually, the `notify` is at line 230 and it's the last statement before the function ends. Add invalidation before the notify:
```tsx
    queryClient.invalidateQueries({ queryKey: ['cover-letters'] })
    notify({ message: 'Cover letter saved successfully!', type: 'success' })
```

9. In the delete confirmation `onConfirm` handler (lines 527-548), after successful DELETE (line 536), replace the local state update with invalidation. 

Current (lines 536-541):
```tsx
            setSavedLetters(prev => prev.filter(l => l.id !== deleteTarget))
            if (activeLetterId === deleteTarget) {
              setActiveLetterId(null)
              setLetterText('')
            }
            setDeleteTarget(null)
```

Replace `setSavedLetters(...)` with invalidation:
```tsx
            queryClient.invalidateQueries({ queryKey: ['cover-letters'] })
            if (activeLetterId === deleteTarget) {
              setActiveLetterId(null)
              setLetterText('')
            }
            setDeleteTarget(null)
```

10. The `handleLoadSaved` function (line 233-238) uses `letter.id, letter.content, letter.company, letter.role` — these fields are still available from `savedLetters` derived from `coverLettersData`. No changes needed.

11. Check if `useEffect` is still needed. After removing the raw fetch useEffect (lines 60-73), the remaining useEffects are:
- Lines 53-57: Sync `selectedResumeId` — still needed
- Lines 78-93: Sync letter text from cover letters — still needed
So `useEffect` stays in the import.

### 4.5 Vertical-Slice Order

Execute steps in this order for testable vertical slices:

1. **Step 2** (create `use-user-preferences.ts`) — standalone hook, no consumers yet
2. **Step 5** (create `use-interview-history.ts`) — standalone hook, no consumers yet
3. **Step 1** (fix AuthGuard) — P0, can be tested by navigating between pages and checking Network tab for zero extra `get-session` calls
4. **Step 7** (fix cover-letter page) — P0, can be tested by visiting cover-letter page and checking for single `/api/cover-letters` call
5. **Steps 3+4** (wire up preferences hook) — P1, can be tested by visiting job detail panel and settings page
6. **Step 6** (wire up interview history hook) — P1, can be tested by visiting interview page and checking for cached history

### 5. Assertion & Testing Requirements

- **Unit Tests**: N/A — no business logic changes. These are data-fetching refactors.
- **Integration Tests**: N/A — no API contract changes.
- **E2E UI Tests**: N/A for this scope.
- **Manual verification** (reason about, don't need to run):
  - Navigate `/en/chat` → `/en/resumes` → `/en/cover-letter` — should trigger ZERO extra `get-session` calls after initial load
  - Visit `/en/cover-letter` — should trigger exactly ONE `/api/cover-letters` call
  - Visit job detail panel — preferences loaded from cache, no raw fetch
  - Visit `/en/settings` — preferences loaded from cache, no raw fetch
  - Visit `/en/interview` — history loaded via TanStack Query, no raw fetch

### 6. Verification Commands & Log Files

- **Build**: `pnpm build`
- **TypeScript check**: `npx tsc --noEmit`
- **Lint**: `pnpm lint`
- **Unit tests**: `pnpm test`
- **Dev server log**: `.dev-server.log` (already exists in worktree root)
- **Failure inspection**: If `tsc --noEmit` fails, check for unused imports (`useState`, `useEffect`, `InterviewSessionRow`) in modified files. If lint fails, check for `react-hooks/exhaustive-deps` warnings in the new effects.
