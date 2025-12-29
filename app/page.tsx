"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, FileText, Users, TrendingUp, Clock, ArrowUpRight, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { motion, type Variants } from 'framer-motion'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { TopClients } from '@/components/dashboard/top-clients'
import { YearComparison } from '@/components/dashboard/year-comparison'
import { UpcomingPayments } from '@/components/dashboard/upcoming-payments'
import { AvailableWeeks } from '@/components/dashboard/available-weeks'

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

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
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {/* Minimal Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
          Dashboard
        </h1>
      </motion.div>

      {/* Stats Grid - Glass Cards */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Upcoming Revenue */}
        <motion.div whileHover={{ scale: 1.02, y: -2 }} transition={{ duration: 0.2 }}>
          <Card variant="glass" className="border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-5">
              <CardTitle className="text-xs font-medium text-emerald-400">Kommande intäkter</CardTitle>
              <div className="p-1.5 rounded-lg bg-emerald-500/20">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent className="pb-4 px-5">
              <div className="text-2xl font-bold text-white">
                {stats.upcomingRevenue.toLocaleString('sv-SE')} <span className="text-sm font-normal text-emerald-300">kr</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Gigs */}
        <motion.div whileHover={{ scale: 1.02, y: -2 }} transition={{ duration: 0.2 }}>
          <Card variant="glass" className="border-blue-500/20 hover:border-blue-500/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-5">
              <CardTitle className="text-xs font-medium text-blue-400">Kommande</CardTitle>
              <div className="p-1.5 rounded-lg bg-blue-500/20">
                <Calendar className="h-3.5 w-3.5 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent className="pb-4 px-5">
              <div className="text-2xl font-bold text-white">
                {stats.upcomingGigs} <span className="text-sm font-normal text-blue-300">gigs</span>
              </div>
              <div className="text-sm text-blue-400">
                {stats.upcomingDays} dagar
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Total Clients */}
        <motion.div whileHover={{ scale: 1.02, y: -2 }} transition={{ duration: 0.2 }}>
          <Card variant="glass" className="border-purple-500/20 hover:border-purple-500/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-5">
              <CardTitle className="text-xs font-medium text-purple-400">Uppdragsgivare</CardTitle>
              <div className="p-1.5 rounded-lg bg-purple-500/20">
                <Users className="h-3.5 w-3.5 text-purple-400" />
              </div>
            </CardHeader>
            <CardContent className="pb-4 px-5">
              <div className="text-2xl font-bold text-white">{stats.totalClients}</div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Unpaid Invoices */}
        <motion.div whileHover={{ scale: 1.02, y: -2 }} transition={{ duration: 0.2 }}>
          <Card variant="glass" className="border-amber-500/20 hover:border-amber-500/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-5">
              <CardTitle className="text-xs font-medium text-amber-400">Obetalda</CardTitle>
              <div className="p-1.5 rounded-lg bg-amber-500/20">
                <FileText className="h-3.5 w-3.5 text-amber-400" />
              </div>
            </CardHeader>
            <CardContent className="pb-4 px-5">
              <div className="text-2xl font-bold text-white">
                {stats.unpaidInvoices.toLocaleString('sv-SE')} <span className="text-sm font-normal text-amber-300">kr</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Revenue Chart */}
      <motion.div variants={itemVariants}>
        <RevenueChart />
      </motion.div>

      {/* Four Column Grid */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Year Comparison */}
        <YearComparison />

        {/* Upcoming Payments */}
        <UpcomingPayments />

        {/* Available Weeks */}
        <AvailableWeeks />

        {/* Pending Gigs - Kräver svar */}
        <Card variant="glass" className="border-amber-500/20 self-start">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Kräver ditt svar
              </CardTitle>
              <span className="text-xs text-muted-foreground">{pendingGigs.length} st</span>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            {loading ? (
              <div className="h-[100px] flex items-center justify-center text-muted-foreground text-sm">
                Laddar...
              </div>
            ) : pendingGigs.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Clock className="h-6 w-6 mx-auto mb-1 text-amber-400/50" />
                <p className="text-xs">Inga väntande förfrågningar!</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {pendingGigs.slice(0, 5).map((gig) => {
                  const deadlineInfo = getDeadlineInfo(gig.response_deadline)
                  return (
                    <div
                      key={gig.id}
                      className={`flex items-center justify-between py-2 px-3 rounded-lg text-xs transition-colors ${deadlineInfo?.urgent ? 'bg-red-500/10' : 'bg-white/5 hover:bg-white/10'}`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-medium truncate block text-white">
                          {gig.client?.name || <span className="text-muted-foreground italic">Ej angiven</span>}
                        </span>
                        {deadlineInfo && (
                          <span className={`text-[10px] ${deadlineInfo.urgent ? 'text-red-400' : 'text-muted-foreground'}`}>
                            Svar: {deadlineInfo.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-semibold text-white">{gig.fee?.toLocaleString('sv-SE') || '—'} kr</span>
                        <Link
                          href="/gigs"
                          className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
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
      </motion.div>

      {/* Top Clients - Full Width */}
      <motion.div variants={itemVariants}>
        <TopClients />
      </motion.div>
    </motion.div>
  )
}
