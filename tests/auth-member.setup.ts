/**
 * Member auth setup: logs in as a team member and saves auth state.
 */
import { test as setup } from '@playwright/test'

const AUTH_FILE = 'tests/.auth/member-state.json'

setup('authenticate-member', async ({ page }) => {
  const email = process.env.E2E_MEMBER_EMAIL
  const password = process.env.E2E_MEMBER_PASSWORD

  if (!email || !password) {
    throw new Error(
      'E2E_MEMBER_EMAIL and E2E_MEMBER_PASSWORD must be set in tests/.env.test'
    )
  }

  await page.goto('/login', { waitUntil: 'networkidle' })
  await page.locator('#email').waitFor({ state: 'visible', timeout: 30_000 })
  // Small delay to ensure React hydration is complete
  await page.waitForTimeout(500)

  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.locator('button[type="submit"]').click()

  await page.waitForURL(/\/(dashboard|onboarding|settings|setup-member)/, { timeout: 30_000 })

  await page.context().storageState({ path: AUTH_FILE })
})
