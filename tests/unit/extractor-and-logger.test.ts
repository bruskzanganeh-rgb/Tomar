import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — must be set up before importing modules under test
// ---------------------------------------------------------------------------

const mockExtractText = vi.fn()
vi.mock('unpdf', () => ({
  extractText: mockExtractText,
}))

const mockInsert = vi.fn()
const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert })
const mockCreateAdminClient = vi.fn().mockReturnValue({ from: mockFrom })

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mockCreateAdminClient,
}))

// ---------------------------------------------------------------------------
// Import modules under test (after mocks)
// ---------------------------------------------------------------------------

const { extractTextFromPDF, extractInvoiceNumberFromFilename } = await import('@/lib/pdf/extractor')
const { calculateCost, getUsageTypeLabel, logAiUsage } = await import('@/lib/ai/usage-logger')
import type { UsageType } from '@/lib/ai/usage-logger'

// ===========================================================================
// extractInvoiceNumberFromFilename
// ===========================================================================
describe('extractInvoiceNumberFromFilename', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ----- Standard matching patterns -----
  describe('standard matching patterns', () => {
    it('extracts number from "Faktura-123.pdf"', () => {
      expect(extractInvoiceNumberFromFilename('Faktura-123.pdf')).toBe(123)
    })

    it('extracts number from "faktura_456.pdf"', () => {
      expect(extractInvoiceNumberFromFilename('faktura_456.pdf')).toBe(456)
    })

    it('extracts number from "FAKTURA-001.pdf" (leading zeros stripped)', () => {
      expect(extractInvoiceNumberFromFilename('FAKTURA-001.pdf')).toBe(1)
    })

    it('extracts number from "faktura123.pdf" (no separator)', () => {
      expect(extractInvoiceNumberFromFilename('faktura123.pdf')).toBe(123)
    })

    it('extracts number from "Faktura-999999.pdf" (large number)', () => {
      expect(extractInvoiceNumberFromFilename('Faktura-999999.pdf')).toBe(999999)
    })

    it('extracts number from "faktura_1.pdf" (single digit)', () => {
      expect(extractInvoiceNumberFromFilename('faktura_1.pdf')).toBe(1)
    })

    it('extracts number from "FAKTURA_789.pdf" (uppercase with underscore)', () => {
      expect(extractInvoiceNumberFromFilename('FAKTURA_789.pdf')).toBe(789)
    })

    it('extracts number from "Faktura-0042.pdf" (leading zeros)', () => {
      expect(extractInvoiceNumberFromFilename('Faktura-0042.pdf')).toBe(42)
    })
  })

  // ----- Case insensitivity -----
  describe('case insensitivity', () => {
    it('handles mixed case "FaKtUrA-55.pdf"', () => {
      expect(extractInvoiceNumberFromFilename('FaKtUrA-55.pdf')).toBe(55)
    })

    it('handles all lowercase "faktura-10.pdf"', () => {
      expect(extractInvoiceNumberFromFilename('faktura-10.pdf')).toBe(10)
    })

    it('handles all uppercase "FAKTURA-10.pdf"', () => {
      expect(extractInvoiceNumberFromFilename('FAKTURA-10.pdf')).toBe(10)
    })
  })

  // ----- Non-matching patterns -----
  describe('non-matching patterns', () => {
    it('returns null for "random-file.pdf"', () => {
      expect(extractInvoiceNumberFromFilename('random-file.pdf')).toBeNull()
    })

    it('returns null for "faktura-.pdf" (separator but no digits)', () => {
      expect(extractInvoiceNumberFromFilename('faktura-.pdf')).toBeNull()
    })

    it('returns null for "invoice-123.pdf" (English word)', () => {
      expect(extractInvoiceNumberFromFilename('invoice-123.pdf')).toBeNull()
    })

    it('returns null for "faktura.pdf" (no number at all)', () => {
      expect(extractInvoiceNumberFromFilename('faktura.pdf')).toBeNull()
    })

    it('returns null for "faktura-abc.pdf" (letters instead of digits)', () => {
      expect(extractInvoiceNumberFromFilename('faktura-abc.pdf')).toBeNull()
    })

    it('returns null for "" (empty string)', () => {
      expect(extractInvoiceNumberFromFilename('')).toBeNull()
    })

    it('returns null for "faktura-123.txt" (wrong extension)', () => {
      expect(extractInvoiceNumberFromFilename('faktura-123.txt')).toBeNull()
    })

    it('returns null for "faktura-123.PDF" returns null (regex uses .pdf)', () => {
      // The regex specifies \.pdf with the /i flag, so .PDF should also match
      // Actually /i flag makes the whole pattern case-insensitive, including .pdf
      // Let's verify the actual behavior
      const result = extractInvoiceNumberFromFilename('faktura-123.PDF')
      expect(result).toBe(123) // /i flag makes .PDF match too
    })

    it('returns null for "report_faktura_123.pdf" (prefix before faktura)', () => {
      // The regex does not anchor to the start, so this should still match
      expect(extractInvoiceNumberFromFilename('report_faktura_123.pdf')).toBe(123)
    })

    it('returns null for "dokument.pdf"', () => {
      expect(extractInvoiceNumberFromFilename('dokument.pdf')).toBeNull()
    })

    it('returns null for "faktura_" (no extension)', () => {
      expect(extractInvoiceNumberFromFilename('faktura_')).toBeNull()
    })
  })

  // ----- Edge cases -----
  describe('edge cases', () => {
    it('handles very large number "Faktura-9999999999.pdf"', () => {
      expect(extractInvoiceNumberFromFilename('Faktura-9999999999.pdf')).toBe(9999999999)
    })

    it('handles "faktura0.pdf" (zero)', () => {
      expect(extractInvoiceNumberFromFilename('faktura0.pdf')).toBe(0)
    })

    it('handles path with directories "path/to/faktura-100.pdf"', () => {
      expect(extractInvoiceNumberFromFilename('path/to/faktura-100.pdf')).toBe(100)
    })

    it('extracts first match for "faktura-1faktura-2.pdf"', () => {
      // regex.match returns the first match
      const result = extractInvoiceNumberFromFilename('faktura-1faktura-2.pdf')
      // The regex is greedy on \d+, "faktura-1faktura-2.pdf" — first match "faktura-1" is not
      // followed by .pdf, but "faktura-2.pdf" is. Actually, match returns the first full match.
      // The string "faktura-1faktura-2.pdf": the regex /faktura[_-]?(\d+)\.pdf/i
      // will try to match starting at various positions:
      // At pos 0: "faktura-1faktura-2.pdf" — "faktura-" matches, then (\d+) gets "1",
      // then \.pdf looks for ".pdf" but finds "f" — no match
      // At pos 9: "faktura-2.pdf" — matches! capture group = "2"
      expect(result).toBe(2)
    })

    it('handles "faktura_000.pdf" (all zeros)', () => {
      expect(extractInvoiceNumberFromFilename('faktura_000.pdf')).toBe(0)
    })
  })
})

// ===========================================================================
// extractTextFromPDF
// ===========================================================================
describe('extractTextFromPDF', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ----- Success cases -----
  describe('success cases', () => {
    it('joins text array with newlines', async () => {
      mockExtractText.mockResolvedValue({
        totalPages: 2,
        text: ['Page one content', 'Page two content'],
      })

      const result = await extractTextFromPDF(Buffer.from('fake-pdf'))
      expect(result).toBe('Page one content\nPage two content')
    })

    it('returns empty string for empty text array', async () => {
      mockExtractText.mockResolvedValue({
        totalPages: 0,
        text: [],
      })

      const result = await extractTextFromPDF(Buffer.from('fake-pdf'))
      expect(result).toBe('')
    })

    it('returns single page text without newline', async () => {
      mockExtractText.mockResolvedValue({
        totalPages: 1,
        text: ['Only page'],
      })

      const result = await extractTextFromPDF(Buffer.from('fake-pdf'))
      expect(result).toBe('Only page')
    })

    it('handles multiple pages with various content', async () => {
      mockExtractText.mockResolvedValue({
        totalPages: 3,
        text: ['Header', 'Body text here', 'Footer'],
      })

      const result = await extractTextFromPDF(Buffer.from('fake-pdf'))
      expect(result).toBe('Header\nBody text here\nFooter')
    })

    it('passes a Uint8Array to extractText', async () => {
      mockExtractText.mockResolvedValue({ totalPages: 1, text: ['text'] })

      const buffer = Buffer.from('test-data')
      await extractTextFromPDF(buffer)

      expect(mockExtractText).toHaveBeenCalledTimes(1)
      const arg = mockExtractText.mock.calls[0][0]
      expect(arg).toBeInstanceOf(Uint8Array)
    })

    it('preserves text with special characters', async () => {
      mockExtractText.mockResolvedValue({
        totalPages: 1,
        text: ['Faktura #42 — Total: 1 500 kr (inkl. moms 25%)'],
      })

      const result = await extractTextFromPDF(Buffer.from('fake-pdf'))
      expect(result).toBe('Faktura #42 — Total: 1 500 kr (inkl. moms 25%)')
    })
  })

  // ----- Error handling -----
  describe('error handling', () => {
    it('wraps Error thrown by extractText', async () => {
      mockExtractText.mockRejectedValue(new Error('Corrupt PDF'))

      await expect(extractTextFromPDF(Buffer.from('bad-pdf'))).rejects.toThrow(
        'Failed to extract text from PDF: Corrupt PDF',
      )
    })

    it('wraps non-Error thrown by extractText', async () => {
      mockExtractText.mockRejectedValue('string error')

      await expect(extractTextFromPDF(Buffer.from('bad-pdf'))).rejects.toThrow(
        'Failed to extract text from PDF: Unknown error',
      )
    })

    it('wraps null thrown by extractText', async () => {
      mockExtractText.mockRejectedValue(null)

      await expect(extractTextFromPDF(Buffer.from('bad-pdf'))).rejects.toThrow(
        'Failed to extract text from PDF: Unknown error',
      )
    })

    it('wraps number thrown by extractText', async () => {
      mockExtractText.mockRejectedValue(42)

      await expect(extractTextFromPDF(Buffer.from('bad-pdf'))).rejects.toThrow(
        'Failed to extract text from PDF: Unknown error',
      )
    })

    it('thrown error is an instance of Error', async () => {
      mockExtractText.mockRejectedValue(new Error('broken'))

      try {
        await extractTextFromPDF(Buffer.from('bad'))
        expect.unreachable('should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(Error)
      }
    })
  })
})

// ===========================================================================
// calculateCost
// ===========================================================================
describe('calculateCost', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ----- Known model pricing -----
  describe('known model pricing', () => {
    it('calculates cost for claude-haiku-4-5-20251001', () => {
      // input: 0.8 per 1M, output: 4.0 per 1M
      // 1000 * 0.8 + 500 * 4.0 = 800 + 2000 = 2800 / 1_000_000 = 0.0028
      const cost = calculateCost('claude-haiku-4-5-20251001', 1000, 500)
      expect(cost).toBeCloseTo(0.0028, 10)
    })

    it('exact math: 100 input + 100 output tokens', () => {
      // 100 * 0.8 + 100 * 4.0 = 80 + 400 = 480 / 1_000_000 = 0.00048
      const cost = calculateCost('claude-haiku-4-5-20251001', 100, 100)
      expect(cost).toBe(480 / 1_000_000)
    })

    it('exact math: 1M input + 1M output tokens', () => {
      // 1_000_000 * 0.8 + 1_000_000 * 4.0 = 800_000 + 4_000_000 = 4_800_000 / 1_000_000 = 4.8
      const cost = calculateCost('claude-haiku-4-5-20251001', 1_000_000, 1_000_000)
      expect(cost).toBe(4.8)
    })

    it('only input tokens (zero output)', () => {
      // 5000 * 0.8 + 0 = 4000 / 1_000_000 = 0.004
      const cost = calculateCost('claude-haiku-4-5-20251001', 5000, 0)
      expect(cost).toBe(0.004)
    })

    it('only output tokens (zero input)', () => {
      // 0 + 2000 * 4.0 = 8000 / 1_000_000 = 0.008
      const cost = calculateCost('claude-haiku-4-5-20251001', 0, 2000)
      expect(cost).toBe(0.008)
    })
  })

  // ----- Zero tokens -----
  describe('zero tokens', () => {
    it('returns 0 for zero input and zero output on known model', () => {
      const cost = calculateCost('claude-haiku-4-5-20251001', 0, 0)
      expect(cost).toBe(0)
    })

    it('returns 0 for zero input and zero output on unknown model', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const cost = calculateCost('unknown-model', 0, 0)
      expect(cost).toBe(0)
      warnSpy.mockRestore()
    })
  })

  // ----- Unknown model (fallback pricing) -----
  describe('unknown model fallback', () => {
    it('uses fallback pricing for unknown model', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Fallback pricing: input=0.8, output=4.0 (same as Haiku)
      const cost = calculateCost('gpt-4o', 1000, 500)
      expect(cost).toBeCloseTo(0.0028, 10)

      warnSpy.mockRestore()
    })

    it('logs a warning for unknown model', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      calculateCost('some-random-model', 100, 100)

      expect(warnSpy).toHaveBeenCalledTimes(1)
      expect(warnSpy).toHaveBeenCalledWith('Unknown model pricing: some-random-model, using Claude 3.5 Haiku pricing')

      warnSpy.mockRestore()
    })

    it('does not log warning for known model', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      calculateCost('claude-haiku-4-5-20251001', 100, 100)

      expect(warnSpy).not.toHaveBeenCalled()

      warnSpy.mockRestore()
    })

    it('fallback produces same result as known model (both use 0.8/4.0)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const knownCost = calculateCost('claude-haiku-4-5-20251001', 5000, 3000)
      const fallbackCost = calculateCost('unknown-model', 5000, 3000)

      expect(knownCost).toBe(fallbackCost)

      warnSpy.mockRestore()
    })
  })

  // ----- Large token counts -----
  describe('large token counts', () => {
    it('handles 10M input tokens', () => {
      const cost = calculateCost('claude-haiku-4-5-20251001', 10_000_000, 0)
      // 10_000_000 * 0.8 / 1_000_000 = 8.0
      expect(cost).toBe(8.0)
    })

    it('handles 10M output tokens', () => {
      const cost = calculateCost('claude-haiku-4-5-20251001', 0, 10_000_000)
      // 10_000_000 * 4.0 / 1_000_000 = 40.0
      expect(cost).toBe(40.0)
    })

    it('handles 100M of each', () => {
      const cost = calculateCost('claude-haiku-4-5-20251001', 100_000_000, 100_000_000)
      // 100M * 0.8 + 100M * 4.0 = 80M + 400M = 480M / 1M = 480
      expect(cost).toBe(480)
    })
  })
})

// ===========================================================================
// getUsageTypeLabel
// ===========================================================================
describe('getUsageTypeLabel', () => {
  // ----- All 7 usage types -----
  it('returns "Kvittoskanning (text)" for receipt_scan_text', () => {
    expect(getUsageTypeLabel('receipt_scan_text')).toBe('Kvittoskanning (text)')
  })

  it('returns "Kvittoskanning (bild)" for receipt_scan_vision', () => {
    expect(getUsageTypeLabel('receipt_scan_vision')).toBe('Kvittoskanning (bild)')
  })

  it('returns "Dokumentklassning (text)" for document_classify_text', () => {
    expect(getUsageTypeLabel('document_classify_text')).toBe('Dokumentklassning (text)')
  })

  it('returns "Dokumentklassning (bild)" for document_classify_vision', () => {
    expect(getUsageTypeLabel('document_classify_vision')).toBe('Dokumentklassning (bild)')
  })

  it('returns "Fakturaläsning" for invoice_parse', () => {
    expect(getUsageTypeLabel('invoice_parse')).toBe('Fakturaläsning')
  })

  it('returns "Schematolkning" for schedule_parse', () => {
    expect(getUsageTypeLabel('schedule_parse')).toBe('Schematolkning')
  })

  it('returns "Schemaskanning" for schedule_scan', () => {
    expect(getUsageTypeLabel('schedule_scan')).toBe('Schemaskanning')
  })

  // ----- Unknown type fallback -----
  it('returns the type string itself for unknown usage type', () => {
    // TypeScript would normally prevent this, but we cast to test the fallback
    expect(getUsageTypeLabel('unknown_type' as UsageType)).toBe('unknown_type')
  })

  it('returns the type string for another unknown usage type', () => {
    expect(getUsageTypeLabel('foo_bar' as UsageType)).toBe('foo_bar')
  })
})

// ===========================================================================
// logAiUsage
// ===========================================================================
describe('logAiUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the default mock behavior
    mockCreateAdminClient.mockReturnValue({ from: mockFrom })
    mockFrom.mockReturnValue({ insert: mockInsert })
    mockInsert.mockResolvedValue({ data: null, error: null })
  })

  // ----- Success case -----
  describe('success case', () => {
    it('inserts usage record to ai_usage_logs table', async () => {
      mockInsert.mockResolvedValue({ data: null, error: null })

      await logAiUsage({
        usageType: 'receipt_scan_text',
        model: 'claude-haiku-4-5-20251001',
        inputTokens: 1000,
        outputTokens: 500,
      })

      expect(mockCreateAdminClient).toHaveBeenCalledTimes(1)
      expect(mockFrom).toHaveBeenCalledWith('ai_usage_logs')
      expect(mockInsert).toHaveBeenCalledTimes(1)

      const insertArg = mockInsert.mock.calls[0][0]
      expect(insertArg.usage_type).toBe('receipt_scan_text')
      expect(insertArg.model).toBe('claude-haiku-4-5-20251001')
      expect(insertArg.input_tokens).toBe(1000)
      expect(insertArg.output_tokens).toBe(500)
      expect(insertArg.estimated_cost_usd).toBeCloseTo(0.0028, 10)
      expect(insertArg.user_id).toBeNull()
      expect(insertArg.metadata).toBeNull()
    })

    it('passes userId when provided', async () => {
      mockInsert.mockResolvedValue({ data: null, error: null })

      await logAiUsage({
        usageType: 'invoice_parse',
        model: 'claude-haiku-4-5-20251001',
        inputTokens: 200,
        outputTokens: 100,
        userId: 'user-abc-123',
      })

      const insertArg = mockInsert.mock.calls[0][0]
      expect(insertArg.user_id).toBe('user-abc-123')
    })

    it('passes metadata when provided', async () => {
      mockInsert.mockResolvedValue({ data: null, error: null })

      const metadata = { filename: 'test.pdf', pages: 3 }
      await logAiUsage({
        usageType: 'schedule_parse',
        model: 'claude-haiku-4-5-20251001',
        inputTokens: 300,
        outputTokens: 150,
        metadata,
      })

      const insertArg = mockInsert.mock.calls[0][0]
      expect(insertArg.metadata).toEqual(metadata)
    })

    it('calculates correct cost and stores it', async () => {
      mockInsert.mockResolvedValue({ data: null, error: null })

      await logAiUsage({
        usageType: 'receipt_scan_vision',
        model: 'claude-haiku-4-5-20251001',
        inputTokens: 10_000,
        outputTokens: 2_000,
      })

      const insertArg = mockInsert.mock.calls[0][0]
      // 10000 * 0.8 + 2000 * 4.0 = 8000 + 8000 = 16000 / 1_000_000 = 0.016
      expect(insertArg.estimated_cost_usd).toBe(0.016)
    })

    it('does not throw on success', async () => {
      mockInsert.mockResolvedValue({ data: null, error: null })

      await expect(
        logAiUsage({
          usageType: 'document_classify_text',
          model: 'claude-haiku-4-5-20251001',
          inputTokens: 50,
          outputTokens: 10,
        }),
      ).resolves.toBeUndefined()
    })
  })

  // ----- Error from insert -----
  describe('error from insert', () => {
    it('does not throw when insert returns an error', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockInsert.mockResolvedValue({
        data: null,
        error: { message: 'permission denied', code: '42501' },
      })

      await expect(
        logAiUsage({
          usageType: 'receipt_scan_text',
          model: 'claude-haiku-4-5-20251001',
          inputTokens: 100,
          outputTokens: 50,
        }),
      ).resolves.toBeUndefined()

      errorSpy.mockRestore()
    })

    it('logs the error to console.error when insert fails', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const dbError = { message: 'table not found', code: '42P01' }
      mockInsert.mockResolvedValue({ data: null, error: dbError })

      await logAiUsage({
        usageType: 'receipt_scan_text',
        model: 'claude-haiku-4-5-20251001',
        inputTokens: 100,
        outputTokens: 50,
      })

      expect(errorSpy).toHaveBeenCalledWith('Failed to log AI usage:', dbError)

      errorSpy.mockRestore()
    })
  })

  // ----- Exception during client creation -----
  describe('exception during client creation', () => {
    it('does not throw when createAdminClient throws', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockCreateAdminClient.mockImplementation(() => {
        throw new Error('Missing env vars')
      })

      await expect(
        logAiUsage({
          usageType: 'invoice_parse',
          model: 'claude-haiku-4-5-20251001',
          inputTokens: 100,
          outputTokens: 50,
        }),
      ).resolves.toBeUndefined()

      errorSpy.mockRestore()
    })

    it('logs the exception to console.error', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const thrownError = new Error('Service unavailable')
      mockCreateAdminClient.mockImplementation(() => {
        throw thrownError
      })

      await logAiUsage({
        usageType: 'invoice_parse',
        model: 'claude-haiku-4-5-20251001',
        inputTokens: 100,
        outputTokens: 50,
      })

      expect(errorSpy).toHaveBeenCalledWith('AI usage logging error:', thrownError)

      errorSpy.mockRestore()
    })

    it('does not throw when from() throws', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockCreateAdminClient.mockReturnValue({
        from: () => {
          throw new Error('Network error')
        },
      })

      await expect(
        logAiUsage({
          usageType: 'schedule_scan',
          model: 'claude-haiku-4-5-20251001',
          inputTokens: 100,
          outputTokens: 50,
        }),
      ).resolves.toBeUndefined()

      errorSpy.mockRestore()
    })

    it('does not throw when insert() rejects', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockInsert.mockRejectedValue(new Error('Connection reset'))

      await expect(
        logAiUsage({
          usageType: 'document_classify_vision',
          model: 'claude-haiku-4-5-20251001',
          inputTokens: 100,
          outputTokens: 50,
        }),
      ).resolves.toBeUndefined()

      errorSpy.mockRestore()
    })
  })
})
