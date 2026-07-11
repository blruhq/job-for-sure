import { test, expect } from '@playwright/test'
import { randomBytes } from 'crypto'

function generateTestEmail() {
  return `e2e-dash-${randomBytes(4).toString('hex')}@testmail.com`
}

async function registerAndLogin(page: import('@playwright/test').Page) {
  const email = generateTestEmail()
  await page.goto('/en/register')
  await page.locator('input[type="text"]').first().fill('Dashboard Tester')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill('TestPassword123!')
  await page.getByRole('button', { name: /create account/i }).click()
  await page.waitForURL(/\/(en|th)\/dashboard/, { timeout: 15_000 })
  return email
}

test.describe('Authenticated dashboard', () => {
  test('dashboard loads after login', async ({ page }) => {
    await registerAndLogin(page)

    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })

  test('can navigate to chat', async ({ page }) => {
    await registerAndLogin(page)

    await page.goto('/en/chat')
    await page.waitForLoadState('networkidle')
    expect(page.url()).toMatch(/\/(en|th)\/chat/)
  })

  test('can navigate to resume editor', async ({ page }) => {
    await registerAndLogin(page)

    await page.goto('/en/resume')
    await page.waitForLoadState('networkidle')
    expect(page.url()).toMatch(/\/(en|th)\/resume/)
  })
})
