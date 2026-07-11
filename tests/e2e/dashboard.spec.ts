import { test, expect } from '@playwright/test'

// Note: These tests require a verified user.
// With email verification enabled, registration shows a "check your email" screen.
// Dashboard tests are skipped until we have a test fixture for verified users.

test.describe('Authenticated dashboard', () => {
  test.skip('dashboard loads after login (needs verified user fixture)', async ({ page }) => {
    // This test requires a pre-verified user in the database.
    // TODO: Create a test helper that verifies the user via DB after registration.
    test.skip()
  })
})
