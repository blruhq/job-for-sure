# Spec: Resume Creation 402 — Error UX + Gate Bug Fixes

## Status: approved (user-confirmed)
## Branch: `fix/resume-creation-402` (off `new-ui`)

## Problem
POST `/api/resumes` returns HTTP 402 when a Free-plan user already has 3 base
resumes. The 402 is **intended behavior** (AGENTS.md rule #12: Free = 3 resumes
total, Pro = unlimited). The user-confirmed fix is: **keep the limit, improve the
error UX**, and fix two genuine code bugs in the gate logic.

## Root Cause Analysis
1. **Intended block (NOT a bug):** `src/app/api/resumes/route.ts` lines 37-50
   return 402 for free users with >= 3 non-deleted base resumes. Response body
   already includes `{ error, upgradeUrl: '/pricing' }`. Policy is correct.
2. **Bug A — duplicated/hardcoded gate:** The route re-implements the resume
   limit inline with a hardcoded `>= 3`, bypassing the shared
   `gateFeature(userId, 'resume_create', role, plan)` helper in
   `src/app/lib/plan.ts`. If the limit ever changes in `FEATURES`, this route
   silently diverges.
3. **Bug B — soft-deleted resumes over-counted:** `getResumeCount()` in
   `src/app/lib/plan.ts` (lines 179-185) counts rows where `isBase = true` but
   does **not** filter `deletedAt IS NULL`. Soft-deleted resumes inflate the
   count shown on `/settings/billing` usage bars and in `checkLimit`. (The
   inline route query filters `deletedAt` correctly, so the 402 itself is
   accurate — but the two code paths disagree.)
4. **UX gap:** The client mutation in `src/app/hooks/use-resumes.ts` (line 20)
   does not special-case the 402. The user sees a generic error instead of an
   actionable upgrade / delete prompt.

## Scope of Changes

### 1. `src/app/lib/plan.ts` — fix `getResumeCount` (Bug B)
- Add `isNull(resumes.deletedAt)` to the `where(and(...))` clause.
- Add `isNull` to the `drizzle-orm` import on line 3.
- Keep counting only `isBase = true` rows (tailored variants don't count).

### 2. `src/app/api/resumes/route.ts` — use shared gate (Bug A)
- Remove the inline block (lines 37-50).
- Replace with a call to `gateFeature`, **but preserve the `isBase` guard and
  the Free-plan-only semantics**:
  ```ts
  import { gateFeature, getEffectivePlan } from '~/lib/plan'
  // only base-resume creation counts against the limit
  if ((isBase ?? true)) {
    const gate = await gateFeature(user.id, 'resume_create', user.role, user.plan)
    if (gate) return gate   // gateFeature already returns the 402 + upgradeUrl
  }
  ```
  - `gateFeature` returns `null` for Pro/admin (unlimited), so the explicit
    `effectivePlan === 'free'` check is no longer needed — but KEEP the
    `(isBase ?? true)` guard so creating a tailored (non-base) variant never
    hits the gate.
- Verify the returned 402 body shape matches what the client will parse:
  `{ error, feature, limit, plan, upgradeUrl }` (from `limitReachedResponse`).

### 3. `src/app/hooks/use-resumes.ts` — handle 402 gracefully (UX)
- In the create-resume mutation, detect a 402 response and surface a sonner
  toast with an action button.
- Use the existing toast helper at `src/app/lib/toast.ts` (re-exports `sonner`).
  If it lacks an action-toast helper, use `toast.error(msg, { action: { label,
  onClick } })` directly from sonner.
- Message: "Free plan allows up to 3 resumes." Action button: "Upgrade" →
  `router.push('/pricing')` (or `<Link>`). Secondary hint text: "Delete a resume
  to make room."
- Parse the 402 JSON body for `upgradeUrl` and `limit` if present; fall back to
  `/pricing` and `3`.
- Re-throw / surface the error so react-query `onError` still fires for
  analytics, but suppress the generic "something went wrong" toast for the 402
  case (only show the actionable one).
- Check whether `chat-view.tsx` and `upload-modal.tsx` create resumes via this
  same mutation/hook or call `ApiClient.createResume` directly. If they share
  the hook, the fix covers them. If not, centralize the 402 handling in a small
  helper (e.g. `handleResumeLimitError(res, router)`) in `src/app/lib/toast.ts`
  or a new `src/app/lib/resume-limit.ts` and call it from each site.

### 4. Tests
- Add a Vitest unit test under `tests/unit/` for the resume-limit gate behavior:
  - Free user with 3 base resumes → POST returns 402.
  - Free user with 2 base resumes → allowed.
  - Pro user → never 402.
  - Creating a non-base (tailored) resume → never 402 even at limit.
  - Soft-deleted resumes (`deletedAt` set) are NOT counted.
- Mock `gateFeature` / `db` as needed; follow existing test conventions.

## Non-Goals
- Do NOT change the Free resume limit (stays at 3) unless separately requested.
- Do NOT add new dependencies (sonner already installed).
- Do NOT touch `drizzle/` migrations — schema is unchanged.
- Do NOT push or open a PR (user did not ask).

## Verification
- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test` (or `pnpm vitest run tests/unit/<new-file>`)
- Commit on `fix/resume-creation-402` in conventional format.
- Append `.worklog.md` entry.
