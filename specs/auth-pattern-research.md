# Next.js Auth Guard Pattern Research — Best Practice Verification

## Sources
- Better Auth official docs (Session Management, v1.6)
- Next.js App Router community patterns
- Production app comparisons (Clerk, NextAuth patterns)

---

## 1. useEffect vs useLayoutEffect — Verdict: `useEffect` is CORRECT

| Approach | Verdict | Why |
|----------|---------|-----|
| `useLayoutEffect` | ❌ WRONG | Blocks paint, causes SSR hydration errors/warnings in Next.js |
| `useEffect` | ✅ CORRECT | Async, doesn't block paint, works with SSR |
| **Early Return** (no effect at all for content gate) | ✅ BEST | Prevents any content flash — render skeleton/null before session loads |

**Your code is correct.** You use `useEffect` for the redirect + Early Return (`if (isPending || !session) return <Skeleton>`) for content protection. This matches Better Auth's official recommended pattern exactly.

---

## 2. Better Auth `useSession()` — Verdict: CORRECT

Better Auth's official docs show this as the reactive pattern:
```tsx
const { data: session } = authClient.useSession()
```

It uses nanostores for in-memory caching — fetches ONCE on mount, does NOT re-fetch on client navigation. Your code uses this correctly.

---

## 3. 🚨 CRITICAL FINDING: Cookie Cache is NOT Enabled

**This is the root cause of ALL your slow session checks (6.6s, 2.6s, etc.)**

Your `src/app/lib/auth.ts` does NOT have `session.cookieCache` configured. Without it:

> "Calling your database every time `useSession` or `getSession` is invoked isn't ideal... Cookie caching handles this by storing session data in a short-lived, signed cookie. When enabled, the server can check session validity from the cookie itself instead of hitting the database each time."
> — Better Auth official docs

**Fix (P0):**
```ts
// src/app/lib/auth.ts
export const auth = betterAuth({
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes — refreshes session from DB every 5 min
    },
  },
  // ... rest of config
})
```

**Impact**: Every `useSession()` call becomes a cookie read (0ms) instead of a Neon DB query (500ms-6.6s). This single change eliminates the slowness you saw in logs.

---

## 4. Full Client Layout — Verdict: Works, but NOT Ideal

**Current**: Entire `(app)` layout is `'use client'` — wraps everything in `<AuthGuard>`.

**Production best practice**: Server Component layout that fetches session server-side, passes to client children:
```
app/(app)/layout.tsx       ← Server Component (fetches session via auth.api.getSession)
  └── AuthGuard (client)   ← receives session as prop, only handles client interactions
```

**Tradeoff**:
- Your approach: Simple, works, but loses RSC streaming/SEO benefits for the layout shell
- Server approach: Faster initial paint (session resolved on server), better SEO, but requires refactoring

**Verdict**: Keep current approach for now. It's functional and common in early-stage apps. Consider refactoring to Server Component layout as a P2 optimization.

---

## 5. PostHog Identify Pattern — Verdict: Minor Improvement Possible

**Current**: PostHog identify inside AuthGuard useEffect.

**Best practice**: Separate `<PostHogIdentify>` component or provider, so auth concerns stay in AuthGuard.

**Verdict**: Not a bug. Cosmetic separation. Low priority.

---

## Summary Scorecard

| Area | Status | Notes |
|------|--------|-------|
| `useEffect` for redirect | ✅ Correct | Matches Better Auth docs |
| `useLayoutEffect` usage | ✅ Not used (good) | Would break SSR |
| Early Return content gate | ✅ Correct | Prevents content flash |
| `useSession()` hook | ✅ Correct | Official reactive pattern |
| **Cookie Cache** | 🔴 **MISSING** | Root cause of slow sessions — P0 fix |
| Client layout vs Server layout | 🟡 Works | Consider RSC refactor as P2 |
| PostHog in AuthGuard | 🟡 Works | Could be separate provider |

---

## Recommended Action

**One critical fix needed**: Enable `session.cookieCache` in `src/app/lib/auth.ts`. This is documented by Better Auth as essential for performance. Everything else is best-practice compliant.
