# Pre-Deploy Hardening Spec

**Goal:** Fix all critical security, performance, and code-reuse issues found in the codebase audit before production deploy tomorrow. No users exist yet — no legacy concerns.

**Branch:** `feat/pre-deploy-hardening`

---

## CRITICAL (must fix before deploy)

### C1: Middleware Auth Bypass via Locale Prefix
- **File:** `src/proxy.ts` (lines 11-31)
- **Bug:** `stripLocale()` only checks `parts[1] === 'en' || parts[1] === 'th'`. A request to `/fr/chat` or `/xx/dashboard` returns `/fr/chat` which doesn't match any protected route → auth redirect skipped.
- **Fix:** Replace with regex that strips any 2-letter locale prefix:
  ```typescript
  function stripLocale(pathname: string) {
    return pathname.replace(/^\/(?:[a-z]{2})(?=\/|$)/i, '') || '/'
  }
  ```
- **Also:** Import locales from `src/app/i18n/routing.ts` to stay DRY with the config.

### C2: CSRF Check Skips When Origin Header Missing
- **File:** `src/app/lib/with-auth.ts` (lines 52-67)
- **Bug:** The origin/CSRF check only fires when `origin && host` are both present. Some browsers/requests omit `Origin` on same-origin POSTs but include `Referer`. An attacker can craft a request without `Origin` to bypass CSRF entirely.
- **Fix:** Fall back to `Referer` header when `Origin` is missing:
  ```typescript
  const origin = nextReq.headers.get('origin')
  const referer = nextReq.headers.get('referer')
  const host = nextReq.headers.get('host')
  const target = origin || referer
  if (target && host) {
    try {
      if (new URL(target).host !== host) {
        return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid origin/referer header' }, { status: 400 })
    }
  }
  ```

### C3: RemoteOK Fetch Has No Timeout Signal
- **File:** `src/app/lib/job-sources/index.ts` (lines 119-122) and `src/app/lib/job-sources/remoteok.ts`
- **Bug:** `fetchRemoteOKJobs` calls `fetchRemoteOK()` without passing an AbortSignal. If remoteok.com stalls, the entire job search blocks indefinitely. Other sources (Greenhouse, Ashby) use `SEARCH_TIMEOUT_MS` properly.
- **Fix:** Add AbortController with `SEARCH_TIMEOUT_MS` timeout in the `fetchRemoteOKJobs` wrapper inside `index.ts`. Clear timeout on success/error.

---

## HIGH (should fix before deploy)

### H1: Missing Composite Indexes on `deleted_at`
- **File:** `src/app/lib/schema.ts`
- **Problem:** Every list query filters `WHERE userId = ? AND deletedAt IS NULL`, but indexes only cover `userId`. Postgres must scan + filter.
- **Fix:** Change these indexes to composite (userId, deletedAt):
  - `resumes`: `index("resumes_userId_deletedAt_idx").on(table.userId, table.deletedAt)`
  - `applications`: `index("applications_userId_deletedAt_idx").on(table.userId, table.deletedAt)`
  - `cover_letters`: `index("cover_letters_userId_deletedAt_idx").on(table.userId, table.deletedAt)`
  - `interview_sessions`: `index("interview_sessions_userId_deletedAt_idx").on(table.userId, table.deletedAt)`
- **After editing schema.ts:** Run `pnpm db:generate` then `pnpm db:migrate` to apply.

### H2: N+1 Query in `getUsageBreakdown`
- **File:** `src/app/lib/plan.ts` (lines 161-174)
- **Problem:** Loops through FEATURES sequentially, calling `checkLimit()` → `getFeatureCount()` for each. 5 sequential DB round-trips over Neon HTTP.
- **Fix:** Aggregate in a single `GROUP BY feature` query:
  ```typescript
  const usageRows = await db
    .select({ feature: usageEvents.feature, total: count() })
    .from(usageEvents)
    .where(eq(usageEvents.userId, userId))
    .groupBy(usageEvents.feature)
  ```
  Then map results to the FEATURES structure. Note: resumes count comes from actual DB rows, not usage_events — keep that special case.

### H3: Stream Reader Leak on AI Provider Timeout
- **File:** `src/app/lib/ai-providers.ts` (lines 124-136)
- **Problem:** When `streamWithFailover` times out, `reader.cancel()` is never called. The underlying HTTP connection stays open.
- **Fix:** Add `reader.cancel()` in the catch block:
  ```typescript
  } catch (err) {
    try { await reader.cancel() } catch {}
    // existing error handling...
  }
  ```

### H4: Redundant DNS Resolution in Scraper
- **File:** `src/app/lib/scraper.ts` (lines 140-148)
- **Problem:** `scrapeJob()` calls `validateUrl(url)` then immediately calls `fetchHTML()` which calls `validateUrl(currentUrl)` again for the same URL. Double DNS resolution.
- **Fix:** Remove the redundant `validateUrl` call in `scrapeJob()` — let `fetchHTML` be the single point of SSRF validation.

---

## MEDIUM (nice to have before deploy)

### M1: Extract PDF Stream-to-Buffer Utility (DRY)
- **Files:** `src/app/api/export/pdf/route.tsx` (lines 58-65), `src/app/api/preview-pdf/route.tsx` (lines 37-44)
- **Problem:** Identical stream-buffering loop duplicated in both files.
- **Fix:** Add `pdfStreamToBuffer()` to `src/app/components/resume/templates/shared-pdf.ts` and use in both routes.

### M2: Extract Resume Ownership Query Helper (DRY)
- **Problem:** Multiple API routes duplicate the same `db.select().from(resumes).where(and(eq(resumes.id, id), eq(resumes.userId, user.id), isNull(resumes.deletedAt)))` pattern.
- **Fix:** Create `getResumeForUser(userId, resumeId)` in `src/app/lib/plan.ts` or a new `src/app/lib/queries.ts`. Use in export/pdf, preview-pdf, resumes/[id], etc.

### M3: Add Public Health Check Endpoint
- **File:** Create `src/app/api/health/route.ts`
- **Problem:** No unauthenticated health probe for deployment monitoring.
- **Fix:**
  ```typescript
  import { NextResponse } from 'next/server'
  import { db } from '~/lib/db'
  import { sql } from 'drizzle-orm'

  export async function GET() {
    try {
      await db.execute(sql`SELECT 1`)
      return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() })
    } catch {
      return NextResponse.json({ status: 'error' }, { status: 503 })
    }
  }
  ```

### M4: Clean Up Console Statements
- **Problem:** ~55 console.log/error/warn statements scattered across route handlers and components.
- **Fix:** Keep console.error in catch blocks (useful for debugging). Remove console.log debug statements. Replace with structured logger if time permits, but at minimum remove debug logs.

---

## CONSTRAINTS
- Do NOT change any API response shapes or URLs (no breaking changes)
- Do NOT change auth flow or session structure
- Keep fail-open policy intact (Redis/PostHog failures never block core features)
- Run `pnpm db:generate` + `pnpm db:migrate` after schema changes
- Verify: `npx tsc --noEmit`, `pnpm lint`, `pnpm test` all pass after changes
- Commit each logical fix as a separate conventional commit

## VERIFICATION
After all changes:
1. `npx tsc --noEmit` — must pass clean
2. `pnpm lint` — must pass (0 errors)
3. `pnpm test` — all 141 tests must still pass
4. `pnpm build` — must succeed
