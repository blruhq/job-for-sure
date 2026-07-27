# Implementation Spec & Plan — Smart Overview Quota UX Fix

### 0. ADR & Decisions (PM-owned)
- **Budget model: KEEP shared `ats_match` budget (5/day free).** Smart Overview IS a job-vs-candidate AI analysis — same daily AI budget as ATS Match. Splitting would double free-tier AI cost (5 + 5 = 10/day) and require schema + billing-UI changes (out of scope). Caching (7-day TTL, cache-hit bypasses gate) already eliminates repeat cost. The bug is purely UX communication, not the budget model.
- **UX treatment: REUSE the existing global `UpgradeModal`** (rendered in app layout, opened via `useUIStore.openUpgradeModal`). This is the exact pattern `chat-view.tsx` uses for the identical 402 (lines 121-133). No new modal, no new state machine, no new endpoint. Consistent UX across all gated features.
- **Scope: client-only fix, 1 component + 1 test.** No server, no schema, no new API. The 402 response body (`src/app/lib/plan.ts` `limitReachedResponse`, lines 291-302) already returns `{ error, feature, limit, plan, upgradeUrl }` — the client just needs to read it.

### 1. Root Cause (confirmed, do NOT re-investigate)
`/api/ai/smart-overview` gates on `ats_match` ONLY on cache miss (`route.ts` line 106). Cache hits (line 97-99) return 200 and bypass the gate. So: reopened jobs → 200; early-day new jobs → 200; 6th new analysis → 402. The client (`smart-overview.tsx` lines 80-90) ignores the 402 body entirely, shows a generic "Failed to generate AI overview" error toast, and renders a "Try again" loop that re-402s forever.

### 2. Target Files
- **MODIFY** `src/app/components/pipeline/smart-overview.tsx` — handle 402 in `generate()`.
- **ADD** `tests/unit/smart-overview-quota.test.ts` — unit test for the 402→modal path.
- File-size note: `smart-overview.tsx` is 413 lines; the edit adds ~12 lines → stays <500 cap. No split.

### 3. Step-by-Step Edits

**Edit A — `src/app/components/pipeline/smart-overview.tsx`**

A1. Add import (top, after the existing `~/hooks/...` or `~/lib/...` imports):
```ts
import { useUIStore } from '~/hooks/use-ui'
```

A2. Replace the `generate()` error branch (current lines 80-90) so a 402 opens the global UpgradeModal and does NOT show the generic error toast or enter the `'error'` state. Exact replacement for the block starting `const data = await res.json()` through the end of the `catch`:
```ts
      // 402 = Free-plan daily limit reached (shared with ATS Match).
      // Open the global UpgradeModal (same pattern as chat-view.tsx)
      // and bail out WITHOUT showing the generic error UI.
      if (res.status === 402) {
        const body = await res.json().catch(() => ({}))
        useUIStore.getState().openUpgradeModal({
          feature: body.feature ?? 'ats_match',
          limit: body.limit,
          featureLabel: 'AI analyses',
          period: 'today',
        })
        // Preserve any existing overview (regenerate case); otherwise return to idle.
        setState(overview ? 'complete' : 'idle')
        return
      }

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate overview')
      }
      setOverview(data)
      setState('complete')
    } catch (err) {
      console.error(err)
      notify({ message: 'Failed to generate AI overview', type: 'error' })
      setState('error')
    }
```
Note: `overview` is the state variable already in scope (line 58). The `setState(overview ? 'complete' : 'idle')` line keeps a previously-generated overview visible when the user hit "regenerate" and got rate-limited, and returns to the idle button when no overview exists yet. **Do not** add a new `'limit'` state — the modal handles it.

A3. (Optional polish, only if trivial) In the idle button's helper text (line 124-126), append a short hint so users preemptively understand the shared budget:
```
Get a personalized analysis: match, salary, commute, company
Shares your 5/day free AI analyses with ATS Match.
```
Skip if it risks layout; the modal copy is the primary fix.

**Edit B — `tests/unit/smart-overview-quota.test.ts` (NEW)**
Mirror the mocking style of `tests/unit/resume-limit.test.ts`. Stub global `fetch` to return a 402 with the structured body, mock `useUIStore` to capture `openUpgradeModal`, and assert:
1. On 402, `openUpgradeModal` is called once with `{ feature: 'ats_match', limit: 5, featureLabel: 'AI analyses', period: 'today' }`.
2. The generic error toast (`notify`) is NOT called (import `~/lib/toast` as a mock and assert not called).
3. On a 503 response, `openUpgradeModal` is NOT called (falls through to error path).

Since `SmartOverview` is a React component, render it with `@testing-library/react` if already a dependency; otherwise test the pure logic by extracting the 402-handling into a tiny helper `handleSmartOverviewResponse(res, { overview, setState })` in the same file (or inline) and unit-test that. Prefer the helper extraction ONLY if RTL is not installed — check `package.json` devDeps first. Keep the test ≤60 lines.

### 4. Vertical-Slice Order
Single slice: client 402-handler + test. No DB/API layer. Verify end-to-end by: (1) type-check, (2) lint, (3) unit test, (4) manual — open a job detail panel, exhaust the `ats_match` quota (or temporarily set free limit to 0), click "Generate AI Overview", confirm the UpgradeModal appears (not the error toast); confirm a cached overview still returns 200.

### 5. Assertion & Testing Requirements
- **Unit:** `tests/unit/smart-overview-quota.test.ts` — the 3 cases above. REQUIRED.
- **Integration/E2E:** N/A — client error-handling only, no contract change.

### 6. Verification Commands & Logs
- Type check: `npx tsc --noEmit`
- Lint: `pnpm lint`
- Unit test: `pnpm vitest run tests/unit/smart-overview-quota.test.ts`
- Full unit suite: `pnpm test:unit`
- Build (final gate): `pnpm build`
- On failure: read compiler/lint output directly; for runtime, browser console + the `[smart-overview]` server log prefix in stderr.
