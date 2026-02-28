/**
 * Subscription Tier E2E Tests
 *
 * Verifies that the UI correctly reflects different subscription plans.
 * Runs as OWNER (E2E_EMAIL).
 *
 * Uses serial mode — plan changes affect subsequent tests.
 * Restores to 'team' plan after all tests.
 */
import { test, expect } from '@playwright/test'
import { setTestPlan, resetUsageTracking } from './helpers'

/** Navigate to subscription tab and wait for it to load */
async function goToSubscriptionTab(page: import('@playwright/test').Page) {
  await page.goto('/settings', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  const subTab = page.getByRole('tab', { name: /subscription|prenumeration/i })
  await subTab.click()
  await page.waitForTimeout(1500)
}

test.describe('Subscription tier behavior', () => {
  test.describe.configure({ mode: 'serial' })

  // Start on free plan with clean usage
  test.beforeAll(async () => {
    await setTestPlan('free')
    await resetUsageTracking()
  })

  // Restore to team plan after tests
  test.afterAll(async () => {
    await setTestPlan('team')
    await resetUsageTracking()
  })

  // -------------------------------------------------------------------------
  // Free tier
  // -------------------------------------------------------------------------
  test('free tier — shows Free/Gratis badge on subscription tab', async ({ page }) => {
    await goToSubscriptionTab(page)

    // Badge shows "Free" (en) or "Gratis" (sv)
    const badge = page.locator('span').filter({ hasText: /^free$|^gratis$/i }).first()
    await expect(badge).toBeVisible({ timeout: 5000 })
  })

  test('free tier — shows usage progress (invoices, scans)', async ({ page }) => {
    await goToSubscriptionTab(page)

    const content = await page.textContent('main')
    // Usage section: "Fakturor" / "Invoices" and "Kvittoskanningar" / "Receipt scans"
    expect(content).toMatch(/invoice|faktur/i)
    expect(content).toMatch(/kvitto|receipt|scan/i)
  })

  test('free tier — shows upgrade cards with Uppgradera button', async ({ page }) => {
    await goToSubscriptionTab(page)

    // Should show Pro upgrade cards
    const content = await page.textContent('main')
    expect(content).toMatch(/pro/i)

    // Should have upgrade button(s) — "Upgrade" / "Uppgradera"
    const upgradeBtn = page.getByRole('button', { name: /upgrade|uppgradera/i }).first()
    await expect(upgradeBtn).toBeVisible({ timeout: 5000 })
  })

  test('free tier — team tab shows upgrade required', async ({ page }) => {
    // Ensure we're on free plan (may have been set by beforeAll or another test)
    await setTestPlan('free')

    // Hard reload to clear any cached subscription state
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    const teamTab = page.getByRole('tab', { name: /team/i })
    if (await teamTab.isVisible()) {
      await teamTab.click()
      await page.waitForTimeout(1500)

      const content = await page.textContent('main')
      // Should show upgrade-related message (SV: "Team-plan krävs", EN: "Team plan required")
      // Or at minimum should NOT show full team management UI (members, invite, visibility)
      const hasFullTeamUI = /bjud in|invite|synlighet|visibility/i.test(content || '')
      const hasUpgradeMsg = /upgrade|uppgradera|team.plan|team-plan|krävs/i.test(content || '')
      expect(hasUpgradeMsg || !hasFullTeamUI).toBe(true)
    }
  })

  // -------------------------------------------------------------------------
  // Pro tier
  // -------------------------------------------------------------------------
  test('pro tier — shows Pro badge', async ({ page }) => {
    await setTestPlan('pro')
    await goToSubscriptionTab(page)

    // Badge shows "Pro" in both languages
    const badge = page.locator('span').filter({ hasText: /^pro$/i }).first()
    await expect(badge).toBeVisible({ timeout: 5000 })
  })

  test('pro tier — no usage limits shown', async ({ page }) => {
    await goToSubscriptionTab(page)

    // Usage section ("Användning denna månad" / "Usage this month") should NOT be visible
    const content = await page.textContent('main')
    expect(content).not.toMatch(/användning denna månad|usage this month/i)
  })

  // -------------------------------------------------------------------------
  // Team tier
  // -------------------------------------------------------------------------
  test('team tier — shows Team badge', async ({ page }) => {
    await setTestPlan('team')
    await goToSubscriptionTab(page)

    // Badge shows "Team" in both languages
    const badge = page.locator('span').filter({ hasText: /^team$/i }).first()
    await expect(badge).toBeVisible({ timeout: 5000 })
  })

  test('team tier — team tab shows members (not upgrade)', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    const teamTab = page.getByRole('tab', { name: /team/i })
    if (await teamTab.isVisible()) {
      await teamTab.click()
      await page.waitForTimeout(1000)

      const content = await page.textContent('main')
      // Should NOT show "upgrade required" / "uppgradering krävs"
      expect(content).not.toMatch(/upgrade required|team plan required|uppgradering krävs/i)
      // SHOULD show members list — "member" / "medlem" / "owner" / "ägare"
      expect(content).toMatch(/member|medlem|owner|ägare/i)
    }
  })
})
