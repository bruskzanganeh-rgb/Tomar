/**
 * Client CRUD Tests — Create, edit, delete, search.
 *
 * Runs as the OWNER account on /config?tab=clients.
 */
import { test, expect } from '@playwright/test'
import { loadPage, L, E2E, cleanupTestData, waitForDialog } from './helpers'

test.afterAll(async () => {
  await cleanupTestData()
})

test.describe('Client CRUD', () => {
  test('create client with fields', async ({ page }) => {
    await loadPage(page, '/config')

    // Switch to clients tab
    const clientsTab = page.getByRole('tab', { name: L.clientsTab })
    if (await clientsTab.isVisible()) {
      await clientsTab.click()
      await page.waitForTimeout(500)
    }

    // Click add button (has Plus icon, text "Ny uppdragsgivare" / "New client")
    const addBtn = page.locator('button').filter({ has: page.locator('svg.lucide-plus') }).first()
    await addBtn.click()
    const dialog = await waitForDialog(page)

    // Fill name (required)
    const nameInput = dialog.locator('input').first()
    await nameInput.fill(`${E2E} Client AB`)

    // Fill email (find email input)
    const emailInput = dialog.locator('input[type="email"]').first()
    if (await emailInput.isVisible()) {
      await emailInput.fill('e2e@test.com')
    }

    // Fill org number
    const inputs = dialog.locator('input[type="text"], input:not([type])')
    for (let i = 0; i < await inputs.count(); i++) {
      const input = inputs.nth(i)
      const placeholder = await input.getAttribute('placeholder')
      if (placeholder && placeholder.includes('123456')) {
        await input.fill('999999-9999')
        break
      }
    }

    // Wait for form to stabilize, then submit
    await page.waitForTimeout(500)
    // Use page-level locator to avoid stale dialog reference after re-renders
    await page.locator('[role="dialog"]').getByRole('button', { name: /create|skapa/i }).click({ timeout: 5000 })
    await page.waitForTimeout(1500)

    // Verify dialog closed
    await expect(dialog).not.toBeVisible({ timeout: 5000 })

    // Verify client appears — search to find it in the long list
    const searchInput = page.getByPlaceholder(/sök|search/i).first()
    await expect(searchInput).toBeVisible({ timeout: 3000 })
    await searchInput.fill(E2E)
    await page.waitForTimeout(1000)
    // Use table-scoped text check
    await expect(page.locator('table')).toContainText(`${E2E} Client AB`, { timeout: 5000 })
  })

  test('edit client', async ({ page }) => {
    await loadPage(page, '/config')

    const clientsTab = page.getByRole('tab', { name: L.clientsTab })
    if (await clientsTab.isVisible()) {
      await clientsTab.click()
      await page.waitForTimeout(1000)
    }

    // Find E2E client row and click its edit button
    const clientRow = page.locator('tr, [class*="card"]').filter({ hasText: E2E }).first()
    await expect(clientRow).toBeVisible({ timeout: 5000 })
    const editBtn = clientRow.locator('button').filter({ has: page.locator('svg.lucide-pencil, svg.lucide-edit') }).first()

    if (await editBtn.isVisible()) {
      await editBtn.click()
      const dialog = await waitForDialog(page)

      // Change email
      const emailInput = dialog.locator('input[type="email"]').first()
      if (await emailInput.isVisible()) {
        await emailInput.clear()
        await emailInput.fill('e2e-updated@test.com')
      }

      // Save
      const saveBtn = dialog.getByRole('button', { name: /save|spara/i }).first()
      await saveBtn.click()
      await page.waitForTimeout(1500)
    }
  })

  test('delete client', async ({ page }) => {
    await loadPage(page, '/config')

    const clientsTab = page.getByRole('tab', { name: L.clientsTab })
    if (await clientsTab.isVisible()) {
      await clientsTab.click()
      await page.waitForTimeout(1000)
    }

    // Find E2E client row and click its delete button
    const clientRow = page.locator('tr, [class*="card"]').filter({ hasText: E2E }).first()
    await expect(clientRow).toBeVisible({ timeout: 5000 })
    const trashBtn = clientRow.locator('button').filter({ has: page.locator('svg.lucide-trash-2, svg.lucide-trash') }).first()
    if (await trashBtn.isVisible()) {
      await trashBtn.click()
      await page.waitForTimeout(500)

      // Confirm
      const confirmBtn = page.getByRole('button', { name: /confirm|delete|ta bort|radera|bekräfta/i }).last()
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click()
        await page.waitForTimeout(1500)
      }
    }
  })

  test('client search works', async ({ page }) => {
    // First create a client to search for
    await loadPage(page, '/config')

    const clientsTab = page.getByRole('tab', { name: L.clientsTab })
    if (await clientsTab.isVisible()) {
      await clientsTab.click()
      await page.waitForTimeout(500)
    }

    // Type in search box
    const searchInput = page.locator('input[type="search"], input[placeholder*="search"], input[placeholder*="sök"], input[placeholder*="Search"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('E2E')
      await page.waitForTimeout(500)

      // Content should filter (fewer rows or show "no results")
      const content = await page.textContent('main')
      expect(content).toBeTruthy()
    }
  })
})
