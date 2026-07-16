# Phase 2 — Intelligence Links (Area + Company)

> **Time:** 2-3 hours
> **Depends on:** Phase 1 (panel must exist to add links into it)
> **Cost:** $0 — all links are free URL builders, no API keys needed

## What & Why

When a user looks at a job, they have questions that NO competitor answers:
- "How do I get there? How much does it cost?"
- "Can I afford to live near this office?"
- "Is this company legitimate? Do employees like it?"
- "Can I legally work there (visa)?"
- "Is this area safe?"

We answer ALL of these with **free URL links** — no API integration, no scraping, no iframe embedding. Just URL builders that open external sites with pre-filled queries.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  Job Detail Panel                                    │
│                                                      │
│  ┌─ AREA INTELLIGENCE ──────────────────────────┐   │
│  │                                               │   │
│  │  COMMUTE                                      │   │
│  │  [Directions →]  ← Google Maps URL (free)    │   │
│  │  [Travel Prices →] ← Rome2Rio URL (free)     │   │
│  │                                               │   │
│  │  MONEY                                        │   │
│  │  [Cost of Living →] ← Numbeo URL (free)      │   │
│  │  [Salary Check →] ← Numbeo URL (free)        │   │
│  │                                               │   │
│  │  HOUSING (country-specific)                   │   │
│  │  [Hipflat →] [PropertyHub →] [Baania →]     │   │
│  │  (Thailand) OR [Zillow →] (USA) etc.         │   │
│  │                                               │   │
│  │  EXPANDABLE "MORE":                           │   │
│  │  [Temp Stay →] ← Agoda                       │   │
│  │  [Visa →] ← Country-specific                  │   │
│  │  [Safety →] ← Numbeo crime                   │   │
│  │  [Quality of Life →] ← Numbeo                 │   │
│  │  [Healthcare →] ← Numbeo                      │   │
│  │                                               │   │
│  └───────────────────────────────────────────────┘   │
│                                                      │
│  ┌─ COMPANY INTELLIGENCE ───────────────────────┐   │
│  │                                               │   │
│  │  [Culture Profile →] ← jobsbyculture.com     │   │
│  │  [Reddit →] ← Google search site:reddit.com  │   │
│  │  [Registry →] ← OpenCorporates               │   │
│  │  [Financials →] ← DataForThai / Crunchbase   │   │
│  │  [Background →] ← OpenSanctions              │   │
│  │                                               │   │
│  └───────────────────────────────────────────────┘   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## Files to Create

### 1. `src/app/lib/area-links.ts` (NEW — URL builder functions)

```typescript
// ═══════════════════════════════════════════════════════════════
// AREA INTELLIGENCE — URL builders
// All 100% free. No API key. Just construct URLs and open in new tab.
// ═══════════════════════════════════════════════════════════════

function slug(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, '-')
}

function enc(s: string): string {
  return encodeURIComponent(s.trim())
}

// ── COMMUTE ──

/** Google Maps directions — shows BTS/MRT/bus/motorcycle routing + step-by-step */
export function directionsUrl(home: string, jobLocation: string, mode: 'transit' | 'driving' | 'walking' | 'two_wheeler' = 'transit'): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${enc(home)}&destination=${enc(jobLocation)}&travelmode=${mode}`
}

/** Rome2Rio — shows price for EVERY transport mode + time + frequency */
export function rome2RioUrl(home: string, jobLocation: string): string {
  return `https://www.rome2rio.com/map/${enc(slug(home))}/${enc(slug(jobLocation))}`
}

// ── MONEY ──

/** Numbeo cost of living — food, rent, transport, utilities, groceries */
export function costOfLivingUrl(city: string): string {
  return `https://www.numbeo.com/cost-of-living/in/${enc(city.replace(/\s+/g, '-'))}`
}

/** Numbeo salary calculator — "is this offer fair for this city?" */
export function salaryCalculatorUrl(city: string): string {
  return `https://www.numbeo.com/salary-calculator/in/${enc(city.replace(/\s+/g, '-'))}`
}

// ── HOUSING (country-specific lookup) ──

export interface PropertySite {
  name: string
  url: string
}

export const PROPERTY_SITES: Record<string, PropertySite[]> = {
  TH: [
    { name: 'Hipflat', url: 'https://www.hipflat.co.th/en/condo-for-rent/' },
    { name: 'PropertyHub', url: 'https://www.propertyhub.in.th/search?q=' },
    { name: 'Baania', url: 'https://baania.com/condo-for-rent?q=' },
  ],
  US: [
    { name: 'Zillow', url: 'https://www.zillow.com/homes/for_rent/' },
    { name: 'Apartments.com', url: 'https://www.apartments.com/' },
  ],
  SG: [
    { name: 'PropertyGuru', url: 'https://www.propertyguru.com.sg/property-for-rent?search=' },
    { name: '99.co', url: 'https://www.99.co/singapore/rent?search=' },
  ],
  UK: [
    { name: 'Rightmove', url: 'https://www.rightmove.co.uk/property-to-rent/' },
    { name: 'Zoopla', url: 'https://www.zoopla.co.uk/to-rent/' },
  ],
  AU: [
    { name: 'Domain', url: 'https://www.domain.com.au/rent/' },
    { name: 'REA', url: 'https://www.realestate.com.au/rent/' },
  ],
  MY: [
    { name: 'PropertyGuru', url: 'https://www.propertyguru.com.my/property-for-rent?search=' },
    { name: 'iProperty', url: 'https://www.iproperty.com.my/rent/' },
  ],
}

/** Returns property sites for a country code, or empty array if unknown */
export function getPropertySites(countryCode: string): PropertySite[] {
  return PROPERTY_SITES[countryCode.toUpperCase()] || []
}

/** Build full housing search URL for a specific site + area */
export function housingUrl(site: PropertySite, area: string): string {
  return `${site.url}${enc(area)}`
}

// ── TEMPORARY STAY ──

/** Agoda hotel search near a location */
export function agodaUrl(city: string): string {
  // Agoda city search — user picks dates themselves
  return `https://www.agoda.com/search?city=${enc(city)}&checkIn=&checkOut=&adults=1&rooms=1`
}

// ── VISA (country-specific) ──

export const VISA_LINKS: Record<string, { name: string; url: string }> = {
  TH: { name: 'Thai Visa Guide', url: 'https://www.thaivisa.com/' },
  US: { name: 'USCIS Working in US', url: 'https://www.uscis.gov/working-in-the-united-states' },
  SG: { name: 'MOM Singapore Passes', url: 'https://www.mom.gov.sg/passes-and-permits' },
  UK: { name: 'UK Skilled Worker Visa', url: 'https://www.gov.uk/skilled-worker-visa' },
  AU: { name: 'AU Work Visas', url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing' },
  CA: { name: 'Canada Work Permits', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada.html' },
  DE: { name: 'Germany Work Visa', url: 'https://www.make-it-in-germany.com/en/visa' },
  JP: { name: 'Japan Work Visa', url: 'https://www.mofa.go.jp/j_info/visit/visa/' },
}

export function visaUrl(countryCode: string): { name: string; url: string } | null {
  return VISA_LINKS[countryCode.toUpperCase()] || null
}

// ── AREA QUALITY (Numbeo expandable) ──

export function crimeUrl(city: string): string {
  return `https://www.numbeo.com/crime/in/${enc(city.replace(/\s+/g, '-'))}`
}

export function qualityOfLifeUrl(city: string): string {
  return `https://www.numbeo.com/quality-of-life/in/${enc(city.replace(/\s+/g, '-'))}`
}

export function healthcareUrl(city: string): string {
  return `https://www.numbeo.com/health-care/in/${enc(city.replace(/\s+/g, '-'))}`
}

export function pollutionUrl(city: string): string {
  return `https://www.numbeo.com/pollution/in/${enc(city.replace(/\s+/g, '-'))}`
}

export function trafficUrl(city: string): string {
  return `https://www.numbeo.com/traffic/in/${enc(city.replace(/\s+/g, '-'))}`
}

export function restaurantsUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=restaurants+near+${enc(location)}`
}

// ═══════════════════════════════════════════════════════════════
// COMPANY INTELLIGENCE — URL builders
// ═══════════════════════════════════════════════════════════════

/** jobsbyculture.com — culture profile with Glassdoor rating, pros/cons, values */
export function cultureProfileUrl(company: string): string {
  return `https://jobsbyculture.com/companies/${slug(company)}`
}

/** Reddit discussions — real employee opinions */
export function redditSearchUrl(company: string): string {
  return `https://www.google.com/search?q=${enc(company + ' site:reddit.com')}`
}

/** OpenCorporates — is this company legally registered? */
export function openCorporatesUrl(company: string): string {
  return `https://opencorporates.com/companies?q=${enc(company)}`
}

/** DataForThai — Thai company financial data (Thailand only) */
export function dataForThaiUrl(company: string): string {
  return `https://www.dataforthai.com/search?q=${enc(company)}`
}

/** Crunchbase — funding, valuation, employee count (global, tech focus) */
export function crunchbaseUrl(company: string): string {
  return `https://crunchbase.com/textsearch?q=${enc(company)}`
}

/** OpenSanctions — is this company or directors sanctioned? */
export function openSanctionsUrl(company: string): string {
  return `https://opensanctions.org/search/?q=${enc(company)}`
}

/** Glassdoor — employee reviews directly */
export function glassdoorUrl(company: string): string {
  return `https://www.glassdoor.com/Search/results.htm?keyword=${enc(company)}`
}
```

### 2. `src/app/components/pipeline/area-intelligence.tsx` (NEW — area section UI)

Renders the area intelligence link buttons section. Takes `job` and `homeLocation` props.

```tsx
'use client'

import { MapPin, Bus, DollarSign, Home, Hotel, Shield, Star, HeartPulse, Cloud, Car, UtensilsCrossed, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import * as Links from '~/lib/area-links'

interface AreaIntelligenceProps {
  job: {
    company: string
    loc: string
    title: string
  }
  homeLocation: string  // from user settings
  city: string          // extracted city name for Numbeo
  countryCode: string   // detected country code for property/visa
}

export function AreaIntelligence({ job, homeLocation, city, countryCode }: AreaIntelligenceProps) {
  const [expanded, setExpanded] = useState(false)
  const propertySites = Links.getPropertySites(countryCode)
  const visa = Links.visaUrl(countryCode)

  return (
    <div className="space-y-3">
      {/* COMMUTE */}
      <Section label="Commute">
        <LinkButton href={Links.directionsUrl(homeLocation, job.loc)} icon={<Bus size={14} />} label="Directions" />
        <LinkButton href={Links.rome2RioUrl(homeLocation, job.loc)} icon={<DollarSign size={14} />} label="Travel Prices" />
      </Section>

      {/* MONEY */}
      <Section label="Money">
        <LinkButton href={Links.costOfLivingUrl(city)} icon={<DollarSign size={14} />} label="Cost of Living" />
        <LinkButton href={Links.salaryCalculatorUrl(city)} icon={<DollarSign size={14} />} label="Salary Check" />
      </Section>

      {/* HOUSING */}
      {propertySites.length > 0 && (
        <Section label="Housing">
          {propertySites.map(site => (
            <LinkButton key={site.name} href={Links.housingUrl(site, city)} icon={<Home size={14} />} label={site.name} />
          ))}
        </Section>
      )}

      {/* EXPANDABLE MORE */}
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        More area info
      </button>

      {expanded && (
        <div className="space-y-2">
          <LinkButton href={Links.agodaUrl(city)} icon={<Hotel size={14} />} label="Temporary Stay" />
          {visa && <LinkButton href={visa.url} icon={<Shield size={14} />} label={visa.name} />}
          <LinkButton href={Links.crimeUrl(city)} icon={<Shield size={14} />} label="Safety / Crime" />
          <LinkButton href={Links.qualityOfLifeUrl(city)} icon={<Star size={14} />} label="Quality of Life" />
          <LinkButton href={Links.healthcareUrl(city)} icon={<HeartPulse size={14} />} label="Healthcare" />
          <LinkButton href={Links.restaurantsUrl(job.loc)} icon={<UtensilsCrossed size={14} />} label="Restaurants Nearby" />
        </div>
      )}
    </div>
  )
}

// ── Helper components ──

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label-mono px-2.5 pt-3 pb-1">{label}</div>
      <div className="flex flex-wrap gap-1.5 px-1">{children}</div>
    </div>
  )
}

function LinkButton({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-sidebar-hover"
    >
      {icon}
      {label}
      <ExternalLink size={10} className="opacity-40" />
    </a>
  )
}
```

### 3. `src/app/components/pipeline/company-intelligence.tsx` (NEW — company section UI)

```tsx
'use client'

import { Building2, MessageCircle, FileCheck, DollarSign, ShieldAlert } from 'lucide-react'
import * as Links from '~/lib/area-links'

interface CompanyIntelligenceProps {
  company: string
  countryCode: string
}

export function CompanyIntelligence({ company, countryCode }: CompanyIntelligenceProps) {
  return (
    <div>
      <div className="label-mono px-2.5 pt-3 pb-1">Is this company good?</div>
      <div className="flex flex-wrap gap-1.5 px-1">
        <LinkButton href={Links.cultureProfileUrl(company)} icon={<Building2 size={14} />} label="Culture Profile" />
        <LinkButton href={Links.glassdoorUrl(company)} icon={<Star size={14} />} label="Reviews" />
        <LinkButton href={Links.redditSearchUrl(company)} icon={<MessageCircle size={14} />} label="Reddit" />
        <LinkButton href={Links.openCorporatesUrl(company)} icon={<FileCheck size={14} />} label="Registry" />
        {countryCode === 'TH' ? (
          <LinkButton href={Links.dataForThaiUrl(company)} icon={<DollarSign size={14} />} label="Financials" />
        ) : (
          <LinkButton href={Links.crunchbaseUrl(company)} icon={<DollarSign size={14} />} label="Financials" />
        )}
        <LinkButton href={Links.openSanctionsUrl(company)} icon={<ShieldAlert size={14} />} label="Background" />
      </div>
    </div>
  )
}
```

## Files to Edit

### 4. `src/app/[locale]/(app)/settings/page.tsx` (EDIT — add home location field)

Add a "Home Location" text input to the settings page, under the Profile tab.

> **WARNING: This needs a DB column, not just UI.** The `userPreferences` table
> does NOT have a `homeLocation` column. You must add it:

**Step 1: Schema change** — `src/app/lib/schema.ts`, in `userPreferences` table:
```typescript
export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  emailNotifications: boolean("email_notifications").default(true).notNull(),
  weeklyDigest: boolean("weekly_digest").default(false).notNull(),
  marketingEmails: boolean("marketing_emails").default(false).notNull(),
  homeLocation: text("home_location"),  // ← ADD THIS
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
})
```

**Step 2: Generate migration:**
```bash
pnpm db:generate
pnpm db:migrate
```

**Step 3: Update preferences API** — `src/app/api/user/preferences/route.ts`:
- GET: return `homeLocation` in response
- PUT: accept `homeLocation` in body

**Step 4: Settings UI** — add to profile tab after Email section:
```tsx
<div>
  <label className="label-mono">Home Location</label>
  <input
    type="text"
    value={homeLocation}
    onChange={(e) => setHomeLocation(e.target.value)}
    placeholder="e.g. Bangna, Bangkok"
    className="..."
  />
  <p className="text-xs text-muted-foreground">
    Used for commute directions and travel price estimates
  </p>
</div>
```

> **Alternatively:** If you don't want another DB migration in Phase 2,
> store home location in `localStorage` only. It won't sync across
> devices but avoids schema changes. Upgrade to DB later.

### 5. `src/app/components/pipeline/job-detail-panel.tsx` (EDIT — import and render intelligence sections)

Add to the panel:
```tsx
import { AreaIntelligence } from './area-intelligence'
import { CompanyIntelligence } from './company-intelligence'

// Inside the panel render, after action buttons:
<AreaIntelligence job={job} homeLocation={homeLocation} city={extractCity(job.loc)} countryCode={detectCountry(job.loc)} />
<CompanyIntelligence company={job.company} countryCode={detectCountry(job.loc)} />
```

### 6. Country detection helper

Add to `src/app/lib/area-links.ts`:

```typescript
/** Extract city name from a location string like "Bang Rak, Bangkok, Thailand" */
export function extractCity(location: string): string {
  const parts = location.split(',').map(s => s.trim())
  // Return the second-to-last part (usually the city, not the country)
  if (parts.length >= 2) return parts[parts.length - 2]
  return parts[0] || location
}

/** Detect country code from location string */
export function detectCountry(location: string): string {
  const lower = location.toLowerCase()
  if (lower.includes('thailand') || lower.includes('bangkok') || lower.includes('chiang')) return 'TH'
  if (lower.includes('singapore')) return 'SG'
  if (lower.includes('united states') || lower.includes('usa') || lower.includes('new york') || lower.includes('san francisco')) return 'US'
  if (lower.includes('united kingdom') || lower.includes('london') || lower.includes('uk')) return 'UK'
  if (lower.includes('australia') || lower.includes('sydney') || lower.includes('melbourne')) return 'AU'
  if (lower.includes('malaysia') || lower.includes('kuala lumpur')) return 'MY'
  if (lower.includes('canada') || lower.includes('toronto') || lower.includes('vancouver')) return 'CA'
  if (lower.includes('germany') || lower.includes('berlin') || lower.includes('munich')) return 'DE'
  if (lower.includes('japan') || lower.includes('tokyo') || lower.includes('osaka')) return 'JP'
  return '' // unknown — show no country-specific links
}
```

## Acceptance Criteria

- [ ] Home location field in Settings page
- [ ] Google Maps directions link opens correct URL with home + job location
- [ ] Rome2Rio link opens with correct origin/destination
- [ ] Numbeo cost of living link opens correct city page
- [ ] Housing links show correct sites for detected country
- [ ] Company intelligence links all open correct URLs
- [ ] "More area info" expandable section works
- [ ] All links open in new tab (`target="_blank" rel="noopener noreferrer"`)
- [ ] No API calls needed — all pure URL construction
- [ ] `npx tsc --noEmit` passes
- [ ] `pnpm lint` passes
