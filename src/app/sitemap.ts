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
