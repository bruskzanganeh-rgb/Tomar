import { redirect } from 'next/navigation'

export default function AnalyticsPage() {
  redirect('/finance?tab=analytics')
}
