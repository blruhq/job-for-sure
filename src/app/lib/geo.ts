// ═══════════════════════════════════════════════════════════════
// geo.ts — Free geolocation helpers (no API key needed)
//
// Uses:
// - navigator.geolocation (browser built-in, free)
// - Nominatim / OpenStreetMap reverse geocoding (free, no key)
//
// Nominatim usage policy:
// - Max 1 request/second (we only call on button click, fine)
// - Must send valid User-Agent (browser does this automatically)
// ═══════════════════════════════════════════════════════════════

/**
 * Detect the user's current area using browser GPS + free reverse geocoding.
 *
 * Returns a readable string like "Bang Na, Bangkok" or "Nimman, Chiang Mai".
 *
 * Flow:
 * 1. navigator.geolocation → get lat/lng coordinates
 * 2. Nominatim reverse geocode → get human-readable address
 * 3. Extract area + city from address components
 *
 * @throws if geolocation permission denied or reverse geocode fails
 */
export async function detectArea(): Promise<string> {
  // Step 1: Get GPS coordinates
  const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported by this browser'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 300_000, // accept cached position up to 5 min old
    })
  })

  const { latitude, longitude } = pos.coords

  // Step 2: Reverse geocode using Nominatim (free, no API key)
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=12&addressdetails=1`,
    { headers: { 'Accept-Language': 'en' } },
  )

  if (!res.ok) {
    throw new Error('Reverse geocoding failed')
  }

  const data = await res.json()
  const addr = data.address || {}

  // Step 3: Build readable area string
  // Try various granularity levels (Nominatim is inconsistent across countries)
  const area =
    addr.suburb ||
    addr.district ||
    addr.neighbourhood ||
    addr.city_district ||
    addr.town ||
    addr.village ||
    addr.county ||
    ''

  const city = addr.city || addr.state_district || ''
  const region = addr.state || addr.region || addr.province || ''

  // Prefer "Area, City" format (like "Bang Na, Bangkok")
  if (area && city) return `${area}, ${city}`
  if (area && region) return `${area}, ${region}`
  if (city) return city
  if (area) return area

  // Fallback: use first 2 parts of display_name
  const parts = (data.display_name || '').split(',').map((s: string) => s.trim())
  if (parts.length >= 2) return parts.slice(0, 2).join(', ')
  if (parts.length === 1) return parts[0]

  // Last resort: coordinates (Google Maps handles this fine)
  return `${latitude.toFixed(4)},${longitude.toFixed(4)}`
}
