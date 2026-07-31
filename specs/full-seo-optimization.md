# Full Production SEO Optimization

## Section 1 — Product

### Goal
Make Job For Sure SEO production-grade: proper metadata, structured data, locale-aware hreflang, no-index on private pages, sitemap/robots expansion, web manifest, dynamic OG images, and viewport export.

### Scope
- All public pages (landing, pricing): full metadata, JSON-LD, canonical, hreflang alternates
- All authenticated pages (app routes, auth routes): `noindex` robots meta
- Technical infrastructure: `viewport` export, `manifest.ts`, dynamic OG image route, shared SEO utilities
- Sitemap + robots: expanded coverage with locale alternates

### Out of Scope
- Google Search Console submission / verification (manual, post-deploy)
- A/B testing SEO variants
- Backlink strategy
- Page-speed optimization beyond existing Core Web Vitals
- Server-side rendering changes (pages stay as-is)

### User Stories
- As a job seeker, when I share a Job For Sure link on social media, I see a rich preview card with branded OG image
- As a search engine crawler, I receive proper hreflang signals so I serve the right locale to users
- As a search engine, I never index private authenticated pages (chat, dashboard, settings, etc.)
- As a search engine, I understand the site structure via Organization, WebSite, Product, and FAQPage schema

---

## Section 2 — Engineering Handoff

### Shared Constants

- **Base URL**: `process.env.NEXT_PUBLIC_APP_URL || 'https://jobforsure.app'`
- **Locales**: `['en', 'th']` (from `~/i18n/routing`)
- **Site name**: `'Job For Sure'`

### Next.js 16 Guardrails (CRITICAL)

1. `params` in `generateMetadata` is a **Promise** — must `await params`
2. `viewport` must be exported **separately** from `metadata` (cannot merge)
3. Metadata exports **only work in Server Components** — files with `'use client'` CANNOT export metadata
4. `MetadataRoute.Robots` rules field accepts either a single object or an array

---

### Step 1: Create `src/app/lib/seo.ts` — Shared SEO Utilities

**NEW FILE.** All SEO logic centralized here.

```typescript
import type { Metadata } from 'next'

// ─── Base URL ───
export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://jobforsure.app'
export const SITE_NAME = 'Job For Sure'
export const LOCALES = ['en', 'th'] as const

// ─── Hreflang Alternates Builder ───
export function buildAlternates(path: string = '') {
  // path is locale-relative, e.g. '' for landing, '/pricing' for pricing
  return {
    canonical: path || '/',
    languages: {
      en: `/en${path}`,
      th: `/th${path}`,
      'x-default': `/en${path}`,
    },
  }
}

// ─── OG Image URL Builder ───
export function ogImageUrl(title: string, subtitle?: string): string {
  const params = new URLSearchParams({ title })
  if (subtitle) params.set('subtitle', subtitle)
  return `/api/og?${params.toString()}`
}

// ─── JSON-LD Schema Builders ───

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: 'AI-powered job application helper — resume builder, ATS optimizer, interview prep, and job search.',
    sameAs: [],
  }
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/en/chat?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

export function productSchema(name: string, price: string, currency: string = 'USD', description?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: description || `${name} subscription`,
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency: currency,
      availability: 'https://schema.org/InStock',
    },
  }
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  }
}

// ─── JSON-LD Script Component ───
// Helper to render JSON-LD in server components
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
```

**Note**: `JsonLd` component uses JSX — file extension should be `.tsx`. Name it `src/app/lib/seo.tsx` instead.

---

### Step 2: Add `viewport` Export + Convert to `generateMetadata` in `src/app/[locale]/layout.tsx`

**MODIFY FILE**: `src/app/[locale]/layout.tsx`

Current state: Static `metadata` export, no `viewport`, no hreflang alternates.

Changes:
1. Add `import type { Viewport } from 'next'`
2. Add `export const viewport: Viewport` with themeColor (light/dark), width, initialScale
3. Replace static `export const metadata` with `export async function generateMetadata({ params })`
4. In `generateMetadata`: await locale from params, build locale-aware metadata with alternates, OG image reference, OG locale mapping

```typescript
import type { Metadata, Viewport } from 'next'
import { SITE_URL, buildAlternates, ogImageUrl } from '~/lib/seo'

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const title = 'Job For Sure — AI Career Coach'
  const description = 'Your AI career coach — chat, match, tailor, and track every application. Upload your resume and get matched against top companies.'

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: '%s · Job For Sure',
    },
    description,
    keywords: ['career coach', 'resume builder', 'ATS optimizer', 'job search', 'AI resume', 'job pipeline', 'interview prep'],
    authors: [{ name: 'Job For Sure' }],
    alternates: buildAlternates(''),
    openGraph: {
      title,
      description,
      type: 'website',
      locale: locale === 'th' ? 'th_TH' : 'en_US',
      url: SITE_URL,
      siteName: 'Job For Sure',
      images: [{ url: ogImageUrl(title, description), width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl(title)],
    },
    icons: {
      icon: '/favicon.ico',
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}
```

Keep the existing component function body unchanged (NextIntlClientProvider, ThemeProvider, QueryProvider, Toaster).

---

### Step 3: Restructure `(app)/layout.tsx` — Add noindex

**PROBLEM**: Current `(app)/layout.tsx` is `'use client'` — cannot export metadata.

**SOLUTION**: Split into server layout + client provider.

#### Step 3a: Create `src/app/[locale]/(app)/app-provider.tsx`

**NEW FILE.** Move ALL current logic from `layout.tsx` into this client component.

Copy the ENTIRE current content of `layout.tsx` (the `AuthGuard`, `AppShell`, and `AppLayout` functions) into this file. Rename `AppLayout` to `AppProvider`. Keep `'use client'` at top.

```typescript
'use client'

// ... all imports from current layout.tsx ...

// ... AuthGuard function (unchanged) ...
// ... AppShell function (unchanged) ...

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  )
}
```

#### Step 3b: Rewrite `src/app/[locale]/(app)/layout.tsx`

**MODIFY FILE.** Replace with thin server component:

```typescript
import type { Metadata } from 'next'
import { AppProvider } from './app-provider'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppProvider>{children}</AppProvider>
}
```

---

### Step 4: Add noindex to `(auth)/layout.tsx`

**MODIFY FILE**: `src/app/[locale]/(auth)/layout.tsx`

Add `robots` to existing metadata:

```typescript
export const metadata: Metadata = {
  title: 'Account',
  description: 'Sign in or create your Job For Sure account.',
  robots: {
    index: false,
    follow: true,
  },
}
```

Rest of file unchanged.

---

### Step 5: Enhance Landing Page — Hreflang + JSON-LD

**MODIFY FILE**: `src/app/[locale]/(marketing)/page.tsx`

This is a Server Component (no `'use client'`). Changes:

1. Convert static `metadata` to `generateMetadata` for locale-aware alternates
2. Add JSON-LD scripts for Organization, WebSite, FAQPage

Replace the metadata export:
```typescript
import type { Metadata } from 'next'
import { buildAlternates, ogImageUrl } from '~/lib/seo'
import { organizationSchema, websiteSchema, faqSchema, JsonLd } from '~/lib/seo'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const title = 'Job For Sure'
  const description = 'Upload your resume once. Get AI-matched jobs, ATS-optimized resumes, mock interview practice, and a full application tracker.'

  return {
    title: { absolute: title },
    description,
    alternates: buildAlternates(''),
    openGraph: {
      title,
      description,
      type: 'website',
      locale: locale === 'th' ? 'th_TH' : 'en_US',
      images: [{ url: ogImageUrl(title, description), width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl(title)],
    },
  }
}
```

Add JSON-LD before the closing `</div>` of the page return (before the outermost closing div). Insert inside the component body, after the `<footer>`:

```tsx
{/* ── STRUCTURED DATA ── */}
<JsonLd data={organizationSchema()} />
<JsonLd data={websiteSchema()} />
<JsonLd data={faqSchema([
  {
    question: 'What is Job For Sure?',
    answer: 'Job For Sure is an AI-powered career coach that helps you build resumes, match against job descriptions, prepare for interviews, and track your applications — all in one place.',
  },
  {
    question: 'Is Job For Sure free?',
    answer: 'Yes! The Free plan includes 3 resumes, 15 AI chats per day, 3 cover letters per week, 5 ATS matches per day, and 3 interview prep sessions per week. Upgrade to Pro for unlimited everything at $4/month or $29/year.',
  },
  {
    question: 'How does the ATS resume matcher work?',
    answer: 'Paste a job description and our AI analyzes your resume against it, scoring the match percentage, identifying matched and missing skills, and giving actionable recommendations to improve your chances.',
  },
  {
    question: 'Can I use Job For Sure for non-tech jobs?',
    answer: 'Absolutely. While we have deep tech job board integrations, the resume builder, cover letter generator, ATS matcher, and interview prep work for any industry.',
  },
  {
    question: 'Do you support multiple languages?',
    answer: 'Yes, Job For Sure is available in English and Thai, with more languages coming soon.',
  },
])} />
```

---

### Step 6: Create Pricing Layout — Metadata + Product Schema

#### Step 6a: Create `src/app/[locale]/(marketing)/pricing/layout.tsx`

**NEW FILE.** Server component — the pricing `page.tsx` is `'use client'` and can't export metadata.

```typescript
import type { Metadata } from 'next'
import { buildAlternates, ogImageUrl } from '~/lib/seo'
import { productSchema, JsonLd } from '~/lib/seo'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const title = 'Pricing'
  const description = 'Start free with 3 resumes, 15 AI chats/day, and full job board access. Upgrade to Pro for unlimited everything — $4/month or $29/year.'

  return {
    title,
    description,
    alternates: buildAlternates('/pricing'),
    openGraph: {
      title: 'Pricing · Job For Sure',
      description,
      type: 'website',
      locale: locale === 'th' ? 'th_TH' : 'en_US',
      images: [{ url: ogImageUrl('Job For Sure Pricing', description), width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Pricing · Job For Sure',
      description,
      images: [ogImageUrl('Job For Sure Pricing')],
    },
  }
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <JsonLd data={productSchema(
        'Job For Sure Pro',
        '4.00',
        'USD',
        'Unlimited resumes, AI chats, cover letters, ATS matches, and interview prep sessions.'
      )} />
      <JsonLd data={productSchema(
        'Job For Sure Free',
        '0.00',
        'USD',
        '3 resumes, 15 AI chats per day, 3 cover letters per week, 5 ATS matches per day, 3 interview prep sessions per week.'
      )} />
    </>
  )
}
```

---

### Step 7: Expand `src/app/sitemap.ts`

**MODIFY FILE.** Replace entirely with locale-aware sitemap covering all public pages.

```typescript
import { MetadataRoute } from 'next'
import { SITE_URL, LOCALES } from '~/lib/seo'

export default function sitemap(): MetadataRoute.Sitemap {
  const publicPages = [
    { path: '', priority: 1.0, changeFrequency: 'weekly' as const },
    { path: '/pricing', priority: 0.8, changeFrequency: 'monthly' as const },
  ]

  const entries: MetadataRoute.Sitemap = []

  for (const locale of LOCALES) {
    for (const page of publicPages) {
      const urlPath = page.path === '' ? `/${locale}` : `/${locale}${page.path}`
      entries.push({
        url: `${SITE_URL}${urlPath}`,
        lastModified: new Date(),
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: {
          languages: {
            en: `${SITE_URL}/en${page.path}`,
            th: `${SITE_URL}/th${page.path}`,
            'x-default': `${SITE_URL}/en${page.path}`,
          },
        },
      })
    }
  }

  return entries
}
```

---

### Step 8: Expand `src/app/robots.ts`

**MODIFY FILE.** Add missing disallow paths.

```typescript
import { MetadataRoute } from 'next'
import { SITE_URL } from '~/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/*/dashboard',
        '/*/chat',
        '/*/resume',
        '/*/resumes',
        '/*/applications',
        '/*/interview',
        '/*/cover-letter',
        '/*/settings',
        '/*/admin',
        '/*/ats',
        '/*/login',
        '/*/register',
        '/*/forgot-password',
        '/*/reset-password',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
```

Added paths vs current: `/*/resumes`, `/*/admin`, `/*/ats`, `/*/login`, `/*/register`.

---

### Step 9: Create `src/app/manifest.ts` — Web App Manifest

**NEW FILE.**

```typescript
import type { MetadataRoute } from 'next'
import { SITE_URL } from '~/lib/seo'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Job For Sure — AI Career Coach',
    short_name: 'Job For Sure',
    description: 'AI-powered job application helper — resume builder, ATS optimizer, interview prep, and job search.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
```

---

### Step 10: Create `src/app/api/og/route.tsx` — Dynamic OG Image Generator

**NEW FILE.** Uses `next/og` (ImageResponse).

```tsx
import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') || 'Job For Sure'
  const subtitle = searchParams.get('subtitle') || ''

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          backgroundColor: '#0a0a0a',
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(56, 189, 248, 0.08), transparent 50%)',
          padding: '80px',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              backgroundColor: '#38bdf8',
              fontSize: '32px',
              fontWeight: 700,
              color: '#0a0a0a',
            }}
          >
            J
          </div>
          <div style={{ fontSize: '28px', fontWeight: 600, color: '#38bdf8' }}>
            Job For Sure
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ fontSize: '60px', fontWeight: 700, lineHeight: 1.1, maxWidth: '900px' }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: '28px', color: '#94a3b8', maxWidth: '800px', lineHeight: 1.4 }}>
              {subtitle.length > 120 ? subtitle.substring(0, 120) + '...' : subtitle}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '24px', color: '#475569' }}>
            jobforsure.app
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
```

**IMPORTANT**: This route must be accessible without authentication. Since it's under `/api/`, it's already excluded from auth middleware (proxy.ts only handles locale + protected route redirect for pages, not API routes). Verify no auth check blocks `/api/og`.

---

### Step 11: Add `NEXT_PUBLIC_APP_URL` to Environment

The codebase currently hardcodes `https://jobforsure.app`. The new `seo.ts` uses `process.env.NEXT_PUBLIC_APP_URL || 'https://jobforsure.app'` which works with the fallback. No `.env` change strictly required, but add a note in the verification section.

---

### File Summary

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/app/lib/seo.tsx` | CREATE | ~120 |
| `src/app/[locale]/layout.tsx` | MODIFY | ~70 |
| `src/app/[locale]/(app)/app-provider.tsx` | CREATE | ~155 (moved from layout) |
| `src/app/[locale]/(app)/layout.tsx` | REWRITE | ~15 |
| `src/app/[locale]/(auth)/layout.tsx` | MODIFY | +3 lines |
| `src/app/[locale]/(marketing)/page.tsx` | MODIFY | +30 lines |
| `src/app/[locale]/(marketing)/pricing/layout.tsx` | CREATE | ~50 |
| `src/app/sitemap.ts` | REWRITE | ~35 |
| `src/app/robots.ts` | MODIFY | +5 paths |
| `src/app/manifest.ts` | CREATE | ~25 |
| `src/app/api/og/route.tsx` | CREATE | ~70 |

---

### Edge Cases

- **Missing `NEXT_PUBLIC_APP_URL`**: Falls back to `https://jobforsure.app` — no crash.
- **OG route query params empty**: Defaults to "Job For Sure" title — no crash.
- **OG route subtitle > 120 chars**: Truncated with ellipsis.
- **Sitemap with no dynamic data**: Returns 4 static entries (2 locales × 2 pages) — always valid.
- **Robots disallow patterns**: Glob patterns (`/*/chat`) cover both `/en/chat` and `/th/chat`.
- **Manifest icons**: `favicon.ico` and `logo.png` already exist in `public/`.
- **CSP `frame-ancestors: 'none'`**: Does NOT affect OG image (it's an image response, not a frame).

---

### Verification Exit Criteria

Engineer MUST self-verify ALL of these before reporting DONE:

- [ ] **TypeScript compiles**: `npx tsc --noEmit` exits 0 — no type errors
- [ ] **Lint passes**: `pnpm lint` exits 0 — no lint errors
- [ ] **Build succeeds**: `pnpm build` exits 0 — no build errors
- [ ] **Viewport exported**: Search `[locale]/layout.tsx` for `export const viewport` — must exist with `themeColor`, `width`, `initialScale`
- [ ] **generateMetadata in root layout**: `[locale]/layout.tsx` exports `generateMetadata` (not static `metadata`) — returns Promise<Metadata>
- [ ] **App layout is server component**: `[locale]/(app)/layout.tsx` has NO `'use client'` directive and exports `metadata` with `robots: { index: false }`
- [ ] **App provider is client component**: `[locale]/(app)/app-provider.tsx` has `'use client'` and exports `AppProvider`
- [ ] **Auth layout noindex**: `[locale]/(auth)/layout.tsx` metadata includes `robots: { index: false }`
- [ ] **Landing page JSON-LD**: `(marketing)/page.tsx` renders 3 JSON-LD scripts (Organization, WebSite, FAQPage) — grep for `application/ld+json` returns 3+ matches
- [ ] **Landing page generateMetadata**: `(marketing)/page.tsx` exports `generateMetadata` with `alternates` containing `canonical` and `languages`
- [ ] **Pricing layout metadata**: `(marketing)/pricing/layout.tsx` exists, exports `generateMetadata` with `alternates` and `openGraph`
- [ ] **Pricing JSON-LD**: `(marketing)/pricing/layout.tsx` renders Product schema JSON-LD
- [ ] **Sitemap expanded**: `sitemap.ts` returns 4+ entries (2 locales × 2 pages) with `alternates.languages` for each
- [ ] **Robots expanded**: `robots.ts` disallow list includes: `/*/ats`, `/*/admin`, `/*/login`, `/*/register`, `/*/resumes`
- [ ] **Manifest exists**: `manifest.ts` exists at `src/app/manifest.ts` with `name`, `short_name`, `icons`, `display`
- [ ] **OG route exists**: `api/og/route.tsx` exists, exports `GET` function, uses `ImageResponse` from `next/og`
- [ ] **SEO utility exists**: `src/app/lib/seo.tsx` exports: `SITE_URL`, `buildAlternates`, `ogImageUrl`, `organizationSchema`, `websiteSchema`, `faqSchema`, `productSchema`, `breadcrumbSchema`, `JsonLd`
- [ ] **No hardcoded URLs in new code**: All new/modified files use `SITE_URL` from `~/lib/seo` or `process.env.NEXT_PUBLIC_APP_URL` — NOT bare `'https://jobforsure.app'` strings (except fallback in seo.tsx itself)
- [ ] **Unit test**: Add `tests/unit/seo.test.ts` verifying `buildAlternates`, `ogImageUrl`, `faqSchema`, `productSchema` return expected shapes. Run: `pnpm vitest run tests/unit/seo.test.ts` — all pass
