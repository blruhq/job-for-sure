# AGENTS.md — AI Context Manual

**Job For Sure** is an AI-powered job application helper. Users upload/parse resumes, track applications, prepare for interviews with AI mock sessions, generate tailored cover letters, and find tech jobs via scraped boards.

> **📖 Glossary**: See [`docs/glossary.md`](docs/glossary.md) for definitions of every entity, page, button, flow, and domain term. When a user references "the ATS thing", "tailored resume", "Co-Pilot", or any feature by name, check the glossary first.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2+ (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 + `@tailwindcss/postcss` |
| Database | PostgreSQL (Neon Serverless) + Drizzle ORM |
| Auth | Better Auth (email/password + Google OAuth) |
| AI SDK | Vercel AI SDK (`ai`, `@ai-sdk/openai`) — DeepSeek V4 Flash via failover |
| PDF | `@react-pdf/renderer` (server-side, no headless browser) |
| i18n | `next-intl` (locale prefix: `/en`, `/th`) |
| Testing | Vitest (unit) + Playwright (E2E) |
| Analytics | PostHog (client + server) |
| Rate Limit / Cache | Upstash Redis + Ratelimit |
| State | Custom React store (`app/lib/store.tsx`) |
| Package Manager | pnpm |

## Directory Structure

```
/
├── AGENTS.md                    AI context file
├── proxy.ts                     Middleware (auth redirect + i18n) — Next.js 16 file convention
├── next.config.ts               Next.js config with i18n plugin
├── package.json                 Scripts and dependencies
├── pnpm-workspace.yaml          pnpm workspace config
├── drizzle.config.ts            Drizzle Kit config
│
├── app/
│   ├── [locale]/
│   │   ├── (auth)/              Login, register, password reset pages
│   │   ├── (app)/               Authenticated pages (dashboard, chat, resume, interview, etc.)
│   │   └── (marketing)/         Public landing page
│   ├── api/                     Route handlers (parse-resume, ai/*, scrape, jobs/*, export, billing/*, stripe/webhook)
│   ├── lib/                     Shared libraries
│   │   ├── auth.ts              Better Auth server instance
│   │   ├── auth-client.ts       Better Auth browser client
│   │   ├── db.ts                Drizzle DB connection
│   │   ├── schema.ts            All DB table definitions
│   │   ├── ai-providers.ts      AI failover wrapper (primary + fallback model)
│   │   ├── scraper.ts           Job URL scraper with SSRF protection
│   │   ├── store.tsx            Zustand-like React context store
│   │   ├── email.ts             Resend email sender
│   │   ├── posthog-server.ts    Server-side PostHog analytics
│   │   ├── stripe.ts            Stripe client + price constants
│   │   └── plan.ts              Plan/limit/usage helpers
│   └── components/
│       ├── resume/              Resume detail, PDF, co-pilot, cover letter
│       ├── agent-elements/      AI chat UI components
│       └── layout/              Sidebar, navbar, app shell
│
├── components/
│   └── ui/                      General UI primitives (button, input, skeleton, etc.)
│
├── drizzle/                     Auto-generated migrations — DO NOT EDIT
├── tests/
│   ├── unit/                    Vitest unit tests
│   └── e2e/                     Playwright end-to-end tests
│
└── docs/                        Architecture, ADRs, flow specs
```

## Commands

| Action | Command |
|--------|---------|
| Dev server | `pnpm dev` |
| Build | `pnpm build` |
| Unit tests (watch) | `pnpm test:watch` |
| Unit tests (run) | `pnpm test` or `pnpm test:unit` |
| E2E tests | `pnpm test:e2e` |
| Single test file | `pnpm vitest run tests/unit/<file>` |
| DB migration generate | `pnpm db:generate` |
| DB migration apply | `pnpm db:migrate` |
| Setup Stripe products | `pnpm db:setup-stripe` |
| Lint | `pnpm lint` |
| TypeScript check | `npx tsc --noEmit` |

## Coding Rules & Guardrails

1. **DO NOT edit `drizzle/` files manually.** Always edit `app/lib/schema.ts`, then run `pnpm db:generate` and `pnpm db:migrate`.

2. **Fail-open policy.** External services (PostHog, Upstash Redis, rate limiter) must NEVER block core features. All calls wrapped in try/catch that silently return null on failure. See `app/lib/posthog-server.ts`, `app/lib/ratelimit.ts`.

3. **AI provider failover.** Use `generateTextWithFailover()` or `generateObjectWithFailover()` from `app/lib/ai-providers.ts`. These automatically retry the fallback provider if the primary fails. Do NOT call the AI SDK directly.

4. **Middleware is `proxy.ts`.** Next.js 16 renamed middleware to proxy. File is at root, function is named `proxy`. Export both `proxy` and `config.matcher`.

5. **Auth is client-side guard.** `proxy.ts` only handles locale + public/protected route redirect. Actual session verification is in `app/[locale]/(app)/layout.tsx` via `AuthGuard` component.

6. **Resume data model** supports all roles (tech and non-tech). Section suggestions are AI-driven, not hardcoded. The editor uses real form fields, never raw JSON inputs.

7. **Module path aliases:** `~/` maps to `./app/`, `@/` maps to `./` root.

8. **Resume PDF uses `@react-pdf/renderer`** — runs server-side, no headless browser. Do NOT use `html2canvas` or Puppeteer for PDF generation.

9. **Stripe billing (Free/Pro).** Plans: Free (generous limits) or Pro ($4/mo or $29/yr). `user.plan` in DB is `'free' | 'pro'`. Admins also get `plan='pro'` via seed.

10. **Feature gating.** Route handlers check limits via `gateFeature(userId, feature, role, plan)` + `recordUsage(userId, feature)` from `app/lib/plan.ts`. Usage is recorded to `usage_events` table (daily counters). Limits enforced via `checkLimit(userId, feature, plan)`. Resume creation counts actual DB rows (`resumes` table), not usage events.

11. **Pricing page** at `/pricing` (public). **Billing settings** at `/settings/billing` (plan, usage bars, Stripe customer portal). Free users see an upgrade prompt; Pro users see plan details and cancel option.

12. **Plan tiers & daily limits (Free/Pro):**
    - Chat: 15 / unlimited
    - Cover letters: 3/week / unlimited
    - ATS matches: 5/day / unlimited
    - Interview sessions: 3/week / unlimited
    - Resumes: 3 total / unlimited
    Usage resets nightly via `usage_events` daily counters.
