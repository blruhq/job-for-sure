import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next'

const withNextIntl = createNextIntlPlugin('./src/app/i18n/request.ts');

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@tabler/icons-react', '@dnd-kit/core', '@dnd-kit/sortable'],
  },
  serverExternalPackages: ['mammoth', '@react-pdf/renderer', 'unpdf'],
  async headers() {
    const isProd = process.env.NODE_ENV === 'production'
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"} https://us.i.posthog.com https://us-assets.i.posthog.com`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' data: blob: https://api.deepseek.com https://api.deepinfra.com https://us.i.posthog.com https://us-assets.i.posthog.com",
              "frame-src 'self' blob: data:",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default withNextIntl(nextConfig);
