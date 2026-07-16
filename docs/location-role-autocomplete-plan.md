# Technical Specification & Implementation Plan: Location & Role Autocomplete

This document provides a highly detailed, step-by-step implementation plan for adding autocomplete to the Location and Job Title fields on the Job Search page.

Follow these steps exactly. Do not skip any steps, and do not make independent design decisions.

---

## 1. File Map

| Action | Path | Description |
|---|---|---|
| **Create** | `src/data/cities.json` | Static dataset containing 250 countries and top 133 cities (already created) |
| **Create** | `src/data/job-titles.json` | Static dataset containing 1380 job titles (already created) |
| **Create** | `src/app/components/search/LocationAutocomplete.tsx` | Autocomplete component for location selection |
| **Create** | `src/app/components/search/RoleAutocomplete.tsx` | Autocomplete component for job title selection |
| **Modify** | `src/app/components/resume/job-search-panel.tsx` | Integrate the autocomplete components and handle state |
| **Modify** | `src/app/lib/job-sources/types.ts` | Add `countryCode` to search params |
| **Modify** | `src/app/api/jobs/search/route.ts` | Support `countryCode` in the schema and request body |
| **Modify** | `src/app/lib/job-sources/index.ts` | Pass `countryCode` to the source fetchers |
| **Modify** | `src/app/lib/job-sources/jobsdb-rest.ts` | Pass `where` city name and resolve countryCode |
| **Modify** | `src/app/lib/job-sources/adzuna.ts` | Accept `countryCode` and skip unsupported countries |
| **Modify** | `src/app/api/parse-resume/route.ts` | Nudge the AI prompt to use standard role titles |

---

## 2. Autocomplete Components

### 2a. Location Autocomplete
Create `src/app/components/search/LocationAutocomplete.tsx`. This component handles filtering cities and countries, displays flags, supports keyboard navigation (ArrowUp, ArrowDown, Enter, Esc), and syncs the "Remote Only" filter.

```typescript
'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { MapPin, X, Globe } from 'lucide-react'
import citiesData from '~/data/cities.json'

interface LocationAutocompleteProps {
  value: string
  onChange: (val: string) => void
  countryCode: string
  onSelectCountryCode: (code: string) => void
  onSelectRemoteOnly: (remote: boolean) => void
  onKeyDownEnter: () => void
}

export function LocationAutocomplete({
  value,
  onChange,
  countryCode,
  onSelectCountryCode,
  onSelectRemoteOnly,
  onKeyDownEnter,
}: LocationAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  // 1. Resolve flag emoji from country code
  const getFlag = (code: string) => {
    if (!code || code.length !== 2) return ''
    return code
      .toUpperCase()
      .split('')
      .map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
      .join('')
  }

  // 2. Filter countries and cities based on search input
  const suggestions = useMemo(() => {
    const q = value.toLowerCase().trim()
    
    // Always provide remote option
    const remoteOption = { type: 'remote', label: '🌐 Remote', value: 'Remote', countryCode: '' }
    
    if (!q) {
      // Default suggestions when empty: Remote + Top countries/cities in SEA
      const defaults = [
        remoteOption,
        { type: 'country', label: '🇹🇭 Thailand', value: 'Thailand', countryCode: 'TH' },
        { type: 'city', label: '🇹🇭 Bangkok, Thailand', value: 'Bangkok', countryCode: 'TH' },
        { type: 'country', label: '🇸🇬 Singapore', value: 'Singapore', countryCode: 'SG' },
      ]
      return defaults
    }

    const filtered: Array<{ type: string; label: string; value: string; countryCode: string }> = []
    
    // Remote match
    if ('remote'.includes(q) || 'wfh'.includes(q) || 'work from home'.includes(q)) {
      filtered.push(remoteOption)
    }

    // Match countries
    const matchingCountries = citiesData.countries
      .filter(c => c.name.toLowerCase().includes(q))
      .slice(0, 3)
      .map(c => ({
        type: 'country',
        label: `${getFlag(c.code)} ${c.name}`,
        value: c.name,
        countryCode: c.code,
      }))
    filtered.push(...matchingCountries)

    // Match cities
    const matchingCities = citiesData.cities
      .filter(c => c.city.toLowerCase().includes(q) || c.country.toLowerCase().includes(q))
      .slice(0, 5)
      .map(c => ({
        type: 'city',
        label: `${getFlag(c.code)} ${c.city}, ${c.country}`,
        value: c.city,
        countryCode: c.code,
      }))
    filtered.push(...matchingCities)

    return filtered
  }, [value])

  // 3. Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 4. Handle selection
  const handleSelect = (item: typeof suggestions[number]) => {
    if (item.type === 'remote') {
      onChange('Remote')
      onSelectCountryCode('')
      onSelectRemoteOnly(true)
    } else {
      onChange(item.value)
      onSelectCountryCode(item.countryCode)
      onSelectRemoteOnly(false)
    }
    setIsOpen(false)
    setActiveIndex(-1)
  }

  // 5. Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true)
      } else if (e.key === 'Enter') {
        onKeyDownEnter()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex(prev => (prev + 1) % suggestions.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex(prev => (prev - 1 + suggestions.length) % suggestions.length)
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          handleSelect(suggestions[activeIndex])
        } else {
          onKeyDownEnter()
          setIsOpen(false)
        }
        break
      case 'Escape':
        setIsOpen(false)
        setActiveIndex(-1)
        break
    }
  }

  return (
    <div ref={containerRef} className="relative w-[150px]">
      <MapPin size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          onSelectCountryCode('') // Reset code on typing custom value
          setIsOpen(true)
          setActiveIndex(-1)
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Location…"
        className="w-full rounded-sm border border-border bg-background py-1.5 pl-8 pr-6 text-[12px] outline-none focus:border-primary"
      />
      {value && (
        <button
          onClick={() => {
            onChange('')
            onSelectCountryCode('')
            setActiveIndex(-1)
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X size={10} />
        </button>
      )}

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-[220px] overflow-y-auto rounded-sm border border-border bg-card shadow-lg">
          {suggestions.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(item)}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] transition-colors ${
                idx === activeIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-muted/50 text-foreground'
              }`}
            >
              {item.type === 'remote' ? (
                <Globe size={11} className="text-primary" />
              ) : (
                <span className="text-[12px]" role="img" aria-label="flag">
                  {getFlag(item.countryCode)}
                </span>
              )}
              <span className="truncate">{item.type === 'remote' ? item.label : `${item.value}, ${item.countryCode}`}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

### 2b. Role Autocomplete
Create `src/app/components/search/RoleAutocomplete.tsx`.

```typescript
'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import titlesData from '~/data/job-titles.json'

interface RoleAutocompleteProps {
  value: string
  onChange: (val: string) => void
  onKeyDownEnter: () => void
}

export function RoleAutocomplete({
  value,
  onChange,
  onKeyDownEnter,
}: RoleAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter job titles based on query
  const suggestions = useMemo(() => {
    const q = value.toLowerCase().trim()
    if (q.length < 2) return []

    return titlesData
      .filter(t => t.toLowerCase().includes(q))
      .slice(0, 8)
  }, [value])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (title: string) => {
    onChange(title)
    setIsOpen(false)
    setActiveIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true)
      } else if (e.key === 'Enter') {
        onKeyDownEnter()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex(prev => (prev + 1) % suggestions.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex(prev => (prev - 1 + suggestions.length) % suggestions.length)
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          handleSelect(suggestions[activeIndex])
        } else {
          onKeyDownEnter()
          setIsOpen(false)
        }
        break
      case 'Escape':
        setIsOpen(false)
        setActiveIndex(-1)
        break
    }
  }

  return (
    <div ref={containerRef} className="relative flex-1 min-w-[200px]">
      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setIsOpen(true)
          setActiveIndex(-1)
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Job title or keywords…"
        className="w-full rounded-sm border border-border bg-background py-1.5 pl-8 pr-6 text-[12px] outline-none focus:border-primary"
      />
      {value && (
        <button
          onClick={() => {
            onChange('')
            setActiveIndex(-1)
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X size={10} />
        </button>
      )}

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-[220px] overflow-y-auto rounded-sm border border-border bg-card shadow-lg">
          {suggestions.map((title, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(title)}
              className={`block w-full px-3 py-1.5 text-left text-[11px] transition-colors ${
                idx === activeIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-muted/50 text-foreground'
              }`}
            >
              {title}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## 3. Frontend Wiring

### 3a. Update imports in `src/app/components/resume/job-search-panel.tsx`
Add imports for the components:
```typescript
import { LocationAutocomplete } from '../search/LocationAutocomplete'
import { RoleAutocomplete } from '../search/RoleAutocomplete'
```

### 3b. Add state for `countryCode` in `job-search-panel.tsx`
Right below the state declarations for `query` and `location` (line 85-86):
```typescript
  const [query, setQuery] = useState(resume.role || fallbackQuery)
  const [location, setLocation] = useState(resume.location || '')
  const [countryCode, setCountryCode] = useState('') // ← ADD THIS STATE
```

### 3c. Update the fetch body in `handleSearch` (line 238 and line 271)
Pass the `countryCode` to the API calls and filter out "Remote" string when sending to backend:
```typescript
      // ── Phase 1 API Call (around line 238) ──
      const fastRes = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          location: (loc ?? location)?.trim().toLowerCase() === 'remote' ? undefined : (loc ?? location)?.trim() || undefined,
          countryCode: countryCode || undefined, // ← PASS STATE
          skills: resume.skills,
          role: resume.role,
          sources: FAST_FREE_SOURCES,
          limit: 100,
          fresh,
        }),
      })
```
And similarly for Phase 2 (around line 271):
```typescript
      // ── Phase 2 API Call (around line 271) ──
      const fullRes = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          location: (loc ?? location)?.trim().toLowerCase() === 'remote' ? undefined : (loc ?? location)?.trim() || undefined,
          countryCode: countryCode || undefined, // ← PASS STATE
          skills: resume.skills,
          role: resume.role,
          sources: FULL_FREE_SOURCES,
          limit: 100,
          fresh,
        }),
      })
```

Also, update `backgroundRefresh` in the same way (around line 140).

### 3d. Replace the raw HTML inputs (lines 490-511)
Replace the search inputs in the render block:
```typescript
          // REPLACE line 490-500:
          <RoleAutocomplete
            value={query}
            onChange={setQuery}
            onKeyDownEnter={() => handleSearch()}
          />
          
          // REPLACE line 501-511:
          <LocationAutocomplete
            value={location}
            onChange={setLocation}
            countryCode={countryCode}
            onSelectCountryCode={setCountryCode}
            onSelectRemoteOnly={(remote) => {
              setFilters(f => ({ ...f, remoteOnly: remote }))
            }}
            onKeyDownEnter={() => handleSearch()}
          />
```

---

## 4. Backend Updates

### 4a. Update `src/app/lib/job-sources/types.ts`
Modify `SearchParams` to add `countryCode` (line 51):
```typescript
export interface SearchParams {
  query: string
  location?: string
  countryCode?: string     // ← ADD THIS
  skills?: string[]
  role?: string
  sources?: JobSource[]
  limit?: number
  fresh?: boolean
}
```

### 4b. Update `src/app/api/jobs/search/route.ts`
Add `countryCode` to the Zod schema and pass it to `searchJobs`:
```typescript
// Line 10:
const SearchBody = z.object({
  query: z.string().min(2).max(200),
  location: z.string().max(100).optional(),
  countryCode: z.string().length(2).optional(), // ← ADD THIS
  skills: z.array(z.string().max(80)).max(50).optional(),
  role: z.string().max(100).optional(),
  sources: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  fresh: z.boolean().optional(),
})

// Line 29:
  const { query, location, countryCode, skills, role, sources, limit, fresh } = body.data

  const result = await searchJobs({
    query: query.trim(),
    location: location?.trim() || undefined,
    countryCode: countryCode || undefined, // ← PASS THIS
    skills: skills || [],
    role: role || undefined,
    sources: sources as JobSource[] | undefined,
    limit: limit || 30,
    fresh: fresh || false,
  })
```

### 4c. Update `src/app/lib/job-sources/index.ts`
Pass `countryCode` through to Adzuna and JobsDB REST:
```typescript
// Line 148:
  if (sources.includes('adzuna')) {
    fetchers.push(() => fetchAdzuna(query, location, { countryCode })) // ← PASS countryCode
    fetcherSources.push('adzuna')
  }

// Line 172:
  if (sources.includes('jobsdb-rest')) {
    fetchers.push(() => fetchJobsDBRest(query, location, { countryCode })) // ← PASS countryCode
    fetcherSources.push('jobsdb-rest')
  }
```

### 4d. Update `src/app/lib/job-sources/jobsdb-rest.ts`
Modify the parameters of `fetchJobsDBRest` to accept `countryCode` in options:
```typescript
export async function fetchJobsDBRest(
  query: string,
  location?: string,
  opts?: { signal?: AbortSignal; countryCode?: string }, // ← UPDATE THIS
): Promise<{ jobs: JobResult[]; error?: string }> {
  try {
    // 1. Get country code — use passed option first, fall back to parsing text
    const countryCode = opts?.countryCode || parseLocation(location).country

    // 2. Look up country in SEEK mapping
    const config = countryCode ? COUNTRY_MAP[countryCode] : null

    if (!config) {
      return { jobs: [] }
    }

    // 3. Build API URL with where parameter
    const params = new URLSearchParams()
    params.set('siteKey', config.siteKey)
    params.set('sourcesystem', 'houston')
    params.set('keywords', query.slice(0, 200))
    params.set('pageSize', '50')
    params.set('page', '1')
    params.set('sortmode', 'ListedDate')
    
    // Pass city as where parameter (only if location is not a country code or "Thailand")
    if (location && location !== countryCode && location.toLowerCase() !== 'thailand') {
      params.set('where', location) // ← SET City parameter
    }
```

### 4e. Update `src/app/lib/job-sources/adzuna.ts`
Modify `fetchAdzuna` to accept `countryCode` in options and prevent mapping Thailand/Singapore to the US:
```typescript
// Adzuna supported countries list
const ADZUNA_SUPPORTED = new Set(['at', 'au', 'be', 'br', 'ca', 'ch', 'de', 'es', 'fr', 'gb', 'in', 'it', 'mx', 'nl', 'nz', 'pl', 'sg', 'us', 'za'])

export async function fetchAdzuna(
  query: string,
  location?: string,
  opts?: { signal?: AbortSignal; countryCode?: string }, // ← UPDATE THIS
): Promise<{ jobs: JobResult[]; error?: string }> {
  const appId = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY

  if (!appId || !appKey) {
    return { jobs: [], error: 'No API key' }
  }

  try {
    // Get country code — prioritize passed option
    const country = (opts?.countryCode || resolveCountry(location)).toLowerCase()

    // If country is not supported by Adzuna, skip call and return empty immediately
    if (!ADZUNA_SUPPORTED.has(country)) {
      return { jobs: [] } // ← SKIP unsupported countries
    }

    const baseUrl = `https://api.adzuna.com/v1/api/jobs/${country}/search/1`
```

---

## 5. AI Prompt Nudge

In `src/app/api/parse-resume/route.ts` at line 134:

Replace this guideline:
> `Infer the candidate's target job title based on their skills, projects, and work experience using career progression logic...`

With this nudge:
> `Infer the candidate's target job title using common standard industry terms (prefer "Software Engineer" over "SDE", "Frontend Developer" over "UI Developer"). If their most recent job title is an internship/student role...`

---

## 6. Verification Steps

To verify your work after completing the code modifications:

1. **Test Location Autocomplete UI**:
   - Type "thai" in the Location input. Confirm that `🇹🇭 Thailand` (country) and `🇹🇭 Bangkok, Thailand` (city) appear.
   - Choose `🌐 Remote`. Confirm that the input clears, the "Remote Only" filter chip turns ON.
   - Choose `🇹🇭 Bangkok, Thailand`. Confirm that the "Remote Only" filter chip turns OFF.

2. **Test Country-Level Search (Broad)**:
   - Select `🇹🇭 Thailand` in autocomplete, type "developer" and search.
   - Verify that JobsDB REST returns results and does not hit the US endpoint.

3. **Test City-Level Search (Narrow)**:
   - Select `🇹🇭 Bangkok, Thailand` and search.
   - Verify that JobsDB REST passes `where=Bangkok` in the URL (it can be inspected via logs/network console) and results are city-focused.

4. **Verify Adzuna Skip**:
   - Search for `react` in `🇹🇭 Thailand`.
   - Confirm that the Adzuna source count in the console is `0` (or fails silently/returns empty) without hitting the US endpoint.
