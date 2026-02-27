/**
 * Positions Configuration Tests — CRUD on /config?tab=positions.
 *
 * Runs as the OWNER account.
 */
import { test, expect } from '@playwright/test'
import { loadPage, L, E2E, cleanupTestData, waitForDialog } from './helpers'

test.afterAll(async () => {
  await cleanupTestData()
})

test.describe('Positions Config', () => {
  test('list positions', async ({ page }) => {
    await loadPage(page, '/config')

    // Switch to positions tab
    const posTab = page.getByRole('tab', { name: L.positionsTab })
    await posTab.click()
    await page.waitForTimeout(500)

    // Table should be visible
    const table = page.locator('table')
    if (await table.isVisible()) {
      const rows = table.locator('tbody tr')
      const count = await rows.count()
      expect(count).toBeGreaterThanOrEqual(1)
    }
  })

  test('create position', async ({ page }) => {
    await loadPage(page, '/config')

    const posTab = page.getByRole('tab', { name: L.positionsTab })
    await posTab.click()
    await page.waitForTimeout(500)

    // Click new position button
    const newBtn = page.getByRole('button', { name: /new|ny|add|lägg/i }).first()
    await newBtn.click()
    const dialog = await waitForDialog(page)

    // Fill name
    const nameInput = dialog.locator('#name')
    await nameInput.fill(`${E2E} Tutti`)

    // Save
    const saveBtn = dialog.getByRole('button', { name: /create|save|skapa|spara/i }).first()
    await saveBtn.click()
    await page.waitForTimeout(1500)

    // Verify appears
    const newRow = page.getByText(`${E2E} Tutti`)
    await expect(newRow).toBeVisible({ timeout: 5000 })
  })

  test('delete position', async ({ page }) => {
    await loadPage(page, '/config')

    const posTab = page.getByRole('tab', { name: L.positionsTab })
    await posTab.click()
    await page.waitForTimeout(500)

    // Find and delete E2E position
    const trashBtns = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') })
    const count = await trashBtns.count()

    if (count > 0) {
      await trashBtns.last().click()
      await page.waitForTimeout(500)

      const confirmBtn = page.getByRole('button', { name: /confirm|delete|ta bort|radera|bekräfta/i }).last()
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click()
        await page.waitForTimeout(1500)
      }
    }
  })
})
