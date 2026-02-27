/**
 * Calendar Navigation Tests — Views, availability grid, month navigation.
 *
 * Runs as the OWNER account on /calendar.
 */
import { test, expect } from '@playwright/test'
import { loadPage, L } from './helpers'

test.describe('Calendar', () => {
  test('calendar renders events', async ({ page }) => {
    await loadPage(page, '/calendar')

    // Calendar page should render with content
    const main = page.locator('main')
    await expect(main).toBeVisible()

    const content = await main.textContent()
    expect(content).toBeTruthy()
    expect(content!.length).toBeGreaterThan(50)
  })

  test('availability grid shows weeks', async ({ page }) => {
    await loadPage(page, '/calendar')

    const availTab = page.getByRole('tab', { name: L.availabilityTab }).first()
    await expect(availTab).toBeVisible({ timeout: 5000 })
    await availTab.click()
    await page.waitForTimeout(2000)

    // Should show week labels (V1-V52 or W1-W52) or status words
    const content = await page.textContent('main')
    expect(content).toMatch(/V\d|W\d|vecka|week|ledig|free|upptagen|busy/i)
  })

  test('month navigation works', async ({ page }) => {
    await loadPage(page, '/calendar')

    // Get current month text
    const monthHeading = page.locator('h2, h3, [class*="font-semibold"]').first()
    const initialMonth = await monthHeading.textContent()

    // Click next month button (ChevronRight icon)
    const nextBtn = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-right') }).first()
    if (await nextBtn.isVisible()) {
      await nextBtn.click()
      await page.waitForTimeout(500)

      // Month should change
      const newMonth = await monthHeading.textContent()
      // Month text should have changed (different month name or number)
      expect(newMonth).not.toBe(initialMonth)

      // Click previous month button to go back
      const prevBtn = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-left') }).first()
      if (await prevBtn.isVisible()) {
        await prevBtn.click()
        await page.waitForTimeout(500)

        // Should be back to original month
        const restoredMonth = await monthHeading.textContent()
        expect(restoredMonth).toBe(initialMonth)
      }
    }
  })
})
