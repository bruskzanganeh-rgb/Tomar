"use client"

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useRouter, usePathname } from 'next/navigation'
import { CalendarDays, CalendarCheck } from 'lucide-react'

import dynamic from 'next/dynamic'

const CalendarTab = dynamic(() => import('@/components/calendar/calendar-tab'), {
  loading: () => <TabSkeleton />,
})
const AvailabilityTab = dynamic(() => import('@/components/calendar/availability-tab'), {
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

export function CalendarPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const currentTab = searchParams.get('tab') || 'calendar'

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Kalender</h1>
        <p className="text-muted-foreground">
          Överblick över dina uppdrag och tillgänglighet
        </p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Kalender
          </TabsTrigger>
          <TabsTrigger value="availability" className="gap-2">
            <CalendarCheck className="h-4 w-4" />
            Tillgänglighet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-6">
          <Suspense fallback={<TabSkeleton />}>
            <CalendarTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="availability" className="mt-6">
          <Suspense fallback={<TabSkeleton />}>
            <AvailabilityTab />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}
