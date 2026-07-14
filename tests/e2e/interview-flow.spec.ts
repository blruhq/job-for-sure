import { test, expect } from '@playwright/test'

test.describe('Mock Interview Prep Flow', () => {
  test.beforeEach(async ({ context, page }) => {
    // 1. Inject a fake session cookie so proxy.ts middleware allows access to protected routes
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: 'fake-e2e-token',
        domain: 'localhost',
        path: '/',
      },
    ])

    // 2. Intercept client-side session check
    await page.route('**/api/auth/get-session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'e2e-test-user-id',
            name: 'E2E Test User',
            email: 'e2e-test@testmail.com',
            emailVerified: true,
          },
          session: {
            id: 'e2e-session-id',
            userId: 'e2e-test-user-id',
            token: 'fake-e2e-token',
          },
        }),
      })
    })

    // 3. Intercept resumes API (return at least one resume profile so setup page doesn't block)
    await page.route('**/api/resumes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'resume-1',
            data: JSON.stringify({
              id: 'resume-1',
              name: 'Frontend Engineer',
              persona: 'John Doe',
              skills: ['React', 'TypeScript', 'CSS'],
              summary: 'Experienced frontend developer.',
              experience: [],
              companies: [],
              stretch: [],
            }),
          },
        ]),
      })
    })

    // 4. Intercept applications to prevent 401s
    await page.route('**/api/applications', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    // 5. Intercept Interview API actions (GET history, POST action=question/evaluate/save)
    await page.route('**/api/ai/interview', async (route) => {
      const method = route.request().method()
      
      if (method === 'GET') {
        // Return empty past attempts
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      } else if (method === 'POST') {
        const body = route.request().postDataJSON()
        const { action } = body

        if (action === 'question') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              question: 'Explain how React\'s reconciliation algorithm works and how keys impact performance.',
              category: 'technical',
              tags: ['react', 'performance'],
            }),
          })
        } else if (action === 'evaluate') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              score: 8,
              strengths: ['Correctly explained diffing algorithm.', 'Mentioned Virtual DOM mapping.'],
              improvements: ['Could mention component lifecycle optimization.'],
              modelAnswer: 'Reconciliation is the process by which React updates the DOM tree...',
            }),
          })
        } else if (action === 'save') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              id: 'session-e2e-123',
            }),
          })
        } else {
          await route.continue()
        }
      } else {
        await route.continue()
      }
    })
  })

  test('successfully runs through mock interview setup, QA session, and summary', async ({ page }) => {
    // Navigate to Interview Prep page
    await page.goto('/en/interview')

    // 1. Verifies the setup page loads
    await expect(page.locator('h1')).toContainText('Interview Prep')
    await expect(page.locator('body')).toContainText('Configure your mock interview')

    // Fill out setup form (custom Stripe + Software Engineer practice)
    await page.locator('input[placeholder*="Company"]').fill('Stripe')
    await page.locator('input[placeholder*="Role"]').fill('Software Engineer')

    // Select Focus Type (technical) and Difficulty (senior)
    await page.getByRole('button', { name: 'technical', exact: true }).click()
    await page.getByRole('button', { name: 'senior', exact: true }).click()

    // Start the interview
    await page.getByRole('button', { name: /Start Mock Interview/i }).click()

    // 2. Verify we transitioned to Active Session Q&A
    await page.waitForSelector('text=Active Question', { timeout: 10000 })
    await expect(page.locator('body')).toContainText('Mock Interview: Stripe')
    await expect(page.locator('body')).toContainText('Software Engineer')
    await expect(page.locator('body')).toContainText('Explain how React\'s reconciliation algorithm works')

    // Type a valid response (min 20 characters required)
    const textarea = page.locator('textarea[placeholder*="Type your response"]')
    await textarea.fill('React reconciliation uses a virtual DOM to optimize UI updates by comparing the new and old virtual DOM trees and applying minimal patches.')

    // Submit the answer
    await page.getByRole('button', { name: /Submit Answer/i }).click()

    // 3. Confirm AI Score and Feedback displays
    await page.waitForSelector('text=AI Score & Feedback', { timeout: 10000 })
    await expect(page.locator('body')).toContainText('Score: 8/10')
    await expect(page.locator('body')).toContainText('Correctly explained diffing algorithm.')

    // End & Summarize the interview
    const endBtn = page.getByRole('button', { name: /End & Summarize/i }).first()
    await endBtn.click()

    // 4. Verify we are on the Summary Report phase
    await page.waitForSelector('text=Interview Completed', { timeout: 10000 })
    await expect(page.locator('body')).toContainText('summary of your performance')
    await expect(page.locator('body')).toContainText('8 / 10') // Avg score of 8/10
    
    // Check if Restart button is visible
    const restartBtn = page.getByRole('button', { name: /Practice Again/i })
    await expect(restartBtn).toBeVisible()
  })
})
