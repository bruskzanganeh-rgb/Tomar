"use client"

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, FileText, Users, TrendingUp, Clock, ArrowUpRight, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { useDateLocale } from '@/lib/hooks/use-date-locale'
import { motion, type Variants } from 'framer-motion'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { TopClients } from '@/components/dashboard/top-clients'
import { YearComparison } from '@/components/dashboard/year-comparison'
import { UpcomingPayments } from '@/components/dashboard/upcoming-payments'
import { AvailableWeeks } from '@/components/dashboard/available-weeks'
import { useFormatLocale } from '@/lib/hooks/use-format-locale'

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }
  }
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

function getDeadlineInfo(deadline: string | null, dateLocale: import('date-fns').Locale): { label: string; urgent: boolean } | null {
  if (!deadline) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadlineDate = new Date(deadline)
  deadlineDate.setHours(0, 0, 0, 0)

  const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return { label: 'Försenad!', urgent: true }
  } else if (diffDays === 0) {
    return { label: 'Idag!', urgent: true }
  } else if (diffDays <= 2) {
    return { label: `${diffDays}d`, urgent: true }
  } else {
    return { label: format(deadlineDate, 'd/M', { locale: dateLocale }), urgent: false }
  }
}

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const tc = useTranslations('common')
  const tGig = useTranslations('gig')
  const dateLocale = useDateLocale()
  const formatLocale = useFormatLocale()
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
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Upcoming Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{t('upcomingRevenue')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent className="pb-4 px-5">
            <div className="text-2xl font-bold">
              {stats.upcomingRevenue.toLocaleString(formatLocale)} <span className="text-sm font-normal text-muted-foreground">{tc('kr')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Gigs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">{t('upcoming')}</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent className="pb-4 px-5">
            <div className="text-2xl font-bold">
              {stats.upcomingGigs} <span className="text-sm font-normal text-muted-foreground">{t('gigs')}</span>
            </div>
            <p className="text-sm text-muted-foreground">{stats.upcomingDays} {tc('days')}</p>
          </CardContent>
        </Card>

        {/* Total Clients */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('clients')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-4 px-5">
            <div className="text-2xl font-bold">{stats.totalClients}</div>
          </CardContent>
        </Card>

        {/* Unpaid Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400">{t('unpaid')}</CardTitle>
            <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent className="pb-4 px-5">
            <div className="text-2xl font-bold">
              {stats.unpaidInvoices.toLocaleString(formatLocale)} <span className="text-sm font-normal text-muted-foreground">{tc('kr')}</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Revenue Chart */}
      <motion.div variants={itemVariants}>
        <RevenueChart />
      </motion.div>

      {/* Four Column Grid */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-stretch">
        <YearComparison />
        <UpcomingPayments />
        <AvailableWeeks />

        {/* Pending Gigs */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t('needsResponse')}
              </CardTitle>
              <span className="text-xs text-muted-foreground">{pendingGigs.length} {tc('items')}</span>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            {loading ? (
              <div className="h-[100px] flex items-center justify-center text-muted-foreground text-sm">
                {tc('loading')}
              </div>
            ) : pendingGigs.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Clock className="h-6 w-6 mx-auto mb-1 opacity-50" />
                <p className="text-xs">{t('noPendingRequests')}</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {pendingGigs.slice(0, 5).map((gig) => {
                  const deadlineInfo = getDeadlineInfo(gig.response_deadline, dateLocale)
                  return (
                    <div
                      key={gig.id}
                      className={`flex items-center justify-between py-2 px-3 rounded-lg text-xs transition-colors ${
                        deadlineInfo?.urgent ? 'bg-red-500/10' : 'bg-secondary/50 hover:bg-secondary'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-medium truncate block">
                          {gig.client?.name || <span className="text-muted-foreground italic">{tGig('notSpecified')}</span>}
                        </span>
                        {deadlineInfo && (
                          <span className={`text-[10px] ${deadlineInfo.urgent ? 'text-red-400' : 'text-muted-foreground'}`}>
                            {tGig('response')}: {deadlineInfo.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-semibold">{gig.fee?.toLocaleString(formatLocale) || '—'} {tc('kr')}</span>
                        <Link
                          href="/gigs"
                          className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/30 transition-colors"
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

      {/* Top Clients */}
      <motion.div variants={itemVariants}>
        <TopClients />
      </motion.div>
    </motion.div>
  )
}
