// ═══════════════════════════════════════════════════════════════
// area-links.ts — External link builders for areas around a job.
//
// All 100% free. No API key. Just construct URLs and open in new tab.
// ═══════════════════════════════════════════════════════════════

function slug(s: string): string {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')   // strip punctuation (keeps alphanumeric, spaces, hyphens)
    .replace(/\s+/g, '-')            // spaces → hyphens
    .replace(/-+/g, '-')             // collapse consecutive hyphens
    .replace(/^-|-$/g, '')           // trim leading/trailing hyphens
}

function enc(s: string): string {
  return encodeURIComponent(s.trim())
}

// ═══════════════════════════════════════════════════════════════
// THAI SCRIPT → ENGLISH CITY MAPPING
// JobbKK returns Thai-script locations like "กรุงเทพมหานคร เขตบางรัก"
// We need English for Numbeo, Google Maps, housing sites, etc.
// ═══════════════════════════════════════════════════════════════

const THAI_TO_ENGLISH: Record<string, string> = {
  'กรุงเทพมหานคร': 'Bangkok',
  'กรุงเทพ': 'Bangkok',
  'บางกอก': 'Bangkok',
  'ปทุมธานี': 'Pathum Thani',
  'นนทบุรี': 'Nonthaburi',
  'สมุทรปราการ': 'Samut Prakan',
  'สมุทรสาคร': 'Samut Sakhon',
  'นครปฐม': 'Nakhon Pathom',
  'เชียงใหม่': 'Chiang Mai',
  'เชียงราย': 'Chiang Rai',
  'ภูเก็ต': 'Phuket',
  'ขอนแก่น': 'Khon Kaen',
  'ชลบุรี': 'Chonburi',
  'ระยอง': 'Rayong',
  'นครราชสีมา': 'Nakhon Ratchasima',
  'อุดรธานี': 'Udon Thani',
  'หาดใหญ่': 'Hat Yai',
  'สงขลา': 'Songkhla',
  'พิษณุโลก': 'Phitsanulok',
  'สุราษฎร์ธานี': 'Surat Thani',
  'นครศรีธรรมราช': 'Nakhon Si Thammarat',
  'ลำปาง': 'Lampang',
  'อุบลราชธานี': 'Ubon Ratchathani',
  'กทม': 'Bangkok',
  'อุตรดิตถ์': 'Uttaradit',
  'พระนครศรีอยุธยา': 'Ayutthaya',
  'สระบุรี': 'Saraburi',
  'ลพบุรี': 'Lopburi',
  'ตาก': 'Tak',
  'สุพรรณบุรี': 'Suphanburi',
  'ราชบุรี': 'Ratchaburi',
  'เพชรบุรี': 'Phetchaburi',
  'กระบี่': 'Krabi',
  'สุรินทร์': 'Surin',
  'บุรีรัมย์': 'Buriram',
  'มหาสารคาม': 'Maha Sarakham',
  'ร้อยเอ็ด': 'Roi Et',
  'มุกดาหาร': 'Mukdahan',
  'หนองคาย': 'Nong Khai',
  'สกลนคร': 'Sakon Nakhon',
  'นครพนม': 'Nakhon Phanom',
  'อำนาจเจริญ': 'Amnat Charoen',
  'ยโสธร': 'Yasothon',
}

// Districts commonly seen in JobbKK data (เขต = district prefix)
const THAI_DISTRICT_PREFIX = /^เขต\s*/

/**
 * Check if a string contains Thai script characters.
 */
function isThaiScript(s: string): boolean {
  return /[\u0E00-\u0E7F]/.test(s)
}

/**
 * Convert Thai-script location to English city name.
 * "กรุงเทพมหานคร เขตบางรัก" → "Bangkok"
 * "ปทุมธานี คลองหลวง" → "Pathum Thani"
 * Returns empty string if no match found.
 */
function thaiToEnglishCity(thaiLocation: string): string {
  // Split by space (Thai locations are space-separated, not comma-separated)
  const parts = thaiLocation
    .replace(THAI_DISTRICT_PREFIX, ' ') // normalize "เขตบางรัก" → " บางรัก"
    .split(/\s+/)
    .filter(Boolean)

  // Try each part against the mapping (longest match first)
  for (const part of parts) {
    const trimmed = part.trim()
    if (THAI_TO_ENGLISH[trimmed]) {
      return THAI_TO_ENGLISH[trimmed]
    }
  }

  // Try the full string
  const fullTrimmed = thaiLocation.trim()
  if (THAI_TO_ENGLISH[fullTrimmed]) {
    return THAI_TO_ENGLISH[fullTrimmed]
  }

  return ''
}

// ═══════════════════════════════════════════════════════════════
// NUMBEO CITY NORMALIZER
// Numbeo only supports major cities. Thai cities on Numbeo:
//   Bangkok, Chiang Mai, Phuket
// All other Thai locations → fall back to Bangkok (nearest major).
// ═══════════════════════════════════════════════════════════════

const NUMBEO_SUPPORTED_TH = new Set(['bangkok', 'chiang mai', 'phuket'])

/**
 * Normalize a city name for Numbeo URLs.
 *
 *   "Bangkok"              → "Bangkok" (already supported)
 *   "ปทุมธานี คลองหลวง"    → "Bangkok" (Thai → English → unsupported → fallback)
 *   "Pathum Thani"         → "Bangkok" (not on Numbeo → fallback)
 *   "Chiang Mai"           → "Chiang Mai"
 *   "London"               → "London" (non-TH, pass through)
 */
function numbeoCity(city: string, countryCode?: string): string {
  if (!city) return ''

  let english = city

  // If Thai script, transliterate
  if (isThaiScript(city)) {
    english = thaiToEnglishCity(city) || 'Bangkok'
  }

  // For Thailand, only Bangkok/Chiang Mai/Phuket are on Numbeo
  if (countryCode?.toUpperCase() === 'TH') {
    if (!NUMBEO_SUPPORTED_TH.has(english.toLowerCase().trim())) {
      return 'Bangkok' // nearest major city
    }
  }

  return english
}

// ── COMMUTE ──

/** Google Maps directions — shows BTS/MRT/bus/motorcycle routing + step-by-step */
export function directionsUrl(home: string, jobLocation: string, mode: 'transit' | 'driving' | 'walking' | 'two_wheeler' = 'transit'): string {
  if (!home || !jobLocation) return '#'
  return `https://www.google.com/maps/dir/?api=1&origin=${enc(home)}&destination=${enc(jobLocation)}&travelmode=${mode}`
}

/** Rome2Rio — shows price for EVERY transport mode + time + frequency */
export function rome2RioUrl(home: string, jobLocation: string): string {
  if (!home || !jobLocation) return '#'
  return `https://www.rome2rio.com/map/${enc(slug(home))}/${enc(slug(jobLocation))}`
}

// ── MONEY ──

/** Numbeo cost of living — food, rent, transport, utilities, groceries */
export function costOfLivingUrl(city: string, countryCode?: string): string {
  const normalized = numbeoCity(city, countryCode)
  return `https://www.numbeo.com/cost-of-living/in/${enc(normalized.replace(/\s+/g, '-'))}`
}

/** Numbeo salary calculator — "is this offer fair for this city?" */
export function salaryCalculatorUrl(city: string, countryCode?: string): string {
  const normalized = numbeoCity(city, countryCode)
  return `https://www.numbeo.com/salary-calculator/in/${enc(normalized.replace(/\s+/g, '-'))}`
}

// ── HOUSING (country-specific lookup) ──

export interface PropertySite {
  name: string
  url: string
}

export const PROPERTY_SITES: Record<string, PropertySite[]> = {
  TH: [
    // Hipflat uses base listing page only — NO area deep-linking available.
    // User manually filters by province in the in-page sidebar.
    { name: 'Hipflat', url: 'https://www.hipflat.co.th/en/condo-for-rent' },
    // Baania uses /s/{area}/rent path pattern. Verified: baania.com/s/bangkok/rent → 219 listings.
    { name: 'Baania', url: 'https://baania.com/s/{area}/rent' },
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

/**
 * Build full housing search URL for a specific site + area.
 *
 * Sites that support area search use a `{area}` placeholder in their URL
 * (e.g. Baania: `baania.com/s/{area}/rent`). The placeholder is replaced
 * with a lowercase slug of the area name.
 *
 * Sites without `{area}` (e.g. Hipflat) return their base URL as-is —
 * the user manually filters by province in the site's UI.
 */
export function housingUrl(site: PropertySite, area: string): string {
  if (site.url.includes('{area}')) {
    return site.url.replace('{area}', slug(area))
  }
  return site.url
}

// ── TEMPORARY STAY ──

/** Agoda hotel search near a location */
export function agodaUrl(city: string): string {
  return `https://www.agoda.com/search?city=${enc(city)}&checkIn=&checkOut=&adults=1&rooms=1`
}

// ── VISA (country-specific) ──

export const VISA_LINKS: Record<string, { name: string; url: string }> = {
  TH: { name: 'Thai Visa Forum (AseanNow)', url: 'https://aseannow.com/' },
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

export function crimeUrl(city: string, countryCode?: string): string {
  const normalized = numbeoCity(city, countryCode)
  return `https://www.numbeo.com/crime/in/${enc(normalized.replace(/\s+/g, '-'))}`
}

export function qualityOfLifeUrl(city: string, countryCode?: string): string {
  const normalized = numbeoCity(city, countryCode)
  return `https://www.numbeo.com/quality-of-life/in/${enc(normalized.replace(/\s+/g, '-'))}`
}

export function healthcareUrl(city: string, countryCode?: string): string {
  const normalized = numbeoCity(city, countryCode)
  return `https://www.numbeo.com/health-care/in/${enc(normalized.replace(/\s+/g, '-'))}`
}

export function pollutionUrl(city: string, countryCode?: string): string {
  const normalized = numbeoCity(city, countryCode)
  return `https://www.numbeo.com/pollution/in/${enc(normalized.replace(/\s+/g, '-'))}`
}

export function trafficUrl(city: string, countryCode?: string): string {
  const normalized = numbeoCity(city, countryCode)
  return `https://www.numbeo.com/traffic/in/${enc(normalized.replace(/\s+/g, '-'))}`
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
  return `https://www.reddit.com/search/?q=${enc(company)}`
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

// ═══════════════════════════════════════════════════════════════
// GEO HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Normalize a single location part by stripping administrative suffixes.
 * "Bangkok City" → "Bangkok", "Bang Rak District" → "Bang Rak"
 */
function normalizePart(part: string): string {
  return part
    .replace(/\s+(City|Province|District|Subdistrict|Metropolis|Prefecture|State)$/i, '')
    .trim()
}

/**
 * Extract city name from a location string.
 *
 * Handles common patterns:
 *   "Bangkok, Bangkok City, Thailand"  → "Bangkok"  (dedup after suffix strip)
 *   "Bang Rak, Bangkok, Thailand"      → "Bangkok"  (second-to-last)
 *   "Sathon, Bangkok, Thailand"        → "Bangkok"
 *   "Bangkok, Thailand"                 → "Bangkok"
 *   "London, UK"                        → "London"
 *   "New York, NY, USA"                → "New York"
 *   "กรุงเทพมหานคร เขตบางรัก"            → "Bangkok"  (Thai script)
 *   "ปทุมธานี คลองหลวง"                 → "Pathum Thani"  (Thai script)
 */
export function extractCity(location: string): string {
  if (!location) return ''

  // Thai script: use mapping (Thai locations are space-separated, not comma)
  if (isThaiScript(location)) {
    const english = thaiToEnglishCity(location)
    if (english) return english
    // If no mapping found, strip district prefix and return province
    const cleaned = location.replace(THAI_DISTRICT_PREFIX, ' ').trim()
    return cleaned || location
  }

  const parts = location.split(',').map(s => s.trim()).filter(Boolean)
  if (parts.length === 0) return location

  // Normalize each part (strip "City", "Province", etc.)
  const normalized = parts.map(normalizePart)

  // Deduplicate: remove parts that are identical (case-insensitive) to the previous part
  // This handles "Bangkok, Bangkok, Thailand" → ["Bangkok", "Thailand"]
  const deduped: string[] = []
  for (const part of normalized) {
    const prev = deduped[deduped.length - 1]
    if (!prev || prev.toLowerCase() !== part.toLowerCase()) {
      deduped.push(part)
    }
  }

  if (deduped.length === 1) return deduped[0]

  // Second-to-last is typically the city (last is country)
  return deduped[deduped.length - 2] || deduped[0]
}

/**
 * Extract district/neighborhood from a location string.
 *
 *   "Sathon, Bangkok, Thailand"  → "Sathon"
 *   "Bang Rak, Bangkok, Thailand" → "Bang Rak"
 *   "Bangkok, Thailand"           → "" (no district — just city)
 *   "Bangkok, Bangkok City, Thailand" → "" (redundant, no district)
 */
export function extractDistrict(location: string): string {
  const parts = location.split(',').map(s => s.trim()).filter(Boolean)
  if (parts.length <= 2) return '' // need at least 3 parts for district + city + country

  const normalized = parts.map(normalizePart)
  const deduped: string[] = []
  for (const part of normalized) {
    const prev = deduped[deduped.length - 1]
    if (!prev || prev.toLowerCase() !== part.toLowerCase()) {
      deduped.push(part)
    }
  }

  // After dedup, if we have 3+ parts, the first is the district
  if (deduped.length >= 3) return deduped[0]
  return ''
}

/** Detect country code from location string */
export function detectCountry(location: string): string {
  if (!location) return ''
  const lower = location.toLowerCase()

  // Thai script → always Thailand
  if (isThaiScript(location)) return 'TH'

  if (lower.includes('thailand') || lower.includes('bangkok') || lower.includes('chiang') || lower.includes('phuket') || lower.includes('pathum')) return 'TH'
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
