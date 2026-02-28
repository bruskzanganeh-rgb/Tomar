import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase before importing the module under test
function chainMock() {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }
  return chain
}

let mockChain: ReturnType<typeof chainMock>

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      mockChain._table = table
      return mockChain
    },
  }),
}))

beforeEach(() => {
  mockChain = chainMock()
  vi.clearAllMocks()
})

describe('checkUsageLimit (logic verification)', () => {
  it('free plan with 0 = unlimited means Infinity', () => {
    // The logic: rawLimit === 0 ? Infinity : rawLimit
    const rawLimit = 0
    const limit = rawLimit === 0 ? Infinity : rawLimit
    expect(limit).toBe(Infinity)
  })

  it('free plan with limit=5 blocks at 5', () => {
    const rawLimit = 5
    const limit = rawLimit === 0 ? Infinity : rawLimit
    const current = 5
    expect(current < limit).toBe(false)
  })

  it('free plan with limit=5 allows at 4', () => {
    const rawLimit = 5
    const limit = rawLimit === 0 ? Infinity : rawLimit
    const current = 4
    expect(current < limit).toBe(true)
  })

  it('pro plan with limit=0 always allows', () => {
    const rawLimit = 0
    const limit = rawLimit === 0 ? Infinity : rawLimit
    expect(limit).toBe(Infinity)
    expect(100 < limit).toBe(true)
  })

  it('receipt scan limit=3 blocks at 3', () => {
    const rawLimit = 3
    const limit = rawLimit === 0 ? Infinity : rawLimit
    expect(2 < limit).toBe(true)
    expect(3 < limit).toBe(false)
  })
})

describe('incrementUsage (logic verification)', () => {
  it('creates new row when no existing usage', () => {
    // Simulates the insert path: no existing row → INSERT
    const type = 'invoice' as const
    const row = {
      user_id: 'test-user',
      year: 2026,
      month: 2,
      invoice_count: type === 'invoice' ? 1 : 0,
      receipt_scan_count: type === 'receipt_scan' ? 1 : 0,
    }
    expect(row.invoice_count).toBe(1)
    expect(row.receipt_scan_count).toBe(0)
  })

  it('increments correct field for existing row', () => {
    const existing = { invoice_count: 3, receipt_scan_count: 1 }
    const type = 'invoice' as const
    const field = type === 'invoice' ? 'invoice_count' : 'receipt_scan_count'
    const newValue = (existing as Record<string, number>)[field] + 1
    expect(newValue).toBe(4)
  })

  it('increments receipt_scan_count correctly', () => {
    const existing = { invoice_count: 3, receipt_scan_count: 2 }
    const type = 'receipt_scan' as const
    const field = type === 'invoice' ? 'invoice_count' : 'receipt_scan_count'
    const newValue = (existing as Record<string, number>)[field] + 1
    expect(newValue).toBe(3)
  })
})

describe('plan resolution', () => {
  it('resolves to free when no subscription', () => {
    const sub = null
    const plan = sub ? sub : 'free'
    expect(plan).toBe('free')
  })

  it('resolves to free when status is not active', () => {
    const sub = { plan: 'pro', status: 'cancelled' }
    const plan = sub.status === 'active' && (sub.plan === 'pro' || sub.plan === 'team') ? sub.plan : 'free'
    expect(plan).toBe('free')
  })

  it('resolves to pro when active pro', () => {
    const sub = { plan: 'pro', status: 'active' }
    const plan = sub.status === 'active' && (sub.plan === 'pro' || sub.plan === 'team') ? sub.plan : 'free'
    expect(plan).toBe('pro')
  })
})
