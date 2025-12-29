import { Suspense } from 'react'
import { SettingsPageContent } from './settings-page-content'

function TabSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded" />
      <div className="h-64 bg-muted rounded" />
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<TabSkeleton />}>
      <SettingsPageContent />
    </Suspense>
  )
}
