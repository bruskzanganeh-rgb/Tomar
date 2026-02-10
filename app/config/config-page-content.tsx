"use client"

import { Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useRouter, usePathname } from 'next/navigation'
import { Tag, Music, Users } from 'lucide-react'

import dynamic from 'next/dynamic'

const GigTypesTab = dynamic(() => import('@/components/settings/gig-types-tab'), {
  loading: () => <TabSkeleton />,
})
const PositionsTab = dynamic(() => import('@/components/settings/positions-tab'), {
  loading: () => <TabSkeleton />,
})
const ClientsTab = dynamic(() => import('@/components/settings/clients-tab'), {
  loading: () => <TabSkeleton />,
})

function TabSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded" />
      <div className="h-64 bg-muted rounded" />
    </div>
  )
}

export function ConfigPageContent() {
  const t = useTranslations('config')
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const currentTab = searchParams.get('tab') || 'gig-types'

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="gig-types" className="gap-2">
            <Tag className="h-4 w-4" />
            {t('gigTypes')}
          </TabsTrigger>
          <TabsTrigger value="positions" className="gap-2">
            <Music className="h-4 w-4" />
            {t('positions')}
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-2">
            <Users className="h-4 w-4" />
            {t('clients')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gig-types" className="mt-6">
          <Suspense fallback={<TabSkeleton />}>
            <GigTypesTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="positions" className="mt-6">
          <Suspense fallback={<TabSkeleton />}>
            <PositionsTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="clients" className="mt-6">
          <Suspense fallback={<TabSkeleton />}>
            <ClientsTab />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}
