"use client"

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useRouter, usePathname } from 'next/navigation'
import { Settings, Tag, Music } from 'lucide-react'

import dynamic from 'next/dynamic'

const SettingsTab = dynamic(() => import('@/components/settings/settings-tab'), {
  loading: () => <TabSkeleton />,
})
const GigTypesTab = dynamic(() => import('@/components/settings/gig-types-tab'), {
  loading: () => <TabSkeleton />,
})
const PositionsTab = dynamic(() => import('@/components/settings/positions-tab'), {
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

export function SettingsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const currentTab = searchParams.get('tab') || 'general'

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inställningar</h1>
        <p className="text-muted-foreground">
          Hantera företagsinformation, uppdragstyper och positioner
        </p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            Allmänt
          </TabsTrigger>
          <TabsTrigger value="gig-types" className="gap-2">
            <Tag className="h-4 w-4" />
            Uppdragstyper
          </TabsTrigger>
          <TabsTrigger value="positions" className="gap-2">
            <Music className="h-4 w-4" />
            Positioner
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <Suspense fallback={<TabSkeleton />}>
            <SettingsTab />
          </Suspense>
        </TabsContent>

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
      </Tabs>
    </div>
  )
}
