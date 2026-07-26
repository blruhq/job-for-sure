# Next Sprint: Technical Debt Reduction

## God File Refactor
- `src/app/components/resume/resume-detail.tsx` (1,413 lines) — split into:
  - Tab navigation component
  - Resume editor section
  - Resume preview section
  - Co-pilot panel
- `src/app/components/chat/chat-view.tsx` (845 lines) — split into:
  - Message list
  - Input area
  - Job preview inline

**Risk:** Medium — must keep all 141 unit + 21 E2E tests passing during refactor.
**Effort:** 2-3 days
**Priority:** Medium — code maintainability, not user-facing

## Type Safety Cleanup
- 26 `any` types in `src/components/agent-elements/` — vendored UI library
- Replace with proper types or `unknown` + type guards where feasible
- **Risk:** Low — UI-only, well-tested
- **Effort:** 1 day
- **Priority:** Low — vendored code, acceptable as-is

## Structured Logging (future)
- Replace 53 `console.log/error/warn` with Pino structured logger
- Add request ID tracing for debugging
- **Effort:** 1 day
- **Priority:** Low — only needed at scale
