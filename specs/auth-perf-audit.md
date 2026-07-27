# Auth & Performance Audit — Production Best Practice Comparison

## Executive Summary
This document audits the session management, feature gating, loading states, and API query performance of **Job For Sure** against production Next.js + Better Auth standards.

The observed server log anomalies (multiple duplicate calls to `/api/auth/get-session`, `/api/cover-letters`, `/api/user/preferences`, and slow 5.7s/6.6s endpoints) are caused by a combination of:
1. **Client-side auth guard re-evaluating on every client navigation** using un-cached session calls.
2. **Missing TanStack Query hooks** for raw `fetch('/api/user/preferences')` causing un-cached component re-fetching.
3. **Multiple components mounting duplicate hooks/queries** (`useCoverLetters` called in dashboard, editor, and cover-letter pages without shared store boundaries).
4. **Neon Serverless HTTP latency / cold connections** on uncached endpoint hits in development mode (`pnpm dev`).
5. **Interview route double-trigger / lack of client-side pre-flight limit check** before navigating or starting a session.

---

## 1. Current State Assessment

### What's Done Well
- **Middleware Guard (`src/proxy.ts`)**: Fast, lightweight session-cookie presence check (`getSessionCookie(request)`). Prevents unauthenticated page HTML from rendering before redirecting.
- **Server API Defense (`withAuth`)**: Uses `getSessionUser()` on every API route handler. Handles CSRF via origin checks and rate limiting via Upstash Redis.
- **Atomic Quota Gating (`src/app/lib/plan.ts`)**: Uses Redis `INCR` for atomic quota claiming to prevent TOCTOU race conditions under parallel requests.
- **Drizzle Database Adapter**: Properly configured with Better Auth for persistent session management.

### What Needs Improvement
- **`AuthGuard` (`src/app/[locale]/(app)/layout.tsx`)**: Re-runs `authClient.getSession()` on EVERY client-side route navigation (`useEffect` depends on `[router, pathname]`). Because `getSession()` makes an HTTP network request to `/api/auth/get-session`, changing routes inside the app triggers 1 session check per page transition.
- **Raw `fetch()` calls bypassing TanStack Query**: `/api/user/preferences` is fetched via raw `fetch()` inside `job-detail-panel.tsx` and `settings/page.tsx`. Without Query Caching, every render/interaction refetches it.
- **Interview Flow Guards**: Interview page checks history upon mount (`fetchHistory()`), but quota (`gateFeature('interview')`) is only checked on the server when the user clicks "Start Mock Interview". The client UI does not disable the start button or show remaining quota before initiating an AI request.
- **Query Cache Invalidation Patterns**: `useCoverLetters` and `useResumes` use default `staleTime: 60_000`, but when components unmount and remount during tab switching, if GC time or invalidation triggers, re-fetches occur.
- **Database Latency in Dev**: Neon HTTP serverless driver creates a new HTTP connection per query when not pooled or when running cold in dev mode (`pnpm dev`).

---

## 2. Production Best Practice Comparison

| Feature Area | Current Job For Sure Pattern | Production Best Practice Standard | Gap / Recommendation |
|--------------|------------------------------|-----------------------------------|----------------------|
| **Session Verification** | Client-side `AuthGuard` calls `authClient.getSession()` on every pathname change in layout. | **Context Provider + Session Cache**: Fetch session ONCE at root/app mount or pass session from RSC / Middleware header. Use `authClient.useSession()` React hook which caches in memory. | **High**: Replace manual `useEffect` `getSession()` with Better Auth's `useSession()` hook or a SessionContext provider. |
| **Route Security** | Proxy checks cookie presence; AuthGuard verifies full session in browser. | **Dual Layer**: Proxy/Middleware checks session cookie; Server Components / API handlers call `requireUser()`. Browser uses cached session context. | **Moderate**: AuthGuard should only check session if status is `idle`/`unauthenticated`, not on every internal navigation. |
| **Subscription & Limit Checks** | Route handler gates request (`gateFeature`). Client UI doesn't know quota until server responds with 402. | **Client Pre-Flight + Server Enforcement**: Expose limit status via TanStack Query (`useUserLimits()`). Disable UI buttons or show remaining credits BEFORE action. Server remains source of truth. | **High**: Add `useUserLimits()` hook so Interview, Cover Letter, and Chat components render quota badges and block action client-side. |
| **Data Fetching Consistency** | Mix of TanStack Query (`useResumes`, `useCoverLetters`) and direct `fetch()` (`/api/user/preferences`, `/api/ai/interview` history). | **100% TanStack Query**: All GET requests MUST go through TanStack Query hooks. No raw `fetch()` in `useEffect`. | **High**: Convert `/api/user/preferences` and `/api/ai/interview` history to dedicated TanStack Query hooks (`useUserPreferences`, `useInterviewHistory`). |
| **Dev vs Prod Performance** | Dev server (`pnpm dev`) re-compiles routes on demand; Neon HTTP connection latency adds 500ms-2s per query. | Cold start & route compilation are normal in Next.js dev. Database queries should be batched; session reads should leverage session token caching. | **Info**: Acknowledge dev overhead, but reduce query count by eliminating redundant calls. |

---

## 3. Bugs Found

1. **`AuthGuard` Excess Re-fetching (`src/app/[locale]/(app)/layout.tsx:21-73`)**
   - **File**: `src/app/[locale]/(app)/layout.tsx`
   - **Bug**: `useEffect` dependencies `[router, pathname]` cause `check()` to execute on every single route change, triggering `/api/auth/get-session` repeatedly.
   - **Fix**: Remove `pathname` dependency or use Better Auth's `useSession()` hook which deduplicates and caches the session state.

2. **Interview History Raw Fetch & Double Trigger (`src/app/components/interview/interview-view.tsx:25-42`)**
   - **File**: `src/app/components/interview/interview-view.tsx`
   - **Bug**: `fetchHistory()` is called inside a raw `useEffect` without cancellation or query caching. Also re-called on session save and session delete without updating TanStack Query cache.
   - **Fix**: Refactor to `useInterviewHistory()` TanStack Query hook with automatic invalidation.

3. **Uncached User Preferences (`src/app/components/pipeline/job-detail-panel.tsx:72`, `src/app/[locale]/(app)/settings/page.tsx:106`)**
   - **File**: `src/app/components/pipeline/job-detail-panel.tsx`, `src/app/[locale]/(app)/settings/page.tsx`
   - **Bug**: Directly calling `fetch('/api/user/preferences')` in components instead of using TanStack Query.
   - **Fix**: Create `useUserPreferences()` hook in `src/app/hooks/use-user-preferences.ts`.

4. **Missing Quota Pre-Check in Interview Setup (`src/app/components/interview/interview-setup.tsx:96-131`)**
   - **File**: `src/app/components/interview/interview-setup.tsx`
   - **Bug**: User can click "Start Mock Interview" even if weekly interview quota (3/week for Free tier) is exhausted. The request hits the AI server route before returning 402.
   - **Fix**: Check user limits via query hook and display remaining credits (e.g. "2 of 3 weekly interviews remaining"). Show upgrade prompt if remaining === 0.

---

## 4. Performance Issues

1. **`/api/auth/get-session` Storm (~8 requests per session, up to 6.6s in dev)**
   - **Root Cause**: Next.js App Router re-renders layout on route transitions. `AuthGuard` triggers `authClient.getSession()`, making a un-batched HTTP request to Neon DB to select session & user records.
   - **Impact**: Severe UI lag during navigation, serverless function cold starts, DB connection pressure.

2. **`/api/cover-letters` Duplicate Calls (3x in dev logs)**
   - **Root Cause**: Component tree mounts `useCoverLetters()` in multiple places simultaneously without query sharing across unmounted/remounted routes.
   - **Impact**: 3x database queries for the same user data.

3. **`/api/resumes` Latency (5.7s)**
   - **Root Cause**: Selecting full resume JSON payload (`resumes.data`) for all user resumes without column filtering or index optimizations on `(user_id, deleted_at)`.
   - **Impact**: Slow initial dashboard / editor load.

---

## 5. Recommended Fixes & Priority

### Priority 0 — Critical Bugs & Auth Stabilization
- [ ] **Fix AuthGuard Session Loop**: Update `AuthGuard` in `src/app/[locale]/(app)/layout.tsx` to use `authClient.useSession()` or cache session state so navigation doesn't re-trigger network requests.
- [ ] **DB Index Verification**: Ensure compound indices exist on `session(userId, token)` and `resumes(userId, deletedAt)` in `src/app/lib/schema.ts`.

### Priority 1 — Performance & Data Fetching Refactoring
- [ ] **Create `useUserPreferences` Hook**: Move raw `/api/user/preferences` calls to TanStack Query.
- [ ] **Create `useInterviewHistory` Hook**: Replace manual `fetchHistory` in `interview-view.tsx` with TanStack Query.
- [ ] **Create `useUserLimits` Hook**: Create a hook wrapping `/api/user/limits` (or using `getUsageBreakdown`) to expose real-time feature limits to UI components.

### Priority 2 — UX & Feature Gating Pre-flight Checks
- [ ] **Interview Setup Pre-flight**: Display remaining weekly interview credits on `interview-setup.tsx`. Disable start button if limit reached and offer Upgrade modal trigger.
- [ ] **Cover Letter & ATS Pre-flight Badges**: Add limit indicator components to Cover Letter and ATS Match entry points.

---

## Conclusion & Direct Answers to User Questions

1. **"Do other production level do like this?"**
   - **Session & Loading**: Production apps check session presence in middleware/cookies for zero-latency redirects, but use an in-memory cached session hook (`useSession()`) in client components so internal navigation NEVER re-fetches `/api/auth/get-session`.
   - **Subscription & Entitlement**: Production apps check entitlement both client-side (pre-flight UI state) and server-side (atomic quota gate in API handler). Currently Job For Sure only checks server-side, causing unnecessary loading states before 402 errors.

2. **"Is my code best practice now?"**
   - Architectural foundations (Better Auth, atomic Redis quota gate, Drizzle ORM, Next.js proxy) are solid and follow modern Next.js 16 standards.
   - Client-side data fetching is inconsistent (mixing TanStack Query with raw `fetch`) and `AuthGuard` has a re-fetch bug causing the log storms.

3. **"Is this normal in dev?"**
   - Slowness (1-3s per endpoint) is partially normal in `pnpm dev` due to un-minified code and module compilation.
   - Duplicate calls (8x session checks, 3x cover letters) are NOT normal and indicate React component re-fetch bugs that must be fixed.
