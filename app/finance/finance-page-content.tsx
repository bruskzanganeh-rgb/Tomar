"use client"

import { Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useRouter, usePathname } from 'next/navigation'
import { FileText, Receipt, Download } from 'lucide-react'

import dynamic from 'next/dynamic'

const InvoicesTab = dynamic(() => import('@/components/finance/invoices-tab'), {
  loading: () => <TabSkeleton />,
})
const ExpensesTab = dynamic(() => import('@/components/finance/expenses-tab'), {
  loading: () => <TabSkeleton />,
})
const ImportTab = dynamic(() => import('@/components/finance/import-tab'), {
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

export function FinancePageContent() {
  const t = useTranslations('finance')
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const currentTab = searchParams.get('tab') || 'invoices'

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
          <TabsTrigger value="invoices" className="gap-2">
            <FileText className="h-4 w-4" />
            {t('invoices')}
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2">
            <Receipt className="h-4 w-4" />
            {t('expenses')}
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-2">
            <Download className="h-4 w-4" />
            {t('import')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-6">
          <Suspense fallback={<TabSkeleton />}>
            <InvoicesTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="expenses" className="mt-6">
          <Suspense fallback={<TabSkeleton />}>
            <ExpensesTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="import" className="mt-6">
          <Suspense fallback={<TabSkeleton />}>
            <ImportTab />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}
