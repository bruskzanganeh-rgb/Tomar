import { Suspense } from 'react'
import { ConfigPageContent } from './config-page-content'

function TabSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded" />
      <div className="h-64 bg-muted rounded" />
    </div>
  )
}

export default function ConfigPage() {
  return (
    <Suspense fallback={<TabSkeleton />}>
      <ConfigPageContent />
    </Suspense>
  )
}
