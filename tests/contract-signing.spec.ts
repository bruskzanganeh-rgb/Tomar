/**
 * Contract Signing E2E Tests
 *
 * Tests the public /sign/[token] page.
 * Creates a test contract via service role, then navigates to it.
 *
 * Uses serial mode — tests depend on each other.
 */
import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const TEST_COMPANY_ID = '11111111-1111-1111-1111-111111111111'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE env vars')
  return createClient(url, key)
}

let testContractId: string
let signingToken: string

test.describe('Contract signing page', () => {
  test.describe.configure({ mode: 'serial' })

  // Create a test contract with signing_token directly via DB
  test.beforeAll(async () => {
    const supabase = getAdminClient()
    signingToken = randomBytes(32).toString('hex')

    const { data, error } = await supabase
      .from('contracts')
      .insert({
        company_id: TEST_COMPANY_ID,
        contract_number: `E2E-TEST-${Date.now()}`,
        tier: 'pro',
        annual_price: 4999,
        currency: 'SEK',
        billing_interval: 'annual',
        vat_rate_pct: 25,
        contract_start_date: '2026-03-01',
        contract_duration_months: 12,
        signer_name: 'E2E Signer',
        signer_email: 'e2e-signer@test.com',
        signer_title: 'CTO',
        status: 'sent',
        signing_token: signingToken,
        token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single()

    if (error) throw new Error(`Failed to create test contract: ${error.message}`)
    testContractId = data.id
  })

  // Cleanup
  test.afterAll(async () => {
    if (testContractId) {
      const supabase = getAdminClient()
      await supabase.from('contract_audit').delete().eq('contract_id', testContractId)
      await supabase.from('contracts').delete().eq('id', testContractId)
    }
  })

  test('signing page loads with contract details', async ({ page }) => {
    await page.goto(`/sign/${signingToken}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

    // Should show the agreement heading
    await expect(page.getByText('Subscription Agreement')).toBeVisible({ timeout: 10000 })

    // Should show signer name
    const nameInput = page.locator('#signer-name')
    await expect(nameInput).toBeVisible()
    await expect(nameInput).toHaveValue('E2E Signer')

    // Should show tier and price
    const content = await page.textContent('body')
    expect(content).toMatch(/pro/i)
    expect(content).toMatch(/4[\s,.]?999/)
  })

  test('sign button disabled without signature and checkboxes', async ({ page }) => {
    await page.goto(`/sign/${signingToken}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

    // Sign button should be disabled initially
    const signBtn = page.getByRole('button', { name: /sign agreement/i })
    await expect(signBtn).toBeVisible({ timeout: 10000 })
    await expect(signBtn).toBeDisabled()
  })

  test('checkboxes enable after clicking', async ({ page }) => {
    await page.goto(`/sign/${signingToken}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

    // Click both checkboxes
    const authority = page.locator('#authority')
    const terms = page.locator('#terms')
    await authority.click()
    await terms.click()

    // Both should be checked
    await expect(authority).toHaveAttribute('data-state', 'checked')
    await expect(terms).toHaveAttribute('data-state', 'checked')

    // Button still disabled (no signature yet)
    const signBtn = page.getByRole('button', { name: /sign agreement/i })
    await expect(signBtn).toBeDisabled()
  })

  test('invalid token shows error page', async ({ page }) => {
    await page.goto('/sign/invalid-token-123456', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Should show error message
    const content = await page.textContent('body')
    expect(content).toMatch(/unable to load|expired|invalid/i)
  })

  test('signing page has no horizontal overflow', async ({ page }) => {
    await page.goto(`/sign/${signingToken}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
  })
})
