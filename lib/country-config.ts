export type CountryConfig = {
  flag: string
  name: { sv: string; en: string }
  currency: string
  orgLabel: { sv: string; en: string }
  orgPlaceholder: string
  vatPrefix: string
  bankLabel: { sv: string; en: string }
  bankPlaceholder: string
  hasVat: boolean
  defaultVatRates: { concert: number; recording: number; teaching: number; expenses: number }
}

export const EU_COUNTRIES = [
  'SE',
  'NO',
  'DK',
  'FI',
  'DE',
  'AT',
  'FR',
  'NL',
  'BE',
  'ES',
  'IT',
  'PL',
  'CZ',
  'IE',
  'PT',
] as const

// Norway is EEA, not EU, but reverse charge applies similarly
export const REVERSE_CHARGE_COUNTRIES = [...EU_COUNTRIES, 'NO'] as const

export const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  SE: {
    flag: '🇸🇪',
    name: { sv: 'Sverige', en: 'Sweden' },
    currency: 'SEK',
    orgLabel: { sv: 'Org.nr', en: 'Org. no.' },
    orgPlaceholder: 'XXXXXX-XXXX',
    vatPrefix: 'SE',
    bankLabel: { sv: 'Bankgiro', en: 'Bank account' },
    bankPlaceholder: 'XXXX-XXXX',
    hasVat: true,
    defaultVatRates: { concert: 0, recording: 6, teaching: 25, expenses: 0 },
  },
  NO: {
    flag: '🇳🇴',
    name: { sv: 'Norge', en: 'Norway' },
    currency: 'NOK',
    orgLabel: { sv: 'Org.nr', en: 'Org. no.' },
    orgPlaceholder: 'XXX XXX XXX',
    vatPrefix: 'NO',
    bankLabel: { sv: 'Kontonummer', en: 'Account number' },
    bankPlaceholder: 'XXXX XX XXXXX',
    hasVat: true,
    defaultVatRates: { concert: 0, recording: 25, teaching: 25, expenses: 0 },
  },
  DK: {
    flag: '🇩🇰',
    name: { sv: 'Danmark', en: 'Denmark' },
    currency: 'DKK',
    orgLabel: { sv: 'CVR-nummer', en: 'CVR number' },
    orgPlaceholder: 'XXXXXXXX',
    vatPrefix: 'DK',
    bankLabel: { sv: 'Kontonummer', en: 'Account number' },
    bankPlaceholder: 'XXXX XXXXXXXXXX',
    hasVat: true,
    defaultVatRates: { concert: 0, recording: 25, teaching: 25, expenses: 0 },
  },
  FI: {
    flag: '🇫🇮',
    name: { sv: 'Finland', en: 'Finland' },
    currency: 'EUR',
    orgLabel: { sv: 'FO-nummer', en: 'Business ID' },
    orgPlaceholder: 'XXXXXXX-X',
    vatPrefix: 'FI',
    bankLabel: { sv: 'IBAN', en: 'IBAN' },
    bankPlaceholder: 'FI00 0000 0000 0000 00',
    hasVat: true,
    defaultVatRates: { concert: 10, recording: 25.5, teaching: 25.5, expenses: 0 },
  },
  DE: {
    flag: '🇩🇪',
    name: { sv: 'Tyskland', en: 'Germany' },
    currency: 'EUR',
    orgLabel: { sv: 'Steuernummer', en: 'Tax number' },
    orgPlaceholder: 'XXX/XXXX/XXXX',
    vatPrefix: 'DE',
    bankLabel: { sv: 'IBAN', en: 'IBAN' },
    bankPlaceholder: 'DE00 0000 0000 0000 0000 00',
    hasVat: true,
    defaultVatRates: { concert: 7, recording: 19, teaching: 19, expenses: 0 },
  },
  AT: {
    flag: '🇦🇹',
    name: { sv: 'Österrike', en: 'Austria' },
    currency: 'EUR',
    orgLabel: { sv: 'UID-Nummer', en: 'UID number' },
    orgPlaceholder: 'ATU00000000',
    vatPrefix: 'AT',
    bankLabel: { sv: 'IBAN', en: 'IBAN' },
    bankPlaceholder: 'AT00 0000 0000 0000 0000',
    hasVat: true,
    defaultVatRates: { concert: 13, recording: 20, teaching: 20, expenses: 0 },
  },
  FR: {
    flag: '🇫🇷',
    name: { sv: 'Frankrike', en: 'France' },
    currency: 'EUR',
    orgLabel: { sv: 'SIRET', en: 'SIRET' },
    orgPlaceholder: 'XXX XXX XXX XXXXX',
    vatPrefix: 'FR',
    bankLabel: { sv: 'IBAN', en: 'IBAN' },
    bankPlaceholder: 'FR00 0000 0000 0000 0000 0000 000',
    hasVat: true,
    defaultVatRates: { concert: 5.5, recording: 20, teaching: 20, expenses: 0 },
  },
  NL: {
    flag: '🇳🇱',
    name: { sv: 'Nederländerna', en: 'Netherlands' },
    currency: 'EUR',
    orgLabel: { sv: 'KvK-nummer', en: 'KvK number' },
    orgPlaceholder: 'XXXXXXXX',
    vatPrefix: 'NL',
    bankLabel: { sv: 'IBAN', en: 'IBAN' },
    bankPlaceholder: 'NL00 XXXX 0000 0000 00',
    hasVat: true,
    defaultVatRates: { concert: 9, recording: 21, teaching: 21, expenses: 0 },
  },
  BE: {
    flag: '🇧🇪',
    name: { sv: 'Belgien', en: 'Belgium' },
    currency: 'EUR',
    orgLabel: { sv: 'Företagsnummer', en: 'Enterprise number' },
    orgPlaceholder: '0XXX.XXX.XXX',
    vatPrefix: 'BE',
    bankLabel: { sv: 'IBAN', en: 'IBAN' },
    bankPlaceholder: 'BE00 0000 0000 0000',
    hasVat: true,
    defaultVatRates: { concert: 6, recording: 21, teaching: 21, expenses: 0 },
  },
  GB: {
    flag: '🇬🇧',
    name: { sv: 'Storbritannien', en: 'United Kingdom' },
    currency: 'GBP',
    orgLabel: { sv: 'Company Number', en: 'Company Number' },
    orgPlaceholder: 'XXXXXXXX',
    vatPrefix: 'GB',
    bankLabel: { sv: 'Sort code & Account', en: 'Sort code & Account' },
    bankPlaceholder: 'XX-XX-XX / XXXXXXXX',
    hasVat: true,
    defaultVatRates: { concert: 20, recording: 20, teaching: 0, expenses: 0 },
  },
  US: {
    flag: '🇺🇸',
    name: { sv: 'USA', en: 'United States' },
    currency: 'USD',
    orgLabel: { sv: 'EIN', en: 'EIN' },
    orgPlaceholder: 'XX-XXXXXXX',
    vatPrefix: '',
    bankLabel: { sv: 'Routing & Account', en: 'Routing & Account' },
    bankPlaceholder: 'XXXXXXXXX / XXXXXXXXXXXX',
    hasVat: false,
    defaultVatRates: { concert: 0, recording: 0, teaching: 0, expenses: 0 },
  },
  CH: {
    flag: '🇨🇭',
    name: { sv: 'Schweiz', en: 'Switzerland' },
    currency: 'CHF',
    orgLabel: { sv: 'UID', en: 'UID' },
    orgPlaceholder: 'CHE-XXX.XXX.XXX',
    vatPrefix: 'CHE',
    bankLabel: { sv: 'IBAN', en: 'IBAN' },
    bankPlaceholder: 'CH00 0000 0000 0000 0000 0',
    hasVat: true,
    defaultVatRates: { concert: 2.6, recording: 8.1, teaching: 8.1, expenses: 0 },
  },
  ES: {
    flag: '🇪🇸',
    name: { sv: 'Spanien', en: 'Spain' },
    currency: 'EUR',
    orgLabel: { sv: 'NIF/CIF', en: 'NIF/CIF' },
    orgPlaceholder: 'X00000000X',
    vatPrefix: 'ES',
    bankLabel: { sv: 'IBAN', en: 'IBAN' },
    bankPlaceholder: 'ES00 0000 0000 0000 0000 0000',
    hasVat: true,
    defaultVatRates: { concert: 10, recording: 21, teaching: 21, expenses: 0 },
  },
  IT: {
    flag: '🇮🇹',
    name: { sv: 'Italien', en: 'Italy' },
    currency: 'EUR',
    orgLabel: { sv: 'Codice Fiscale', en: 'Fiscal code' },
    orgPlaceholder: 'XXXXXXXXXXXXXXXX',
    vatPrefix: 'IT',
    bankLabel: { sv: 'IBAN', en: 'IBAN' },
    bankPlaceholder: 'IT00 X 00000 00000 000000000000',
    hasVat: true,
    defaultVatRates: { concert: 10, recording: 22, teaching: 22, expenses: 0 },
  },
  PL: {
    flag: '🇵🇱',
    name: { sv: 'Polen', en: 'Poland' },
    currency: 'PLN',
    orgLabel: { sv: 'NIP', en: 'NIP' },
    orgPlaceholder: 'XXXXXXXXXX',
    vatPrefix: 'PL',
    bankLabel: { sv: 'IBAN', en: 'IBAN' },
    bankPlaceholder: 'PL00 0000 0000 0000 0000 0000 0000',
    hasVat: true,
    defaultVatRates: { concert: 8, recording: 23, teaching: 23, expenses: 0 },
  },
  CZ: {
    flag: '🇨🇿',
    name: { sv: 'Tjeckien', en: 'Czech Republic' },
    currency: 'CZK',
    orgLabel: { sv: 'ICO', en: 'ICO' },
    orgPlaceholder: 'XXXXXXXX',
    vatPrefix: 'CZ',
    bankLabel: { sv: 'IBAN', en: 'IBAN' },
    bankPlaceholder: 'CZ00 0000 0000 0000 0000 0000',
    hasVat: true,
    defaultVatRates: { concert: 12, recording: 21, teaching: 21, expenses: 0 },
  },
  IE: {
    flag: '🇮🇪',
    name: { sv: 'Irland', en: 'Ireland' },
    currency: 'EUR',
    orgLabel: { sv: 'CRO Number', en: 'CRO Number' },
    orgPlaceholder: 'XXXXXX',
    vatPrefix: 'IE',
    bankLabel: { sv: 'IBAN', en: 'IBAN' },
    bankPlaceholder: 'IE00 XXXX 0000 0000 0000 00',
    hasVat: true,
    defaultVatRates: { concert: 9, recording: 23, teaching: 23, expenses: 0 },
  },
  PT: {
    flag: '🇵🇹',
    name: { sv: 'Portugal', en: 'Portugal' },
    currency: 'EUR',
    orgLabel: { sv: 'NIF', en: 'NIF' },
    orgPlaceholder: 'XXXXXXXXX',
    vatPrefix: 'PT',
    bankLabel: { sv: 'IBAN', en: 'IBAN' },
    bankPlaceholder: 'PT00 0000 0000 0000 0000 0000 0',
    hasVat: true,
    defaultVatRates: { concert: 6, recording: 23, teaching: 23, expenses: 0 },
  },
}

export function getCountryConfig(countryCode: string): CountryConfig {
  return COUNTRY_CONFIGS[countryCode] || COUNTRY_CONFIGS['SE']
}

export function isEuCountry(countryCode: string): boolean {
  return (EU_COUNTRIES as readonly string[]).includes(countryCode)
}

export function shouldReverseCharge(userCountry: string, clientCountry: string): boolean {
  if (!clientCountry || userCountry === clientCountry) return false
  // Both must be in EU/EEA for reverse charge to apply
  const userInEu = isEuCountry(userCountry) || userCountry === 'NO'
  const clientInEu = isEuCountry(clientCountry) || clientCountry === 'NO'
  return userInEu && clientInEu
}

export function getCountryOptions(locale: string): { value: string; label: string }[] {
  return Object.entries(COUNTRY_CONFIGS)
    .map(([code, config]) => ({
      value: code,
      label: `${config.flag} ${locale === 'sv' ? config.name.sv : config.name.en}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, locale))
}
