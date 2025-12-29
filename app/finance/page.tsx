import { Suspense } from 'react'
import { FinancePageContent } from './finance-page-content'

function TabSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded" />
      <div className="h-64 bg-muted rounded" />
    </div>
  )
}

export default function FinancePage() {
  return (
    <Suspense fallback={<TabSkeleton />}>
      <FinancePageContent />
    </Suspense>
  )
}
