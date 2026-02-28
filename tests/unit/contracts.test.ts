import { describe, it, expect, vi } from 'vitest'
import { createHash } from 'crypto'

/** Remove keys from an object — avoids unused-var lint warnings from rest-destructuring */
function omit<T extends Record<string, unknown>>(obj: T, ...keys: string[]): Partial<T> {
  const result = { ...obj }
  for (const key of keys) delete result[key as keyof T]
  return result
}

// ---------------------------------------------------------------------------
// 1. sha256 hash
// ---------------------------------------------------------------------------
import { sha256 } from '@/lib/contracts/hash'

describe('sha256', () => {
  it('returns correct hash for a simple ASCII string', () => {
    const buf = Buffer.from('hello')
    const expected = createHash('sha256').update(buf).digest('hex')
    expect(sha256(buf)).toBe(expected)
  })

  it('returns a 64-character lowercase hex string', () => {
    const result = sha256(Buffer.from('test'))
    expect(result).toHaveLength(64)
    expect(result).toMatch(/^[0-9a-f]{64}$/)
  })

  it('returns deterministic output for same input', () => {
    const buf = Buffer.from('deterministic')
    expect(sha256(buf)).toBe(sha256(buf))
  })

  it('returns different hashes for different inputs', () => {
    expect(sha256(Buffer.from('a'))).not.toBe(sha256(Buffer.from('b')))
  })

  it('handles empty buffer', () => {
    const result = sha256(Buffer.alloc(0))
    // SHA-256 of empty = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    expect(result).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })

  it('handles unicode content', () => {
    const buf = Buffer.from('åäö 日本語 🎵')
    const result = sha256(buf)
    expect(result).toHaveLength(64)
    expect(result).toMatch(/^[0-9a-f]{64}$/)
  })

  it('handles binary data (null bytes)', () => {
    const buf = Buffer.from([0x00, 0xff, 0x00, 0xfe])
    const result = sha256(buf)
    expect(result).toHaveLength(64)
    expect(result).toMatch(/^[0-9a-f]{64}$/)
  })

  it('handles large buffer (1 MB)', () => {
    const buf = Buffer.alloc(1024 * 1024, 0x42) // 1 MB of 'B'
    const result = sha256(buf)
    expect(result).toHaveLength(64)
    expect(result).toMatch(/^[0-9a-f]{64}$/)
  })

  it('produces known hash for known input', () => {
    // SHA-256("abc") = ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
    const buf = Buffer.from('abc')
    expect(sha256(buf)).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })

  it('returns lowercase hex (no uppercase)', () => {
    const result = sha256(Buffer.from('UPPER'))
    expect(result).toBe(result.toLowerCase())
  })
})

// ---------------------------------------------------------------------------
// 2. Types — importability check
// ---------------------------------------------------------------------------
import type {
  ContractStatus,
  Contract,
  ContractAuditEvent,
  ContractAudit,
  ContractWithAudit,
  SignContractPayload,
} from '@/lib/contracts/types'

describe('contract types (importability)', () => {
  it('ContractStatus is assignable with valid values', () => {
    const statuses: ContractStatus[] = [
      'draft',
      'sent_to_reviewer',
      'reviewed',
      'sent',
      'viewed',
      'signed',
      'expired',
      'cancelled',
    ]
    expect(statuses).toHaveLength(8)
  })

  it('ContractAuditEvent is assignable with valid values', () => {
    const events: ContractAuditEvent[] = [
      'created',
      'sent_to_reviewer',
      'reviewed',
      'approved',
      'sent',
      'resent',
      'viewed',
      'signed',
      'expired',
      'cancelled',
    ]
    expect(events).toHaveLength(10)
  })

  it('Contract type is structurally valid', () => {
    const contract: Partial<Contract> = {
      id: 'test-id',
      status: 'draft',
      tier: 'pro',
      annual_price: 1000,
    }
    expect(contract.id).toBe('test-id')
  })

  it('ContractAudit type is structurally valid', () => {
    const audit: Partial<ContractAudit> = {
      id: 'audit-1',
      contract_id: 'c-1',
      event_type: 'created',
    }
    expect(audit.event_type).toBe('created')
  })

  it('ContractWithAudit extends Contract', () => {
    const cwa: Partial<ContractWithAudit> = {
      id: 'c-1',
      audit_trail: [],
      company: { company_name: 'Test', org_number: null, address: null },
    }
    expect(cwa.audit_trail).toEqual([])
  })

  it('SignContractPayload has required fields', () => {
    const payload: SignContractPayload = {
      signer_name: 'John',
      signature_image: 'base64data',
    }
    expect(payload.signer_name).toBe('John')
  })

  it('SignContractPayload allows optional signer_title', () => {
    const payload: SignContractPayload = {
      signer_name: 'John',
      signer_title: 'CEO',
      signature_image: 'base64data',
    }
    expect(payload.signer_title).toBe('CEO')
  })
})

// ---------------------------------------------------------------------------
// 3. Contract Schemas
// ---------------------------------------------------------------------------
import { createContractSchema, updateContractSchema, signContractSchema } from '@/lib/contracts/schemas'

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'

const validCreateData = {
  company_id: VALID_UUID,
  tier: 'pro',
  annual_price: 12000,
  currency: 'SEK',
  billing_interval: 'annual' as const,
  vat_rate_pct: 25,
  contract_start_date: '2026-01-01',
  contract_duration_months: 12,
  custom_terms: {},
  signer_name: 'Anna Andersson',
  signer_email: 'anna@example.com',
  signer_title: 'VD',
}

describe('createContractSchema', () => {
  it('accepts valid complete data', () => {
    const result = createContractSchema.safeParse(validCreateData)
    expect(result.success).toBe(true)
  })

  it('accepts minimal required data (uses defaults)', () => {
    const minimal = {
      tier: 'pro',
      annual_price: 100,
      contract_start_date: '2026-03-15',
      signer_name: 'Test',
      signer_email: 'test@example.com',
    }
    const result = createContractSchema.safeParse(minimal)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.currency).toBe('SEK')
      expect(result.data.billing_interval).toBe('annual')
      expect(result.data.vat_rate_pct).toBe(25)
      expect(result.data.contract_duration_months).toBe(12)
      expect(result.data.custom_terms).toEqual({})
    }
  })

  // --- tier ---
  it('rejects empty tier', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, tier: '' }).success).toBe(false)
  })

  it('rejects missing tier', () => {
    expect(createContractSchema.safeParse(omit(validCreateData, 'tier')).success).toBe(false)
  })

  it('accepts any non-empty tier string', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, tier: 'enterprise-plus' }).success).toBe(true)
  })

  // --- annual_price ---
  it('rejects zero annual_price (must be positive)', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, annual_price: 0 }).success).toBe(false)
  })

  it('rejects negative annual_price', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, annual_price: -1 }).success).toBe(false)
  })

  it('accepts fractional annual_price', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, annual_price: 99.99 }).success).toBe(true)
  })

  it('rejects non-number annual_price', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, annual_price: '12000' }).success).toBe(false)
  })

  // --- currency ---
  it('defaults currency to SEK when omitted', () => {
    const result = createContractSchema.safeParse(omit(validCreateData, 'currency'))
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.currency).toBe('SEK')
  })

  it('accepts other currency strings', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, currency: 'EUR' }).success).toBe(true)
    expect(createContractSchema.safeParse({ ...validCreateData, currency: 'USD' }).success).toBe(true)
  })

  // --- billing_interval ---
  it.each(['monthly', 'quarterly', 'annual'] as const)('accepts billing_interval=%s', (billing_interval) => {
    expect(createContractSchema.safeParse({ ...validCreateData, billing_interval }).success).toBe(true)
  })

  it('rejects invalid billing_interval', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, billing_interval: 'weekly' }).success).toBe(false)
  })

  it('defaults billing_interval to annual', () => {
    const result = createContractSchema.safeParse(omit(validCreateData, 'billing_interval'))
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.billing_interval).toBe('annual')
  })

  // --- vat_rate_pct ---
  it('accepts vat_rate_pct at 0', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, vat_rate_pct: 0 }).success).toBe(true)
  })

  it('accepts vat_rate_pct at 100', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, vat_rate_pct: 100 }).success).toBe(true)
  })

  it('rejects vat_rate_pct below 0', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, vat_rate_pct: -1 }).success).toBe(false)
  })

  it('rejects vat_rate_pct above 100', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, vat_rate_pct: 101 }).success).toBe(false)
  })

  it('defaults vat_rate_pct to 25', () => {
    const result = createContractSchema.safeParse(omit(validCreateData, 'vat_rate_pct'))
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.vat_rate_pct).toBe(25)
  })

  // --- contract_start_date ---
  it('accepts valid YYYY-MM-DD date', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, contract_start_date: '2026-12-31' }).success).toBe(true)
  })

  it('rejects date with wrong format (DD-MM-YYYY)', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, contract_start_date: '31-12-2026' }).success).toBe(
      false,
    )
  })

  it('rejects date with slashes', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, contract_start_date: '2026/01/01' }).success).toBe(
      false,
    )
  })

  it('rejects empty date string', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, contract_start_date: '' }).success).toBe(false)
  })

  it('rejects missing contract_start_date', () => {
    expect(createContractSchema.safeParse(omit(validCreateData, 'contract_start_date')).success).toBe(false)
  })

  it('rejects ISO timestamp format', () => {
    expect(
      createContractSchema.safeParse({ ...validCreateData, contract_start_date: '2026-01-01T00:00:00Z' }).success,
    ).toBe(false)
  })

  // --- contract_duration_months ---
  it('rejects zero contract_duration_months', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, contract_duration_months: 0 }).success).toBe(false)
  })

  it('rejects negative contract_duration_months', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, contract_duration_months: -6 }).success).toBe(false)
  })

  it('rejects non-integer contract_duration_months', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, contract_duration_months: 6.5 }).success).toBe(false)
  })

  it('accepts contract_duration_months of 1', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, contract_duration_months: 1 }).success).toBe(true)
  })

  it('defaults contract_duration_months to 12', () => {
    const result = createContractSchema.safeParse(omit(validCreateData, 'contract_duration_months'))
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.contract_duration_months).toBe(12)
  })

  // --- custom_terms ---
  it('defaults custom_terms to empty object', () => {
    const result = createContractSchema.safeParse(omit(validCreateData, 'custom_terms'))
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.custom_terms).toEqual({})
  })

  it('accepts custom_terms with arbitrary keys', () => {
    const result = createContractSchema.safeParse({
      ...validCreateData,
      custom_terms: { early_termination: true, discount_pct: 10, note: 'Special deal' },
    })
    expect(result.success).toBe(true)
  })

  // --- company_id ---
  it('accepts null company_id', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, company_id: null }).success).toBe(true)
  })

  it('accepts omitted company_id', () => {
    expect(createContractSchema.safeParse(omit(validCreateData, 'company_id')).success).toBe(true)
  })

  it('accepts valid UUID company_id', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, company_id: VALID_UUID }).success).toBe(true)
  })

  it('rejects invalid UUID company_id', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, company_id: 'not-a-uuid' }).success).toBe(false)
  })

  // --- signer_name ---
  it('rejects empty signer_name', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, signer_name: '' }).success).toBe(false)
  })

  it('rejects missing signer_name', () => {
    expect(createContractSchema.safeParse(omit(validCreateData, 'signer_name')).success).toBe(false)
  })

  // --- signer_email ---
  it('rejects invalid signer_email', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, signer_email: 'not-email' }).success).toBe(false)
  })

  it('rejects empty signer_email', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, signer_email: '' }).success).toBe(false)
  })

  it('rejects missing signer_email', () => {
    expect(createContractSchema.safeParse(omit(validCreateData, 'signer_email')).success).toBe(false)
  })

  // --- signer_title ---
  it('accepts null signer_title', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, signer_title: null }).success).toBe(true)
  })

  it('accepts omitted signer_title', () => {
    expect(createContractSchema.safeParse(omit(validCreateData, 'signer_title')).success).toBe(true)
  })

  // --- reviewer fields ---
  it('accepts reviewer fields when all provided', () => {
    const result = createContractSchema.safeParse({
      ...validCreateData,
      reviewer_name: 'Erik Eriksson',
      reviewer_email: 'erik@example.com',
      reviewer_title: 'CFO',
    })
    expect(result.success).toBe(true)
  })

  it('accepts null reviewer_name', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, reviewer_name: null }).success).toBe(true)
  })

  it('accepts null reviewer_email', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, reviewer_email: null }).success).toBe(true)
  })

  it('accepts null reviewer_title', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, reviewer_title: null }).success).toBe(true)
  })

  it('rejects invalid reviewer_email format', () => {
    expect(createContractSchema.safeParse({ ...validCreateData, reviewer_email: 'bad-email' }).success).toBe(false)
  })

  it('accepts omitted reviewer fields', () => {
    expect(
      createContractSchema.safeParse(
        omit(validCreateData as Record<string, unknown>, 'reviewer_name', 'reviewer_email', 'reviewer_title'),
      ).success,
    ).toBe(true)
  })
})

describe('updateContractSchema', () => {
  it('accepts empty object (all partial)', () => {
    const result = updateContractSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update with only tier', () => {
    expect(updateContractSchema.safeParse({ tier: 'team' }).success).toBe(true)
  })

  it('accepts partial update with only annual_price', () => {
    expect(updateContractSchema.safeParse({ annual_price: 24000 }).success).toBe(true)
  })

  it('still validates types on provided fields (rejects negative annual_price)', () => {
    expect(updateContractSchema.safeParse({ annual_price: -1 }).success).toBe(false)
  })

  it('still validates email format on provided signer_email', () => {
    expect(updateContractSchema.safeParse({ signer_email: 'bad' }).success).toBe(false)
  })

  it('still validates date format on provided contract_start_date', () => {
    expect(updateContractSchema.safeParse({ contract_start_date: '2026/01/01' }).success).toBe(false)
  })

  it('accepts valid partial update with multiple fields', () => {
    const result = updateContractSchema.safeParse({
      tier: 'enterprise',
      annual_price: 50000,
      currency: 'EUR',
    })
    expect(result.success).toBe(true)
  })

  it('still validates billing_interval enum', () => {
    expect(updateContractSchema.safeParse({ billing_interval: 'biweekly' }).success).toBe(false)
  })

  it('still validates UUID for company_id', () => {
    expect(updateContractSchema.safeParse({ company_id: 'not-uuid' }).success).toBe(false)
  })
})

describe('signContractSchema', () => {
  const longSignatureBase64 = 'A'.repeat(200) // well over 100 chars

  it('accepts valid signing data', () => {
    const result = signContractSchema.safeParse({
      signer_name: 'Anna Andersson',
      signature_image: longSignatureBase64,
    })
    expect(result.success).toBe(true)
  })

  it('accepts with optional signer_title', () => {
    const result = signContractSchema.safeParse({
      signer_name: 'Anna Andersson',
      signer_title: 'VD',
      signature_image: longSignatureBase64,
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty signer_name', () => {
    expect(
      signContractSchema.safeParse({
        signer_name: '',
        signature_image: longSignatureBase64,
      }).success,
    ).toBe(false)
  })

  it('rejects missing signer_name', () => {
    expect(
      signContractSchema.safeParse({
        signature_image: longSignatureBase64,
      }).success,
    ).toBe(false)
  })

  it('rejects signature_image shorter than 100 characters', () => {
    expect(
      signContractSchema.safeParse({
        signer_name: 'Test',
        signature_image: 'A'.repeat(99),
      }).success,
    ).toBe(false)
  })

  it('accepts signature_image exactly 100 characters', () => {
    expect(
      signContractSchema.safeParse({
        signer_name: 'Test',
        signature_image: 'A'.repeat(100),
      }).success,
    ).toBe(true)
  })

  it('rejects missing signature_image', () => {
    expect(
      signContractSchema.safeParse({
        signer_name: 'Test',
      }).success,
    ).toBe(false)
  })

  it('rejects empty signature_image', () => {
    expect(
      signContractSchema.safeParse({
        signer_name: 'Test',
        signature_image: '',
      }).success,
    ).toBe(false)
  })

  it('accepts omitted signer_title (optional)', () => {
    const result = signContractSchema.safeParse({
      signer_name: 'Test',
      signature_image: longSignatureBase64,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.signer_title).toBeUndefined()
    }
  })

  it('rejects non-string signer_name', () => {
    expect(
      signContractSchema.safeParse({
        signer_name: 123,
        signature_image: longSignatureBase64,
      }).success,
    ).toBe(false)
  })

  it('rejects non-string signature_image', () => {
    expect(
      signContractSchema.safeParse({
        signer_name: 'Test',
        signature_image: 12345,
      }).success,
    ).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 4. Contract Storage
// ---------------------------------------------------------------------------
import {
  uploadContractPdf,
  uploadSignatureImage,
  getContractSignedUrl,
  downloadContractFile,
} from '@/lib/contracts/storage'

function createMockStorage(
  overrides: {
    uploadResult?: { error: null | { message: string } }
    createSignedUrlResult?: { data: { signedUrl: string } | null; error: null | { message: string } }
    downloadResult?: { data: Blob | null; error: null | { message: string } }
  } = {},
) {
  const uploadFn = vi.fn().mockResolvedValue(overrides.uploadResult ?? { error: null })
  const createSignedUrlFn = vi
    .fn()
    .mockResolvedValue(
      overrides.createSignedUrlResult ?? { data: { signedUrl: 'https://signed.url/test' }, error: null },
    )
  const downloadFn = vi.fn().mockResolvedValue(
    overrides.downloadResult ?? {
      data: new Blob([Buffer.from('pdf-content')]),
      error: null,
    },
  )

  const storageBucket = {
    upload: uploadFn,
    createSignedUrl: createSignedUrlFn,
    download: downloadFn,
  }

  const supabase = {
    storage: {
      from: vi.fn().mockReturnValue(storageBucket),
    },
  }

  return {
    supabase: supabase as unknown as Parameters<typeof uploadContractPdf>[0],
    storageBucket,
    uploadFn,
    createSignedUrlFn,
    downloadFn,
  }
}

describe('contract storage — path generation', () => {
  it('generates path with companyId prefix', async () => {
    const { supabase, uploadFn } = createMockStorage()
    const path = await uploadContractPdf(supabase, 'company-123', 'contract-456', 'doc.pdf', Buffer.from('pdf'))
    expect(path).toBe('company-123/contract-456/doc.pdf')
    expect(uploadFn).toHaveBeenCalledOnce()
  })

  it('uses "no-company" prefix when companyId is null', async () => {
    const { supabase } = createMockStorage()
    const path = await uploadContractPdf(supabase, null, 'contract-789', 'doc.pdf', Buffer.from('pdf'))
    expect(path).toBe('no-company/contract-789/doc.pdf')
  })

  it('uses "contracts" bucket', async () => {
    const { supabase } = createMockStorage()
    await uploadContractPdf(supabase, 'c1', 'c2', 'file.pdf', Buffer.from('x'))
    expect(supabase.storage.from).toHaveBeenCalledWith('contracts')
  })
})

describe('uploadContractPdf', () => {
  it('uploads with correct content type and upsert', async () => {
    const { supabase, uploadFn } = createMockStorage()
    const buffer = Buffer.from('pdf-data')
    await uploadContractPdf(supabase, 'comp', 'cid', 'file.pdf', buffer)
    expect(uploadFn).toHaveBeenCalledWith('comp/cid/file.pdf', buffer, { contentType: 'application/pdf', upsert: true })
  })

  it('returns the full storage path on success', async () => {
    const { supabase } = createMockStorage()
    const path = await uploadContractPdf(supabase, 'comp', 'cid', 'unsigned.pdf', Buffer.from('x'))
    expect(path).toBe('comp/cid/unsigned.pdf')
  })

  it('throws on upload error', async () => {
    const { supabase } = createMockStorage({
      uploadResult: { error: { message: 'Bucket not found' } },
    })
    await expect(uploadContractPdf(supabase, 'comp', 'cid', 'file.pdf', Buffer.from('x'))).rejects.toThrow(
      'Failed to upload contract PDF: Bucket not found',
    )
  })

  it('handles empty buffer', async () => {
    const { supabase } = createMockStorage()
    const path = await uploadContractPdf(supabase, 'comp', 'cid', 'empty.pdf', Buffer.alloc(0))
    expect(path).toBe('comp/cid/empty.pdf')
  })
})

describe('uploadSignatureImage', () => {
  it('uploads to signature.png path', async () => {
    const { supabase, uploadFn } = createMockStorage()
    await uploadSignatureImage(supabase, 'comp', 'cid', 'base64data')
    expect(uploadFn).toHaveBeenCalledWith('comp/cid/signature.png', expect.any(Buffer), {
      contentType: 'image/png',
      upsert: true,
    })
  })

  it('returns correct path', async () => {
    const { supabase } = createMockStorage()
    const path = await uploadSignatureImage(supabase, 'comp', 'cid', 'base64data')
    expect(path).toBe('comp/cid/signature.png')
  })

  it('strips data URL prefix before converting to buffer', async () => {
    const { supabase, uploadFn } = createMockStorage()
    const rawBase64 = Buffer.from('png-image-data').toString('base64')
    const dataUrl = `data:image/png;base64,${rawBase64}`
    await uploadSignatureImage(supabase, 'comp', 'cid', dataUrl)

    const uploadedBuffer = uploadFn.mock.calls[0][1] as Buffer
    expect(uploadedBuffer.toString()).toBe('png-image-data')
  })

  it('handles raw base64 without data URL prefix', async () => {
    const { supabase, uploadFn } = createMockStorage()
    const rawBase64 = Buffer.from('raw-image').toString('base64')
    await uploadSignatureImage(supabase, 'comp', 'cid', rawBase64)

    const uploadedBuffer = uploadFn.mock.calls[0][1] as Buffer
    expect(uploadedBuffer.toString()).toBe('raw-image')
  })

  it('uses no-company prefix when companyId is null', async () => {
    const { supabase } = createMockStorage()
    const path = await uploadSignatureImage(supabase, null, 'cid', 'data')
    expect(path).toBe('no-company/cid/signature.png')
  })

  it('throws on upload error', async () => {
    const { supabase } = createMockStorage({
      uploadResult: { error: { message: 'Storage limit exceeded' } },
    })
    await expect(uploadSignatureImage(supabase, 'comp', 'cid', 'data')).rejects.toThrow(
      'Failed to upload signature image: Storage limit exceeded',
    )
  })
})

describe('getContractSignedUrl', () => {
  it('returns signed URL on success', async () => {
    const { supabase } = createMockStorage({
      createSignedUrlResult: { data: { signedUrl: 'https://example.com/signed' }, error: null },
    })
    const url = await getContractSignedUrl(supabase, 'comp/cid/file.pdf')
    expect(url).toBe('https://example.com/signed')
  })

  it('calls createSignedUrl with 3600s expiry', async () => {
    const { supabase, createSignedUrlFn } = createMockStorage()
    await getContractSignedUrl(supabase, 'some/path')
    expect(createSignedUrlFn).toHaveBeenCalledWith('some/path', 3600)
  })

  it('uses contracts bucket', async () => {
    const { supabase } = createMockStorage()
    await getContractSignedUrl(supabase, 'path')
    expect(supabase.storage.from).toHaveBeenCalledWith('contracts')
  })

  it('throws when error is returned', async () => {
    const { supabase } = createMockStorage({
      createSignedUrlResult: { data: null, error: { message: 'Not found' } },
    })
    await expect(getContractSignedUrl(supabase, 'path')).rejects.toThrow('Failed to get signed URL: Not found')
  })

  it('throws when data is null without error', async () => {
    const { supabase } = createMockStorage({
      createSignedUrlResult: { data: null, error: null },
    })
    await expect(getContractSignedUrl(supabase, 'path')).rejects.toThrow('Failed to get signed URL')
  })

  it('throws when signedUrl is missing from data', async () => {
    // Empty string is still truthy enough, but null signedUrl would throw
    const mockResult = { data: null, error: null }
    const storageBucket = {
      upload: vi.fn(),
      createSignedUrl: vi.fn().mockResolvedValue(mockResult),
      download: vi.fn(),
    }
    const sb = { storage: { from: vi.fn().mockReturnValue(storageBucket) } } as unknown as Parameters<
      typeof getContractSignedUrl
    >[0]
    await expect(getContractSignedUrl(sb, 'path')).rejects.toThrow('Failed to get signed URL')
  })
})

describe('downloadContractFile', () => {
  it('returns a Buffer on success', async () => {
    const pdfContent = 'fake-pdf-bytes'
    const blob = new Blob([Buffer.from(pdfContent)])
    const { supabase } = createMockStorage({
      downloadResult: { data: blob, error: null },
    })
    const buf = await downloadContractFile(supabase, 'comp/cid/file.pdf')
    expect(Buffer.isBuffer(buf)).toBe(true)
    expect(buf.toString()).toBe(pdfContent)
  })

  it('uses contracts bucket', async () => {
    const { supabase } = createMockStorage()
    await downloadContractFile(supabase, 'path')
    expect(supabase.storage.from).toHaveBeenCalledWith('contracts')
  })

  it('throws when error is returned', async () => {
    const { supabase } = createMockStorage({
      downloadResult: { data: null, error: { message: 'Access denied' } },
    })
    await expect(downloadContractFile(supabase, 'path')).rejects.toThrow(
      'Failed to download contract file: Access denied',
    )
  })

  it('throws when data is null', async () => {
    const { supabase } = createMockStorage({
      downloadResult: { data: null, error: null },
    })
    await expect(downloadContractFile(supabase, 'path')).rejects.toThrow('Failed to download contract file')
  })

  it('calls download with the given path', async () => {
    const { supabase, downloadFn } = createMockStorage()
    await downloadContractFile(supabase, 'my/custom/path.pdf')
    expect(downloadFn).toHaveBeenCalledWith('my/custom/path.pdf')
  })
})

// ---------------------------------------------------------------------------
// 5. Audit Logging
// ---------------------------------------------------------------------------
import { logContractEvent } from '@/lib/contracts/audit'

function createMockAuditSupabase(insertResult: { error: null | { message: string } } = { error: null }) {
  const insertFn = vi.fn().mockResolvedValue(insertResult)
  const fromFn = vi.fn().mockReturnValue({ insert: insertFn })
  const supabase = { from: fromFn } as unknown as Parameters<typeof logContractEvent>[0]
  return { supabase, fromFn, insertFn }
}

describe('logContractEvent', () => {
  it('inserts into contract_audit table', async () => {
    const { supabase, fromFn } = createMockAuditSupabase()
    await logContractEvent(supabase, {
      contract_id: 'c-1',
      event_type: 'created',
    })
    expect(fromFn).toHaveBeenCalledWith('contract_audit')
  })

  it('passes all provided params', async () => {
    const { supabase, insertFn } = createMockAuditSupabase()
    await logContractEvent(supabase, {
      contract_id: 'c-1',
      event_type: 'signed',
      actor_email: 'user@test.com',
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0',
      document_hash_sha256: 'abc123',
      metadata: { browser: 'Chrome' },
    })
    expect(insertFn).toHaveBeenCalledWith({
      contract_id: 'c-1',
      event_type: 'signed',
      actor_email: 'user@test.com',
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0',
      document_hash_sha256: 'abc123',
      metadata: { browser: 'Chrome' },
    })
  })

  it('defaults optional fields to null/empty', async () => {
    const { supabase, insertFn } = createMockAuditSupabase()
    await logContractEvent(supabase, {
      contract_id: 'c-2',
      event_type: 'viewed',
    })
    expect(insertFn).toHaveBeenCalledWith({
      contract_id: 'c-2',
      event_type: 'viewed',
      actor_email: null,
      ip_address: null,
      user_agent: null,
      document_hash_sha256: null,
      metadata: {},
    })
  })

  it('does not throw on insert error (logs to console)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { supabase } = createMockAuditSupabase({ error: { message: 'DB error' } })

    await expect(
      logContractEvent(supabase, {
        contract_id: 'c-3',
        event_type: 'created',
      }),
    ).resolves.toBeUndefined()

    expect(consoleSpy).toHaveBeenCalledWith('Failed to log contract audit event:', { message: 'DB error' })
    consoleSpy.mockRestore()
  })

  it('does not throw when error is null (success)', async () => {
    const { supabase } = createMockAuditSupabase({ error: null })
    await expect(
      logContractEvent(supabase, {
        contract_id: 'c-4',
        event_type: 'sent',
      }),
    ).resolves.toBeUndefined()
  })

  it('handles empty string actor_email as null (falsy)', async () => {
    const { supabase, insertFn } = createMockAuditSupabase()
    await logContractEvent(supabase, {
      contract_id: 'c-5',
      event_type: 'expired',
      actor_email: '',
    })
    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({ actor_email: null }))
  })

  it('handles undefined metadata as empty object', async () => {
    const { supabase, insertFn } = createMockAuditSupabase()
    await logContractEvent(supabase, {
      contract_id: 'c-6',
      event_type: 'cancelled',
      metadata: undefined,
    })
    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({ metadata: {} }))
  })

  it('handles all event types', async () => {
    const events: Array<Parameters<typeof logContractEvent>[1]['event_type']> = [
      'created',
      'sent_to_reviewer',
      'reviewed',
      'approved',
      'sent',
      'resent',
      'viewed',
      'signed',
      'expired',
      'cancelled',
    ]
    for (const event_type of events) {
      const { supabase, insertFn } = createMockAuditSupabase()
      await logContractEvent(supabase, { contract_id: 'c', event_type })
      expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({ event_type }))
    }
  })
})

// ---------------------------------------------------------------------------
// 6. Contract Number Generation
// ---------------------------------------------------------------------------
import { generateContractNumber } from '@/lib/contracts/contract-number'

function createMockContractNumberSupabase(mockData: Array<{ contract_number: string }> | null = null) {
  const limitFn = vi.fn().mockResolvedValue({ data: mockData })
  const orderFn = vi.fn().mockReturnValue({ limit: limitFn })
  const likeFn = vi.fn().mockReturnValue({ order: orderFn })
  const selectFn = vi.fn().mockReturnValue({ like: likeFn })
  const fromFn = vi.fn().mockReturnValue({ select: selectFn })
  const supabase = { from: fromFn } as unknown as Parameters<typeof generateContractNumber>[0]
  return { supabase, fromFn, selectFn, likeFn, orderFn, limitFn }
}

describe('generateContractNumber', () => {
  it('generates first contract number as SS-YYYY-001', async () => {
    const { supabase } = createMockContractNumberSupabase([])
    const result = await generateContractNumber(supabase)
    const year = new Date().getFullYear()
    expect(result).toBe(`SS-${year}-001`)
  })

  it('generates first contract number when data is null', async () => {
    const { supabase } = createMockContractNumberSupabase(null)
    const result = await generateContractNumber(supabase)
    const year = new Date().getFullYear()
    expect(result).toBe(`SS-${year}-001`)
  })

  it('increments from the last existing contract number', async () => {
    const year = new Date().getFullYear()
    const { supabase } = createMockContractNumberSupabase([{ contract_number: `SS-${year}-005` }])
    const result = await generateContractNumber(supabase)
    expect(result).toBe(`SS-${year}-006`)
  })

  it('pads numbers to 3 digits', async () => {
    const year = new Date().getFullYear()
    const { supabase } = createMockContractNumberSupabase([{ contract_number: `SS-${year}-009` }])
    const result = await generateContractNumber(supabase)
    expect(result).toBe(`SS-${year}-010`)
  })

  it('handles numbers above 999 (no truncation)', async () => {
    const year = new Date().getFullYear()
    const { supabase } = createMockContractNumberSupabase([{ contract_number: `SS-${year}-999` }])
    const result = await generateContractNumber(supabase)
    expect(result).toBe(`SS-${year}-1000`)
  })

  it('handles NaN in last contract number (falls back to 001)', async () => {
    const year = new Date().getFullYear()
    const { supabase } = createMockContractNumberSupabase([{ contract_number: `SS-${year}-abc` }])
    const result = await generateContractNumber(supabase)
    expect(result).toBe(`SS-${year}-001`)
  })

  it('queries the contracts table', async () => {
    const { supabase, fromFn } = createMockContractNumberSupabase([])
    await generateContractNumber(supabase)
    expect(fromFn).toHaveBeenCalledWith('contracts')
  })

  it('selects only contract_number column', async () => {
    const { supabase, selectFn } = createMockContractNumberSupabase([])
    await generateContractNumber(supabase)
    expect(selectFn).toHaveBeenCalledWith('contract_number')
  })

  it('filters by current year prefix with LIKE', async () => {
    const year = new Date().getFullYear()
    const { supabase, likeFn } = createMockContractNumberSupabase([])
    await generateContractNumber(supabase)
    expect(likeFn).toHaveBeenCalledWith('contract_number', `SS-${year}-%`)
  })

  it('orders descending and limits to 1', async () => {
    const { supabase, orderFn, limitFn } = createMockContractNumberSupabase([])
    await generateContractNumber(supabase)
    expect(orderFn).toHaveBeenCalledWith('contract_number', { ascending: false })
    expect(limitFn).toHaveBeenCalledWith(1)
  })

  it('uses current year dynamically', async () => {
    const { supabase } = createMockContractNumberSupabase([])
    const result = await generateContractNumber(supabase)
    const year = new Date().getFullYear()
    expect(result).toContain(`SS-${year}-`)
  })

  it('format matches SS-YYYY-NNN pattern', async () => {
    const { supabase } = createMockContractNumberSupabase([])
    const result = await generateContractNumber(supabase)
    expect(result).toMatch(/^SS-\d{4}-\d{3,}$/)
  })
})
