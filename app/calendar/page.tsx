import { Suspense } from 'react'
import { CalendarPageContent } from './calendar-page-content'

function TabSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded" />
      <div className="h-64 bg-muted rounded" />
    </div>
  )
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<TabSkeleton />}>
      <CalendarPageContent />
    </Suspense>
  )
}
