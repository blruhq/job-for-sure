import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './app'),
      '@': path.resolve(__dirname, './'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: [
        'app/lib/scraper.ts',
        'app/lib/ratelimit.ts',
        'app/lib/auth-helpers.ts',
        'app/lib/posthog-server.ts',
        'app/lib/ai-providers.ts',
        'app/lib/job-sources/cache.ts',
        'app/lib/job-sources/scoring.ts',
        'app/lib/job-sources/index.ts',
        'proxy.ts',
      ],
    },
  },
})
