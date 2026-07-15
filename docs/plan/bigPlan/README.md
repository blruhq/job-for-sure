# Big Plan — Job For Sure Product Roadmap

> Generated from product strategy session — July 2026
> Total: 6 phases, 31 tasks, 10 done

## Phase Order

| Phase | Name | Time | Status | Dependencies |
|-------|------|------|--------|-------------|
| 0 | [Fix Schema](./phase-0-fix-schema.md) | 30 min | TODO | None (do first) |
| 1 | [Job Detail Panel](./phase-1-job-detail-panel.md) | 2-3 days | TODO | Phase 0 |
| 2 | [Intelligence Links](./phase-2-intelligence-links.md) | 2-3 hours | TODO | Phase 1 |
| 3 | [Quick Wins](./phase-3-quick-wins.md) | 2-3 days | TODO | Phase 0 |
| 4 | [Chrome Extension](./phase-4-chrome-extension.md) | 2-3 weeks | TODO | Phase 1+2 |
| 5 | [Contact Tracker](./phase-5-contact-tracker.md) | 2-3 days | TODO | Phase 0 |
| 6 | [Additional Sources](./phase-6-additional-sources.md) | 2-3 days | TODO | None |

## Already Shipped

- Sidebar UX fixes (jitter, vertical shift, separators, nav reorder)
- Interview Prep → own PRACTICE section
- JSONB blob → proper applications table migration
- API routes for applications (GET/POST/DELETE/reorder)

## Build Order

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
 FIX     PANEL     LINKS     WINS      EXTENSION  CONTACTS   SOURCES
(30 min) (3 days)  (2 hrs)   (3 days)  (3 weeks)  (3 days)   (3 days)
```

## Key Decisions

1. **Link out, don't embed** — All intelligence features use free URL links, not APIs or iframes
2. **One panel, opened from everywhere** — Search results + Kanban both open the same JobDetailPanel
3. **Show raw JD, no AI summary** — Simpler, user reads the actual text
4. **Country-specific property sites** — Lookup table by country code (TH: Hipflat/PropertyHub/Baania)
5. **Numbeo for universal cost data** — Works worldwide, free to link
6. **Rome2Rio for commute prices** — Replaces fare table + cost calculator
7. **jobsbyculture.com for company culture** — Scraper-friendly, will be 14th source

## What We're NOT Doing

- Grab/Uber live pricing (no public API)
- Property site iframes (all blocked)
- Google Maps embed (limited, costs $)
- AI Job Summary (show raw JD instead)
- Building own transit routing (link to Google Maps)
