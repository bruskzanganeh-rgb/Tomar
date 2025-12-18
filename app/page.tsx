"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, FileText, Users, TrendingUp, Clock, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { TopClients } from '@/components/dashboard/top-clients'
import { YearComparison } from '@/components/dashboard/year-comparison'
import { UpcomingPayments } from '@/components/dashboard/upcoming-payments'

type Stats = {
  monthRevenue: number
  upcomingGigs: number
  totalClients: number
  unpaidInvoices: number
}

type RecentGig = {
  id: string
  date: string
  client: { name: string }
  status: string
  fee: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    monthRevenue: 0,
    upcomingGigs: 0,
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

    // Get current month revenue
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: monthInvoices } = await supabase
      .from('invoices')
      .select('total')
      .gte('invoice_date', startOfMonth.toISOString().split('T')[0])
      .in('status', ['sent', 'paid'])

    const monthRevenue = monthInvoices?.reduce((sum, inv) => sum + inv.total, 0) || 0

    // Get upcoming gigs
    const today = new Date().toISOString()
    const { data: upcoming } = await supabase
      .from('gigs')
      .select('id')
      .gte('date', today)
      .eq('status', 'accepted')

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

    // Get pending gigs
    const { data: pending } = await supabase
      .from('gigs')
      .select('id, date, fee, status, client:clients(name)')
      .eq('status', 'pending')
      .order('date', { ascending: false })
      .limit(5)

    setStats({
      monthRevenue,
      upcomingGigs: upcoming?.length || 0,
      totalClients: clients?.length || 0,
      unpaidInvoices: unpaidTotal,
    })

    setPendingGigs((pending || []) as unknown as RecentGig[])
    setLoading(false)
  }

  const currentMonth = format(new Date(), 'MMMM', { locale: sv })

  return (
    <div className="space-y-3">
      {/* Minimal Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
            {currentMonth}
          </Badge>
        </div>
      </div>

      {/* Stats Grid - Compact Cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {/* Month Revenue */}
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/30 border-emerald-200/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-emerald-700">Intäkter</CardTitle>
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="text-xl font-bold text-emerald-900">
              {stats.monthRevenue.toLocaleString('sv-SE')} <span className="text-sm font-normal">kr</span>
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
            <div className="text-xl font-bold text-blue-900">{stats.upcomingGigs} <span className="text-sm font-normal">gigs</span></div>
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

      {/* Three Column Grid */}
      <div className="grid gap-3 lg:grid-cols-3">
        {/* Year Comparison */}
        <YearComparison />

        {/* Upcoming Payments */}
        <UpcomingPayments />

        {/* Pending Gigs */}
        <Card className="bg-gradient-to-br from-white to-blue-50/30 border-blue-100/50">
          <CardHeader className="pb-2 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-blue-700">Väntar på svar</CardTitle>
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
                <Clock className="h-6 w-6 mx-auto mb-1 text-blue-300" />
                <p className="text-xs">Inga väntande!</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {pendingGigs.slice(0, 5).map((gig) => (
                  <div
                    key={gig.id}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-medium truncate block">{gig.client.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-semibold">{gig.fee?.toLocaleString('sv-SE') || '—'} kr</span>
                      <Link
                        href="/gigs"
                        className="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100"
                      >
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
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
