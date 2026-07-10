// ═══════════════════════════════════════════════════════════════
// CURATED COMPANY LISTS
// Greenhouse and Ashby are per-company APIs — you need to know which
// companies use each platform. These slugs are the board tokens.
//
// VERIFIED = tested and confirmed working (July 2026).
// UNVERIFIED = likely works but needs a one-time check.
// Add more as you verify them.
// ═══════════════════════════════════════════════════════════════

export const GREENHOUSE_COMPANIES: { slug: string; verified: boolean }[] = [
  // ── Verified ✅ ──
  { slug: 'stripe', verified: true },
  { slug: 'figma', verified: true },
  { slug: 'airbnb', verified: true },
  { slug: 'anthropic', verified: true },
  { slug: 'coinbase', verified: true },
  { slug: 'datadog', verified: true },
  // ── Likely (common Greenhouse users) ──
  { slug: 'cloudflare', verified: false },
  { slug: 'robinhood', verified: false },
  { slug: 'doordash', verified: false },
  { slug: 'dropbox', verified: false },
  { slug: 'square', verified: false },       // Block / Square
  { slug: 'mercury', verified: false },
  { slug: 'ramp', verified: false },
  { slug: 'brex', verified: false },
  { slug: 'dashlane', verified: false },
  { slug: 'mimecast', verified: false },
  { slug: 'squarespace', verified: false },
  { slug: 'warbyparker', verified: false },
  { slug: 'glossier', verified: false },
  { slug: 'brilliant', verified: false },
  { slug: 'motion', verified: false },
  { slug: 'hey', verified: false },          // 37signals
  { slug: 'loom', verified: false },
  { slug: 'monzo', verified: false },
  { slug: 'wise', verified: false },
  { slug: 'gojek', verified: false },
  { slug: 'grab', verified: false },
  { slug: 'shopify', verified: false },
  { slug: 'hubspot', verified: false },
  { slug: 'asana', verified: false },
  { slug: 'intercom', verified: false },
]

export const ASHBY_COMPANIES: { slug: string; verified: boolean }[] = [
  { slug: 'ashby', verified: true },
  // Ashby is newer — many YC startups use it. Add as you verify.
  { slug: 'vanta', verified: false },
  { slug: 'linear', verified: false },
  { slug: 'pearvc', verified: false },
  { slug: 'taggart', verified: false },
  { slug: 'getcody', verified: false },
  { slug: 'portkey', verified: false },
  { slug: 'fixfolio', verified: false },
  { slug: 'mobbin', verified: false },
]

// How many ATS companies to fetch per search (balanced for speed).
// Greenhouse calls are parallel; 15 = ~2-3s with parallelism.
export const GREENHOUSE_FETCH_LIMIT = 15
export const ASHBY_FETCH_LIMIT = 5
