import { describe, it, expect } from 'vitest'
import {
  isSimilarSupplier,
  findDuplicateExpense,
  findDuplicateExpenses,
  DuplicateExpense,
} from '@/lib/expenses/duplicate-checker'

// ---------------------------------------------------------------------------
// Helper to build a DuplicateExpense with sensible defaults
// ---------------------------------------------------------------------------
function makeExpense(overrides: Partial<DuplicateExpense> = {}): DuplicateExpense {
  return {
    id: overrides.id ?? 'exp-1',
    date: overrides.date ?? '2025-06-15',
    supplier: overrides.supplier ?? 'Spotify AB',
    amount: overrides.amount ?? 99.0,
    category: overrides.category ?? null,
  }
}

// ===========================================================================
// isSimilarSupplier
// ===========================================================================
describe('isSimilarSupplier', () => {
  // ----- Exact match -----
  describe('exact match', () => {
    it('matches identical strings', () => {
      const result = isSimilarSupplier('Spotify', 'Spotify')
      expect(result).toEqual({ isSimilar: true, matchType: 'exact' })
    })

    it('matches case-insensitively', () => {
      const result = isSimilarSupplier('SPOTIFY', 'spotify')
      expect(result).toEqual({ isSimilar: true, matchType: 'exact' })
    })

    it('matches after trimming whitespace', () => {
      const result = isSimilarSupplier('  Spotify  ', 'Spotify')
      expect(result).toEqual({ isSimilar: true, matchType: 'exact' })
    })

    it('matches mixed case with whitespace', () => {
      const result = isSimilarSupplier('  sPOTIFY ', ' Spotify  ')
      expect(result).toEqual({ isSimilar: true, matchType: 'exact' })
    })
  })

  // ----- Company suffix removal -----
  describe('company suffix removal', () => {
    it('removes AB suffix', () => {
      const result = isSimilarSupplier('Spotify AB', 'Spotify')
      expect(result).toEqual({ isSimilar: true, matchType: 'exact' })
    })

    it('removes HB suffix', () => {
      const result = isSimilarSupplier('Musikgruppen HB', 'Musikgruppen')
      expect(result).toEqual({ isSimilar: true, matchType: 'exact' })
    })

    it('removes KB suffix', () => {
      const result = isSimilarSupplier('Konsertbolaget KB', 'Konsertbolaget')
      expect(result).toEqual({ isSimilar: true, matchType: 'exact' })
    })

    it('removes Inc suffix', () => {
      const result = isSimilarSupplier('Apple Inc', 'Apple')
      expect(result).toEqual({ isSimilar: true, matchType: 'exact' })
    })

    it('removes Inc. suffix (with period)', () => {
      const result = isSimilarSupplier('Apple Inc.', 'Apple')
      expect(result).toEqual({ isSimilar: true, matchType: 'exact' })
    })

    it('removes LLC suffix', () => {
      const result = isSimilarSupplier('Acme LLC', 'Acme')
      expect(result).toEqual({ isSimilar: true, matchType: 'exact' })
    })

    it('removes Ltd suffix', () => {
      const result = isSimilarSupplier('Barclays Ltd', 'Barclays')
      expect(result).toEqual({ isSimilar: true, matchType: 'exact' })
    })

    it('removes GmbH suffix', () => {
      const result = isSimilarSupplier('Siemens GmbH', 'Siemens')
      expect(result).toEqual({ isSimilar: true, matchType: 'exact' })
    })

    it('removes AS suffix', () => {
      const result = isSimilarSupplier('Equinor AS', 'Equinor')
      expect(result).toEqual({ isSimilar: true, matchType: 'exact' })
    })

    it('removes Oy suffix', () => {
      const result = isSimilarSupplier('Nokia Oy', 'Nokia')
      expect(result).toEqual({ isSimilar: true, matchType: 'exact' })
    })

    it('removes A/S suffix', () => {
      const result = isSimilarSupplier('Maersk A/S', 'Maersk')
      expect(result).toEqual({ isSimilar: true, matchType: 'exact' })
    })

    it('removes PBC suffix', () => {
      const result = isSimilarSupplier('Patagonia, PBC', 'Patagonia')
      expect(result).toEqual({ isSimilar: true, matchType: 'exact' })
    })

    it('removes suffix with preceding comma', () => {
      const result = isSimilarSupplier('Patagonia, Inc.', 'Patagonia')
      expect(result).toEqual({ isSimilar: true, matchType: 'exact' })
    })

    it('matches two suppliers that both have different suffixes', () => {
      const result = isSimilarSupplier('Spotify AB', 'Spotify Inc')
      expect(result).toEqual({ isSimilar: true, matchType: 'exact' })
    })
  })

  // ----- Contains match -----
  describe('contains match', () => {
    it('detects when first string contains second', () => {
      const result = isSimilarSupplier('Spotify Premium', 'Spotify')
      expect(result).toEqual({ isSimilar: true, matchType: 'contains' })
    })

    it('detects when second string contains first', () => {
      const result = isSimilarSupplier('Spotify', 'Spotify Premium')
      expect(result).toEqual({ isSimilar: true, matchType: 'contains' })
    })

    it('contains match is case-insensitive', () => {
      const result = isSimilarSupplier('SPOTIFY PREMIUM', 'spotify')
      expect(result).toEqual({ isSimilar: true, matchType: 'contains' })
    })
  })

  // ----- Fuzzy match -----
  describe('fuzzy match', () => {
    it('matches with a small typo', () => {
      const result = isSimilarSupplier('Spotfy', 'Spotify')
      expect(result.isSimilar).toBe(true)
      expect(result.matchType).toBe('fuzzy')
    })

    it('matches with a character swap', () => {
      // "Spotfiy" is one transposition away from "Spotify"
      const result = isSimilarSupplier('Spotfiy', 'Spotify')
      expect(result.isSimilar).toBe(true)
      expect(result.matchType).toBe('fuzzy')
    })

    it('matches with default threshold of 0.7', () => {
      // "Konserthuset" vs "Konserhuset" (missing 't') — high similarity
      const result = isSimilarSupplier('Konserthuset', 'Konserhuset')
      expect(result.isSimilar).toBe(true)
      expect(result.matchType).toBe('fuzzy')
    })
  })

  // ----- No match -----
  describe('no match', () => {
    it('returns no match for completely different suppliers', () => {
      const result = isSimilarSupplier('Spotify', 'Amazon')
      expect(result).toEqual({ isSimilar: false, matchType: null })
    })

    it('returns no match for short but different strings', () => {
      const result = isSimilarSupplier('ICA', 'SAS')
      expect(result).toEqual({ isSimilar: false, matchType: null })
    })

    it('returns no match when similarity is below threshold', () => {
      const result = isSimilarSupplier('Musikhuset', 'Datahuset')
      // These differ significantly
      expect(result.isSimilar).toBe(false)
      expect(result.matchType).toBeNull()
    })
  })

  // ----- Custom threshold -----
  describe('custom threshold', () => {
    it('stricter threshold rejects borderline matches', () => {
      // With high threshold, small differences may be rejected
      const result = isSimilarSupplier('Spotfy', 'Spotify', 0.99)
      expect(result.isSimilar).toBe(false)
      expect(result.matchType).toBeNull()
    })

    it('looser threshold accepts more distant matches', () => {
      const result = isSimilarSupplier('Spotif', 'Spotify', 0.5)
      expect(result.isSimilar).toBe(true)
    })

    it('threshold of 0 matches anything via fuzzy', () => {
      // Exact/contains may still trigger first, but nothing should be rejected
      const result = isSimilarSupplier('AAAA', 'ZZZZ', 0)
      expect(result.isSimilar).toBe(true)
      expect(result.matchType).toBe('fuzzy')
    })

    it('threshold of 1.0 requires perfect similarity for fuzzy', () => {
      // Only exact or contains should pass — fuzzy at 1.0 would need identical normalized strings
      const result = isSimilarSupplier('Spotfy', 'Spotify', 1.0)
      // Not exact, not contains, fuzzy similarity < 1.0
      expect(result.isSimilar).toBe(false)
      expect(result.matchType).toBeNull()
    })
  })

  // ----- Edge cases -----
  describe('edge cases', () => {
    it('handles two empty strings as exact match', () => {
      const result = isSimilarSupplier('', '')
      expect(result).toEqual({ isSimilar: true, matchType: 'exact' })
    })

    it('handles one empty string - contains match since empty is contained in anything', () => {
      const result = isSimilarSupplier('Spotify', '')
      // After normalization both lowercased/trimmed:
      // normalizedA = "spotify", normalizedB = ""
      // "" is not equal to "spotify" -> not exact
      // "spotify".includes("") -> true in JS -> contains
      expect(result).toEqual({ isSimilar: true, matchType: 'contains' })
    })

    it('handles very short strings (single character)', () => {
      const result = isSimilarSupplier('A', 'B')
      // distance("a","b") = 1, maxLen = 1, similarity = 0
      expect(result.isSimilar).toBe(false)
      expect(result.matchType).toBeNull()
    })

    it('handles strings that are only whitespace', () => {
      const result = isSimilarSupplier('   ', '   ')
      expect(result).toEqual({ isSimilar: true, matchType: 'exact' })
    })

    it('handles supplier name that is just a suffix', () => {
      // "AB" after normalization becomes "" (suffix removed)
      const result = isSimilarSupplier('AB', 'Inc')
      // Both normalize to "" -> exact match
      expect(result).toEqual({ isSimilar: true, matchType: 'exact' })
    })
  })
})

// ===========================================================================
// findDuplicateExpense
// ===========================================================================
describe('findDuplicateExpense', () => {
  const existing: DuplicateExpense[] = [
    makeExpense({ id: 'exp-1', date: '2025-06-15', supplier: 'Spotify AB', amount: 99.0 }),
    makeExpense({ id: 'exp-2', date: '2025-06-15', supplier: 'Apple Inc', amount: 149.0 }),
    makeExpense({ id: 'exp-3', date: '2025-07-01', supplier: 'Spotify AB', amount: 99.0 }),
    makeExpense({ id: 'exp-4', date: '2025-06-15', supplier: 'ICA Maxi', amount: 250.5 }),
  ]

  // ----- Duplicate found -----
  describe('duplicate found', () => {
    it('finds duplicate with same date, amount, and exact supplier', () => {
      const result = findDuplicateExpense({ date: '2025-06-15', supplier: 'Spotify AB', amount: 99.0 }, existing)
      expect(result.isDuplicate).toBe(true)
      expect(result.existingExpense).not.toBeNull()
      expect(result.existingExpense!.id).toBe('exp-1')
      expect(result.matchType).toBe('exact')
    })

    it('finds duplicate with supplier suffix difference', () => {
      const result = findDuplicateExpense({ date: '2025-06-15', supplier: 'Spotify', amount: 99.0 }, existing)
      expect(result.isDuplicate).toBe(true)
      expect(result.existingExpense!.id).toBe('exp-1')
      expect(result.matchType).toBe('exact')
    })

    it('finds duplicate with fuzzy supplier match', () => {
      const result = findDuplicateExpense({ date: '2025-06-15', supplier: 'Spotfy', amount: 99.0 }, existing)
      expect(result.isDuplicate).toBe(true)
      expect(result.existingExpense!.id).toBe('exp-1')
      expect(result.matchType).toBe('fuzzy')
    })

    it('finds duplicate with amount within 0.01 tolerance', () => {
      const result = findDuplicateExpense({ date: '2025-06-15', supplier: 'Spotify AB', amount: 99.005 }, existing)
      expect(result.isDuplicate).toBe(true)
      expect(result.existingExpense!.id).toBe('exp-1')
    })

    it('finds duplicate with amount at exact 0.01 boundary (exclusive)', () => {
      // Math.abs(99.01 - 99.0) = 0.01, which is NOT < 0.01
      const result = findDuplicateExpense({ date: '2025-06-15', supplier: 'Spotify AB', amount: 99.01 }, existing)
      expect(result.isDuplicate).toBe(false)
    })

    it('finds duplicate with case-insensitive supplier', () => {
      const result = findDuplicateExpense({ date: '2025-06-15', supplier: 'apple inc', amount: 149.0 }, existing)
      expect(result.isDuplicate).toBe(true)
      expect(result.existingExpense!.id).toBe('exp-2')
      expect(result.matchType).toBe('exact')
    })
  })

  // ----- No duplicate — different date -----
  describe('no duplicate (different date)', () => {
    it('does not match when date differs', () => {
      const result = findDuplicateExpense({ date: '2025-06-16', supplier: 'Spotify AB', amount: 99.0 }, existing)
      expect(result.isDuplicate).toBe(false)
      expect(result.existingExpense).toBeNull()
      expect(result.matchType).toBeUndefined()
    })
  })

  // ----- No duplicate — different amount -----
  describe('no duplicate (different amount)', () => {
    it('does not match when amount differs significantly', () => {
      const result = findDuplicateExpense({ date: '2025-06-15', supplier: 'Spotify AB', amount: 199.0 }, existing)
      expect(result.isDuplicate).toBe(false)
      expect(result.existingExpense).toBeNull()
    })

    it('does not match when amount differs by more than tolerance', () => {
      const result = findDuplicateExpense({ date: '2025-06-15', supplier: 'Spotify AB', amount: 99.02 }, existing)
      expect(result.isDuplicate).toBe(false)
    })
  })

  // ----- No duplicate — different supplier -----
  describe('no duplicate (different supplier)', () => {
    it('does not match when supplier is completely different', () => {
      const result = findDuplicateExpense({ date: '2025-06-15', supplier: 'Netflix', amount: 99.0 }, existing)
      expect(result.isDuplicate).toBe(false)
      expect(result.existingExpense).toBeNull()
    })
  })

  // ----- Empty existing list -----
  describe('empty existing expenses', () => {
    it('returns no duplicate when existing list is empty', () => {
      const result = findDuplicateExpense({ date: '2025-06-15', supplier: 'Spotify AB', amount: 99.0 }, [])
      expect(result.isDuplicate).toBe(false)
      expect(result.existingExpense).toBeNull()
    })
  })

  // ----- Returns first matching duplicate -----
  describe('multiple potential matches', () => {
    it('returns the first matching duplicate found', () => {
      const duplicates: DuplicateExpense[] = [
        makeExpense({ id: 'dup-1', date: '2025-06-15', supplier: 'Spotify AB', amount: 99.0 }),
        makeExpense({ id: 'dup-2', date: '2025-06-15', supplier: 'Spotify Inc', amount: 99.0 }),
      ]
      const result = findDuplicateExpense({ date: '2025-06-15', supplier: 'Spotify', amount: 99.0 }, duplicates)
      expect(result.isDuplicate).toBe(true)
      expect(result.existingExpense!.id).toBe('dup-1')
    })
  })
})

// ===========================================================================
// findDuplicateExpenses (batch)
// ===========================================================================
describe('findDuplicateExpenses', () => {
  const existing: DuplicateExpense[] = [
    makeExpense({ id: 'exp-1', date: '2025-06-15', supplier: 'Spotify AB', amount: 99.0 }),
    makeExpense({ id: 'exp-2', date: '2025-06-15', supplier: 'Apple Inc', amount: 149.0 }),
  ]

  it('returns results for each expense with correct index', () => {
    const expenses = [
      { date: '2025-06-15', supplier: 'Spotify', amount: 99.0 }, // duplicate
      { date: '2025-06-15', supplier: 'Netflix', amount: 99.0 }, // not duplicate
      { date: '2025-06-15', supplier: 'Apple', amount: 149.0 }, // duplicate
    ]

    const results = findDuplicateExpenses(expenses, existing)

    expect(results).toHaveLength(3)

    // First expense — duplicate of Spotify AB
    expect(results[0].index).toBe(0)
    expect(results[0].isDuplicate).toBe(true)
    expect(results[0].existingExpense!.id).toBe('exp-1')

    // Second expense — no duplicate
    expect(results[1].index).toBe(1)
    expect(results[1].isDuplicate).toBe(false)
    expect(results[1].existingExpense).toBeNull()

    // Third expense — duplicate of Apple Inc
    expect(results[2].index).toBe(2)
    expect(results[2].isDuplicate).toBe(true)
    expect(results[2].existingExpense!.id).toBe('exp-2')
  })

  it('returns empty array when given empty expenses array', () => {
    const results = findDuplicateExpenses([], existing)
    expect(results).toEqual([])
  })

  it('returns all non-duplicates when existing expenses is empty', () => {
    const expenses = [
      { date: '2025-06-15', supplier: 'Spotify', amount: 99.0 },
      { date: '2025-06-15', supplier: 'Apple', amount: 149.0 },
    ]

    const results = findDuplicateExpenses(expenses, [])

    expect(results).toHaveLength(2)
    expect(results[0].isDuplicate).toBe(false)
    expect(results[1].isDuplicate).toBe(false)
  })

  it('returns empty array when both arrays are empty', () => {
    const results = findDuplicateExpenses([], [])
    expect(results).toEqual([])
  })

  it('handles single expense in batch', () => {
    const expenses = [{ date: '2025-06-15', supplier: 'Spotify AB', amount: 99.0 }]

    const results = findDuplicateExpenses(expenses, existing)

    expect(results).toHaveLength(1)
    expect(results[0].index).toBe(0)
    expect(results[0].isDuplicate).toBe(true)
  })

  it('preserves matchType in batch results', () => {
    const expenses = [
      { date: '2025-06-15', supplier: 'Spotify AB', amount: 99.0 }, // exact
      { date: '2025-06-15', supplier: 'Spotfy', amount: 99.0 }, // fuzzy
    ]

    const results = findDuplicateExpenses(expenses, existing)

    expect(results[0].matchType).toBe('exact')
    expect(results[1].matchType).toBe('fuzzy')
  })
})
