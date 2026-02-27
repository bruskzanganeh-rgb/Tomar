/**
 * Settings Tests — Edit and verify persistence, tab navigation.
 *
 * Runs as the OWNER account on /settings.
 */
import { test, expect } from '@playwright/test'
import { loadPage, L } from './helpers'

test.describe('Settings', () => {
  test('edit company name and verify persistence', async ({ page }) => {
    await loadPage(page, '/settings')

    const companyNameInput = page.locator('#company_name')
    await expect(companyNameInput).toBeVisible({ timeout: 5000 })

    // Save original value
    const originalName = await companyNameInput.inputValue()
    expect(originalName.length).toBeGreaterThan(0)

    // Change to test name
    await companyNameInput.clear()
    await companyNameInput.fill('E2E Test Company')

    // Click save
    const saveBtn = page.getByRole('button', { name: L.saveSettings }).first()
    if (await saveBtn.isVisible()) {
      await saveBtn.click()
      await page.waitForTimeout(2000)
    }

    // Reload page and verify persistence
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    const newValue = await page.locator('#company_name').inputValue()
    expect(newValue).toBe('E2E Test Company')

    // Restore original name
    await page.locator('#company_name').clear()
    await page.locator('#company_name').fill(originalName)
    if (await saveBtn.isVisible()) {
      await saveBtn.click()
      await page.waitForTimeout(1500)
    }
  })

  test('email tab loads without errors', async ({ page }) => {
    await loadPage(page, '/settings')

    const emailTab = page.getByRole('tab', { name: L.emailTab })
    if (await emailTab.isVisible()) {
      await emailTab.click()
      await page.waitForTimeout(1000)

      // Should not show error state
      const mainContent = await page.textContent('main')
      expect(mainContent).toBeTruthy()
      expect(mainContent).not.toMatch(/error occurred|fel uppstod/i)
    }
  })

  test('calendar URL present', async ({ page }) => {
    await loadPage(page, '/settings')

    const calendarTab = page.getByRole('tab', { name: L.calendarTab })
    if (await calendarTab.isVisible()) {
      await calendarTab.click()
      await page.waitForTimeout(1000)

      // Should contain a calendar feed URL
      const urlInput = page.locator('input[readonly]').first()
      if (await urlInput.isVisible()) {
        const url = await urlInput.inputValue()
        expect(url).toContain('/api/calendar/feed')
      }
    }
  })

  test('subscription tab shows plan info', async ({ page }) => {
    await loadPage(page, '/settings')

    const subTab = page.getByRole('tab', { name: L.subscriptionTab })
    if (await subTab.isVisible()) {
      await subTab.click()
      await page.waitForTimeout(1000)

      // Should show plan information (Free, Pro, or Team)
      const content = await page.textContent('main')
      expect(content).toMatch(/free|pro|team|subscription|prenumeration/i)
    }
  })
})
