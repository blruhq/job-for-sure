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
