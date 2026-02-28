import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createContractSchema, signContractSchema } from '@/lib/contracts/schemas'

// ---------------------------------------------------------------------------
// 1. Rate Limiter
// ---------------------------------------------------------------------------
describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Reset the module between tests so the internal Map store is fresh
    vi.resetModules()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function importRateLimit() {
    const mod = await import('@/lib/rate-limit')
    return mod.rateLimit
  }

  it('first request succeeds with remaining = limit - 1', async () => {
    const rateLimit = await importRateLimit()
    const result = rateLimit('user-1', 5, 60_000)
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('allows requests up to the limit', async () => {
    const rateLimit = await importRateLimit()
    for (let i = 0; i < 3; i++) {
      const result = rateLimit('user-1', 3, 60_000)
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(3 - 1 - i)
    }
  })

  it('rejects requests that exceed the limit', async () => {
    const rateLimit = await importRateLimit()
    // Exhaust the limit
    for (let i = 0; i < 3; i++) {
      rateLimit('user-1', 3, 60_000)
    }
    // Next request should fail
    const result = rateLimit('user-1', 3, 60_000)
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('different identifiers are independent', async () => {
    const rateLimit = await importRateLimit()
    // Exhaust limit for user-1
    for (let i = 0; i < 2; i++) {
      rateLimit('user-1', 2, 60_000)
    }
    const blocked = rateLimit('user-1', 2, 60_000)
    expect(blocked.success).toBe(false)

    // user-2 should still be allowed
    const allowed = rateLimit('user-2', 2, 60_000)
    expect(allowed.success).toBe(true)
    expect(allowed.remaining).toBe(1)
  })

  it('window resets after the specified time', async () => {
    const rateLimit = await importRateLimit()
    // Exhaust limit
    for (let i = 0; i < 2; i++) {
      rateLimit('user-1', 2, 10_000)
    }
    expect(rateLimit('user-1', 2, 10_000).success).toBe(false)

    // Advance past the window
    vi.advanceTimersByTime(10_001)

    // Should be allowed again
    const result = rateLimit('user-1', 2, 10_000)
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(1)
  })

  it('remaining decreases with each request', async () => {
    const rateLimit = await importRateLimit()
    expect(rateLimit('user-1', 5, 60_000).remaining).toBe(4)
    expect(rateLimit('user-1', 5, 60_000).remaining).toBe(3)
    expect(rateLimit('user-1', 5, 60_000).remaining).toBe(2)
    expect(rateLimit('user-1', 5, 60_000).remaining).toBe(1)
    expect(rateLimit('user-1', 5, 60_000).remaining).toBe(0)
  })

  it('returns remaining 0 when blocked (over limit)', async () => {
    const rateLimit = await importRateLimit()
    rateLimit('user-1', 1, 60_000)
    const result = rateLimit('user-1', 1, 60_000)
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
  })
})

describe('rateLimitResponse', () => {
  it('returns a Response with 429 status', async () => {
    const { rateLimitResponse } = await import('@/lib/rate-limit')
    const response = rateLimitResponse()
    expect(response.status).toBe(429)
  })

  it('returns JSON body with error message', async () => {
    const { rateLimitResponse } = await import('@/lib/rate-limit')
    const response = rateLimitResponse()
    const body = await response.json()
    expect(body.error).toBe('Too many requests. Please try again later.')
  })

  it('has Content-Type application/json header', async () => {
    const { rateLimitResponse } = await import('@/lib/rate-limit')
    const response = rateLimitResponse()
    expect(response.headers.get('Content-Type')).toBe('application/json')
  })
})

// ---------------------------------------------------------------------------
// 2. SHA-256 Hash
// ---------------------------------------------------------------------------
describe('sha256', () => {
  it('computes correct SHA-256 for a known input', async () => {
    const { sha256 } = await import('@/lib/contracts/hash')
    // SHA-256 of empty string is well-known
    const hash = sha256(Buffer.from(''))
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })

  it('computes correct SHA-256 for "hello"', async () => {
    const { sha256 } = await import('@/lib/contracts/hash')
    const hash = sha256(Buffer.from('hello'))
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
  })

  it('returns lowercase hex string', async () => {
    const { sha256 } = await import('@/lib/contracts/hash')
    const hash = sha256(Buffer.from('test'))
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('returns consistent results for the same input', async () => {
    const { sha256 } = await import('@/lib/contracts/hash')
    const buf = Buffer.from('consistent-input')
    const hash1 = sha256(buf)
    const hash2 = sha256(buf)
    expect(hash1).toBe(hash2)
  })

  it('produces different hashes for different inputs', async () => {
    const { sha256 } = await import('@/lib/contracts/hash')
    const hash1 = sha256(Buffer.from('input-a'))
    const hash2 = sha256(Buffer.from('input-b'))
    expect(hash1).not.toBe(hash2)
  })
})

// ---------------------------------------------------------------------------
// 3. API Response helpers
// ---------------------------------------------------------------------------
describe('apiSuccess', () => {
  it('returns success:true with data', async () => {
    const { apiSuccess } = await import('@/lib/api-response')
    const response = apiSuccess({ id: 1, name: 'test' })
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data).toEqual({ id: 1, name: 'test' })
  })

  it('defaults to status 200', async () => {
    const { apiSuccess } = await import('@/lib/api-response')
    const response = apiSuccess('ok')
    expect(response.status).toBe(200)
  })

  it('accepts a custom status code', async () => {
    const { apiSuccess } = await import('@/lib/api-response')
    const response = apiSuccess({ created: true }, 201)
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data).toEqual({ created: true })
  })

  it('handles null data', async () => {
    const { apiSuccess } = await import('@/lib/api-response')
    const response = apiSuccess(null)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data).toBeNull()
  })

  it('handles array data', async () => {
    const { apiSuccess } = await import('@/lib/api-response')
    const response = apiSuccess([1, 2, 3])
    const body = await response.json()
    expect(body.data).toEqual([1, 2, 3])
  })
})

describe('apiError', () => {
  it('returns success:false with error message', async () => {
    const { apiError } = await import('@/lib/api-response')
    const response = apiError('Something went wrong')
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe('Something went wrong')
  })

  it('defaults to status 400', async () => {
    const { apiError } = await import('@/lib/api-response')
    const response = apiError('Bad request')
    expect(response.status).toBe(400)
  })

  it('accepts a custom status code', async () => {
    const { apiError } = await import('@/lib/api-response')
    const response = apiError('Not found', 404)
    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toBe('Not found')
  })

  it('accepts 500 status for server errors', async () => {
    const { apiError } = await import('@/lib/api-response')
    const response = apiError('Internal server error', 500)
    expect(response.status).toBe(500)
  })
})

describe('apiValidationError', () => {
  it('returns success:false with "Validation failed" error', async () => {
    const { apiValidationError } = await import('@/lib/api-response')
    const response = apiValidationError({ name: ['Required'] })
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe('Validation failed')
  })

  it('includes fieldErrors in the response', async () => {
    const { apiValidationError } = await import('@/lib/api-response')
    const fieldErrors = {
      email: ['Invalid email', 'Email is required'],
      name: ['Name is required'],
    }
    const response = apiValidationError(fieldErrors)
    const body = await response.json()
    expect(body.fieldErrors).toEqual(fieldErrors)
  })

  it('returns status 400', async () => {
    const { apiValidationError } = await import('@/lib/api-response')
    const response = apiValidationError({ field: ['error'] })
    expect(response.status).toBe(400)
  })

  it('handles empty fieldErrors object', async () => {
    const { apiValidationError } = await import('@/lib/api-response')
    const response = apiValidationError({})
    const body = await response.json()
    expect(body.fieldErrors).toEqual({})
    expect(body.error).toBe('Validation failed')
  })
})

// ---------------------------------------------------------------------------
// 4. cn — Tailwind class merge utility
// ---------------------------------------------------------------------------
describe('cn', () => {
  it('merges multiple class strings', async () => {
    const { cn } = await import('@/lib/utils')
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes (falsy values)', async () => {
    const { cn } = await import('@/lib/utils')
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })

  it('handles undefined and null inputs', async () => {
    const { cn } = await import('@/lib/utils')
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
  })

  it('resolves Tailwind conflicts (last wins)', async () => {
    const { cn } = await import('@/lib/utils')
    // twMerge should resolve px-2 vs px-4 to px-4
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('resolves conflicting text colors', async () => {
    const { cn } = await import('@/lib/utils')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('keeps non-conflicting classes', async () => {
    const { cn } = await import('@/lib/utils')
    const result = cn('p-4', 'mt-2', 'text-red-500')
    expect(result).toContain('p-4')
    expect(result).toContain('mt-2')
    expect(result).toContain('text-red-500')
  })

  it('returns empty string with no arguments', async () => {
    const { cn } = await import('@/lib/utils')
    expect(cn()).toBe('')
  })

  it('handles array inputs (clsx feature)', async () => {
    const { cn } = await import('@/lib/utils')
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })

  it('handles object inputs (clsx feature)', async () => {
    const { cn } = await import('@/lib/utils')
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })
})

// ---------------------------------------------------------------------------
// 5. Contract Schemas (Zod)
// ---------------------------------------------------------------------------
describe('createContractSchema', () => {
  const validData = {
    tier: 'pro',
    annual_price: 2400,
    signer_name: 'Anna Svensson',
    signer_email: 'anna@example.com',
    contract_start_date: '2025-01-01',
  }

  it('accepts valid minimal input', () => {
    const result = createContractSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('applies default values', () => {
    const result = createContractSchema.parse(validData)
    expect(result.currency).toBe('SEK')
    expect(result.billing_interval).toBe('annual')
    expect(result.vat_rate_pct).toBe(25)
    expect(result.contract_duration_months).toBe(12)
    expect(result.custom_terms).toEqual({})
  })

  it('accepts full input with all optional fields', () => {
    const full = {
      ...validData,
      company_id: '11111111-1111-4111-a111-111111111111',
      currency: 'EUR',
      billing_interval: 'monthly' as const,
      vat_rate_pct: 20,
      contract_duration_months: 24,
      custom_terms: { trial: '30 days' },
      signer_title: 'CEO',
      reviewer_name: 'Erik Reviewer',
      reviewer_email: 'erik@example.com',
      reviewer_title: 'CFO',
    }
    const result = createContractSchema.safeParse(full)
    expect(result.success).toBe(true)
  })

  it('rejects missing required field: tier', () => {
    const noTier = { ...validData }
    delete (noTier as Record<string, unknown>).tier
    const result = createContractSchema.safeParse(noTier)
    expect(result.success).toBe(false)
  })

  it('rejects missing required field: annual_price', () => {
    const noPrice = { ...validData }
    delete (noPrice as Record<string, unknown>).annual_price
    const result = createContractSchema.safeParse(noPrice)
    expect(result.success).toBe(false)
  })

  it('rejects missing required field: signer_name', () => {
    const noName = { ...validData }
    delete (noName as Record<string, unknown>).signer_name
    const result = createContractSchema.safeParse(noName)
    expect(result.success).toBe(false)
  })

  it('rejects missing required field: signer_email', () => {
    const noEmail = { ...validData }
    delete (noEmail as Record<string, unknown>).signer_email
    const result = createContractSchema.safeParse(noEmail)
    expect(result.success).toBe(false)
  })

  it('rejects missing required field: contract_start_date', () => {
    const noDate = { ...validData }
    delete (noDate as Record<string, unknown>).contract_start_date
    const result = createContractSchema.safeParse(noDate)
    expect(result.success).toBe(false)
  })

  it('rejects invalid email for signer_email', () => {
    const result = createContractSchema.safeParse({
      ...validData,
      signer_email: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email for reviewer_email', () => {
    const result = createContractSchema.safeParse({
      ...validData,
      reviewer_email: 'bad-email',
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-positive annual_price', () => {
    const result = createContractSchema.safeParse({
      ...validData,
      annual_price: 0,
    })
    expect(result.success).toBe(false)

    const resultNeg = createContractSchema.safeParse({
      ...validData,
      annual_price: -100,
    })
    expect(resultNeg.success).toBe(false)
  })

  it('rejects invalid contract_start_date format', () => {
    const result = createContractSchema.safeParse({
      ...validData,
      contract_start_date: '01-01-2025',
    })
    expect(result.success).toBe(false)

    const result2 = createContractSchema.safeParse({
      ...validData,
      contract_start_date: '2025/01/01',
    })
    expect(result2.success).toBe(false)
  })

  it('rejects invalid billing_interval', () => {
    const result = createContractSchema.safeParse({
      ...validData,
      billing_interval: 'weekly',
    })
    expect(result.success).toBe(false)
  })

  it('rejects vat_rate_pct outside 0-100 range', () => {
    const result = createContractSchema.safeParse({
      ...validData,
      vat_rate_pct: -1,
    })
    expect(result.success).toBe(false)

    const result2 = createContractSchema.safeParse({
      ...validData,
      vat_rate_pct: 101,
    })
    expect(result2.success).toBe(false)
  })

  it('rejects empty tier string', () => {
    const result = createContractSchema.safeParse({
      ...validData,
      tier: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid UUID for company_id', () => {
    const result = createContractSchema.safeParse({
      ...validData,
      company_id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('allows null and undefined for optional nullable fields', () => {
    const result = createContractSchema.safeParse({
      ...validData,
      company_id: null,
      signer_title: null,
      reviewer_name: null,
      reviewer_email: null,
      reviewer_title: null,
    })
    expect(result.success).toBe(true)
  })
})

describe('signContractSchema', () => {
  const validSignData = {
    signer_name: 'Anna Svensson',
    signature_image: 'data:image/png;base64,' + 'A'.repeat(200),
  }

  it('accepts valid signing input', () => {
    const result = signContractSchema.safeParse(validSignData)
    expect(result.success).toBe(true)
  })

  it('accepts optional signer_title', () => {
    const result = signContractSchema.safeParse({
      ...validSignData,
      signer_title: 'CEO',
    })
    expect(result.success).toBe(true)
  })

  it('succeeds without signer_title', () => {
    const result = signContractSchema.safeParse({
      signer_name: 'Test',
      signature_image: 'A'.repeat(100),
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing signer_name', () => {
    const noName = { ...validSignData }
    delete (noName as Record<string, unknown>).signer_name
    const result = signContractSchema.safeParse(noName)
    expect(result.success).toBe(false)
  })

  it('rejects empty signer_name', () => {
    const result = signContractSchema.safeParse({
      ...validSignData,
      signer_name: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing signature_image', () => {
    const noSig = { ...validSignData }
    delete (noSig as Record<string, unknown>).signature_image
    const result = signContractSchema.safeParse(noSig)
    expect(result.success).toBe(false)
  })

  it('rejects signature_image shorter than 100 characters', () => {
    const result = signContractSchema.safeParse({
      ...validSignData,
      signature_image: 'short',
    })
    expect(result.success).toBe(false)
  })

  it('accepts signature_image of exactly 100 characters', () => {
    const result = signContractSchema.safeParse({
      signer_name: 'Test',
      signature_image: 'A'.repeat(100),
    })
    expect(result.success).toBe(true)
  })
})
