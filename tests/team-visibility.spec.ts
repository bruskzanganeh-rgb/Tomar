/**
 * Team Visibility E2E Tests
 *
 * Verifies gig visibility toggle (personal ↔ shared) and member filter.
 * Runs as OWNER (E2E_EMAIL) with team plan.
 *
 * Uses serial mode — tests depend on each other's side effects.
 */
import { test, expect } from '@playwright/test'
import { setTestPlan, setGigVisibility } from './helpers'

test.describe('Team gig visibility', () => {
  test.describe.configure({ mode: 'serial' })

  // Ensure team plan and personal mode before tests
  test.beforeAll(async () => {
    await setTestPlan('team')
    await setGigVisibility('personal')
  })

  // Restore personal mode after tests
  test.afterAll(async () => {
    await setGigVisibility('personal')
  })

  test('personal mode — no member filter on gigs page', async ({ page }) => {
    await page.goto('/gigs', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Member filter buttons should NOT be visible in personal mode
    const allMembersBtn = page.getByRole('button', { name: /^all$|^alla$/i })
    await expect(allMembersBtn).not.toBeVisible()
  })

  test('owner can toggle visibility to shared in settings', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Go to Team tab
    const teamTab = page.getByRole('tab', { name: /team/i })
    await expect(teamTab).toBeVisible()
    await teamTab.click()
    await page.waitForTimeout(1000)

    // Find the shared mode toggle (Switch component)
    const toggle = page.locator('button[role="switch"]').first()
    await expect(toggle).toBeVisible({ timeout: 5000 })

    // If not already on, click it
    const state = await toggle.getAttribute('data-state')
    if (state !== 'checked') {
      await toggle.click()
      await page.waitForTimeout(1500)
    }

    // Verify toggle is now checked
    await expect(toggle).toHaveAttribute('data-state', 'checked')
  })

  test('shared mode — member filter appears on gigs page', async ({ page }) => {
    await page.goto('/gigs', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Member filter "All Members" / "Alla medlemmar" should be visible
    const allMembersBtn = page.getByRole('button', { name: /^all$|^alla$/i })
    await expect(allMembersBtn).toBeVisible({ timeout: 5000 })

    // There should be at least 2 member filter buttons (All + individual members)
    const filterButtons = page.locator('.flex button').filter({ hasText: /.+/ })
    const count = await filterButtons.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('owner can filter by specific member', async ({ page }) => {
    await page.goto('/gigs', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // "Alla" / "All" button should be visible (shared mode)
    const allBtn = page.getByRole('button', { name: /^all$|^alla$/i })
    await expect(allBtn).toBeVisible({ timeout: 5000 })

    // Click "Jag" / "Me" button to filter by self
    const meBtn = page.getByRole('button', { name: /^jag$|^me$/i })
    if (await meBtn.isVisible()) {
      await meBtn.click()
      await page.waitForTimeout(500)

      // "Alla" button should now have outline variant (not active)
      await expect(allBtn).toBeVisible()
      const allClass = await allBtn.getAttribute('class')
      expect(allClass).toContain('outline')
    }

    // Click "Alla" to reset filter
    await allBtn.click()
    await page.waitForTimeout(300)
  })

  test('owner toggles back to personal mode', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    const teamTab = page.getByRole('tab', { name: /team/i })
    await teamTab.click()
    await page.waitForTimeout(1000)

    const toggle = page.locator('button[role="switch"]').first()
    await expect(toggle).toBeVisible({ timeout: 5000 })

    // Toggle should be checked (shared) — click to toggle back
    const state = await toggle.getAttribute('data-state')
    if (state === 'checked') {
      await toggle.click()
      await page.waitForTimeout(1500)
    }

    await expect(toggle).toHaveAttribute('data-state', 'unchecked')
  })

  test('after toggle back — member filter gone from gigs page', async ({ page }) => {
    await page.goto('/gigs', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    const allMembersBtn = page.getByRole('button', { name: /^all$|^alla$/i })
    await expect(allMembersBtn).not.toBeVisible()
  })
})
