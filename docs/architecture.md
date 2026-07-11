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

2. Client-side AuthGuard in (app)/layout.tsx
   ├── Calls authClient.getSession()
   ├── If no session → redirect /login
   └── If session → identify in PostHog, render children

3. API routes use requireUser() from auth-helpers.ts
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
    ├── Try primary model (OpenAI GPT-4o)
    │   └── If fails → log error, try fallback
    │
    ├── Try fallback model (OpenAI GPT-4o-mini or alternative)
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

Custom React context store (`app/lib/store.tsx`):
- `useAppStore()` hook returns all app state + actions
- State: resumes, applications, sidebar state, onboarding
- No external state lib — simple Context + useReducer pattern
- All state is client-side only (no SSR for dynamic data)

## Important Guardrails

1. **Fail-open**: PostHog, Redis, and rate limiter never block the app. Try/catch returns null.
2. **SSRF protection**: `scraper.ts` validates all URLs before fetching. Blocks private IPs, loopback, metadata endpoints.
3. **No direct AI SDK calls**: Always use `ai-providers.ts` wrappers for failover.
4. **PDF is server-only**: `@react-pdf/renderer` never runs in browser. Export endpoint generates and streams PDF.
5. **i18n routing**: All pages have locale prefix (`/en/...`, `/th/...`). Handled by proxy.ts + next-intl.
