import posthog from 'posthog-js'

// Defer PostHog init until after first paint to avoid blocking LCP/TBT.
// PostHog loads ~200KB of JS + surveys.js (26KB). Deferring to idle keeps
// Core Web Vitals green while still capturing analytics within ~1s of load.
function initPostHog() {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
    defaults: '2026-05-30',
    capture_exceptions: true,
    session_recording: {},
    capture_pageview: false,
    capture_pageleave: false,
    disable_surveys: true,            // No surveys in use — saves 26KB
    advanced_disable_decide: true,    // Skip feature flag check on load
  })
}

if (document.readyState === 'complete') {
  initPostHog()
} else {
  window.addEventListener('load', () => {
    // requestIdleCallback defers init until browser is idle (non-blocking)
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(initPostHog, { timeout: 3000 })
    } else {
      setTimeout(initPostHog, 1000)
    }
  })
}
