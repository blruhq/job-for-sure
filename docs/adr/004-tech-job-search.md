# ADR-004: Job Search Scoped to Tech Roles

**Status:** Accepted

**Context:** The job search feature automatically finds and scores jobs from external boards. General job boards (Indeed, LinkedIn, JobsDB) have anti-scraping measures, inconsistent data formats, and require paid API access for structured data.

**Decision:** Scrape only tech-focused job boards (RemoteOK, Ashby, Greenhouse) that provide well-structured listings with clear skill requirements. General users (marketing, finance, etc.) can still use the resume editor, cover letter generator, ATS match (by pasting a JD), and PDF export. Job search is explicitly a tech-first feature.

**Consequences:** Non-tech users cannot auto-discover jobs in the app. They must paste job descriptions manually for ATS matching and tailoring. If we later want to support general job search, we would need to integrate with paid job board APIs (Adzuna, Indeed) or require user-submitted links.
