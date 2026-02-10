import { useLocale } from 'next-intl'
import { sv } from 'date-fns/locale/sv'
import { enUS } from 'date-fns/locale/en-US'
import type { Locale } from 'date-fns'

const localeMap: Record<string, Locale> = { sv, en: enUS }

export function useDateLocale(): Locale {
  const locale = useLocale()
  return localeMap[locale] || sv
}
