import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports that reference the mocked modules
// ---------------------------------------------------------------------------

const mockConstructEvent = vi.fn()
const mockSubscriptionsRetrieve = vi.fn()

vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(() => ({
    webhooks: { constructEvent: mockConstructEvent },
    subscriptions: { retrieve: mockSubscriptionsRetrieve },
  })),
  getPlanFromPriceId: vi.fn((priceId: string | undefined | null) => (priceId?.includes('team') ? 'team' : 'pro')),
}))

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({
    get: vi.fn((name: string) => (name === 'stripe-signature' ? 'sig_test' : null)),
  })),
}))

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: Record<string, unknown>, opts?: { status?: number }) => ({
      data,
      status: opts?.status ?? 200,
    })),
  },
}))

import { POST } from '@/app/api/stripe/webhook/route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockRequest(body: string): Request {
  return new Request('http://localhost/api/stripe/webhook', {
    method: 'POST',
    body,
    headers: { 'stripe-signature': 'sig_test' },
  })
}

/**
 * Creates a fluent Supabase chain mock that supports
 * `.from(t).select(...).eq(...).single()` and `.from(t).update(...).eq(...)`
 */
function createChainMock(returnData: unknown = null) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: returnData }),
  }
  return chain
}

/**
 * Builds a minimal Stripe Event object for `constructEvent` to return.
 */
function makeEvent(type: string, data: Record<string, unknown>) {
  return { type, data: { object: data } }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
  })

  // -----------------------------------------------------------------------
  // 1. No signature
  // -----------------------------------------------------------------------
  it('returns 400 with "No signature" when stripe-signature header is missing', async () => {
    // Override headers mock for this test to return null for stripe-signature
    const { headers } = await import('next/headers')
    vi.mocked(headers).mockResolvedValueOnce({
      get: vi.fn(() => null),
    } as never)

    const req = createMockRequest('{}')
    const res = await POST(req)

    expect(res).toEqual(expect.objectContaining({ data: { error: 'No signature' }, status: 400 }))
  })

  // -----------------------------------------------------------------------
  // 2. Invalid signature (constructEvent throws)
  // -----------------------------------------------------------------------
  it('returns 400 when constructEvent throws', async () => {
    mockConstructEvent.mockImplementationOnce(() => {
      throw new Error('Signature mismatch')
    })

    const req = createMockRequest('{}')
    const res = await POST(req)

    expect(res).toEqual(expect.objectContaining({ data: { error: 'Invalid signature' }, status: 400 }))
  })

  // -----------------------------------------------------------------------
  // 3. checkout.session.completed — updates subscription to active with pro
  // -----------------------------------------------------------------------
  it('handles checkout.session.completed and sets plan to pro', async () => {
    const chain = createChainMock()
    mockFrom.mockReturnValue(chain)

    mockConstructEvent.mockReturnValueOnce(
      makeEvent('checkout.session.completed', {
        metadata: { user_id: 'user-1', plan: 'pro' },
        subscription: 'sub_123',
      }),
    )

    mockSubscriptionsRetrieve.mockResolvedValueOnce({
      items: { data: [{ price: { id: 'price_pro_monthly' } }] },
      start_date: 1700000000,
      ended_at: null,
    })

    const req = createMockRequest('{}')
    const res = await POST(req)

    expect(res).toEqual(expect.objectContaining({ data: { received: true }, status: 200 }))
    expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith('sub_123')
    expect(mockFrom).toHaveBeenCalledWith('subscriptions')
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: 'pro',
        status: 'active',
        stripe_subscription_id: 'sub_123',
        stripe_price_id: 'price_pro_monthly',
        admin_override: false,
      }),
    )
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  // -----------------------------------------------------------------------
  // 4. checkout.session.completed with team plan — includes company_id
  // -----------------------------------------------------------------------
  it('handles checkout.session.completed with team plan and company_id', async () => {
    const chain = createChainMock()
    mockFrom.mockReturnValue(chain)

    mockConstructEvent.mockReturnValueOnce(
      makeEvent('checkout.session.completed', {
        metadata: { user_id: 'user-2', plan: 'team', company_id: 'comp-1' },
        subscription: 'sub_456',
      }),
    )

    mockSubscriptionsRetrieve.mockResolvedValueOnce({
      items: { data: [{ price: { id: 'price_team_monthly' } }] },
      start_date: 1700000000,
      ended_at: 1702592000,
    })

    const req = createMockRequest('{}')
    const res = await POST(req)

    expect(res).toEqual(expect.objectContaining({ data: { received: true }, status: 200 }))
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: 'team',
        status: 'active',
        company_id: 'comp-1',
        current_period_end: new Date(1702592000 * 1000).toISOString(),
      }),
    )
  })

  // -----------------------------------------------------------------------
  // 5. checkout.session.completed without user_id — no DB update
  // -----------------------------------------------------------------------
  it('does nothing when checkout.session.completed has no user_id', async () => {
    mockConstructEvent.mockReturnValueOnce(
      makeEvent('checkout.session.completed', {
        metadata: {},
        subscription: 'sub_noop',
      }),
    )

    const req = createMockRequest('{}')
    const res = await POST(req)

    expect(res).toEqual(expect.objectContaining({ data: { received: true }, status: 200 }))
    expect(mockFrom).not.toHaveBeenCalled()
    expect(mockSubscriptionsRetrieve).not.toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------
  // 6. customer.subscription.updated — updates plan and status
  // -----------------------------------------------------------------------
  it('handles customer.subscription.updated and updates plan', async () => {
    // First call: lookup by stripe_customer_id → returns user_id
    const lookupChain = createChainMock({ user_id: 'user-3' })
    // Second call: lookup current plan/pending_plan
    const currentSubChain = createChainMock({ plan: 'free', pending_plan: null })
    // Third call: the actual update
    const updateChain = createChainMock()

    let callIndex = 0
    mockFrom.mockImplementation(() => {
      callIndex++
      if (callIndex === 1) return lookupChain
      if (callIndex === 2) return currentSubChain
      return updateChain
    })

    mockConstructEvent.mockReturnValueOnce(
      makeEvent('customer.subscription.updated', {
        customer: 'cus_123',
        status: 'active',
        items: { data: [{ price: { id: 'price_pro_monthly' } }] },
        start_date: 1700000000,
        ended_at: null,
        cancel_at_period_end: false,
      }),
    )

    const req = createMockRequest('{}')
    const res = await POST(req)

    expect(res).toEqual(expect.objectContaining({ data: { received: true }, status: 200 }))
    expect(lookupChain.select).toHaveBeenCalledWith('user_id')
    expect(lookupChain.eq).toHaveBeenCalledWith('stripe_customer_id', 'cus_123')
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: 'pro',
        status: 'active',
        stripe_price_id: 'price_pro_monthly',
        cancel_at_period_end: false,
        admin_override: false,
      }),
    )
    expect(updateChain.eq).toHaveBeenCalledWith('user_id', 'user-3')
  })

  // -----------------------------------------------------------------------
  // 7. customer.subscription.updated with cancel_at_period_end
  // -----------------------------------------------------------------------
  it('preserves cancel_at_period_end flag on subscription update', async () => {
    const lookupChain = createChainMock({ user_id: 'user-4' })
    const currentSubChain = createChainMock({ plan: 'pro', pending_plan: null })
    const updateChain = createChainMock()

    let callIndex = 0
    mockFrom.mockImplementation(() => {
      callIndex++
      if (callIndex === 1) return lookupChain
      if (callIndex === 2) return currentSubChain
      return updateChain
    })

    mockConstructEvent.mockReturnValueOnce(
      makeEvent('customer.subscription.updated', {
        customer: 'cus_444',
        status: 'active',
        items: { data: [{ price: { id: 'price_pro_yearly' } }] },
        start_date: 1700000000,
        ended_at: null,
        cancel_at_period_end: true,
      }),
    )

    const req = createMockRequest('{}')
    const res = await POST(req)

    expect(res).toEqual(expect.objectContaining({ data: { received: true }, status: 200 }))
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        cancel_at_period_end: true,
      }),
    )
  })

  // -----------------------------------------------------------------------
  // 8. customer.subscription.deleted — sets plan to free, status canceled
  // -----------------------------------------------------------------------
  it('handles customer.subscription.deleted and resets to free/canceled', async () => {
    // First call: lookup by stripe_customer_id
    const lookupChain = createChainMock({ user_id: 'user-5' })
    // Second call: the update
    const updateChain = createChainMock()

    let callIndex = 0
    mockFrom.mockImplementation(() => {
      callIndex++
      if (callIndex === 1) return lookupChain
      return updateChain
    })

    mockConstructEvent.mockReturnValueOnce(
      makeEvent('customer.subscription.deleted', {
        customer: 'cus_555',
      }),
    )

    const req = createMockRequest('{}')
    const res = await POST(req)

    expect(res).toEqual(expect.objectContaining({ data: { received: true }, status: 200 }))
    expect(lookupChain.select).toHaveBeenCalledWith('user_id')
    expect(lookupChain.eq).toHaveBeenCalledWith('stripe_customer_id', 'cus_555')
    expect(updateChain.update).toHaveBeenCalledWith({
      plan: 'free',
      status: 'canceled',
      stripe_subscription_id: null,
      stripe_price_id: null,
      cancel_at_period_end: false,
      admin_override: false,
    })
    expect(updateChain.eq).toHaveBeenCalledWith('user_id', 'user-5')
  })

  // -----------------------------------------------------------------------
  // 9. customer.subscription.deleted with unknown customer — no error
  // -----------------------------------------------------------------------
  it('does not error when subscription.deleted customer is not found', async () => {
    const lookupChain = createChainMock(null) // no matching row
    mockFrom.mockReturnValue(lookupChain)

    mockConstructEvent.mockReturnValueOnce(
      makeEvent('customer.subscription.deleted', {
        customer: 'cus_unknown',
      }),
    )

    const req = createMockRequest('{}')
    const res = await POST(req)

    expect(res).toEqual(expect.objectContaining({ data: { received: true }, status: 200 }))
    // update should never be called since sub lookup returned null
    expect(lookupChain.update).not.toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------
  // 10. Unknown event type — returns { received: true }
  // -----------------------------------------------------------------------
  it('returns { received: true } for unknown event types', async () => {
    mockConstructEvent.mockReturnValueOnce(makeEvent('payment_intent.succeeded', { id: 'pi_999' }))

    const req = createMockRequest('{}')
    const res = await POST(req)

    expect(res).toEqual(expect.objectContaining({ data: { received: true }, status: 200 }))
    expect(mockFrom).not.toHaveBeenCalled()
  })
})
