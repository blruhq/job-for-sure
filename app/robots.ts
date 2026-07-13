import { MetadataRoute } from 'next'

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
        '/*/applications',
        '/*/interview',
        '/*/cover-letter',
        '/*/settings',
        '/*/forgot-password',
        '/*/reset-password',
      ],
    },
    sitemap: 'https://jobforsure.app/sitemap.xml',
  }
}
