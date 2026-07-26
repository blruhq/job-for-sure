# Job For Sure

**AI-powered job application helper.** Upload and tailor resumes, check ATS compatibility, generate cover letters, practice with mock interviews, and discover tech jobs across 13+ boards — all in one place.

> **Status**: Pre-release (v0.2.0) — active development.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-11-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Build](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/)

---

## Features

- **Resume Builder** — Upload PDF, DOCX, TXT, or MD; AI parses and structures your data into editable form fields. Choose from 3 templates (Minimalist, Modern, Classic) and export as a professional A4 PDF.
- **ATS Match** — Paste a job description and get a match score with matched/missing skills, weak areas, and actionable recommendations.
- **Cover Letter Generator** — AI generates tailored cover letters for specific roles. Edit tone, regenerate, and export alongside your resume.
- **Mock Interviews** — Practice with AI-powered interview sessions. Get feedback on your responses.
- **Job Search** — Discover tech jobs from 13+ sources (RemoteOK, Greenhouse, Ashby, Adzuna, JSearch, LinkedIn, Indeed, and more). Results are scored against your resume skills and cached for 6 hours.
- **Pipeline Tracking** — Kanban board to track applications across stages: bookmarked, applied, interviewing, offers.
- **AI Co-Pilot** — Real-time chat assistant that suggests rewrites, detects missing sections, and optimizes content for ATS.
- **Billing** — Free tier with generous daily limits; Pro tier ($4/mo or $29/yr) for unlimited usage.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2+ (App Router) |
| Language | TypeScript 5.8+ (strict) |
| Styling | Tailwind CSS v4 + `@tailwindcss/postcss` |
| Database | PostgreSQL (Neon Serverless) + Drizzle ORM |
| Auth | Better Auth (email/password + Google OAuth) |
| AI | Vercel AI SDK + DeepSeek V4 Flash via OpenAI-compatible API, with automatic failover |
| PDF | `@react-pdf/renderer` (server-side, no headless browser) |
| i18n | `next-intl` (locale prefix: `/en`, `/th`) |
| Testing | Vitest (unit) + Playwright (E2E) |
| Analytics | PostHog (client + server) |
| Cache / Rate Limit | Upstash Redis + Ratelimit |
| State | Zustand v5 + Immer + TanStack Query v5 |
| Package Manager | pnpm 11+ |

---

## Prerequisites

- **Node.js** 22+
- **pnpm** 11+
- **PostgreSQL** database — [Neon Serverless](https://neon.tech) recommended
- **Upstash Redis** account — for caching and rate limiting
- **OpenAI-compatible API key** — DeepSeek (primary) and/or DeepInfra (fallback)

---

## Getting Started

```bash
# Clone the repository
git clone <repo-url>
cd job-for-sure

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your credentials (see Environment Variables section)

# Generate database migrations
pnpm db:generate

# Apply migrations
pnpm db:migrate

# (Optional) Set up Stripe products if you need billing
pnpm db:setup-stripe

# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The app will redirect you based on your browser locale (`/en` or `/th`).

> **Note**: On first run, you will need to register an account. Email/password and Google OAuth are both supported.

---

## Environment Variables

The `.env.example` file contains all required variables. Here are the categories:

| Category | Variables | Required? |
|----------|-----------|-----------|
| **Database** | `DATABASE_URL` | Yes |
| **Auth** | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | Yes |
| **Social Login** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional |
| **AI Providers** | `DEEPSEEK_API_KEY`, `DEEPINFRA_API_KEY` | Yes (at least one) |
| **Email** | `RESEND_API_KEY` | Yes (for auth emails) |
| **Job APIs** | `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `OPENWEBNINJA_API_KEY`, `APIFY_TOKEN` | Optional (for paid job sources) |
| **Analytics** | `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST` | Optional (fail-open) |
| **Cache / Rate Limit** | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Optional (fail-open) |
| **Billing** | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `STRIPE_WEBHOOK_SECRET` | Optional |

All optional services are fail-open — if they are unavailable, the app continues to work without them.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the Next.js development server |
| `pnpm build` | Create a production build |
| `pnpm start` | Start the production server |
| `pnpm lint` | Run ESLint across the codebase |
| `pnpm typecheck` | Run TypeScript type checking (`npx tsc --noEmit`) |
| `pnpm test` | Run all unit tests (Vitest) |
| `pnpm test:watch` | Run unit tests in watch mode |
| `pnpm test:e2e` | Run Playwright end-to-end tests |
| `pnpm db:generate` | Generate Drizzle ORM migrations from schema changes |
| `pnpm db:migrate` | Apply pending migrations to the database |
| `pnpm db:migrate-local` | Apply migrations using `.env.local` variables |
| `pnpm db:push` | Push schema directly (dev only) |
| `pnpm db:setup-stripe` | Create Stripe products and prices from seed data |

---

## Project Structure

```
job-for-sure/
├── src/
│   ├── proxy.ts                 Next.js 16 middleware (i18n + auth redirect)
│   ├── app/
│   │   ├── [locale]/            Locale-rooted pages
│   │   │   ├── (auth)/          Login, register, password reset
│   │   │   ├── (app)/           Authenticated pages (dashboard, resume, chat, etc.)
│   │   │   └── (marketing)/     Public landing page
│   │   ├── api/                 Route handlers (AI, applications, auth, billing, etc.)
│   │   ├── lib/                 Shared libraries (DB, auth, AI providers, Stripe, Redis)
│   │   ├── hooks/               Custom React hooks (Zustand stores, TanStack Query)
│   │   ├── components/          React components (resume, chat, ATS, interview, layout, UI)
│   │   ├── types/               TypeScript type definitions
│   │   ├── i18n/                next-intl configuration
│   │   └── globals.css          Global styles
│   ├── components/              Shared UI components (agent-elements, billing)
│   └── data/                    Static data (cities, job titles)
├── drizzle/                     Auto-generated migrations — do not edit manually
├── tests/
│   ├── unit/                    Vitest unit tests
│   └── e2e/                     Playwright end-to-end tests
├── docs/                        Architecture, ADRs, flow specs, glossary
├── AGENTS.md                    AI context and coding rules
├── drizzle.config.ts            Drizzle Kit configuration
└── next.config.ts               Next.js configuration
```

**Path aliases**: `~/` maps to `src/app/`, `@/` maps to `src/`.

---

## Architecture

The system follows a monolith Next.js architecture:

```
Browser -> Next.js 16 -> API Routes -> AI SDK (OpenAI-compatible)
                |                         |
                v                         v
          PostgreSQL (Neon)          Upstash Redis
          (Drizzle ORM)              (Cache + Rate Limit)
                |
                v
           Resend (Email)
```

- **Auth**: Requests pass through `src/proxy.ts` for locale detection and lightweight route protection. Actual session verification happens client-side via `AuthGuard`.
- **AI Failover**: All LLM calls use `generateTextWithFailover()` / `generateObjectWithFailover()` from `src/app/lib/ai-providers.ts`, which automatically retry from DeepSeek (primary) to DeepInfra (fallback).
- **Job Search**: Queries run through a multi-source scraper pipeline with SSRF protection, skill-based scoring, and 6-hour Redis caching.
- **Resume PDF**: Generated server-side with `@react-pdf/renderer` — no headless browser required.

See [`docs/architecture.md`](docs/architecture.md) for the full system design, auth flow, resume lifecycle, and data model.

---

## Database

This project uses **Drizzle ORM** with **PostgreSQL** (Neon Serverless).

- All table definitions live in **one file**: `src/app/lib/schema.ts`
- To modify the schema: edit `schema.ts`, then run:
  ```bash
  pnpm db:generate
  pnpm db:migrate
  ```
- **Do not edit files in `drizzle/` manually** — they are auto-generated migration snapshots.
- The `usage_events` table tracks daily feature usage for Free/Pro plan enforcement.

---

## Deployment

The application is optimized for **Vercel** deployment:

1. Push your repository to GitHub.
2. Import the project in Vercel.
3. Set the required environment variables in Vercel's project settings (all variables from `.env.example`).
4. Deploy.

**Database**: Use Neon Serverless — it works with Vercel Edge Functions and serverless environments out of the box.

**No Dockerfile** is needed for Vercel deployment. For other platforms, a standard Node.js Dockerfile can be added.

---

## Documentation

| Resource | Description |
|----------|-------------|
| [`AGENTS.md`](AGENTS.md) | AI context, coding rules, and guardrails for contributors |
| [`docs/architecture.md`](docs/architecture.md) | System design, auth flow, resume lifecycle, state management |
| [`docs/flow/`](docs/flow/) | Feature flow specifications (resume builder, job search, ATS match, cover letter) |
| [`docs/adr/`](docs/adr/) | Architecture Decision Records (Better Auth, @react-pdf, AI failover, job search) |
| [`docs/glossary.md`](docs/glossary.md) | Domain terms and definitions |
| [`docs/tech-stack.md`](docs/tech-stack.md) | Detailed technology versions and purposes |

---

## Coding Rules

Key guidelines for contributors (see `AGENTS.md` for the full list):

- **Do not edit `drizzle/` files manually** — always edit `schema.ts` and generate migrations.
- **Fail-open policy** — PostHog, Redis, and rate limiter must never block core features.
- **AI calls must use failover wrappers** — never call the AI SDK directly.
- **PDF is server-only** — `@react-pdf/renderer` never runs in the browser.
- **Middleware is `proxy.ts`** — Next.js 16 renamed middleware to proxy.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
