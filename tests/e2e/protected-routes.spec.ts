import { test, expect } from '@playwright/test'

test.describe('Protected route authentication', () => {
  test('redirects unauthenticated user from /dashboard to login', async ({ page }) => {
    await page.goto('/en/dashboard')
    await page.waitForURL(/\/(en|th)\/login/, { timeout: 15_000 })
    expect(page.url()).toMatch(/\/(en|th)\/login/)
  })

  test('redirects unauthenticated user from /chat to login', async ({ page }) => {
    await page.goto('/en/chat')
    await page.waitForURL(/\/(en|th)\/login/, { timeout: 15_000 })
    expect(page.url()).toMatch(/\/(en|th)\/login/)
  })

  test('redirects unauthenticated user from /resume to login', async ({ page }) => {
    await page.goto('/en/resume')
    await page.waitForURL(/\/(en|th)\/login/, { timeout: 15_000 })
    expect(page.url()).toMatch(/\/(en|th)\/login/)
  })

  test('redirects unauthenticated user from /settings to login', async ({ page }) => {
    await page.goto('/en/settings')
    await page.waitForURL(/\/(en|th)\/login/, { timeout: 15_000 })
    expect(page.url()).toMatch(/\/(en|th)\/login/)
  })

  test('shows landing page for unauthenticated user', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/\/login/)
  })

  test('allows access to login page', async ({ page }) => {
    await page.goto('/en/login')
    await page.waitForLoadState('networkidle')
    expect(page.url()).toMatch(/\/(en|th)\/login/)
  })

  test('allows access to register page', async ({ page }) => {
    await page.goto('/en/register')
    await page.waitForLoadState('networkidle')
    expect(page.url()).toMatch(/\/(en|th)\/register/)
  })
})
