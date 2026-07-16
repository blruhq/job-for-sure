// ═══════════════════════════════════════════════════════════════
// area-links.ts — External link builders for areas around a job.
//
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

// ═══════════════════════════════════════════════════════════════
// GEO HELPERS
// ═══════════════════════════════════════════════════════════════

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
