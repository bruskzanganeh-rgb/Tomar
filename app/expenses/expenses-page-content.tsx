"use client"

import { Suspense } from 'react'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useRouter, usePathname } from 'next/navigation'
import { Receipt, Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageTransition } from '@/components/ui/page-transition'

import dynamic from 'next/dynamic'

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

export function ExpensesPageContent() {
  const t = useTranslations('finance')
  const tExpense = useTranslations('expense')
  const tc = useTranslations('common')
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const currentTab = searchParams.get('tab') || 'expenses'

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <Tabs value={currentTab} onValueChange={handleTabChange}>
          <div className="flex items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="expenses" className="gap-2">
                <Receipt className="h-4 w-4" />
                {t('expenses')}
              </TabsTrigger>
              <TabsTrigger value="import" className="gap-2">
                <Download className="h-4 w-4" />
                {t('import')}
              </TabsTrigger>
            </TabsList>
            {currentTab === 'expenses' && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => window.dispatchEvent(new Event('export-expenses'))}>
                  <Download className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{tc('export')}</span>
                </Button>
                <Button size="sm" onClick={() => window.dispatchEvent(new Event('upload-receipt'))}>
                  <Upload className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{tExpense('uploadReceipt')}</span>
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="expenses" className="mt-4">
            <ErrorBoundary>
              <Suspense fallback={<TabSkeleton />}>
                <ExpensesTab />
              </Suspense>
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="import" className="mt-4">
            <ErrorBoundary>
              <Suspense fallback={<TabSkeleton />}>
                <ImportTab />
              </Suspense>
            </ErrorBoundary>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  )
}
