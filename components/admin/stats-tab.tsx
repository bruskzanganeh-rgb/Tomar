'use client'

import { Card, CardContent } from '@/components/ui/card'
import { useTranslations } from 'next-intl'

type Stats = {
  totalUsers: number
  proUsers: number
  freeUsers: number
  mrr: number
  totalImpressions: number
}

export function StatsTab({ stats }: { stats: Stats | null }) {
  const t = useTranslations('admin')

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">{t('totalUsers')}</p>
          <p className="text-2xl font-bold">{stats?.totalUsers ?? '-'}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">{t('proUsers')}</p>
          <p className="text-2xl font-bold">{stats?.proUsers ?? '-'}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">{t('freeUsers')}</p>
          <p className="text-2xl font-bold">{stats?.freeUsers ?? '-'}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">{t('mrr')}</p>
          <p className="text-2xl font-bold">{stats?.mrr ?? 0} kr</p>
        </CardContent>
      </Card>
      <Card className="col-span-2">
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">{t('sponsorImpressions')}</p>
          <p className="text-2xl font-bold">{stats?.totalImpressions ?? 0}</p>
        </CardContent>
      </Card>
    </div>
  )
}
