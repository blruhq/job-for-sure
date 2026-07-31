# Production SEO Implementation Research — Job For Sure (Next.js 16.2+)

> Research date: 2026-08-01
> Target: Next.js 16.2+ App Router, next-intl (`/en`, `/th`), Better Auth, Neon PostgreSQL, Drizzle ORM

---

## 1. Next.js 16 Metadata API

### Async Params Contract (Breaking Change)
- `params` and `searchParams` in `generateMetadata` and Page components are **Promises** in Next.js 16.
- Must use: `const { locale, id } = await params`

### Viewport Export Separation
- `themeColor`, `viewportFit`, `width`, `initialScale` can NO LONGER be in `metadata`.
- Must export separately: `export const viewport: Viewport = { themeColor: '#0f172a', width: 'device-width', initialScale: 1 }`

### Base Metadata Pattern (`app/[locale]/layout.tsx`)
```tsx
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jobforsure.app'
  return {
    metadataBase: new URL(baseUrl),
    title: { default: 'Job For Sure — AI Career Coach', template: '%s · Job For Sure' },
    description: 'AI-powered job application helper...',
    alternates: {
      canonical: `/${locale}`,
      languages: {
        'en': `/en`,
        'th': `/th`,
        'x-default': `/en`,
      },
    },
    openGraph: { type: 'website', locale: locale === 'th' ? 'th_TH' : 'en_US', url: baseUrl, siteName: 'Job For Sure' },
    twitter: { card: 'summary_large_image' },
  }
}
```

### Dynamic OG Image Generator (`app/api/og/job/route.tsx`)
```tsx
import { ImageResponse } from 'next/og'
export const runtime = 'edge'
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') || 'Job For Sure'
  return new ImageResponse(
    (<div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#0f172a', width: '100%', height: '100%', padding: '80px', color: 'white' }}>
      <div style={{ fontSize: 28, color: '#38bdf8' }}>Job For Sure</div>
      <div style={{ fontSize: 60, fontWeight: 'bold' }}>{title}</div>
    </div>),
    { width: 1200, height: 630 }
  )
}
```

---

## 2. Structured Data / Schema.org (JSON-LD)

### Organization & WebSite Schema (Landing Page)
```tsx
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Job For Sure',
  url: baseUrl,
  logo: `${baseUrl}/logo.png`,
  description: 'AI-powered job application helper',
  sameAs: ['https://twitter.com/jobforsure'],
}) }} />
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Job For Sure',
  url: baseUrl,
  potentialAction: { '@type': 'SearchAction', target: `${baseUrl}/jobs?q={search_term_string}`, 'query-input': 'required name=search_term_string' },
}) }} />
```

### JobPosting Schema (Job Detail Pages)
```tsx
{
  '@context': 'https://schema.org',
  '@type': 'JobPosting',
  title: job.title,
  description: job.description,
  hiringOrganization: { '@type': 'Organization', name: job.company, logo: job.logo },
  jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: job.location } },
  datePosted: job.datePosted,
  validThrough: job.validThrough,
  employmentType: job.employmentType,
  directApply: true,
}
```

### Product/Offer Schema (Pricing Page)
```tsx
{
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Job For Sure Pro',
  offers: { '@type': 'Offer', price: '4.00', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
}
```

### FAQPage Schema
```tsx
{
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [{ '@type': 'Question', name: '...', acceptedAnswer: { '@type': 'Answer', text: '...' } }],
}
```

### BreadcrumbList Schema
```tsx
{
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl }, ...],
}
```

---

## 3. Sitemap.xml & Robots.txt

### Robots (`app/robots.ts`)
```typescript
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jobforsure.app'
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/', '/*/dashboard/*', '/*/chat/*', '/*/ats/*', '/*/resume/*', '/*/interview/*', '/*/applications/*', '/*/cover-letter/*', '/*/settings/*', '/*/admin/*'] },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
```

### Sitemap (`app/sitemap.ts`)
```typescript
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jobforsure.app'
  const locales = ['en', 'th']
  const staticPages = ['', '/pricing']
  const entries: MetadataRoute.Sitemap = []
  for (const locale of locales) {
    for (const page of staticPages) {
      entries.push({
        url: `${baseUrl}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: page === '' ? 1 : 0.8,
        alternates: { languages: { en: `${baseUrl}/en${page}`, th: `${baseUrl}/th${page}` } },
      })
    }
  }
  return entries
}
```

---

## 4. Core Web Vitals

- **LCP**: Hero images with `priority`, font `display: 'swap'`
- **CLS**: Always define `width`/`height` on images, preserve bounding boxes during loading
- **INP**: Move heavy computation to Web Workers or Server Actions, use `startTransition`

---

## 5. International SEO (hreflang)

```tsx
alternates: {
  canonical: `/${locale}/page`,
  languages: {
    'en': `/en/page`,
    'th': `/th/page`,
    'x-default': `/en/page`,
  },
}
```

---

## 6. Production SEO Checklist

### P0 (Must-Have)
- [ ] Root metadata template with `generateMetadata` in `app/[locale]/layout.tsx`
- [ ] Separate `export const viewport` in root layout
- [ ] No-index (`robots: { index: false, follow: false }`) on ALL authenticated layouts
- [ ] `app/robots.ts` — disallow all app/auth paths
- [ ] `app/sitemap.ts` — static pages + locale variants + alternates
- [ ] Hreflang alternates on all public pages
- [ ] JSON-LD Organization + WebSite on landing page
- [ ] Missing metadata on `/pricing` page
- [ ] Web app manifest (`manifest.ts`)

### P1 (Important)
- [ ] Dynamic OG image generator (`next/og`)
- [ ] `Product`/`Offer` schema on `/pricing`
- [ ] `FAQPage` schema on landing/pricing
- [ ] Static OG images in `public/`
- [ ] Image `remotePatterns` in `next.config.ts` (if needed)

### P2 (Nice-to-Have)
- [ ] `BreadcrumbList` JSON-LD
- [ ] `Person` schema on team/about pages
- [ ] Google Search Console auto-indexing
- [ ] Rich results testing integration
