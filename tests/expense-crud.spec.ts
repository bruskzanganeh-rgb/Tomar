/**
 * Expense CRUD Tests — Upload dialog, manual creation, edit, delete.
 *
 * Runs as the OWNER account on /finance (expenses tab).
 */
import { test, expect } from '@playwright/test'
import { loadPage, L, E2E, cleanupTestData, waitForDialog } from './helpers'

test.afterAll(async () => {
  await cleanupTestData()
})

test.describe('Expense CRUD', () => {
  test('upload receipt dialog opens', async ({ page }) => {
    await loadPage(page, '/finance')

    // Switch to expenses tab
    const expenseTab = page.getByRole('tab', { name: L.expensesTab })
    if (await expenseTab.isVisible()) {
      await expenseTab.click()
      await page.waitForTimeout(500)
    }

    // Click upload button ("Ladda upp kvitto" / "Upload receipt")
    const uploadBtn = page.getByRole('button', { name: /upload|ladda upp/i }).first()
    if (await uploadBtn.isVisible()) {
      await uploadBtn.click()
      await page.waitForTimeout(500)

      // Dialog should be visible
      const dialog = page.locator('[role="dialog"]')
      await expect(dialog).toBeVisible({ timeout: 5000 })

      // Should show upload area or file input
      const dialogText = await dialog.textContent()
      expect(dialogText).toMatch(/upload|ladda upp|drag|dra|receipt|kvitto/i)

      await page.keyboard.press('Escape')
    }
  })

  test('manual expense creation', async ({ page }) => {
    await loadPage(page, '/finance')

    // Switch to expenses tab
    const expenseTab = page.getByRole('tab', { name: L.expensesTab })
    if (await expenseTab.isVisible()) {
      await expenseTab.click()
      await page.waitForTimeout(500)
    }

    // Click upload button by text ("Ladda upp kvitto" / "Upload receipt")
    const uploadBtn = page.getByRole('button', { name: /ladda upp|upload receipt/i }).first()
    await expect(uploadBtn).toBeVisible({ timeout: 5000 })
    await uploadBtn.click()

    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Upload a dummy file (required to enable "Manual Entry" button)
    const fileInput = dialog.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-receipt.png',
      mimeType: 'image/png',
      // Minimal 1x1 PNG
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
    })
    await page.waitForTimeout(500)

    // Click "Manual Entry" / "Manuell inmatning" button (skip AI scan)
    const manualBtn = dialog.getByRole('button', { name: /manual|manuell/i }).first()
    await expect(manualBtn).toBeEnabled({ timeout: 5000 })
    await manualBtn.click()
    await page.waitForTimeout(500)

    // Fill form fields (now in "review" step)
    const supplierInput = dialog.locator('#supplier')
    await expect(supplierInput).toBeVisible({ timeout: 3000 })
    await supplierInput.fill(`${E2E} Supplier`)

    const amountInput = dialog.locator('#amount')
    if (await amountInput.isVisible()) {
      await amountInput.clear()
      await amountInput.fill('1500')
    }

    // Save
    const saveBtn = dialog.getByRole('button', { name: /save|spara/i }).first()
    if (await saveBtn.isVisible()) {
      await saveBtn.click()
      await page.waitForTimeout(2000)
    }
  })

  test('edit expense', async ({ page }) => {
    await loadPage(page, '/finance')

    const expenseTab = page.getByRole('tab', { name: L.expensesTab })
    if (await expenseTab.isVisible()) {
      await expenseTab.click()
      await page.waitForTimeout(1000)
    }

    // Click edit on first expense
    const editBtn = page.locator('button').filter({ has: page.locator('svg.lucide-pencil, svg.lucide-edit') }).first()
    if (await editBtn.isVisible()) {
      await editBtn.click()
      const dialog = await waitForDialog(page)

      // Change supplier
      const supplierInput = dialog.locator('#supplier, input[name="supplier"]').first()
      if (await supplierInput.isVisible()) {
        await supplierInput.clear()
        await supplierInput.fill(`${E2E} Updated Supplier`)
      }

      // Save
      const saveBtn = dialog.getByRole('button', { name: /save|spara/i }).first()
      if (await saveBtn.isVisible()) {
        await saveBtn.click()
        await page.waitForTimeout(1500)
      }
    }
  })

  test('delete expense', async ({ page }) => {
    await loadPage(page, '/finance')

    const expenseTab = page.getByRole('tab', { name: L.expensesTab })
    if (await expenseTab.isVisible()) {
      await expenseTab.click()
      await page.waitForTimeout(1000)
    }

    // Click delete on an expense
    const trashBtn = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2, svg.lucide-trash') }).first()
    if (await trashBtn.isVisible()) {
      await trashBtn.click()
      await page.waitForTimeout(500)

      // Confirm deletion
      const confirmBtn = page.getByRole('button', { name: /confirm|delete|ta bort|radera|bekräfta/i }).last()
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click()
        await page.waitForTimeout(1500)
      }
    }
  })
})
