/**
 * Auth Flow E2E Tests
 *
 * Tests login page, signup page, forgot password, and middleware redirects.
 * No auth setup needed — these test public pages + redirect behavior.
 */
import { test, expect } from '@playwright/test'

test.describe('Login page', () => {
  test('renders login form correctly', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })

    // Email and password fields visible
    const emailInput = page.locator('#email')
    const passwordInput = page.locator('#password')
    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()

    // Login button visible
    const loginBtn = page.getByRole('button', { name: /log in|logga in/i })
    await expect(loginBtn).toBeVisible()

    // Forgot password link visible
    const forgotLink = page.getByRole('link', { name: /forgot|glömt/i })
    await expect(forgotLink).toBeVisible()

    // Signup link visible
    const signupLink = page.getByRole('link', { name: /create|skapa|registrera/i })
    await expect(signupLink).toBeVisible()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })

    await page.locator('#email').fill('invalid@nonexistent.com')
    await page.locator('#password').fill('wrongpassword123')
    await page.getByRole('button', { name: /log in|logga in/i }).click()

    // Wait for error message
    await page.waitForTimeout(2000)
    const errorMsg = page.locator('.text-red-400')
    await expect(errorMsg).toBeVisible({ timeout: 10000 })
  })

  test('no horizontal overflow on login page', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
  })

  test('login page has no broken i18n keys', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    const problems = await page.evaluate(() => {
      const results: string[] = []
      const namespaces = ['common', 'auth', 'gig', 'invoice', 'settings']
      const nsPattern = new RegExp(`^(${namespaces.join('|')})\\.\\w+`, 'i')

      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null)
      let node: Text | null
      while ((node = walker.nextNode() as Text | null)) {
        const text = node.textContent?.trim()
        if (!text || text.length < 3) continue
        const parent = node.parentElement
        if (!parent) continue
        const tag = parent.tagName.toLowerCase()
        if (tag === 'script' || tag === 'style') continue
        if (nsPattern.test(text)) results.push(`"${text}" in <${tag}>`)
      }
      return results
    })

    expect(problems, `Broken i18n: ${problems.join(', ')}`).toHaveLength(0)
  })
})

test.describe('Signup page', () => {
  test('renders signup form correctly', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'networkidle' })

    // Email and password fields visible
    const emailInput = page.locator('#email, input[type="email"]').first()
    await expect(emailInput).toBeVisible()

    const passwordInput = page.locator('#password, input[type="password"]').first()
    await expect(passwordInput).toBeVisible()

    // Signup/register button visible
    const signupBtn = page.getByRole('button', { name: /sign up|registrera|create|skapa/i })
    await expect(signupBtn).toBeVisible()
  })

  test('no horizontal overflow on signup page', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'networkidle' })

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
  })
})

test.describe('Forgot password page', () => {
  test('renders forgot password form', async ({ page }) => {
    await page.goto('/forgot-password', { waitUntil: 'networkidle' })

    // Email field visible
    const emailInput = page.locator('input[type="email"]').first()
    await expect(emailInput).toBeVisible()

    // Submit button visible
    const submitBtn = page.getByRole('button', { name: /send|skicka|reset|återställ/i })
    await expect(submitBtn).toBeVisible()
  })
})

test.describe('Middleware redirects', () => {
  test('unauthenticated user on /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Should end up on login page
    expect(page.url()).toMatch(/\/login/)
  })

  test('unauthenticated user on /gigs redirects to /login', async ({ page }) => {
    await page.goto('/gigs', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    expect(page.url()).toMatch(/\/login/)
  })

  test('unauthenticated user on /settings redirects to /login', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    expect(page.url()).toMatch(/\/login/)
  })
})
