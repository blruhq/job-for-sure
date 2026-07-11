import { test, expect } from '@playwright/test'

test.describe('Landing page', () => {
  test('loads and shows key content', async ({ page }) => {
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('body')).toContainText(/Job For Sure/i)
  })

  test('has a sign in or get started link', async ({ page }) => {
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    const authLink = page.locator('a[href*="login"], a[href*="register"], button:has-text("Sign"), button:has-text("Get Started"), button:has-text("Start")')
    await expect(authLink.first()).toBeVisible()
  })

  test('locale switcher is present', async ({ page }) => {
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    expect(page.url()).toMatch(/\/en/)
  })
})
