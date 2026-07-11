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

  test('register with valid data creates account and redirects to dashboard', async ({ page }) => {
    const email = generateTestEmail()
    await page.goto('/en/register')

    await page.locator('input[type="text"]').first().fill('E2E Test User')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[type="password"]').fill('TestPassword123!')

    await page.getByRole('button', { name: /create account/i }).click()

    await page.waitForURL(/\/(en|th)\/dashboard/, { timeout: 15_000 })
    expect(page.url()).toMatch(/\/(en|th)\/dashboard/)
  })

  test('login with valid credentials works', async ({ page }) => {
    const email = generateTestEmail()
    await page.goto('/en/register')
    await page.locator('input[type="text"]').first().fill('E2E Test User')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[type="password"]').fill('TestPassword123!')
    await page.getByRole('button', { name: /create account/i }).click()
    await page.waitForURL(/\/(en|th)\/dashboard/, { timeout: 15_000 })

    await page.context().clearCookies()

    await page.goto('/en/login')
    await page.locator('input[type="email"], input[type="text"]').first().fill(email)
    await page.locator('input[type="password"]').fill('TestPassword123!')
    await page.getByRole('button', { name: /sign in/i }).click()

    await page.waitForURL(/\/(en|th)\/dashboard/, { timeout: 15_000 })
    expect(page.url()).toMatch(/\/(en|th)\/dashboard/)
  })

  test('login with wrong password shows error', async ({ page }) => {
    const email = generateTestEmail()
    await page.goto('/en/register')
    await page.locator('input[type="text"]').first().fill('Test User')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[type="password"]').fill('CorrectPassword123!')
    await page.getByRole('button', { name: /create account/i }).click()
    await page.waitForURL(/\/(en|th)\/dashboard/, { timeout: 15_000 })

    await page.context().clearCookies()
    await page.goto('/en/login')
    await page.locator('input[type="email"], input[type="text"]').first().fill(email)
    await page.locator('input[type="password"]').fill('WrongPassword123!')
    await page.getByRole('button', { name: /sign in/i }).click()

    await page.waitForTimeout(3000)
    expect(page.url()).not.toMatch(/\/dashboard/)
  })
})
