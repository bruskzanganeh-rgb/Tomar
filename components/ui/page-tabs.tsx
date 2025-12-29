"use client"

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { type ReactNode, useCallback } from 'react'

export type TabConfig = {
  id: string
  label: string
  content: ReactNode
}

type PageTabsProps = {
  tabs: TabConfig[]
  defaultTab?: string
  className?: string
}

export function PageTabs({ tabs, defaultTab, className }: PageTabsProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const currentTab = searchParams.get('tab') || defaultTab || tabs[0]?.id

  const handleTabChange = useCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [pathname, router, searchParams])

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className={className}>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}
