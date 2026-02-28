import { describe, it, expect } from 'vitest'
import { getAdminClient } from './helpers'

const BASE_URL = 'http://localhost:3000'

describe('GET /api/config/tiers', () => {
  it('returns 200 with valid JSON', async () => {
    const res = await fetch(`${BASE_URL}/api/config/tiers`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toBeDefined()
  })

  it('returns all three tiers', async () => {
    const res = await fetch(`${BASE_URL}/api/config/tiers`)
    const data = await res.json()
    expect(data).toHaveProperty('free')
    expect(data).toHaveProperty('pro')
    expect(data).toHaveProperty('team')
  })

  it('each tier has required fields', async () => {
    const res = await fetch(`${BASE_URL}/api/config/tiers`)
    const data = await res.json()

    for (const tier of ['free', 'pro', 'team'] as const) {
      expect(data[tier]).toHaveProperty('invoiceLimit')
      expect(data[tier]).toHaveProperty('receiptScanLimit')
      expect(data[tier]).toHaveProperty('storageMb')
      expect(data[tier]).toHaveProperty('features')
      expect(Array.isArray(data[tier].features)).toBe(true)
    }
  })

  it('all tiers match platform_config values', async () => {
    // Fetch expected values from platform_config (set by super admin)
    const supabase = getAdminClient()
    const { data: config } = await supabase
      .from('platform_config')
      .select('key, value')
      .or('key.like.%_invoice_limit,key.like.%_receipt_scan_limit,key.like.%_storage_mb')

    const configMap = Object.fromEntries((config || []).map(r => [r.key, r.value]))

    const res = await fetch(`${BASE_URL}/api/config/tiers`)
    const data = await res.json()

    // API output should match platform_config for all three tiers
    for (const tier of ['free', 'pro', 'team'] as const) {
      expect(data[tier].invoiceLimit).toBe(parseInt(configMap[`${tier}_invoice_limit`]))
      expect(data[tier].receiptScanLimit).toBe(parseInt(configMap[`${tier}_receipt_scan_limit`]))
      expect(data[tier].storageMb).toBe(parseInt(configMap[`${tier}_storage_mb`]))
    }
  })
})
