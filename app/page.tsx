"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, FileText, Users, TrendingUp, Clock, ArrowUpRight, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { TopClients } from '@/components/dashboard/top-clients'
import { YearComparison } from '@/components/dashboard/year-comparison'
import { UpcomingPayments } from '@/components/dashboard/upcoming-payments'
import { AvailableWeeks } from '@/components/dashboard/available-weeks'

type Stats = {
  upcomingRevenue: number
  upcomingGigs: number
  upcomingDays: number
  totalClients: number
  unpaidInvoices: number
}

type RecentGig = {
  id: string
  date: string
  client: { name: string } | null
  status: string
  fee: number
  response_deadline: string | null
}

function getDeadlineInfo(deadline: string | null): { label: string; color: string; urgent: boolean } | null {
  if (!deadline) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadlineDate = new Date(deadline)
  deadlineDate.setHours(0, 0, 0, 0)

  const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return { label: 'Försenad!', color: 'text-red-600 bg-red-50', urgent: true }
  } else if (diffDays === 0) {
    return { label: 'Idag!', color: 'text-red-600 bg-red-50', urgent: true }
  } else if (diffDays <= 2) {
    return { label: `${diffDays}d`, color: 'text-orange-600 bg-orange-50', urgent: true }
  } else {
    return { label: format(deadlineDate, 'd/M', { locale: sv }), color: 'text-gray-500 bg-gray-50', urgent: false }
  }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    upcomingRevenue: 0,
    upcomingGigs: 0,
    upcomingDays: 0,
    totalClients: 0,
    unpaidInvoices: 0,
  })
  const [pendingGigs, setPendingGigs] = useState<RecentGig[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    setLoading(true)

    const today = new Date().toISOString().split('T')[0]

    // Get upcoming gigs with fee
    const { data: upcoming } = await supabase
      .from('gigs')
      .select('id, fee')
      .gte('date', today)
      .eq('status', 'accepted')

    const upcomingRevenue = upcoming?.reduce((sum, gig) => sum + (gig.fee || 0), 0) || 0
    const upcomingGigs = upcoming?.length || 0

    // Get number of unique days from gig_dates for upcoming gigs
    let upcomingDays = 0
    if (upcoming && upcoming.length > 0) {
      const gigIds = upcoming.map(g => g.id)
      const { data: gigDates } = await supabase
        .from('gig_dates')
        .select('date')
        .in('gig_id', gigIds)
        .gte('date', today)

      const uniqueDates = new Set(gigDates?.map(d => d.date) || [])
      upcomingDays = uniqueDates.size
    }

    // Get total clients
    const { data: clients } = await supabase
      .from('clients')
      .select('id')

    // Get unpaid invoices
    const { data: unpaid } = await supabase
      .from('invoices')
      .select('total')
      .in('status', ['sent', 'overdue'])

    const unpaidTotal = unpaid?.reduce((sum, inv) => sum + inv.total, 0) || 0

    // Get pending and tentative gigs (need response)
    const { data: pending } = await supabase
      .from('gigs')
      .select('id, date, fee, status, response_deadline, client:clients(name)')
      .in('status', ['pending', 'tentative'])
      .order('response_deadline', { ascending: true, nullsFirst: false })
      .limit(5)

    setStats({
      upcomingRevenue,
      upcomingGigs,
      upcomingDays,
      totalClients: clients?.length || 0,
      unpaidInvoices: unpaidTotal,
    })

    setPendingGigs((pending || []) as unknown as RecentGig[])
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      {/* Minimal Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
      </div>

      {/* Stats Grid - Compact Cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {/* Upcoming Revenue */}
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/30 border-emerald-200/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-emerald-700">Kommande intäkter</CardTitle>
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="text-xl font-bold text-emerald-900">
              {stats.upcomingRevenue.toLocaleString('sv-SE')} <span className="text-sm font-normal">kr</span>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Gigs */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100/30 border-blue-200/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-blue-700">Kommande</CardTitle>
            <Calendar className="h-3.5 w-3.5 text-blue-600" />
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="text-xl font-bold text-blue-900">
              {stats.upcomingGigs} <span className="text-sm font-normal">gigs</span>
            </div>
            <div className="text-sm text-blue-600">
              {stats.upcomingDays} dagar
            </div>
          </CardContent>
        </Card>

        {/* Total Clients */}
        <Card className="bg-gradient-to-br from-purple-50 to-violet-100/30 border-purple-200/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-purple-700">Uppdragsgivare</CardTitle>
            <Users className="h-3.5 w-3.5 text-purple-600" />
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="text-xl font-bold text-purple-900">{stats.totalClients}</div>
          </CardContent>
        </Card>

        {/* Unpaid Invoices */}
        <Card className="bg-gradient-to-br from-amber-50 to-orange-100/30 border-amber-200/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-amber-700">Obetalda</CardTitle>
            <FileText className="h-3.5 w-3.5 text-amber-600" />
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="text-xl font-bold text-amber-900">
              {stats.unpaidInvoices.toLocaleString('sv-SE')} <span className="text-sm font-normal">kr</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <RevenueChart />

      {/* Four Column Grid */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {/* Year Comparison */}
        <YearComparison />

        {/* Upcoming Payments */}
        <UpcomingPayments />

        {/* Available Weeks */}
        <AvailableWeeks />

        {/* Pending Gigs - Kräver svar */}
        <Card className="bg-gradient-to-br from-white to-amber-50/30 border-amber-100/50">
          <CardHeader className="pb-2 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-amber-700 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Kräver ditt svar
              </CardTitle>
              <span className="text-xs text-muted-foreground">{pendingGigs.length} st</span>
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            {loading ? (
              <div className="h-[100px] flex items-center justify-center text-muted-foreground text-sm">
                Laddar...
              </div>
            ) : pendingGigs.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Clock className="h-6 w-6 mx-auto mb-1 text-amber-300" />
                <p className="text-xs">Inga väntande förfrågningar!</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {pendingGigs.slice(0, 5).map((gig) => {
                  const deadlineInfo = getDeadlineInfo(gig.response_deadline)
                  return (
                    <div
                      key={gig.id}
                      className={`flex items-center justify-between py-1.5 px-2 rounded-lg text-xs ${deadlineInfo?.urgent ? 'bg-red-50/50' : ''}`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-medium truncate block">
                          {gig.client?.name || <span className="text-muted-foreground italic">Ej angiven</span>}
                        </span>
                        {deadlineInfo && (
                          <span className={`text-[10px] ${deadlineInfo.color} px-1 py-0.5 rounded`}>
                            {deadlineInfo.urgent && '⚠️ '}Svar: {deadlineInfo.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-semibold">{gig.fee?.toLocaleString('sv-SE') || '—'} kr</span>
                        <Link
                          href="/gigs"
                          className="p-1 rounded bg-amber-50 text-amber-600 hover:bg-amber-100"
                        >
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Clients - Full Width */}
      <TopClients />
    </div>
  )
}
