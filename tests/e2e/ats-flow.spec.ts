import { test, expect } from '@playwright/test'

test.describe('ATS Optimizer Flow', () => {
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

    // 3. Intercept resumes API (both GET to list and POST to save)
    await page.route('**/api/resumes', async (route) => {
      const method = route.request().method()
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'resume-1',
              isBase: true,
              data: {
                id: 'resume-1',
                name: 'Frontend Engineer',
                persona: 'John Doe',
                skills: ['React', 'TypeScript', 'CSS'],
                summary: 'Experienced frontend developer.',
                experience: [
                  {
                    company: 'Stripe',
                    role: 'Software Engineer',
                    dates: '2023 - Present',
                    bullets: ['Built UI components using React.', 'Optimized page load speed.'],
                  },
                ],
                companies: [],
                stretch: [],
              },
            },
          ]),
        })
      } else if (method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'resume-new-id',
            userId: 'e2e-test-user-id',
            data: route.request().postData(),
            createdAt: new Date().toISOString(),
          }),
        })
      } else {
        await route.continue()
      }
    })

    // 4. Intercept individual resume updates (PATCH / DELETE)
    await page.route('**/api/resumes/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    // 5. Intercept applications to prevent 401s
    await page.route('**/api/applications', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    // 6. Intercept ATS Match calls (mock AI output)
    await page.route('**/api/ai/ats-match', async (route) => {
      const body = route.request().postDataJSON()
      const hasJd = !!body?.jdText && body.jdText.trim().length > 0

      if (hasJd) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            score: 75,
            categories: [
              { name: 'Skills Match', score: 80, evidence: 'React and TypeScript matched.' },
              { name: 'Experience Fit', score: 70, evidence: 'Matches front-end engineer focus.' },
              { name: 'Impact Relevance', score: 75, evidence: 'Shows good experience bullets.' },
            ],
            matched: ['React', 'TypeScript'],
            missing: ['Node.js'],
            suggestions: ['Highlight Node.js backend experience.'],
          }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            score: 85,
            categories: [
              { name: 'ATS Format', score: 90, evidence: 'Clean standard structure.' },
              { name: 'Impact Language', score: 80, evidence: 'Uses metrics and verbs.' },
              { name: 'Skills Density', score: 85, evidence: 'Good skill categorization.' },
              { name: 'Completeness', score: 85, evidence: 'Contains all sections.' },
            ],
            matched: ['Summary', 'Experience', 'Skills'],
            missing: [],
            suggestions: ['Add a custom portfolio URL.'],
          }),
        })
      }
    })

    // 7. Intercept Tailoring calls
    await page.route('**/api/ai/tailor', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          optimized: {
            summary: 'Rewritten frontend developer summary for target job.',
            skills: ['React', 'TypeScript', 'Node.js', 'CSS'],
            experience: [
              {
                company: 'Stripe',
                role: 'Senior Software Engineer',
                dates: '2023 - Present',
                bullets: ['Led development of dashboard UI with React and Node.js.', 'Optimized frontend performance.'],
              },
            ],
          },
          changes: [],
        }),
      })
    })
  })

  test('runs baseline audit and allows matching with JD', async ({ page }) => {
    // Navigate to ATS Optimizer page
    await page.goto('/en/ats')

    // Verifies the page loads correctly
    await expect(page.locator('h1')).toContainText('ATS Optimizer')

    // Select the first resume so the Health Check button becomes enabled
    // (auto-run was removed in a765139 — user must explicitly click Health Check)
    // First open the Select dropdown, then click the resume option
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Frontend Engineer' }).waitFor({ state: 'visible', timeout: 10000 })
    await page.getByRole('option', { name: 'Frontend Engineer' }).click()

    // Trigger the baseline health check
    await page.getByRole('button', { name: /Health Check/i }).click()

    // Verifies the General Health Audit runs
    await page.waitForSelector('text=Excellent Health', { timeout: 10000 })
    await expect(page.locator('body')).toContainText('Baseline resume health report')
    await expect(page.locator('body')).toContainText('ATS Format')
    await expect(page.locator('body')).toContainText('Clean standard structure.')

    // Fill in a job description and run Match Analysis
    const jdTextarea = page.locator('textarea[placeholder*="Paste the job description"]')
    await jdTextarea.fill('We are looking for a Senior React Engineer with Node.js skills.')

    const analyzeBtn = page.getByRole('button', { name: /Analyze Match/i })
    await analyzeBtn.click()

    // Verifies it transitions to Job Match state
    await page.waitForSelector('text=Strong Match', { timeout: 10000 })
    await expect(page.locator('body')).toContainText('Real-time job matching and keyword analysis')
    await expect(page.locator('body')).toContainText('Skills Match')
    await expect(page.locator('body')).toContainText('React and TypeScript matched.')
    
    // Verifies Tailor Resume Card and action button is present
    await expect(page.locator('body')).toContainText('Tailor Resume for this Job')
    const tailorBtn = page.getByRole('button', { name: /Tailor Resume with AI/i })
    await expect(tailorBtn).toBeVisible()
  })
})
