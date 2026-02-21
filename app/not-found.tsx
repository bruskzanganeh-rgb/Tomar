import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileQuestion } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export default async function NotFound() {
  const t = await getTranslations('errors')

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <FileQuestion className="h-12 w-12 text-muted-foreground" />
      <h2 className="text-xl font-semibold">{t('pageNotFound')}</h2>
      <p className="text-sm text-muted-foreground">
        {t('pageNotFoundDesc')}
      </p>
      <Button asChild variant="outline">
        <Link href="/dashboard">{t('goHome')}</Link>
      </Button>
    </div>
  )
}
