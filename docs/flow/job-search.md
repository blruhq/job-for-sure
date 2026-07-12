# Flow Spec: Job Search

## User Story
> As a tech job seeker, I want to search for jobs by keyword and location, see how well they match my resume, and bookmark promising ones for later.

## Entry Points
- Resume Detail → "Find Jobs" tab (full board with filters and infinite scroll)
- Chat → Resume upload (inline 5-card preview flowing inside chat stream)
- Chat → "Find me jobs like X" (AI suggestions)

## Flow States

### Search
```
1. User enters query + location (optional)
2. System checks Upstash cache (key: "query::location")
   ├── Cache hit (≤6h old) → return cached results
   └── Cache miss → proceed to scrape
3. Scraper runs SSRF validation on target URLs
   ├── Blocks private IPs, loopback, metadata endpoints
   └── Only tech boards: RemoteOK, Ashby, Greenhouse
4. Results are scored against user's resume:
   ├── Skill overlap (case-insensitive, normalized: React.js→react)
   ├── Title match bonus (+20 if title keyword matches)
   └── Experience level detection (senior/mid/entry)
5. Results cached with 6-hour TTL
6. Return ranked results
```

### Results Display

#### 1. Full Job Board (Resume Detail Page)
```
┌──────────────────────────────────────────────────┐
│  Search: "React Developer" · Bangkok   [Search]  │
│                                                   │
│  Showing 12 matches · Sorted by match score       │
│                                                   │
│  ┌────┬──────────────────────────┬──────┬──────┐  │
│  │ 98%│ Senior FE Engineer       │Remote│ 🤍   │  │
│  │    │ Acme Corp · Bangkok      │      │      │  │
│  │    │ Match: React, TS, Next   │      │      │  │
│  ├────┼──────────────────────────┼──────┼──────┤  │
│  │ 72%│ Full Stack Dev           │Hybrid│ 🤍   │  │
│  │    │ Beta Inc · Bangkok       │      │      │  │
│  │    │ Match: React, Node       │      │      │  │
│  └────┴──────────────────────────┴──────┴──────┘  │
└──────────────────────────────────────────────────┘
```

#### 2. Chat Job Preview (Inline Chat Flow)
Upon successful resume upload, the system automatically fetches jobs matching the resume's `role` and displays a maximum of 5 cards inline at the end of the scrollable message list.
- Renders directly in the chat flow (not pinned or fixed).
- Includes the match score, company logo, salary, visa support, and basic action buttons (Bookmark, ATS Fit, Interview, Apply).
- Shows a "+N more jobs · View all" button linking to `/resume/[id]` for the full search panel.
- Includes a button to search paid sources (LinkedIn, Indeed, JobsDB) on demand.

### Actions
```
On each job card:
├── Click → open job URL in new tab
├── Bookmark (🤍→❤️) → saves to application board
│   └── If user clicks "Tailor for this job":
│       → Creates TailoredResume variant
│       → Opens resume editor with AI suggestions
└── Score → expand to see missing skills
```

## Edge Cases
- **Search fails (all sources down)**: Show "Job search is temporarily unavailable. Try again later."
- **No results**: Show "No jobs found for 'query'. Try different keywords or location."
- **SSRF block**: If user somehow submits a blocked URL manually, return "This link cannot be accessed."
- **Cache empty**: First search is always slow (2-5s). Subsequent same searches are instant.
