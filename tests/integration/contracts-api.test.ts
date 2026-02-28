/**
 * Contract API Integration Tests
 *
 * Tests the public contract review/sign flow.
 * Admin-only endpoints (create, list, send) are bypassed by setting up
 * contracts directly via service role in the DB.
 *
 * Flow tested: reviewer views → reviewer approves → signer views → signer signs
 *
 * Requires dev server on localhost:3000.
 */
import { describe, it, expect, afterAll } from 'vitest'
import { randomBytes } from 'crypto'
import { getAdminClient, TEST_COMPANY_ID } from './helpers'

const BASE_URL = 'http://localhost:3000'

// Cleanup: delete test contracts after all tests
const createdContractIds: string[] = []

afterAll(async () => {
  const supabase = getAdminClient()
  if (createdContractIds.length) {
    await supabase.from('contract_audit').delete().in('contract_id', createdContractIds)
    await supabase.from('contracts').delete().in('id', createdContractIds)
  }
})

describe('Contract review → sign flow', () => {
  let contractId: string
  let reviewerToken: string
  let signingToken: string

  // Create contract directly via DB with reviewer token
  it('setup: creates contract with reviewer token via DB', async () => {
    const supabase = getAdminClient()
    reviewerToken = randomBytes(32).toString('hex')

    const { data, error } = await supabase
      .from('contracts')
      .insert({
        company_id: TEST_COMPANY_ID,
        contract_number: `E2E-INT-${Date.now()}`,
        tier: 'pro',
        annual_price: 4999,
        currency: 'SEK',
        billing_interval: 'annual',
        vat_rate_pct: 25,
        contract_start_date: '2026-03-01',
        contract_duration_months: 12,
        signer_name: 'E2E Test Signer',
        signer_email: 'e2e-signer@amida-test.com',
        signer_title: 'CEO',
        reviewer_name: 'E2E Test Reviewer',
        reviewer_email: 'e2e-reviewer@amida-test.com',
        status: 'sent_to_reviewer',
        reviewer_token: reviewerToken,
        reviewer_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single()

    expect(error).toBeNull()
    expect(data?.id).toBeDefined()
    contractId = data!.id
    createdContractIds.push(contractId)
  })

  it('GET /api/contracts/review/[token] — reviewer views contract', async () => {
    const res = await fetch(`${BASE_URL}/api/contracts/review/${reviewerToken}`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.contract_number).toBeDefined()
    expect(data.signer_name).toBe('E2E Test Signer')
    expect(data.reviewer_name).toBe('E2E Test Reviewer')
    expect(data.tier).toBe('pro')
    expect(data.annual_price).toBe(4999)

    // Status should be updated to reviewed
    const supabase = getAdminClient()
    const { data: contract } = await supabase.from('contracts').select('status').eq('id', contractId).single()
    expect(contract?.status).toBe('reviewed')
  })

  it('POST /api/contracts/review/[token] — reviewer approves and forwards', async () => {
    const res = await fetch(`${BASE_URL}/api/contracts/review/${reviewerToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.forwarded_to).toBe('e2e-signer@amida-test.com')

    // Verify signing token was generated
    const supabase = getAdminClient()
    const { data: contract } = await supabase
      .from('contracts')
      .select('status, signing_token, reviewer_token')
      .eq('id', contractId)
      .single()
    expect(contract?.status).toBe('sent')
    expect(contract?.signing_token).toBeTruthy()
    expect(contract?.reviewer_token).toBeNull()
    signingToken = contract!.signing_token
  })

  it('GET /api/contracts/sign/[token] — signer views contract', async () => {
    const res = await fetch(`${BASE_URL}/api/contracts/sign/${signingToken}`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.contract_number).toBeDefined()
    expect(data.signer_name).toBe('E2E Test Signer')
    expect(data.tier).toBe('pro')
    expect(data.annual_price).toBe(4999)

    // Status should be updated to viewed
    const supabase = getAdminClient()
    const { data: contract } = await supabase.from('contracts').select('status').eq('id', contractId).single()
    expect(contract?.status).toBe('viewed')
  })

  it('POST /api/contracts/sign/[token] — signer signs contract', async () => {
    // Base64 PNG signature (repeated to meet min 100 char requirement)
    const minimalSignature =
      'data:image/png;base64,' +
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='.repeat(2)

    const res = await fetch(`${BASE_URL}/api/contracts/sign/${signingToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signer_name: 'E2E Test Signer',
        signer_title: 'CEO',
        signature_image: minimalSignature,
      }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.signed_at).toBeDefined()

    // Verify final state
    const supabase = getAdminClient()
    const { data: contract } = await supabase
      .from('contracts')
      .select('status, signed_at, signing_token')
      .eq('id', contractId)
      .single()
    expect(contract?.status).toBe('signed')
    expect(contract?.signed_at).toBeTruthy()
    expect(contract?.signing_token).toBeNull()
  })
})

describe('Contract sign — direct flow (no reviewer)', () => {
  let contractId: string
  let signingToken: string

  it('setup: creates contract with signing token via DB', async () => {
    const supabase = getAdminClient()
    signingToken = randomBytes(32).toString('hex')

    const { data, error } = await supabase
      .from('contracts')
      .insert({
        company_id: TEST_COMPANY_ID,
        contract_number: `E2E-DIRECT-${Date.now()}`,
        tier: 'team',
        annual_price: 9999,
        currency: 'SEK',
        billing_interval: 'annual',
        vat_rate_pct: 25,
        contract_start_date: '2026-04-01',
        contract_duration_months: 24,
        signer_name: 'Direct Signer',
        signer_email: 'e2e-direct@amida-test.com',
        status: 'sent',
        signing_token: signingToken,
        token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single()

    expect(error).toBeNull()
    contractId = data!.id
    createdContractIds.push(contractId)
  })

  it('GET /api/contracts/sign/[token] — loads and marks as viewed', async () => {
    const res = await fetch(`${BASE_URL}/api/contracts/sign/${signingToken}`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.signer_name).toBe('Direct Signer')
    expect(data.tier).toBe('team')
    expect(data.annual_price).toBe(9999)
    expect(data.contract_duration_months).toBe(24)
  })

  it('POST /api/contracts/sign/[token] — signs successfully', async () => {
    const signature =
      'data:image/png;base64,' +
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='.repeat(2)

    const res = await fetch(`${BASE_URL}/api/contracts/sign/${signingToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signer_name: 'Direct Signer',
        signer_title: 'CFO',
        signature_image: signature,
      }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })
})

describe('Contract error cases', () => {
  it('GET /api/contracts/sign/invalid-token — returns 404', async () => {
    const res = await fetch(`${BASE_URL}/api/contracts/sign/invalid-token-12345`)
    expect(res.status).toBe(404)
  })

  it('GET /api/contracts/review/invalid-token — returns 404', async () => {
    const res = await fetch(`${BASE_URL}/api/contracts/review/invalid-token-12345`)
    expect(res.status).toBe(404)
  })

  it('POST /api/contracts/sign/invalid-token — returns 404', async () => {
    const res = await fetch(`${BASE_URL}/api/contracts/sign/invalid-token-12345`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signer_name: 'Test',
        signer_title: 'Test',
        signature_image: 'x'.repeat(200),
      }),
    })
    expect(res.status).toBe(404)
  })

  it('GET /api/contracts — unauthenticated returns 401', async () => {
    const res = await fetch(`${BASE_URL}/api/contracts`)
    expect(res.status).toBe(401)
  })
})

describe('Contract token security', () => {
  // 1. Expired reviewer token returns 410
  it('GET /api/contracts/review/[expired-token] — expired returns 410', async () => {
    const supabase = getAdminClient()
    const expiredReviewerToken = randomBytes(32).toString('hex')

    const { data, error } = await supabase
      .from('contracts')
      .insert({
        company_id: TEST_COMPANY_ID,
        contract_number: `E2E-EXPIRED-REV-${Date.now()}`,
        tier: 'pro',
        annual_price: 4999,
        currency: 'SEK',
        billing_interval: 'annual',
        vat_rate_pct: 25,
        contract_start_date: '2026-03-01',
        contract_duration_months: 12,
        signer_name: 'Expired Reviewer Signer',
        signer_email: 'e2e-expired-rev@amida-test.com',
        reviewer_name: 'Expired Reviewer',
        reviewer_email: 'e2e-expired-reviewer@amida-test.com',
        status: 'sent_to_reviewer',
        reviewer_token: expiredReviewerToken,
        // Expired 1 day ago
        reviewer_token_expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single()

    expect(error).toBeNull()
    createdContractIds.push(data!.id)

    const res = await fetch(`${BASE_URL}/api/contracts/review/${expiredReviewerToken}`)
    expect(res.status).toBe(410)
    const body = await res.json()
    expect(body.error).toContain('expired')
  })

  // 2. Expired signing token returns 410
  it('GET /api/contracts/sign/[expired-token] — expired returns 410', async () => {
    const supabase = getAdminClient()
    const expiredSigningToken = randomBytes(32).toString('hex')

    const { data, error } = await supabase
      .from('contracts')
      .insert({
        company_id: TEST_COMPANY_ID,
        contract_number: `E2E-EXPIRED-SIGN-${Date.now()}`,
        tier: 'team',
        annual_price: 9999,
        currency: 'SEK',
        billing_interval: 'annual',
        vat_rate_pct: 25,
        contract_start_date: '2026-04-01',
        contract_duration_months: 12,
        signer_name: 'Expired Token Signer',
        signer_email: 'e2e-expired-sign@amida-test.com',
        status: 'sent',
        signing_token: expiredSigningToken,
        // Expired 1 day ago
        token_expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single()

    expect(error).toBeNull()
    createdContractIds.push(data!.id)

    const res = await fetch(`${BASE_URL}/api/contracts/sign/${expiredSigningToken}`)
    expect(res.status).toBe(410)
    const body = await res.json()
    expect(body.error).toContain('expired')
  })

  // 3. Already-used reviewer token (nullified after approval) returns 404
  it('GET /api/contracts/review/[used-token] — reused token returns 404', async () => {
    const supabase = getAdminClient()
    const usedReviewerToken = randomBytes(32).toString('hex')

    // Create a contract, then immediately nullify the reviewer_token
    // (simulating what happens after reviewer approval)
    const { data, error } = await supabase
      .from('contracts')
      .insert({
        company_id: TEST_COMPANY_ID,
        contract_number: `E2E-USED-REV-${Date.now()}`,
        tier: 'pro',
        annual_price: 4999,
        currency: 'SEK',
        billing_interval: 'annual',
        vat_rate_pct: 25,
        contract_start_date: '2026-03-01',
        contract_duration_months: 12,
        signer_name: 'Used Token Signer',
        signer_email: 'e2e-used-token@amida-test.com',
        reviewer_name: 'Used Token Reviewer',
        reviewer_email: 'e2e-used-reviewer@amida-test.com',
        status: 'sent',
        reviewer_token: null, // Already nullified
        signing_token: randomBytes(32).toString('hex'),
        token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single()

    expect(error).toBeNull()
    createdContractIds.push(data!.id)

    // Try to use the original reviewer token — no row matches it
    const res = await fetch(`${BASE_URL}/api/contracts/review/${usedReviewerToken}`)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  // 4. Already-signed contract: signing_token is nullified, so returns 404
  it('POST /api/contracts/sign/[token] — already signed returns 404', async () => {
    const supabase = getAdminClient()
    const usedSigningToken = randomBytes(32).toString('hex')

    // Create a contract in 'signed' state with signing_token = null
    // (this is the state after successful signing)
    const { data, error } = await supabase
      .from('contracts')
      .insert({
        company_id: TEST_COMPANY_ID,
        contract_number: `E2E-SIGNED-${Date.now()}`,
        tier: 'pro',
        annual_price: 4999,
        currency: 'SEK',
        billing_interval: 'annual',
        vat_rate_pct: 25,
        contract_start_date: '2026-03-01',
        contract_duration_months: 12,
        signer_name: 'Already Signed Signer',
        signer_email: 'e2e-already-signed@amida-test.com',
        status: 'signed',
        signed_at: new Date().toISOString(),
        signing_token: null, // Nullified after signing
      })
      .select('id')
      .single()

    expect(error).toBeNull()
    createdContractIds.push(data!.id)

    // Try to sign with the original token — no row matches it
    const signature =
      'data:image/png;base64,' +
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='.repeat(2)

    const res = await fetch(`${BASE_URL}/api/contracts/sign/${usedSigningToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signer_name: 'Already Signed Signer',
        signer_title: 'CEO',
        signature_image: signature,
      }),
    })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  // 5. Invalid signature data — missing required fields returns 400
  it('POST /api/contracts/sign/[token] — missing fields returns 400', async () => {
    const supabase = getAdminClient()
    const validToken = randomBytes(32).toString('hex')

    const { data, error } = await supabase
      .from('contracts')
      .insert({
        company_id: TEST_COMPANY_ID,
        contract_number: `E2E-BADPAYLOAD-${Date.now()}`,
        tier: 'pro',
        annual_price: 4999,
        currency: 'SEK',
        billing_interval: 'annual',
        vat_rate_pct: 25,
        contract_start_date: '2026-03-01',
        contract_duration_months: 12,
        signer_name: 'Bad Payload Signer',
        signer_email: 'e2e-bad-payload@amida-test.com',
        status: 'sent',
        signing_token: validToken,
        token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single()

    expect(error).toBeNull()
    createdContractIds.push(data!.id)

    // POST with empty body — missing signer_name and signature_image
    const res = await fetch(`${BASE_URL}/api/contracts/sign/${validToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  // 6. Signature image too short returns 400
  it('POST /api/contracts/sign/[token] — signature too short returns 400', async () => {
    const supabase = getAdminClient()
    const validToken = randomBytes(32).toString('hex')

    const { data, error } = await supabase
      .from('contracts')
      .insert({
        company_id: TEST_COMPANY_ID,
        contract_number: `E2E-SHORTSIG-${Date.now()}`,
        tier: 'pro',
        annual_price: 4999,
        currency: 'SEK',
        billing_interval: 'annual',
        vat_rate_pct: 25,
        contract_start_date: '2026-03-01',
        contract_duration_months: 12,
        signer_name: 'Short Sig Signer',
        signer_email: 'e2e-short-sig@amida-test.com',
        status: 'sent',
        signing_token: validToken,
        token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single()

    expect(error).toBeNull()
    createdContractIds.push(data!.id)

    // POST with signature_image under 100 chars
    const res = await fetch(`${BASE_URL}/api/contracts/sign/${validToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signer_name: 'Short Sig Signer',
        signer_title: 'CEO',
        signature_image: 'data:image/png;base64,short',
      }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })
})
