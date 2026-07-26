# ADR-004: Multi-Source Job Search Architecture

**Status:** Updated (2025-07-13)

**Context:** The job search feature automatically finds and scores jobs from external boards. General job boards (Indeed, LinkedIn, JobsDB) have anti-scraping measures, inconsistent data formats, and require paid API access for structured data.

**Decision:** Use a **tiered multi-source strategy** with 13 job sources organized by cost and reliability:

### Source Tiers

| Tier | Sources | Cost | Notes |
|------|---------|------|-------|
| FAST_FREE | RemoteOK, Himalayas, Remotive, The Muse, Arbeitnow, JobbKK | Free | Single API calls, 1-3s response |
| SLOW_FREE | Greenhouse, Ashby | Free | Multi-company ATS boards, 3-10s |
| KEY_GATED | Adzuna, JSearch | Free tier (monthly limit) | Requires API key |
| PAID | LinkedIn, Indeed, JobsDB | Apify credits | Via Apify scraping actors |

### Architecture

All source adapters normalize to a unified `JobResult` type (defined in `src/app/lib/job-sources/types.ts`). The orchestrator (`src/app/lib/job-sources/index.ts`):
1. Fetches from all enabled sources in parallel (with per-source timeout)
2. Deduplicates by company + title
3. Filters by query keywords and location
4. Infers experience level from title
5. Scores against user's resume skills (synonym-normalized keyword overlap)
6. Caches results in Upstash Redis (6h TTL, re-scored per user on cache hit)

### Non-Tech Users

General users (marketing, finance, etc.) can still use the resume editor, cover letter generator, ATS match (by pasting a JD), and PDF export. Job search defaults to free sources. Paid sources (LinkedIn, Indeed, JobsDB) are opt-in via the `includePaid` flag.

**Consequences:** Non-tech users get fewer relevant results from free tech-focused boards. The paid Apify sources broaden coverage but cost money per search. If we later want unlimited general job search, we would need direct partnerships with job board APIs.
