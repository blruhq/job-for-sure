// ═══════════════════════════════════════════════════════════════
// area-links.ts — External link builders for areas around a job.
//
// NOTE: This is a STUB for Phase 2 of the area intelligence feature.
// These functions build URLs that link to external sites for
// verification of AI-generated estimates (salary, commute, company).
//
// Phase 2 will implement proper area detection, slug generation,
// and URL building. For now these return '#' as placeholders.
//
// TODO: Implement proper URL builders in Phase 2.
// ═══════════════════════════════════════════════════════════════

/**
 * Build a Numbeo cost-of-living URL for a given city.
 * e.g. https://www.numbeo.com/cost-of-living/in/Bangkok
 */
export function costOfLivingUrl(city: string): string {
  // Stub — Phase 2 will slugify city names properly
  return `https://www.numbeo.com/cost-of-living/in/${encodeURIComponent(city.replace(/\s+/g, '-'))}`
}

/**
 * Build a Google Maps directions URL between two locations.
 * e.g. https://www.google.com/maps/dir/Home+Location/Job+Location
 */
export function directionsUrl(origin: string, destination: string): string {
  if (!origin || !destination) return '#'
  return `https://www.google.com/maps/dir/${encodeURIComponent(origin)}/${encodeURIComponent(destination)}`
}

/**
 * Build a Rome2Rio URL for travel options + prices.
 * e.g. https://www.rome2rio.com/s/Bangkok/Chiang-Mai
 */
export function rome2RioUrl(origin: string, destination: string): string {
  if (!origin || !destination) return '#'
  return `https://www.rome2rio.com/s/${encodeURIComponent(origin)}/${encodeURIComponent(destination)}`
}

/**
 * Build a jobsbyculture.com profile URL for a company.
 * e.g. https://www.jobsbyculture.com/companies/acme-corp
 */
export function cultureProfileUrl(company: string): string {
  return `https://www.jobsbyculture.com/companies/${encodeURIComponent(company.toLowerCase().replace(/\s+/g, '-'))}`
}

/**
 * Build a Reddit search URL for company reviews.
 * e.g. https://www.reddit.com/search/?q=acme+corp+review
 */
export function redditSearchUrl(company: string): string {
  return `https://www.reddit.com/search/?q=${encodeURIComponent(`${company} review`)}`
}

/**
 * Build an OpenCorporates company search URL.
 * e.g. https://opencorporates.com/companies?q=acme+corp
 */
export function openCorporatesUrl(company: string): string {
  return `https://opencorporates.com/companies?q=${encodeURIComponent(company)}`
}
