import { useLocale } from 'next-intl'

export function useFormatLocale() {
  const locale = useLocale()
  return locale === 'en' ? 'en-US' : 'sv-SE'
}
