// ═══════════════════════════════════════════════════════════════
// GEO NORMALIZER
//
// Parses free-text location strings into structured country/region data.
// Uses `world-countries` (ISO 3166 standard) — no hardcoded data.
//
// Key functions:
//   parseLocation(text)  → { city?, country?, region?, isRemote? }
//   countryToFlag(code)  → "🇹🇭"
//   detectMacroRegion(text) → "APAC" | "EMEA" | "AMER" | undefined
//   isRegionCompatible(userCountry, jobRegionText) → boolean
// ═══════════════════════════════════════════════════════════════

import worldCountries from 'world-countries'

// ── Build lookup maps from ISO 3166 data ─────────────────────

interface CountryEntry {
  cca2: string
  region: string
  subregion: string
}

// Map: lowercase country name → ISO alpha-2 code
// Includes common name, official name, native names, and alt spellings
const nameToCode = new Map<string, string>()
// Map: ISO alpha-2 → { region, subregion }
const codeToGeo = new Map<string, CountryEntry>()

for (const c of worldCountries) {
  const code = c.cca2
  codeToGeo.set(code, { cca2: code, region: c.region, subregion: c.subregion })

  // Common + official English names
  if (c.name?.common) nameToCode.set(c.name.common.toLowerCase(), code)
  if (c.name?.official) nameToCode.set(c.name.official.toLowerCase(), code)

  // Native names (Thai, Arabic, Chinese, etc.)
  if (c.name?.native) {
    for (const lang of Object.values(c.name.native)) {
      if (lang?.common) nameToCode.set(lang.common.toLowerCase(), code)
      if (lang?.official) nameToCode.set(lang.official.toLowerCase(), code)
    }
  }

  // Alternative spellings (e.g., "United States of America")
  if (c.altSpellings) {
    for (const alt of c.altSpellings) {
      if (alt.length > 2) nameToCode.set(alt.toLowerCase(), code)
    }
  }
}

// Extra aliases not in ISO data (common job-board shorthand)
const ALIASES: Record<string, string> = {
  'usa': 'US', 'u.s.a': 'US', 'u.s.': 'US', 'america': 'US',
  'uk': 'GB', 'u.k.': 'GB', 'britain': 'GB', 'great britain': 'GB',
  'uae': 'AE', 'u.a.e.': 'AE',
  's.korea': 'KR', 'south korea': 'KR', 'korea': 'KR',
  'n.korea': 'KP', 'north korea': 'KP',
}
for (const [alias, code] of Object.entries(ALIASES)) {
  nameToCode.set(alias, code)
}

// ── Macro-region mapping (job-market conventions) ───────────
// Maps UN M49 regions to job-board macro-region keywords.
// These are NOT ISO — they're industry vocabulary.
const MACRO_REGIONS: Record<string, string[]> = {
  'APAC':   ['apac', 'asia-pacific', 'asia pacific', 'asia pac', 'pacific', 'southeast asia', 'south-east asia', 'sea'],
  'EMEA':   ['emea', 'europe middle east africa', 'europe, middle east, africa'],
  'AMER':   ['amer', 'americas', 'north america', 'latin america', 'latam', 'south america'],
  'EUROPE': ['europe', 'eu'],
  'ASIA':   ['asia'],
  'AFRICA': ['africa'],
  'OCEANIA':['oceania', 'anz', 'australasia'],
}

// Maps UN M49 region (from world-countries) → macro-region
const UN_REGION_TO_MACRO: Record<string, string> = {
  'Asia': 'APAC',
  'Oceania': 'APAC',
  'Europe': 'EMEA',
  'Africa': 'EMEA',
  'Americas': 'AMER',
  'Antarctic': 'AMER', // rarely relevant
}

// ── Remote detection keywords ───────────────────────────────
const REMOTE_KEYWORDS = [
  'remote', 'work from home', 'wfh', 'telecommute',
  'worldwide', 'global', 'anywhere', 'distributed',
]

// ── Public types ─────────────────────────────────────────────

export interface ParsedLocation {
  city?: string
  country?: string         // ISO alpha-2 (e.g., "TH")
  region?: string          // UN M49 region (e.g., "Asia")
  macroRegion?: string     // job-market macro (e.g., "APAC")
  isRemote?: boolean
}

// ── Core: parseLocation ──────────────────────────────────────
// Takes free text like "Bangkok, Thailand" or "Remote - APAC"
// and returns structured data.
export function parseLocation(text: string | undefined | null): ParsedLocation {
  if (!text || !text.trim()) return {}

  const lower = text.toLowerCase().trim()
  const result: ParsedLocation = {}

  // 1. Remote detection
  result.isRemote = REMOTE_KEYWORDS.some(kw => lower.includes(kw))

  // 2. Country detection — scan for any known country name in the text
  for (const [name, code] of nameToCode) {
    if (lower.includes(name)) {
      result.country = code
      const geo = codeToGeo.get(code)
      if (geo) {
        result.region = geo.region
        result.macroRegion = UN_REGION_TO_MACRO[geo.region]
      }
      break // first match wins (most specific)
    }
  }

  // 3. Macro-region detection from keywords (APAC, EMEA, etc.)
  if (!result.macroRegion) {
    for (const [macro, keywords] of Object.entries(MACRO_REGIONS)) {
      if (keywords.some(kw => lower.includes(kw))) {
        result.macroRegion = macro
        break
      }
    }
  }

  // 4. City extraction — take the first comma-separated part that isn't a country/remote keyword
  if (!result.isRemote) {
    const parts = text.split(/[,;]/).map(p => p.trim()).filter(Boolean)
    for (const part of parts) {
      const partLower = part.toLowerCase()
      const isCountryName = partLower.length > 2 && nameToCode.has(partLower)
      const isRemoteWord = REMOTE_KEYWORDS.includes(partLower)
      if (!isCountryName && !isRemoteWord) {
        result.city = part
        break
      }
    }
  }

  return result
}

// ── Flag emoji from ISO code (pure Unicode algorithm) ────────
export function countryToFlag(code: string | undefined | null): string {
  if (!code || code.length !== 2) return ''
  const upper = code.toUpperCase()
  if (!/^[A-Z]{2}$/.test(upper)) return ''
  return upper
    .split('')
    .map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
    .join('')
}

// ── Get macro-region for a country code ──────────────────────
export function getMacroRegion(countryCode: string | undefined | null): string | undefined {
  if (!countryCode) return undefined
  const geo = codeToGeo.get(countryCode.toUpperCase())
  if (!geo) return undefined
  return UN_REGION_TO_MACRO[geo.region]
}

// ── Check if a remote job's region restriction is compatible ─
// userCountry: ISO code of the user's country (e.g., "TH")
// jobLocationText: the job's location string (e.g., "Remote - US only")
export function isRemoteRegionCompatible(
  userCountry: string | undefined,
  jobLocationText: string | undefined,
): boolean {
  const userMacro = getMacroRegion(userCountry)
  if (!userMacro) return true // can't determine → permissive (don't block)

  const jobParsed = parseLocation(jobLocationText)

  // No macro-region in job text → worldwide/generic remote → allow
  if (!jobParsed.macroRegion) return true

  // APAC covers both Asia + Oceania
  const compat: Record<string, string[]> = {
    'APAC': ['APAC'],
    'EMEA': ['EMEA'],
    'AMER': ['AMER'],
    'EUROPE': ['EMEA'],
    'ASIA': ['APAC'],
    'AFRICA': ['EMEA'],
    'OCEANIA': ['APAC'],
  }

  const allowed = compat[userMacro] || [userMacro]
  return allowed.includes(jobParsed.macroRegion) || jobParsed.macroRegion === userMacro
}
