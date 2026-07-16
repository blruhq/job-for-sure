# Phase 4 — Chrome Extension (Smart AI Job Companion)

> **Time:** 1-2 weeks (Phase 1) + 2 weeks (Phase 2)
> **Depends on:** Phase 1 (panel pattern) + Phase 2 (intelligence links)
> **Status:** Biggest competitive gap. Huntr, Teal, Simplify ALL have extensions.

> **CRITICAL — AUTH DESIGN (read before implementing):**
>
> The existing `withAuth()` HOF in `src/app/lib/with-auth.ts` (lines 47-61) does
> an **origin/host equality check** on ALL non-GET requests. Extension requests
> originate from `linkedin.com` / `indeed.com` → origin ≠ host → **403 blocked**.
>
> Additionally, Better Auth session cookies default to `SameSite=Lax`, which
> browsers **refuse to send** on cross-site POSTs.
>
> **Solution: Bearer token auth (recommended).** Do NOT try to make cookies work
> cross-origin. Instead:
> 1. Create `/api/extension/auth` — accepts email+password (or existing session
>    cookie if the extension is opened from the app domain), returns a
>    long-lived token (stored in `extension_token` table or as a random string
>    in `user_preferences`).
> 2. Extension stores token in `chrome.storage.sync`.
> 3. Every extension API call sends `Authorization: Bearer <token>`.
> 4. Add a `withExtensionAuth()` HOF (or extend `withAuth`) that accepts bearer
>    tokens and skips the origin check.
> 5. The ATS match route must also accept a full resume object (not just
>    `resumeId`) — see note below.

## What & Why

Every competitor has a Chrome extension. Simplify's autofill is the #1 feature users cite for switching. This is the biggest competitive gap.

But YOUR extension is different:
- **Simplify** = "Apply to 100 jobs fast" (quantity)
- **YOUR extension** = "Should you even apply? Here's match score, commute cost, company intel" (quality)

Your extension brings the SAME intelligence from the job detail panel to ANY external job site (LinkedIn, JobsDB, Indeed, company career pages).

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  USER BROWSES: linkedin.com/jobs/view/123                    │
│       │                                                      │
│       ▼                                                      │
│  EXTENSION CONTENT SCRIPT                                    │
│  (runs on the job page)                                      │
│  ├── Detects: this is a job page (URL pattern match)        │
│  ├── Scrapes: title, company, location, JD text from DOM    │
│  └── Sends to background script → your API                  │
│       │                                                      │
│       ▼                                                      │
│  YOUR API (existing)                                         │
│  ├── /api/ai/ats-match → match score + missing skills       │
│  └── Returns results to extension                           │
│       │                                                      │
│       ▼                                                      │
│  EXTENSION SIDEBAR (injected into page)                     │
│  ┌──────────────────────────────────────────┐               │
│  │  🔍 JOB INTELLIGENCE              78%    │               │
│  │  Match: ████████░░ 78%                   │               │
│  │  ✓ React, TypeScript                     │               │
│  │  ✗ Docker, CI/CD                         │               │
│  │                                          │               │
│  │  🚇 COMMUTE                              │               │
│  │  [Directions →] [Prices →]              │               │
│  │                                          │               │
│  │  🏢 COMPANY                              │               │
│  │  [Culture →] [Reddit →] [Registry →]   │               │
│  │                                          │               │
│  │  [💾 Save to Tracker]                   │               │
│  └──────────────────────────────────────────┘               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Extension Structure (Manifest V3)

```
extension/
├── manifest.json
├── background.ts          (service worker)
├── content-script.ts      (runs on job pages, scrapes + injects sidebar)
├── sidebar.tsx            (sidebar UI component)
├── detectors.ts           (URL pattern → is this a job page?)
├── scrapers/
│   ├── linkedin.ts        (LinkedIn-specific DOM selectors)
│   ├── jobsdb.ts          (JobsDB-specific selectors)
│   ├── indeed.ts          (Indeed-specific selectors)
│   ├── greenhouse.ts      (Greenhouse ATS selectors)
│   ├── workday.ts         (Workday ATS selectors)
│   └── generic.ts         (fallback: meta tags + heuristics)
├── api.ts                 (calls your Next.js API)
└── styles.css             (sidebar styling, scoped to not leak)
```

## Phase 1: Intelligence Extension (Ship First)

### manifest.json

```json
{
  "manifest_version": 3,
  "name": "Job For Sure — Smart Job Companion",
  "version": "1.0.0",
  "description": "See match score, commute cost, and company intelligence on any job page.",
  "permissions": ["storage", "activeTab"],
  "host_permissions": [
    "https://*.linkedin.com/*",
    "https://*.jobsdb.com/*",
    "https://*.indeed.com/*",
    "https://*.glassdoor.com/*",
    "https://boards.greenhouse.io/*",
    "https://careers.*.com/*",
    "https://your-app-domain.com/*"
  ],
  "background": { "service_worker": "background.js" },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content-script.js"],
    "css": ["styles.css"],
    "run_at": "document_idle"
  }],
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon-48.png"
  }
}
```

### content-script.ts — Job Detection + Scraping

```typescript
// ── JOB PAGE DETECTION ──
const JOB_URL_PATTERNS = [
  /linkedin\.com\/jobs\//i,
  /jobsdb\.com\/.*\/job\//i,
  /indeed\.com\/(viewjob|jobs)\//i,
  /boards\.greenhouse\.io\//i,
  /boards\.ashby\.hq\.com\//i,
  /careers\..*\/jobs?\//i,
  // Add more patterns as needed
]

function isJobPage(url: string): boolean {
  return JOB_URL_PATTERNS.some(pattern => pattern.test(url))
}

// ── SCRAPING (generic fallback) ──
function scrapeJobData(): { title: string; company: string; location: string; description: string } {
  // Try meta tags first (most reliable)
  const title = document.querySelector('meta[property="og:title"]')?.getAttribute('content')
    || document.querySelector('h1')?.textContent?.trim()
    || ''

  const description = document.querySelector('meta[property="og:description"]')?.getAttribute('content')
    || document.querySelector('[class*="job-description"]')?.textContent?.trim()
    || document.querySelector('[class*="description"]')?.textContent?.trim()
    || ''

  // Company and location vary by site — use site-specific scrapers
  // Fall back to generic heuristics

  return { title, company: '', location: '', description }
}
```

### Site-Specific Scrapers

Each major job board has different DOM structure. Create one scraper per site:

**`scrapers/linkedin.ts`:**
```typescript
export function scrapeLinkedIn() {
  return {
    title: document.querySelector('.job-details-jobs-unified-top-card__job-title')?.textContent?.trim() || '',
    company: document.querySelector('.job-details-jobs-unified-top-card__company-name a')?.textContent?.trim() || '',
    location: document.querySelector('.job-details-jobs-unified-top-card__bullet')?.textContent?.trim() || '',
    description: document.querySelector('.jobs-description__content')?.textContent?.trim() || '',
  }
}
```

**`scrapers/greenhouse.ts`:**
```typescript
export function scrapeGreenhouse() {
  return {
    title: document.querySelector('.app-title')?.textContent?.trim() || '',
    company: document.querySelector('.company-name')?.textContent?.trim() || '',
    location: document.querySelector('.location')?.textContent?.trim() || '',
    description: document.querySelector('#content')?.textContent?.trim() || '',
  }
}
```

### api.ts — Call Your Existing API

```typescript
const API_BASE = process.env.REACT_APP_API_BASE || 'https://your-app-domain.com'

// Retrieve bearer token from extension storage
async function getToken(): Promise<string | null> {
  const { jfs_token } = await chrome.storage.sync.get('jfs_token')
  return jfs_token || null
}

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }
}

// NOTE: /api/ai/ats-match requires a FULL resume object (validated by
// ResumeDataSchema), NOT a resumeId. The extension must fetch the active
// resume first via GET /api/resumes (with bearer token), then pass it here.
export async function getMatchScore(jdText: string, resume: Record<string, unknown>, token: string) {
  const res = await fetch(`${API_BASE}/api/ai/ats-match`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ resume, jdText }),
  })
  return res.json()
}

export async function saveToTracker(jobData: Record<string, unknown>, token: string) {
  const res = await fetch(`${API_BASE}/api/applications`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(jobData),
  })
  return res.json()
}

// Fetch user's active resume for match scoring
export async function getResumes(token: string) {
  const res = await fetch(`${API_BASE}/api/resumes`, {
    headers: authHeaders(token),
  })
  return res.json()
}
```

### Sidebar Injection

The content script injects a sidebar into the page:

```typescript
function injectSidebar(data: MatchResult) {
  const sidebar = document.createElement('div')
  sidebar.id = 'jfs-sidebar'
  sidebar.innerHTML = `
    <div class="jfs-header">
      <span>Job For Sure</span>
      <span class="jfs-score">${data.score}%</span>
    </div>
    ...
  `
  document.body.appendChild(sidebar)
  // Add class to body to shift content
  document.body.classList.add('jfs-sidebar-open')
}
```

## Phase 2: Autofill (Later)

This is the HARDER part — detecting and filling form fields on ATS systems. Only build after Phase 1 proves value.

### Supported ATS Systems (prioritized)
1. Workday (most common enterprise ATS)
2. Greenhouse (popular in tech)
3. Lever
4. iCIMS
5. SmartRecruiters
6. Taleo

### Autofill Logic
```typescript
// Detect form fields by label, placeholder, or aria-label
function findField(labels: string[]): HTMLInputElement | null {
  for (const label of labels) {
    const el = document.querySelector(`input[placeholder*="${label}" i]`)
      || document.querySelector(`input[aria-label*="${label}" i]`)
      || document.querySelector(`label:has(text():icontains("${label}")) + input`)
    if (el) return el as HTMLInputElement
  }
  return null
}

// Fill fields
function autofillApplication(profile: UserProfile) {
  findField(['first name', 'given name'])?.value = profile.firstName
  findField(['last name', 'family name'])?.value = profile.lastName
  findField(['email'])?.value = profile.email
  findField(['phone'])?.value = profile.phone
  // ... etc
}
```

## Build & Deploy

### Build the extension
```bash
# Use Vite or webpack for MV3 build
pnpm --filter extension build
```

### Load unpacked in Chrome
1. Go to `chrome://extensions`
2. Enable Developer mode
3. Load unpacked → select `extension/dist`

### Publish to Chrome Web Store
1. Create developer account ($5 one-time fee)
2. Zip the `extension/dist` folder
3. Submit for review (1-3 days)

## Verification

Phase 1:
1. Browse to a LinkedIn job page → sidebar appears with match score
2. Browse to a Greenhouse job page → sidebar appears
3. Sidebar shows commute links (Google Maps, Rome2Rio)
4. Sidebar shows company intel links (Glassdoor, Reddit, OpenCorporates)
5. "Save to Tracker" adds job to Kanban board
6. Match score is accurate (compares JD to user's active resume)

Phase 2:
7. On a Workday application form → click "Autofill"
8. Fields fill with user profile data
9. Resume PDF uploads

## Acceptance Criteria

**Phase 1:**
- [ ] Extension detects job pages (LinkedIn, Greenhouse, Indeed, JobsDB minimum)
- [ ] Sidebar injects without breaking page layout
- [ ] Match score displays (calls your /api/ai/ats-match)
- [ ] Missing skills displayed
- [ ] Area intelligence links work (same as panel)
- [ ] Company intelligence links work
- [ ] "Save to Tracker" creates application record
- [ ] Auth works (cookie-based session)
- [ ] Extension loads on chrome://extensions with no errors

**Phase 2:**
- [ ] Autofill works on at least 3 ATS systems
- [ ] File upload works for resume PDF
- [ ] "Why are you a good fit?" textarea filled by AI

**General:**
- [ ] Extension does NOT slow down page load (< 500ms injection time)
- [ ] Extension does NOT break any page functionality
- [ ] Sidebar can be collapsed/hidden
