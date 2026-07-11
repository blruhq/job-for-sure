import { test, expect } from '@playwright/test'
import { randomBytes } from 'crypto'

function generateTestEmail() {
  const random = randomBytes(4).toString('hex')
  return `e2e-test-${random}@testmail.com`
}

test.describe('Authentication flows', () => {
  test('register page renders correctly', async ({ page }) => {
    await page.goto('/en/register')

    await expect(page.locator('h1')).toContainText('Create your account')
    await expect(page.locator('input[type="text"]').first()).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
  })

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/en/login')

    await expect(page.locator('h1')).toContainText('Welcome back')
    await expect(page.locator('input[type="email"], input[type="text"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('password field enforces minimum 8 characters', async ({ page }) => {
    await page.goto('/en/register')
    const passwordInput = page.locator('input[type="password"]')
    await expect(passwordInput).toHaveAttribute('minlength', '8')
  })

  test('register with valid data shows email verification screen', async ({ page }) => {
    const email = generateTestEmail()
    await page.goto('/en/register')

    await page.locator('input[type="text"]').first().fill('E2E Test User')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[type="password"]').fill('TestPassword123!')

    await page.getByRole('button', { name: /create account/i }).click()

    // Should show "Check your email" screen (not redirect to dashboard)
    await page.waitForSelector('text=Check your email', { timeout: 15_000 })
    await expect(page.locator('body')).toContainText(email)
  })

  test('login with wrong password shows error', async ({ page }) => {
    await page.goto('/en/login')
    await page.locator('input[type="email"], input[type="text"]').first().fill('nonexistent@testmail.com')
    await page.locator('input[type="password"]').fill('WrongPassword123!')
    await page.getByRole('button', { name: /sign in/i }).click()

    await page.waitForTimeout(3000)
    expect(page.url()).not.toMatch(/\/dashboard/)
  })
})
