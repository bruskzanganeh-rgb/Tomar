import { describe, it, expect } from 'vitest'
import {
  EU_COUNTRIES,
  REVERSE_CHARGE_COUNTRIES,
  COUNTRY_CONFIGS,
  getCountryConfig,
  isEuCountry,
  shouldReverseCharge,
  getCountryOptions,
  type CountryConfig,
} from '@/lib/country-config'

// ---------------------------------------------------------------------------
// 1. getCountryConfig
// ---------------------------------------------------------------------------
describe('getCountryConfig', () => {
  it('returns config for a known country code', () => {
    const config = getCountryConfig('SE')
    expect(config.currency).toBe('SEK')
    expect(config.name.en).toBe('Sweden')
    expect(config.flag).toBe('🇸🇪')
  })

  it('returns config for another known country (DE)', () => {
    const config = getCountryConfig('DE')
    expect(config.currency).toBe('EUR')
    expect(config.name.en).toBe('Germany')
  })

  it('falls back to SE config for unknown country code', () => {
    const fallback = getCountryConfig('XX')
    const se = getCountryConfig('SE')
    expect(fallback).toEqual(se)
  })

  it('falls back to SE config for empty string', () => {
    const fallback = getCountryConfig('')
    const se = getCountryConfig('SE')
    expect(fallback).toEqual(se)
  })

  it('is case-sensitive — lowercase "se" falls back to SE', () => {
    const fallback = getCountryConfig('se')
    const se = getCountryConfig('SE')
    expect(fallback).toEqual(se)
  })
})

// ---------------------------------------------------------------------------
// 2. isEuCountry
// ---------------------------------------------------------------------------
describe('isEuCountry', () => {
  it.each(['SE', 'NO', 'DK', 'FI', 'DE', 'AT', 'FR', 'NL', 'BE', 'ES', 'IT', 'PL', 'CZ', 'IE', 'PT'])(
    'returns true for EU_COUNTRIES member %s',
    (code) => {
      expect(isEuCountry(code)).toBe(true)
    },
  )

  it('returns true for NO (included in EU_COUNTRIES array)', () => {
    expect(isEuCountry('NO')).toBe(true)
  })

  it.each(['US', 'CH', 'GB'])('returns false for non-EU country %s', (code) => {
    expect(isEuCountry(code)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isEuCountry('')).toBe(false)
  })

  it('returns false for unknown country code', () => {
    expect(isEuCountry('XX')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 3. shouldReverseCharge
// ---------------------------------------------------------------------------
describe('shouldReverseCharge', () => {
  it('returns false when userCountry and clientCountry are the same', () => {
    expect(shouldReverseCharge('SE', 'SE')).toBe(false)
    expect(shouldReverseCharge('DE', 'DE')).toBe(false)
    expect(shouldReverseCharge('NO', 'NO')).toBe(false)
  })

  it('returns true for EU-to-EU cross-border (SE -> DE)', () => {
    expect(shouldReverseCharge('SE', 'DE')).toBe(true)
  })

  it('returns true for EU-to-EU cross-border (DE -> FR)', () => {
    expect(shouldReverseCharge('DE', 'FR')).toBe(true)
  })

  it('returns true for EU-to-NO (EEA reverse charge)', () => {
    expect(shouldReverseCharge('SE', 'NO')).toBe(true)
  })

  it('returns true for NO-to-EU (EEA reverse charge)', () => {
    expect(shouldReverseCharge('NO', 'SE')).toBe(true)
  })

  it('returns false when non-EU user sells to EU client', () => {
    expect(shouldReverseCharge('US', 'SE')).toBe(false)
    expect(shouldReverseCharge('CH', 'DE')).toBe(false)
    expect(shouldReverseCharge('GB', 'FR')).toBe(false)
  })

  it('returns false when EU user sells to non-EU client', () => {
    expect(shouldReverseCharge('SE', 'US')).toBe(false)
    expect(shouldReverseCharge('DE', 'GB')).toBe(false)
    expect(shouldReverseCharge('FR', 'CH')).toBe(false)
  })

  it('returns false when both countries are non-EU', () => {
    expect(shouldReverseCharge('US', 'GB')).toBe(false)
    expect(shouldReverseCharge('CH', 'US')).toBe(false)
  })

  it('returns false when clientCountry is empty', () => {
    expect(shouldReverseCharge('SE', '')).toBe(false)
  })

  it('returns false when clientCountry is undefined-like empty string', () => {
    expect(shouldReverseCharge('DE', '')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 4. getCountryOptions
// ---------------------------------------------------------------------------
describe('getCountryOptions', () => {
  it('returns an array of options with value and label', () => {
    const options = getCountryOptions('en')
    expect(options.length).toBeGreaterThan(0)
    for (const opt of options) {
      expect(opt).toHaveProperty('value')
      expect(opt).toHaveProperty('label')
      expect(typeof opt.value).toBe('string')
      expect(typeof opt.label).toBe('string')
    }
  })

  it('returns one entry per country in COUNTRY_CONFIGS', () => {
    const options = getCountryOptions('en')
    const configKeys = Object.keys(COUNTRY_CONFIGS)
    expect(options.length).toBe(configKeys.length)
  })

  it('uses English names when locale is "en"', () => {
    const options = getCountryOptions('en')
    const sweden = options.find((o) => o.value === 'SE')
    expect(sweden).toBeDefined()
    expect(sweden!.label).toContain('Sweden')
  })

  it('uses Swedish names when locale is "sv"', () => {
    const options = getCountryOptions('sv')
    const sweden = options.find((o) => o.value === 'SE')
    expect(sweden).toBeDefined()
    expect(sweden!.label).toContain('Sverige')
  })

  it('includes the flag emoji in the label', () => {
    const options = getCountryOptions('en')
    const se = options.find((o) => o.value === 'SE')
    expect(se!.label).toContain('🇸🇪')
  })

  it('returns options sorted alphabetically by label', () => {
    const options = getCountryOptions('en')
    const labels = options.map((o) => o.label)
    const sorted = [...labels].sort((a, b) => a.localeCompare(b, 'en'))
    expect(labels).toEqual(sorted)
  })

  it('returns options sorted alphabetically by Swedish label when locale is sv', () => {
    const options = getCountryOptions('sv')
    const labels = options.map((o) => o.label)
    const sorted = [...labels].sort((a, b) => a.localeCompare(b, 'sv'))
    expect(labels).toEqual(sorted)
  })
})

// ---------------------------------------------------------------------------
// 5. COUNTRY_CONFIGS — structural integrity
// ---------------------------------------------------------------------------
describe('COUNTRY_CONFIGS', () => {
  const requiredFields: (keyof CountryConfig)[] = [
    'flag',
    'name',
    'currency',
    'orgLabel',
    'orgPlaceholder',
    'vatPrefix',
    'bankLabel',
    'bankPlaceholder',
    'hasVat',
    'defaultVatRates',
  ]

  it.each(Object.keys(COUNTRY_CONFIGS))('%s has all required fields', (code) => {
    const config = COUNTRY_CONFIGS[code]
    for (const field of requiredFields) {
      expect(config).toHaveProperty(field)
    }
  })

  it.each(Object.keys(COUNTRY_CONFIGS))('%s has sv and en name strings', (code) => {
    const config = COUNTRY_CONFIGS[code]
    expect(typeof config.name.sv).toBe('string')
    expect(typeof config.name.en).toBe('string')
    expect(config.name.sv.length).toBeGreaterThan(0)
    expect(config.name.en.length).toBeGreaterThan(0)
  })

  it.each(Object.keys(COUNTRY_CONFIGS))('%s has sv and en orgLabel strings', (code) => {
    const config = COUNTRY_CONFIGS[code]
    expect(typeof config.orgLabel.sv).toBe('string')
    expect(typeof config.orgLabel.en).toBe('string')
  })

  it.each(Object.keys(COUNTRY_CONFIGS))('%s has sv and en bankLabel strings', (code) => {
    const config = COUNTRY_CONFIGS[code]
    expect(typeof config.bankLabel.sv).toBe('string')
    expect(typeof config.bankLabel.en).toBe('string')
  })

  it.each(Object.keys(COUNTRY_CONFIGS))('%s has defaultVatRates with all four categories', (code) => {
    const rates = COUNTRY_CONFIGS[code].defaultVatRates
    expect(rates).toHaveProperty('concert')
    expect(rates).toHaveProperty('recording')
    expect(rates).toHaveProperty('teaching')
    expect(rates).toHaveProperty('expenses')
    expect(typeof rates.concert).toBe('number')
    expect(typeof rates.recording).toBe('number')
    expect(typeof rates.teaching).toBe('number')
    expect(typeof rates.expenses).toBe('number')
  })

  it.each(Object.keys(COUNTRY_CONFIGS))('%s has non-negative VAT rates', (code) => {
    const rates = COUNTRY_CONFIGS[code].defaultVatRates
    expect(rates.concert).toBeGreaterThanOrEqual(0)
    expect(rates.recording).toBeGreaterThanOrEqual(0)
    expect(rates.teaching).toBeGreaterThanOrEqual(0)
    expect(rates.expenses).toBeGreaterThanOrEqual(0)
  })

  it.each(Object.keys(COUNTRY_CONFIGS))('%s has a non-empty flag string', (code) => {
    expect(COUNTRY_CONFIGS[code].flag.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 6. Data integrity — specific country checks
// ---------------------------------------------------------------------------
describe('Data integrity checks', () => {
  it('SE uses SEK currency', () => {
    expect(COUNTRY_CONFIGS['SE'].currency).toBe('SEK')
  })

  it('SE has hasVat = true', () => {
    expect(COUNTRY_CONFIGS['SE'].hasVat).toBe(true)
  })

  it('SE concert VAT rate is 0', () => {
    expect(COUNTRY_CONFIGS['SE'].defaultVatRates.concert).toBe(0)
  })

  it('DE uses EUR currency', () => {
    expect(COUNTRY_CONFIGS['DE'].currency).toBe('EUR')
  })

  it('DE has hasVat = true', () => {
    expect(COUNTRY_CONFIGS['DE'].hasVat).toBe(true)
  })

  it('US uses USD currency', () => {
    expect(COUNTRY_CONFIGS['US'].currency).toBe('USD')
  })

  it('US has hasVat = false', () => {
    expect(COUNTRY_CONFIGS['US'].hasVat).toBe(false)
  })

  it('US has all VAT rates at 0', () => {
    const rates = COUNTRY_CONFIGS['US'].defaultVatRates
    expect(rates.concert).toBe(0)
    expect(rates.recording).toBe(0)
    expect(rates.teaching).toBe(0)
    expect(rates.expenses).toBe(0)
  })

  it('NO uses NOK currency', () => {
    expect(COUNTRY_CONFIGS['NO'].currency).toBe('NOK')
  })

  it('GB uses GBP currency', () => {
    expect(COUNTRY_CONFIGS['GB'].currency).toBe('GBP')
  })

  it('CH uses CHF currency', () => {
    expect(COUNTRY_CONFIGS['CH'].currency).toBe('CHF')
  })

  it('FI uses EUR currency', () => {
    expect(COUNTRY_CONFIGS['FI'].currency).toBe('EUR')
  })

  it('PL uses PLN currency', () => {
    expect(COUNTRY_CONFIGS['PL'].currency).toBe('PLN')
  })

  it('CZ uses CZK currency', () => {
    expect(COUNTRY_CONFIGS['CZ'].currency).toBe('CZK')
  })

  it('DK uses DKK currency', () => {
    expect(COUNTRY_CONFIGS['DK'].currency).toBe('DKK')
  })
})

// ---------------------------------------------------------------------------
// 7. EU_COUNTRIES and REVERSE_CHARGE_COUNTRIES arrays
// ---------------------------------------------------------------------------
describe('EU_COUNTRIES', () => {
  it('contains 15 entries', () => {
    expect(EU_COUNTRIES.length).toBe(15)
  })

  it('includes all expected Nordic countries', () => {
    expect(EU_COUNTRIES).toContain('SE')
    expect(EU_COUNTRIES).toContain('NO')
    expect(EU_COUNTRIES).toContain('DK')
    expect(EU_COUNTRIES).toContain('FI')
  })

  it('does not include non-EU countries like US, GB, CH', () => {
    expect((EU_COUNTRIES as readonly string[]).includes('US')).toBe(false)
    expect((EU_COUNTRIES as readonly string[]).includes('GB')).toBe(false)
    expect((EU_COUNTRIES as readonly string[]).includes('CH')).toBe(false)
  })
})

describe('REVERSE_CHARGE_COUNTRIES', () => {
  it('includes all EU_COUNTRIES entries', () => {
    for (const code of EU_COUNTRIES) {
      expect((REVERSE_CHARGE_COUNTRIES as readonly string[]).includes(code)).toBe(true)
    }
  })

  it('includes NO', () => {
    expect((REVERSE_CHARGE_COUNTRIES as readonly string[]).includes('NO')).toBe(true)
  })

  it('does not include non-EU/EEA countries', () => {
    expect((REVERSE_CHARGE_COUNTRIES as readonly string[]).includes('US')).toBe(false)
    expect((REVERSE_CHARGE_COUNTRIES as readonly string[]).includes('GB')).toBe(false)
    expect((REVERSE_CHARGE_COUNTRIES as readonly string[]).includes('CH')).toBe(false)
  })
})
