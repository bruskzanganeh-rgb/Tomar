import { describe, it, expect, vi, beforeEach } from 'vitest'
import { matchClient } from '@/lib/pdf/client-matcher'

// ---------------------------------------------------------------------------
// Mock the Anthropic SDK so we can test parseInvoiceWithAI without real API calls
// ---------------------------------------------------------------------------
const mockCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: mockCreate }
  },
}))

// Mock the usage logger so it doesn't try to write to Supabase
vi.mock('@/lib/ai/usage-logger', () => ({
  logAiUsage: vi.fn(),
}))

// Import after mocks are set up
const { parseInvoiceWithAI } = await import('@/lib/pdf/parser')

// ===========================================================================
// Helper: build a mock Anthropic message response
// ===========================================================================
function mockAnthropicResponse(text: string) {
  return {
    content: [{ type: 'text', text }],
    usage: { input_tokens: 100, output_tokens: 50 },
  }
}

function validInvoiceJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    invoiceNumber: 42,
    clientName: 'Stockholms Konserthusstiftelse',
    invoiceDate: '2025-01-15',
    dueDate: '2025-02-15',
    subtotal: 10000,
    vatRate: 25,
    vatAmount: 2500,
    total: 12500,
    confidence: 0.95,
    ...overrides,
  })
}

// ===========================================================================
// parseInvoiceWithAI
// ===========================================================================
describe('parseInvoiceWithAI', () => {
  beforeEach(() => {
    mockCreate.mockReset()
  })

  // ----- Successful parsing -----
  describe('successful parsing', () => {
    it('parses a valid JSON response', async () => {
      mockCreate.mockResolvedValue(mockAnthropicResponse(validInvoiceJson()))

      const result = await parseInvoiceWithAI('some invoice text')

      expect(result).toEqual({
        invoiceNumber: 42,
        clientName: 'Stockholms Konserthusstiftelse',
        invoiceDate: '2025-01-15',
        dueDate: '2025-02-15',
        subtotal: 10000,
        vatRate: 25,
        vatAmount: 2500,
        total: 12500,
        confidence: 0.95,
      })
    })

    it('strips ```json markdown wrapper', async () => {
      const wrapped = '```json\n' + validInvoiceJson() + '\n```'
      mockCreate.mockResolvedValue(mockAnthropicResponse(wrapped))

      const result = await parseInvoiceWithAI('some invoice text')
      expect(result.invoiceNumber).toBe(42)
      expect(result.clientName).toBe('Stockholms Konserthusstiftelse')
    })

    it('strips bare ``` markdown wrapper', async () => {
      const wrapped = '```\n' + validInvoiceJson() + '\n```'
      mockCreate.mockResolvedValue(mockAnthropicResponse(wrapped))

      const result = await parseInvoiceWithAI('some invoice text')
      expect(result.invoiceNumber).toBe(42)
    })

    it('converts string invoiceNumber to integer', async () => {
      mockCreate.mockResolvedValue(mockAnthropicResponse(validInvoiceJson({ invoiceNumber: 'F-0042' })))

      const result = await parseInvoiceWithAI('some invoice text')
      expect(result.invoiceNumber).toBe(42)
    })

    it('converts numeric string invoiceNumber to integer', async () => {
      mockCreate.mockResolvedValue(mockAnthropicResponse(validInvoiceJson({ invoiceNumber: '123' })))

      const result = await parseInvoiceWithAI('some invoice text')
      expect(result.invoiceNumber).toBe(123)
    })

    it('sets invoiceNumber to 0 when string has no digits', async () => {
      // invoiceNumber "ABC" has no digits, so it becomes 0 — which fails Zod min(1)
      mockCreate.mockResolvedValue(mockAnthropicResponse(validInvoiceJson({ invoiceNumber: 'ABC' })))

      await expect(parseInvoiceWithAI('text')).rejects.toThrow('Invalid AI response format')
    })
  })

  // ----- VAT rate validation -----
  describe('VAT rate validation', () => {
    it('accepts vatRate 0', async () => {
      mockCreate.mockResolvedValue(
        mockAnthropicResponse(validInvoiceJson({ vatRate: 0, vatAmount: 0, subtotal: 12500 })),
      )
      const result = await parseInvoiceWithAI('text')
      expect(result.vatRate).toBe(0)
    })

    it('accepts vatRate 6', async () => {
      mockCreate.mockResolvedValue(
        mockAnthropicResponse(validInvoiceJson({ vatRate: 6, vatAmount: 600, subtotal: 10000 })),
      )
      const result = await parseInvoiceWithAI('text')
      expect(result.vatRate).toBe(6)
    })

    it('accepts vatRate 25', async () => {
      mockCreate.mockResolvedValue(mockAnthropicResponse(validInvoiceJson({ vatRate: 25 })))
      const result = await parseInvoiceWithAI('text')
      expect(result.vatRate).toBe(25)
    })

    it('rejects vatRate 12 (not a Swedish rate)', async () => {
      mockCreate.mockResolvedValue(mockAnthropicResponse(validInvoiceJson({ vatRate: 12 })))
      await expect(parseInvoiceWithAI('text')).rejects.toThrow('Invalid AI response format')
    })

    it('rejects vatRate 20', async () => {
      mockCreate.mockResolvedValue(mockAnthropicResponse(validInvoiceJson({ vatRate: 20 })))
      await expect(parseInvoiceWithAI('text')).rejects.toThrow('Invalid AI response format')
    })
  })

  // ----- Date validation -----
  describe('date validation', () => {
    it('rejects non-ISO date format', async () => {
      mockCreate.mockResolvedValue(mockAnthropicResponse(validInvoiceJson({ invoiceDate: '15/01/2025' })))
      await expect(parseInvoiceWithAI('text')).rejects.toThrow('Invalid AI response format')
    })

    it('rejects date with wrong separator', async () => {
      mockCreate.mockResolvedValue(mockAnthropicResponse(validInvoiceJson({ dueDate: '2025.02.15' })))
      await expect(parseInvoiceWithAI('text')).rejects.toThrow('Invalid AI response format')
    })
  })

  // ----- Numeric validation -----
  describe('numeric validation', () => {
    it('rejects negative subtotal', async () => {
      mockCreate.mockResolvedValue(mockAnthropicResponse(validInvoiceJson({ subtotal: -100 })))
      await expect(parseInvoiceWithAI('text')).rejects.toThrow('Invalid AI response format')
    })

    it('rejects zero total', async () => {
      mockCreate.mockResolvedValue(mockAnthropicResponse(validInvoiceJson({ total: 0 })))
      await expect(parseInvoiceWithAI('text')).rejects.toThrow('Invalid AI response format')
    })

    it('rejects negative total', async () => {
      mockCreate.mockResolvedValue(mockAnthropicResponse(validInvoiceJson({ total: -500 })))
      await expect(parseInvoiceWithAI('text')).rejects.toThrow('Invalid AI response format')
    })

    it('rejects confidence above 1', async () => {
      mockCreate.mockResolvedValue(mockAnthropicResponse(validInvoiceJson({ confidence: 1.5 })))
      await expect(parseInvoiceWithAI('text')).rejects.toThrow('Invalid AI response format')
    })

    it('rejects confidence below 0', async () => {
      mockCreate.mockResolvedValue(mockAnthropicResponse(validInvoiceJson({ confidence: -0.1 })))
      await expect(parseInvoiceWithAI('text')).rejects.toThrow('Invalid AI response format')
    })

    it('accepts confidence of exactly 0', async () => {
      mockCreate.mockResolvedValue(mockAnthropicResponse(validInvoiceJson({ confidence: 0 })))
      const result = await parseInvoiceWithAI('text')
      expect(result.confidence).toBe(0)
    })

    it('accepts confidence of exactly 1', async () => {
      mockCreate.mockResolvedValue(mockAnthropicResponse(validInvoiceJson({ confidence: 1 })))
      const result = await parseInvoiceWithAI('text')
      expect(result.confidence).toBe(1)
    })
  })

  // ----- Required fields -----
  describe('required fields', () => {
    it('rejects empty clientName', async () => {
      mockCreate.mockResolvedValue(mockAnthropicResponse(validInvoiceJson({ clientName: '' })))
      await expect(parseInvoiceWithAI('text')).rejects.toThrow('Invalid AI response format')
    })

    it('rejects missing invoiceNumber (as non-integer)', async () => {
      const json = validInvoiceJson()
      const parsed = JSON.parse(json)
      delete parsed.invoiceNumber
      mockCreate.mockResolvedValue(mockAnthropicResponse(JSON.stringify(parsed)))
      await expect(parseInvoiceWithAI('text')).rejects.toThrow('Invalid AI response format')
    })
  })

  // ----- Error handling -----
  describe('error handling', () => {
    it('throws on empty response from Claude', async () => {
      mockCreate.mockResolvedValue({
        content: [],
        usage: { input_tokens: 10, output_tokens: 0 },
      })

      await expect(parseInvoiceWithAI('text')).rejects.toThrow('No response from Claude')
    })

    it('throws on non-text response block', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'tool_use', id: 'x', name: 'y', input: {} }],
        usage: { input_tokens: 10, output_tokens: 0 },
      })

      await expect(parseInvoiceWithAI('text')).rejects.toThrow('No response from Claude')
    })

    it('throws on invalid JSON from Claude', async () => {
      mockCreate.mockResolvedValue(mockAnthropicResponse('this is not valid json at all'))

      await expect(parseInvoiceWithAI('text')).rejects.toThrow('Failed to parse invoice with Claude')
    })

    it('throws wrapped error when API call fails', async () => {
      mockCreate.mockRejectedValue(new Error('API rate limited'))

      await expect(parseInvoiceWithAI('text')).rejects.toThrow('Failed to parse invoice with Claude: API rate limited')
    })
  })
})

// ===========================================================================
// matchClient (from client-matcher.ts)
// ===========================================================================
describe('matchClient', () => {
  const clients = [
    { id: '1', name: 'Stockholms Konserthusstiftelse' },
    { id: '2', name: 'Göteborgs Symfoniker AB' },
    { id: '3', name: 'Malmö Opera' },
    { id: '4', name: 'Kungliga Filharmonikerna' },
    { id: '5', name: 'Helsingborgs Symfoniorkester' },
  ]

  // ----- Exact match -----
  describe('exact match', () => {
    it('matches exact client name', () => {
      const result = matchClient('Malmö Opera', clients)
      expect(result).not.toBeNull()
      expect(result!.id).toBe('3')
      expect(result!.name).toBe('Malmö Opera')
    })

    it('matches case-insensitively', () => {
      const result = matchClient('malmö opera', clients)
      expect(result).not.toBeNull()
      expect(result!.id).toBe('3')
    })

    it('matches with extra whitespace', () => {
      const result = matchClient('  Malmö Opera  ', clients)
      expect(result).not.toBeNull()
      expect(result!.id).toBe('3')
    })
  })

  // ----- Company suffix normalization -----
  describe('company suffix normalization', () => {
    it('matches when AB suffix is missing from input', () => {
      const result = matchClient('Göteborgs Symfoniker', clients)
      expect(result).not.toBeNull()
      expect(result!.id).toBe('2')
    })

    it('matches when input has AB but stored name does not', () => {
      const clientsNoSuffix = [{ id: '10', name: 'Göteborgs Symfoniker' }]
      const result = matchClient('Göteborgs Symfoniker AB', clientsNoSuffix)
      expect(result).not.toBeNull()
      expect(result!.id).toBe('10')
    })

    it('matches when input has HB suffix', () => {
      const clientsWithHB = [{ id: '20', name: 'Musikgruppen' }]
      const result = matchClient('Musikgruppen HB', clientsWithHB)
      expect(result).not.toBeNull()
      expect(result!.id).toBe('20')
    })

    it('matches when input has KB suffix', () => {
      const clientsWithKB = [{ id: '21', name: 'Konsertbolaget' }]
      const result = matchClient('Konsertbolaget KB', clientsWithKB)
      expect(result).not.toBeNull()
      expect(result!.id).toBe('21')
    })

    it('matches when input has Aktiebolag suffix', () => {
      const clientsAktiebolag = [{ id: '22', name: 'Göteborgs Symfoniker' }]
      const result = matchClient('Göteborgs Symfoniker Aktiebolag', clientsAktiebolag)
      expect(result).not.toBeNull()
      expect(result!.id).toBe('22')
    })
  })

  // ----- Fuzzy matching -----
  describe('fuzzy matching', () => {
    it('matches with a small typo', () => {
      const result = matchClient('Malmö Oepra', clients)
      // "Malmö Oepra" vs "Malmö Opera" — distance 2, length 11
      // maxAllowed = ceil(11 * 0.3) = 4
      expect(result).not.toBeNull()
      expect(result!.id).toBe('3')
    })

    it('matches with a missing character', () => {
      const result = matchClient('Malmö Oper', clients)
      // Distance 1, length 10, maxAllowed = 3
      expect(result).not.toBeNull()
      expect(result!.id).toBe('3')
    })

    it('matches with an extra character', () => {
      const result = matchClient('Malmö Operaa', clients)
      // Distance 1 from "malmö opera" (after normalization), length 12, maxAllowed = 4
      expect(result).not.toBeNull()
      expect(result!.id).toBe('3')
    })

    it('picks the closest match among multiple options', () => {
      const similarClients = [
        { id: 'a', name: 'Solna Kyrka' },
        { id: 'b', name: 'Solna Kyrkan' },
        { id: 'c', name: 'Sollentuna Kyrka' },
      ]
      const result = matchClient('Solna Kyrka', similarClients)
      expect(result).not.toBeNull()
      expect(result!.id).toBe('a')
    })
  })

  // ----- No match -----
  describe('no match', () => {
    it('returns null for completely different name', () => {
      const result = matchClient('IKEA Sverige', clients)
      expect(result).toBeNull()
    })

    it('returns null when distance exceeds 30% threshold', () => {
      // "ABC" vs long names — distance will be huge relative to length
      const result = matchClient('ABC', clients)
      expect(result).toBeNull()
    })

    it('returns null for a very short input against long names', () => {
      const result = matchClient('X', clients)
      expect(result).toBeNull()
    })
  })

  // ----- Edge cases -----
  describe('edge cases', () => {
    it('returns null for empty client name', () => {
      const result = matchClient('', clients)
      expect(result).toBeNull()
    })

    it('returns null for empty client list', () => {
      const result = matchClient('Malmö Opera', [])
      expect(result).toBeNull()
    })

    it('returns null for both empty', () => {
      const result = matchClient('', [])
      expect(result).toBeNull()
    })

    it('handles single-client list', () => {
      const result = matchClient('Malmö Opera', [{ id: '99', name: 'Malmö Opera' }])
      expect(result).not.toBeNull()
      expect(result!.id).toBe('99')
    })

    it('handles client names with multiple internal spaces', () => {
      const result = matchClient('Malmö   Opera', clients)
      // normalizeString collapses whitespace
      expect(result).not.toBeNull()
      expect(result!.id).toBe('3')
    })

    it('handles whitespace-only input as empty', () => {
      const result = matchClient('   ', clients)
      // After normalization "   " becomes "", which is falsy
      // The guard `if (!clientName ...)` checks the original string
      // "   " is truthy, so it proceeds. normalizedInput = ""
      // distance("", normalized) will be large -> no match within 30%
      // Actually ceil(0 * 0.3) = 0, so only distance 0 (exact empty match) would work
      // None of the clients normalize to "", so no match
      expect(result).toBeNull()
    })
  })

  // ----- Threshold behavior -----
  describe('30% distance threshold', () => {
    it('accepts a match at exactly the threshold boundary', () => {
      // "abcdefghij" (length 10) -> maxAllowed = ceil(10 * 0.3) = 3
      // "abcdefgxyz" has distance 3 from "abcdefghij"
      const clientList = [{ id: 'x', name: 'abcdefghij' }]
      const result = matchClient('abcdefgxyz', clientList)
      expect(result).not.toBeNull()
      expect(result!.id).toBe('x')
    })

    it('rejects a match just beyond the threshold', () => {
      // "abcdefghij" (length 10) -> maxAllowed = ceil(10 * 0.3) = 3
      // "abcdefwxyz" has distance 4 from "abcdefghij"
      const clientList = [{ id: 'x', name: 'abcdefghij' }]
      const result = matchClient('abcdefwxyz', clientList)
      expect(result).toBeNull()
    })
  })
})
