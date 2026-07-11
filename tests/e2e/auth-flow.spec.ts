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

  test('forgot-password page renders and accepts email', async ({ page }) => {
    await page.goto('/en/forgot-password')

    await expect(page.locator('h1')).toContainText('Forgot password?')
    await expect(page.locator('input[type="email"]')).toBeVisible()

    await page.locator('input[type="email"]').fill('test@example.com')
    await page.getByRole('button', { name: /send reset link/i }).click()

    // Should show success screen (email service may not be configured in test,
    // but Better Auth returns success to prevent email enumeration)
    await page.waitForSelector('text=Check your email', { timeout: 15_000 })
    await expect(page.locator('body')).toContainText('test@example.com')
  })

  test('reset-password page shows error for invalid token', async ({ page }) => {
    await page.goto('/en/reset-password?error=invalid_token')

    await expect(page.locator('h1')).toContainText('Invalid or expired')
  })

  test('reset-password page shows error for missing token', async ({ page }) => {
    await page.goto('/en/reset-password')

    await expect(page.locator('h1')).toContainText('Invalid or expired')
  })

  test('login page has forgot password link', async ({ page }) => {
    await page.goto('/en/login')
    const forgotLink = page.getByRole('link', { name: /forgot password/i })
    await expect(forgotLink).toBeVisible()
    await forgotLink.click()
    await page.waitForURL(/\/forgot-password/)
  })
})
