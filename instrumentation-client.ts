import posthog from 'posthog-js'

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
  defaults: '2026-05-30',
  capture_exceptions: true,                    // Automatic global error capture
  session_recording: {},                       // Session replay (masked by default)
  capture_pageview: false,                      // We control page views via router events
  capture_pageleave: false,
})
