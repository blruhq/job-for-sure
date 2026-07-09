import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      '@base-ui/react': '@base-ui-components/react',
    },
  },
}

export default nextConfig
