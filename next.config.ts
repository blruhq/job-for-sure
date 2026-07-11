import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next'

const withNextIntl = createNextIntlPlugin('./app/i18n/request.ts');

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      '@base-ui/react': '@base-ui-components/react',
    },
  },
}

export default withNextIntl(nextConfig);
