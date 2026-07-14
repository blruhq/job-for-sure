import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src/app'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: [
        'src/app/lib/scraper.ts',
        'src/app/lib/ratelimit.ts',
        'src/app/lib/auth-helpers.ts',
        'src/app/lib/posthog-server.ts',
        'src/app/lib/ai-providers.ts',
        'src/app/lib/with-auth.ts',
        'src/app/lib/resume-extract.ts',
        'src/app/lib/schemas.ts',
        'src/app/lib/job-sources/cache.ts',
        'src/app/lib/job-sources/scoring.ts',
        'src/app/lib/job-sources/index.ts',
        'proxy.ts',
      ],
    },
  },
})
