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
