"use client"

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useRouter, usePathname } from 'next/navigation'
import { Calendar, Users } from 'lucide-react'

import dynamic from 'next/dynamic'

const GigsTab = dynamic(() => import('@/components/gigs/gigs-tab'), {
  loading: () => <TabSkeleton />,
})
const ClientsTab = dynamic(() => import('@/components/gigs/clients-tab'), {
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

export function GigsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const currentTab = searchParams.get('tab') || 'gigs'

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Uppdrag</h1>
        <p className="text-muted-foreground">
          Hantera dina uppdrag och uppdragsgivare
        </p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="gigs" className="gap-2">
            <Calendar className="h-4 w-4" />
            Uppdrag
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-2">
            <Users className="h-4 w-4" />
            Uppdragsgivare
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gigs" className="mt-6">
          <Suspense fallback={<TabSkeleton />}>
            <GigsTab />
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
