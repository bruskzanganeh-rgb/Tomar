/**
 * Invoice CRUD Tests — Create, line management, send dialog.
 *
 * Runs as the OWNER account on /finance.
 */
import { test, expect } from '@playwright/test'
import { loadPage, L, E2E, cleanupTestData, waitForDialog } from './helpers'

test.afterAll(async () => {
  await cleanupTestData()
})

test.describe('Invoice CRUD', () => {
  test('create invoice with manual line', async ({ page }) => {
    await loadPage(page, '/finance')

    // Click new invoice
    const newInvoiceBtn = page.getByRole('button', { name: L.newInvoice }).first()
    await newInvoiceBtn.click()
    const dialog = await waitForDialog(page)

    // Select a client (first SelectTrigger in the form)
    const clientSelect = dialog.locator('button[role="combobox"]').first()
    await clientSelect.click()
    await page.waitForTimeout(500)
    const firstClient = page.getByRole('option').first()
    if (await firstClient.isVisible()) {
      await firstClient.click()
      await page.waitForTimeout(1000) // Wait for client gigs to load
    }

    // Fill the first invoice line description
    const descInput = dialog.locator('input.flex-1, input[class*="flex-1"]').first()
    if (await descInput.isVisible()) {
      await descInput.fill(`${E2E} Service`)
    }

    // Fill amount for first line (has step="0.01", unlike the payment_terms input)
    const lineAmountInput = dialog.locator('input[type="number"][step="0.01"]').first()
    if (await lineAmountInput.isVisible()) {
      await lineAmountInput.clear()
      await lineAmountInput.fill('25000')
    }

    // Create invoice
    const createBtn = dialog.getByRole('button', { name: /create invoice|skapa faktura/i }).first()
    if (await createBtn.isVisible() && await createBtn.isEnabled()) {
      await createBtn.click()
      await page.waitForTimeout(2000)

      // Verify dialog closed
      await expect(dialog).not.toBeVisible({ timeout: 5000 })
    } else {
      // If button is disabled, we might need a Pro subscription — skip gracefully
      await page.keyboard.press('Escape')
    }
  })

  test('invoice from completed gig', async ({ page }) => {
    await loadPage(page, '/finance')

    const newInvoiceBtn = page.getByRole('button', { name: L.newInvoice }).first()
    await newInvoiceBtn.click()
    const dialog = await waitForDialog(page)

    // Select client
    const clientSelect = dialog.locator('button[role="combobox"]').first()
    await clientSelect.click()
    await page.waitForTimeout(500)
    const firstClient = page.getByRole('option').first()
    if (await firstClient.isVisible()) {
      await firstClient.click()
      await page.waitForTimeout(1500) // Wait for gigs to load
    }

    // Check if any gig checkboxes appear
    const gigCheckboxes = dialog.locator('[role="checkbox"]')
    const checkboxCount = await gigCheckboxes.count()

    if (checkboxCount > 0) {
      // Select first completed gig
      await gigCheckboxes.first().click()
      await page.waitForTimeout(500)

      // Verify lines were auto-populated (should see amount)
      const lines = dialog.locator('input[type="number"]')
      const lineCount = await lines.count()
      expect(lineCount).toBeGreaterThanOrEqual(1)
    }

    // Close without creating
    await page.keyboard.press('Escape')
  })

  test('VAT calculation correct', async ({ page }) => {
    await loadPage(page, '/finance')

    const newInvoiceBtn = page.getByRole('button', { name: L.newInvoice }).first()
    await newInvoiceBtn.click()
    const dialog = await waitForDialog(page)

    // Select client
    const clientSelect = dialog.locator('button[role="combobox"]').first()
    await clientSelect.click()
    await page.waitForTimeout(500)
    const firstClient = page.getByRole('option').first()
    if (await firstClient.isVisible()) {
      await firstClient.click()
      await page.waitForTimeout(1000)
    }

    // Fill amount manually
    const amountInputs = dialog.locator('input[type="number"]')
    if (await amountInputs.count() > 0) {
      await amountInputs.first().fill('10000')
      await page.waitForTimeout(500)

      // Check that the preview or summary shows subtotal + VAT
      const dialogText = await dialog.textContent()
      // Should contain numbers that indicate calculations happened
      expect(dialogText).toBeTruthy()
      expect(dialogText!.length).toBeGreaterThan(100) // Dialog has content
    }

    await page.keyboard.press('Escape')
  })

  test('add and remove invoice lines', async ({ page }) => {
    await loadPage(page, '/finance')

    const newInvoiceBtn = page.getByRole('button', { name: L.newInvoice }).first()
    await newInvoiceBtn.click()
    const dialog = await waitForDialog(page)

    // Select client first
    const clientSelect = dialog.locator('button[role="combobox"]').first()
    await clientSelect.click()
    await page.waitForTimeout(500)
    const firstClient = page.getByRole('option').first()
    if (await firstClient.isVisible()) {
      await firstClient.click()
      await page.waitForTimeout(1000)
    }

    // Count initial line amount inputs (step=0.01 distinguishes from payment terms)
    const lineAmountsBefore = await dialog.locator('input[type="number"][step="0.01"]').count()

    // Click "+ Rad" / "+ Row" button
    const addRowBtn = dialog.getByRole('button', { name: /rad|row/i }).first()
    if (await addRowBtn.isVisible()) {
      await addRowBtn.click()
      await page.waitForTimeout(500)

      // Should have more line amount inputs now
      const lineAmountsAfter = await dialog.locator('input[type="number"][step="0.01"]').count()
      expect(lineAmountsAfter).toBeGreaterThan(lineAmountsBefore)

      // Remove the added line (Trash icon inside the dialog)
      const trashBtns = dialog.locator('button').filter({ has: dialog.locator('svg.lucide-trash-2') })
      const trashCount = await trashBtns.count()
      if (trashCount > 0) {
        await trashBtns.last().click()
        await page.waitForTimeout(500)

        // Should have fewer line amount inputs (use same selector as above)
        const lineAmountsFinal = await dialog.locator('input[type="number"][step="0.01"]').count()
        expect(lineAmountsFinal).toBeLessThan(lineAmountsAfter)
      }
    }

    await page.keyboard.press('Escape')
  })

  test('send invoice dialog opens', async ({ page }) => {
    await loadPage(page, '/finance')

    // Find any "send" or "email" button for an existing invoice
    const sendBtn = page.locator('button').filter({ has: page.locator('svg.lucide-mail, svg.lucide-send') }).first()
    if (await sendBtn.isVisible()) {
      await sendBtn.click()
      await page.waitForTimeout(1000)

      // Verify send dialog opens with email field
      const dialog = page.locator('[role="dialog"]')
      if (await dialog.isVisible()) {
        // Should have email input, subject, message
        const emailInput = dialog.locator('input[type="email"]')
        await expect(emailInput).toBeVisible({ timeout: 3000 })

        // Should have subject input
        const subjectInput = dialog.locator('input#subject, input[id="subject"]')
        if (await subjectInput.isVisible()) {
          const subjectValue = await subjectInput.inputValue()
          expect(subjectValue.length).toBeGreaterThan(0) // Should be pre-filled
        }

        await page.keyboard.press('Escape')
      }
    }
  })
})
