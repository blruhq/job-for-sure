# Architecture

## System Design Overview

```
Browser ──► Next.js 16 ──► API Routes ──► AI SDK (OpenAI)
                │                              │
                ▼                              ▼
          PostgreSQL (Neon)             Upstash Redis
          (Drizzle ORM)                 (Cache + Rate Limit)
                │
                ▼
           Resend (Email)
```

## Auth Flow

```
1. Request hits proxy.ts (Next.js 16 middleware)
   ├── Locale redirect (/ → /en or /th)
   ├── Protected route check (cookie-based, lightweight)
   └── Passes through to app

2. Client-side AuthGuard in `src/app/[locale]/(app)/layout.tsx`
   ├── Calls authClient.getSession()
   ├── If no session → redirect /login
   └── If session → identify in PostHog, render children

3. API routes use `requireUser()` from `src/app/lib/auth-helpers.ts`
   ├── Reads session cookie via headers()
   ├── Returns 401 if invalid
   └── Returns user object if valid
```

## Resume Lifecycle

```
Upload PDF ──► Parse (PDF.js) ──► AI extracts fields ──► Editor
                                                             │
                    ┌────────────────────────────────────────┤
                    ▼                                        ▼
              Template selector                        AI Co-Pilot
              (Minimalist / Modern / Classic)           (rewrite, tailor,
                    │                                    optimize)
                    ▼
              Export PDF ←─ @react-pdf/renderer
              (server-side, A4, embedded fonts)
```

## Job Search Pipeline

```
User query ──► cache check (Upstash)
                  │
            ┌─────┴─────┐
            ▼            ▼
         Cache hit    Cache miss
            │            │
            │            ▼
            │       Scraper (cheerio + fetch)
            │       ├── RemoteOK
            │       ├── Ashby
            │       └── Greenhouse
            │            │
            │            ▼
            │       SSRF guard (validateUrl)
            │       blocks private IPs, loopback, metadata endpoints
            │            │
            │            ▼
            │       Score + rank jobs
            │       ├── Skill overlap
            │       ├── Title match bonus
            │       └── Experience level
            │            │
            │            ▼
            │       Cache result (6h TTL)
            │            │
            └────────────┘
                  │
                  ▼
            Return results
```

## AI Provider Chain

```
generateTextWithFailover(options) / generateObjectWithFailover(options)
    │
    ├── Try primary model (DeepSeek Official — api.deepseek.com)
    │   └── If fails → log error, try fallback
    │
    ├── Try fallback model (DeepInfra — api.deepinfra.com)
    │   └── If fails → throw error
    │
    └── Return result
```

## Data Model Relationships

```
User ──1:N──► Resumes
  │             │
  │             ├──1:N──► TailoredResumes (base variant)
  │             │             │
  │             │             └── jobUrl + jobData (scraped/input)
  │             │
  │             └──1:N──► CoverLetters
  │             │             └── jdText (job description input)
  │             │
  │             └──1:N──► InterviewSessions
  │                           └── exchanges (JSON array of QA)
  │
  ├──1:1──► UserPreferences (email notifications)
  │
  └──1:N──► Applications
                └── status (bookmarked → applied → interviewing → offers)
```

## State Management

**Zustand v5 + Immer** for local UI state and store:
- `src/app/hooks/use-ui.ts` — sidebar, modals, pending tailor state
- `src/app/lib/resume-editor-store.ts` — resume editor form state

**TanStack Query v5** for server state:
- `src/app/hooks/use-resumes.ts` — resume CRUD
- `src/app/hooks/use-apps.ts` — application CRUD
- `src/app/hooks/use-cover-letters.ts` — cover letter CRUD

All server-fetched data goes through TanStack Query with automatic cache invalidation. Zustand stores are used only for client-side UI concerns.

## Important Guardrails

1. **Fail-open**: PostHog, Redis, and rate limiter never block the app. Try/catch returns null.
2. **SSRF protection**: `scraper.ts` validates all URLs before fetching. Blocks private IPs, loopback, metadata endpoints.
3. **No direct AI SDK calls**: Always use `ai-providers.ts` wrappers for failover.
4. **PDF is server-only**: `@react-pdf/renderer` never runs in browser. Export endpoint generates and streams PDF.
5. **i18n routing**: All pages have locale prefix (`/en/...`, `/th/...`). Handled by `src/proxy.ts` + next-intl.
