# Contributing to Job For Sure

Thanks for stopping by! This project is in active development and contributions are welcome — bug fixes, docs, tests, and new ideas alike.

## Ground Rules

The full coding rules live in [`AGENTS.md`](AGENTS.md). The five that bite most often:

1. **Do not edit `drizzle/` manually.** Edit `src/app/lib/schema.ts`, then run `pnpm db:generate` + `pnpm db:migrate`.
2. **Fail-open policy.** PostHog, Upstash Redis, and the rate limiter must never block core features — wrap calls in try/catch.
3. **AI calls use failover wrappers.** Use `generateTextWithFailover()` / `generateObjectWithFailover()` from `src/app/lib/ai-providers.ts`, never the AI SDK directly.
4. **PDF is server-only.** `@react-pdf/renderer` never runs in the browser.
5. **Middleware is `proxy.ts`** (`src/proxy.ts`), per the Next.js 16 convention.

## Setup

```bash
git clone https://github.com/blruhq/job-for-sure.git
cd job-for-sure
pnpm install
cp .env.example .env.local   # fill in your credentials
pnpm db:generate && pnpm db:migrate
pnpm dev
```

See the README's [Environment Variables](README.md#environment-variables) table for what's required vs. optional (everything optional is fail-open).

## Branching & Commits

- Branch from `main` using `feat/<short-name>` or `fix/<short-name>` — CI runs on `main`, `feat/*`, `fix/*`, and all PRs to `main`.
- Keep commits small and scoped; write messages in the imperative mood (`feat: add …`, `fix: handle …`).
- Never commit secrets, `.env.local`, screenshots, logs, or scratch notes (all gitignored).

## Before You Push

Run the same checks CI runs:

```bash
pnpm lint          # ESLint, must have 0 errors
pnpm typecheck     # tsc --noEmit
pnpm test          # Vitest unit suite
pnpm build         # production build
```

For end-to-end coverage: `pnpm test:e2e` (Playwright).

Database changes need a generated migration committed alongside the schema edit (`pnpm db:generate`), plus a note in the PR description.

## Pull Requests

1. Fork the repo and open a PR against `main`.
2. Describe **what** changed and **why**; link any related issue.
3. Confirm the four checks above pass.
4. One concern per PR — refactoring and features don't mix.

## Reporting Issues

Open a GitHub issue with: what you expected, what happened, steps to reproduce, and your environment (Node/pnpm versions, browser). Logs and screenshots help.

## License

By contributing, you agree your work is licensed under the [MIT License](LICENSE).
