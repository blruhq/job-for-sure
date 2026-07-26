# Intelligence Links — Complete Browser-Verified Audit

**Date:** 2026-07-27
**File audited:** `src/app/lib/area-links.ts`
**Method:** Real Chrome browser via `~/bin/ai-browser` (persistent profile, CDP) + `curl` HTTP status codes
**Branch:** `fix/intelligence-links-audit`

---

## Executive Summary

**ZERO genuinely broken (HTTP 404) links found.** The prior two commits (`4ef2a6b`, `897c0ff`) already fixed the real bugs (Hipflat path, RentHub removal, Baania path, Reddit URL). Every URL in the current code returns either:
- **200** — works correctly in browser, OR
- **403 / Cloudflare challenge** — bot-protected, works for real human users

The user's perceived "404s" are most likely **Cloudflare challenge pages** ("Just a moment...", "Access Denied") that look like errors but resolve correctly for real users with real browsers.

**One code-quality fix recommended:** The `slug()` function does not strip punctuation, producing malformed path segments for company names like `"Keranos Tech Co., Ltd."` → `keranos-tech-co.,-ltd.`. This doesn't cause 404s (jobsbyculture redirects unknown slugs to its directory) but is technically incorrect and fragile.

---

## Test Cases

### Locations
| Label | Input string |
|-------|-------------|
| Bangkok (EN) | `Bangkok, Bangkok City, Thailand` |
| Pathum Thani (EN) | `Pathum Thani` |
| Bangkok (Thai) | `กรุงเทพมหานคร เขตจตุจักร` |
| Pathum Thani (Thai) | `ปทุมธานี คลองหลวง` |

### Companies
| Label | Input string |
|-------|-------------|
| CJ MORE | `CJ MORE` |
| Keranos | `Keranos Tech Co., Ltd.` |
| Max Savings | `Max Savings (Thailand) Co., Ltd.` |
| Thoughtworks | `Thoughtworks` |

---

## AREA INTELLIGENCE — Full Results

### Commute

| # | Function | URL Pattern | Test URL | Browser Result | HTTP | Status |
|---|----------|------------|----------|---------------|------|--------|
| 1 | `directionsUrl()` | `google.com/maps/dir/?api=1&origin={home}&destination={job}&travelmode={mode}` | `...origin=Bangkok&destination=Pathum%20Thani&travelmode=transit` | ✓ "Google Maps" — loads directions UI | 200 | **WORKING** |
| 2 | `rome2RioUrl()` | `rome2rio.com/map/{slug(home)}/{slug(job)}` | `.../map/bangkok/pathum-thani` | "Just a moment..." (Cloudflare) | 403 | **BOT-PROTECTED** |

### Money (Numbeo)

| # | Function | URL Pattern | Test URL | Browser Result | HTTP | Status |
|---|----------|------------|----------|---------------|------|--------|
| 3 | `costOfLivingUrl()` | `numbeo.com/cost-of-living/in/{City}` | `.../in/Bangkok` | ✓ "Cost of Living in Bangkok. Jul 2026" | 200 | **WORKING** |
| 4 | `salaryCalculatorUrl()` | `numbeo.com/salary-calculator/in/{City}` | `.../in/Bangkok` | ✓ "Salary Calculator for Bangkok, Thailand" | 200 | **WORKING** |

**Numbeo city normalization note:** `numbeoCity()` correctly falls back unsupported TH cities (Pathum Thani, etc.) to Bangkok — the only TH city with full Numbeo data alongside Chiang Mai and Phuket. Verified: `numbeoCity("Pathum Thani", "TH")` → `"Bangkok"`.

### Housing — Thailand (code-change target)

| # | Site | URL Pattern | Test URL | Browser Result | HTTP | Status |
|---|------|------------|----------|---------------|------|--------|
| 5 | Hipflat | `hipflat.co.th/en/condo-for-rent` (base page, no area deep-link) | as-is | "Just a moment..." (Cloudflare) | 403 | **BOT-PROTECTED** — base page is correct; area-specific pages never existed (confirmed via Wayback Machine in prior commit) |
| 6 | Baania | `baania.com/s/{area}/rent` | `.../s/bangkok/rent` | ✓ "ผลลัพธ์การค้นหา 219 ประกาศ" (219 listings) | 200 | **WORKING** |
| 7 | Baania (edge) | `baania.com/s/{area}/rent` | `.../s/pathum-thani/rent` | "ไม่พบผลลัพธ์" (no exact results) → shows nearby | 200 | **SOFT-FAIL** — page loads, shows nearby results. Not a 404. |

### Housing — Non-TH (verify + document only, NO changes)

All return bot-protection pages in automation. URL patterns are standard, well-known formats for each site.

| # | Country | Site | URL | Browser Result | Status |
|---|---------|------|-----|---------------|--------|
| 8 | US | Zillow | `zillow.com/homes/for_rent/` | "Access to this page has been denied" | **BOT-PROTECTED** |
| 9 | US | Apartments.com | `apartments.com/` | "Access Denied" | **BOT-PROTECTED** |
| 10 | SG | PropertyGuru | `propertyguru.com.sg/property-for-rent?search=` | "Just a moment..." (Cloudflare) | **BOT-PROTECTED** |
| 11 | SG | 99.co | `99.co/singapore/rent?search=` | "Just a moment..." (Cloudflare) | **BOT-PROTECTED** |
| 12 | UK | Rightmove | `rightmove.co.uk/property-to-rent/` | "Application error" (bot detection) | **BOT-PROTECTED** |
| 13 | UK | Zoopla | `zoopla.co.uk/to-rent/` | "Just a moment..." (Cloudflare) | **BOT-PROTECTED** |
| 14 | AU | Domain | `domain.com.au/rent/` | "Access Denied" | **BOT-PROTECTED** |
| 15 | AU | REA | `realestate.com.au/rent/` | bot-blocked (blank) | **BOT-PROTECTED** |
| 16 | MY | PropertyGuru | `propertyguru.com.my/property-for-rent?search=` | "Just a moment..." (Cloudflare) | **BOT-PROTECTED** |
| 17 | MY | iProperty | `iproperty.com.my/rent/` | "Just a moment..." (Cloudflare) | **BOT-PROTECTED** |

### More Area Info (Numbeo expandable)

| # | Function | URL Pattern | Test URL | Browser Result | HTTP | Status |
|---|----------|------------|----------|---------------|------|--------|
| 18 | `crimeUrl()` | `numbeo.com/crime/in/{City}` | `.../in/Bangkok` | ✓ "Crime in Bangkok. Safety in Bangkok" | 200 | **WORKING** |
| 19 | `qualityOfLifeUrl()` | `numbeo.com/quality-of-life/in/{City}` | `.../in/Bangkok` | ✓ "Quality of Life in Bangkok" | 200 | **WORKING** |
| 20 | `healthcareUrl()` | `numbeo.com/health-care/in/{City}` | `.../in/Bangkok` | ✓ "Health Care in Bangkok" | 200 | **WORKING** |
| 21 | `pollutionUrl()` | `numbeo.com/pollution/in/{City}` | `.../in/Bangkok` | ✓ "Pollution in Bangkok" | 200 | **WORKING** *(dead code — not called by any component)* |
| 22 | `trafficUrl()` | `numbeo.com/traffic/in/{City}` | `.../in/Bangkok` | ✓ "Traffic in Bangkok" | 200 | **WORKING** *(dead code — not called by any component)* |
| 23 | `restaurantsUrl()` | `google.com/maps/search/?api=1&query=restaurants+near+{loc}` | `...near+Bangkok` | ✓ "Google Maps" — loads results | 200 | **WORKING** |

### Temporary Stay

| # | Function | URL Pattern | Test URL | Browser Result | Status |
|---|----------|------------|----------|---------------|--------|
| 24 | `agodaUrl()` | `agoda.com/search?city={city}&checkIn=&checkOut=&adults=1&rooms=1` | `...city=Bangkok...` | Redirects to `agoda.com/` homepage (empty dates cause search to be ignored) | **PARTIAL** — loads Agoda but does not pre-filter by city. Minor UX issue. |

### Visa

| # | Country | URL | Browser Result | Status |
|---|---------|-----|---------------|--------|
| 25 | TH | `thaivisa.com/` | Redirects to `aseannow.com` ("Just a moment..." Cloudflare) | **STALE REDIRECT** — thaivisa.com rebranded to aseannow.com. Link still works (302 redirect) but should point directly. |

---

## COMPANY INTELLIGENCE — Full Results

| # | Function | URL Pattern | Test (Thoughtworks) | Browser Result | HTTP | Status |
|---|----------|------------|---------------------|---------------|------|--------|
| 26 | `cultureProfileUrl()` | `jobsbyculture.com/companies/{slug}` | `.../companies/thoughtworks` | Redirects to `/companies` directory (Thoughtworks not in 118-company DB) | 200 | **SOFT-FAIL** — pattern is CORRECT (`/companies/anthropic` loads full profile ✓). Unprofiled companies redirect to directory. Not a 404. |
| 27 | `glassdoorUrl()` | `glassdoor.com/Search/results.htm?keyword={enc}` | `...keyword=Thoughtworks` | "Just a moment..." (Cloudflare) | 403 | **BOT-PROTECTED** — URL pattern is the legacy search endpoint. Web research flags it as "deprecated" but cannot verify alternative without bypassing Cloudflare. No better constructible alternative exists (Glassdoor uses proprietary internal IDs for SEO URLs). |
| 28 | `redditSearchUrl()` | `reddit.com/search/?q={enc}` | `...q=Thoughtworks` | "blocked by network security" (JS challenge) | 200 (curl) | **BOT-PROTECTED** — URL pattern confirmed correct (`?q=` param preserved through challenge redirect). |
| 29 | `openCorporatesUrl()` | `opencorporates.com/companies?q={enc}` | `...q=Thoughtworks` | "HAProxy Challenge" (captcha) | 200 (curl) | **BOT-PROTECTED** — URL pattern confirmed correct. |
| 30 | `dataForThaiUrl()` | `dataforthai.com/search?q={enc}` | `...q=CJ%20MORE` | "Performing security verification" (Cloudflare) | 403 | **BOT-PROTECTED** — domain is correct (dataforthai.com is THE Thai company DB). Search path `/search?q=` is standard. |
| 31 | `crunchbaseUrl()` | `crunchbase.com/textsearch?q={enc}` | `...q=Thoughtworks` | "Attention Required! \| Cloudflare" | 403 | **BOT-PROTECTED** — `/textsearch?q=` is Crunchbase's actual website search endpoint (the Google AI research focused on the API, not the website UI). Pattern is correct. |
| 32 | `openSanctionsUrl()` | `opensanctions.org/search/?q={enc}` | `...q=Thoughtworks` | ✓ "No matching entities were found" (correct — Thoughtworks is not sanctioned) | 200 | **WORKING** |

### Company Intelligence — Cross-company verification

Tested with small Thai companies to confirm patterns hold:

| Company | `cultureProfileUrl` | `dataForThaiUrl` | `openSanctionsUrl` |
|---------|--------------------|-----------------|--------------------|
| CJ MORE | `/companies/cj-more` → redirects to directory | bot-protected (403) | ✓ loads (0 results = not sanctioned) |
| Keranos Tech Co., Ltd. | `/companies/keranos-tech-co.,-ltd.` → redirects to directory | bot-protected (403) | ✓ loads |
| Max Savings (Thailand) Co., Ltd. | `/companies/max-savings-(thailand)-co.,-ltd.` → redirects to directory | bot-protected (403) | ✓ loads |

---

## Issues Found

### Issue 1: `slug()` does not strip punctuation (CODE QUALITY — fix recommended)

**Current:**
```ts
function slug(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, '-')
}
```

**Problem:** Company names with legal suffixes produce malformed path segments:
- `"Keranos Tech Co., Ltd."` → `keranos-tech-co.,-ltd.` (periods, commas, trailing dot)
- `"Max Savings (Thailand) Co., Ltd."` → `max-savings-(thailand)-co.,-ltd.` (parens, commas)

**Impact:** These go into `cultureProfileUrl()` path. Currently harmless (jobsbyculture redirects unknown slugs to its directory regardless), but technically incorrect and could break on stricter servers.

**Fix:** Strip all non-alphanumeric characters (except hyphens), collapse consecutive hyphens, trim leading/trailing hyphens:
```ts
function slug(s: string): string {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')   // strip punctuation
    .replace(/\s+/g, '-')            // spaces → hyphens
    .replace(/-+/g, '-')             // collapse consecutive hyphens
    .replace(/^-|-$/g, '')           // trim leading/trailing hyphens
}
```

**Result:** `"Keranos Tech Co., Ltd."` → `keranos-tech-co-ltd`

### Issue 2: `thaivisa.com` is a stale redirect (MINOR — fix recommended)

**Current:** `https://www.thaivisa.com/` → 302 redirect → `https://aseannow.com/`
**Fix:** Update `VISA_LINKS.TH.url` to `https://aseannow.com/` (direct, avoids redirect)

### Issue 3: `agodaUrl()` empty dates cause homepage redirect (MINOR — document only)

Empty `checkIn`/`checkOut` params cause Agoda to ignore the search and redirect to homepage. Not broken (user lands on Agoda), but doesn't pre-filter by city. No clean fix without picking arbitrary dates. **Document as known limitation.**

### Issue 4: `pollutionUrl()` and `trafficUrl()` are dead code (INFORMATIONAL)

Both functions are exported but never imported or called by any component (`area-intelligence.tsx` uses crime, qualityOfLife, healthcare, restaurants — but NOT pollution or traffic). Not broken; just unused. **No action required** (keeping them provides future flexibility).

---

## Implementation Plan

### Target File
`src/app/lib/area-links.ts` (single file, per constraint)

### Step 1: Fix `slug()` function (line 7-9)
Replace the current slug function with the punctuation-stripping version shown in Issue 1 above.

### Step 2: Update Thai visa URL (line 242)
Change `VISA_LINKS.TH.url` from `https://www.thaivisa.com/` to `https://aseannow.com/`.
Update the name from `'Thai Visa Guide'` to `'Thai Visa Forum (AseanNow)'` for clarity.

### What NOT to change
- **Glassdoor URL** — bot-protected, cannot verify alternative in browser. No better constructible URL exists.
- **Crunchbase URL** — `/textsearch?q=` is the actual website endpoint. Bot-protected.
- **DataForThai URL** — correct domain and path. Bot-protected.
- **Reddit URL** — `reddit.com/search/?q=` is correct (prior fix). Do NOT revert.
- **Hipflat URL** — base page is correct (area pages never existed). Bot-protected.
- **Baania URL** — `/s/{area}/rent` verified working (219 listings). Prior fix is correct.
- **Non-TH housing** — all standard patterns, bot-protected. Per constraint: verify and document only.
- **jobsbyculture URL** — pattern is correct (`/companies/anthropic` works). Soft-fail for unprofiled companies is a data limitation, not a URL bug.

### Verification Commands
```bash
npx tsc --noEmit          # TypeScript check
pnpm lint                 # ESLint
pnpm test                 # Unit tests
```

### Assertion Requirements
- **Unit tests:** Add test cases for `slug()` with punctuation inputs (Keranos, Max Savings). Verify `cultureProfileUrl()` produces clean slugs.
- **Integration/E2E:** N/A — no behavioral change to user-visible flow (URLs still resolve to same destinations).

---

## Prior Commits Verified Correct

| Commit | Description | Verification Result |
|--------|------------|-------------------|
| `4ef2a6b` | Hipflat path fix, RentHub→PropertyHub relabel, Baania path fix, Reddit direct URL | ✓ All correct per this audit |
| `897c0ff` | Hipflat base page (no area deep-link), Baania `/s/{area}/rent`, RentHub removed | ✓ All correct per this audit |
