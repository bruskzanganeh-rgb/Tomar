"use client"

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, ArrowUpRight, AlertTriangle, Plus, Receipt, CalendarDays, Music } from 'lucide-react'
import Link from 'next/link'
import { GigDialog } from '@/components/gigs/gig-dialog'
import { UploadReceiptDialog } from '@/components/expenses/upload-receipt-dialog'
import { format } from 'date-fns'
import { useDateLocale } from '@/lib/hooks/use-date-locale'
import { motion, type Variants } from 'framer-motion'
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

type UpcomingGig = {
  id: string
  date: string
  project_name: string | null
  fee: number | null
  client: { name: string } | null
  gig_type: { name: string } | null
}

type PendingGig = {
  id: string
  date: string
  client: { name: string } | null
  status: string
  fee: number
  response_deadline: string | null
}

function getDeadlineInfo(deadline: string | null, dateLocale: import('date-fns').Locale): { label: string; urgent: boolean; isKey: boolean } | null {
  if (!deadline) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadlineDate = new Date(deadline)
  deadlineDate.setHours(0, 0, 0, 0)

  const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return { label: 'overdue', urgent: true, isKey: true }
  } else if (diffDays === 0) {
    return { label: 'today', urgent: true, isKey: true }
  } else if (diffDays <= 2) {
    return { label: `${diffDays}d`, urgent: true, isKey: false }
  } else {
    return { label: format(deadlineDate, 'd/M', { locale: dateLocale }), urgent: false, isKey: false }
  }
}

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const tc = useTranslations('common')
  const tGig = useTranslations('gig')
  const dateLocale = useDateLocale()
  const formatLocale = useFormatLocale()

  const [upcomingGigs, setUpcomingGigs] = useState<UpcomingGig[]>([])
  const [upcomingRevenue, setUpcomingRevenue] = useState(0)
  const [upcomingDays, setUpcomingDays] = useState(0)
  const [pendingGigs, setPendingGigs] = useState<PendingGig[]>([])
  const [loading, setLoading] = useState(true)
  const [showGigDialog, setShowGigDialog] = useState(false)
  const [showReceiptDialog, setShowReceiptDialog] = useState(false)
  const [gridHeight, setGridHeight] = useState<number | undefined>(undefined)
  const supabase = createClient()

  useEffect(() => {
    loadDashboardData()
  }, [])

  useEffect(() => {
    function updateHeight() {
      if (window.innerWidth < 768) return setGridHeight(undefined)
      const zoom = 0.65
      const header = 56
      const padding = 64
      setGridHeight(window.innerHeight / zoom - header - padding)
    }
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  async function loadDashboardData() {
    setLoading(true)

    const today = new Date().toISOString().split('T')[0]

    // Get upcoming accepted gigs with details
    const { data: upcoming } = await supabase
      .from('gigs')
      .select('id, date, fee, project_name, client:clients(name), gig_type:gig_types(name)')
      .gte('date', today)
      .eq('status', 'accepted')
      .order('date', { ascending: true })

    const upcomingList = (upcoming || []) as unknown as UpcomingGig[]
    setUpcomingGigs(upcomingList)
    setUpcomingRevenue(upcomingList.reduce((sum, g) => sum + (g.fee || 0), 0))

    // Get unique upcoming work days
    if (upcomingList.length > 0) {
      const gigIds = upcomingList.map(g => g.id)
      const { data: gigDates } = await supabase
        .from('gig_dates')
        .select('date')
        .in('gig_id', gigIds)
        .gte('date', today)

      setUpcomingDays(new Set(gigDates?.map(d => d.date) || []).size)
    }

    // Get pending and tentative gigs (need response)
    const { data: pending } = await supabase
      .from('gigs')
      .select('id, date, fee, status, response_deadline, client:clients(name)')
      .in('status', ['pending', 'tentative'])
      .order('response_deadline', { ascending: true, nullsFirst: false })
      .limit(5)

    setPendingGigs((pending || []) as unknown as PendingGig[])
    setLoading(false)
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {/* Mobile Quick Actions */}
      <motion.div variants={itemVariants} className="md:hidden">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setShowGigDialog(true)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border hover:bg-accent transition-colors"
          >
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            <span className="text-[11px] font-medium">{t('newGig')}</span>
          </button>
          <button
            onClick={() => setShowReceiptDialog(true)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border hover:bg-accent transition-colors"
          >
            <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Receipt className="h-4 w-4 text-emerald-500" />
            </div>
            <span className="text-[11px] font-medium">{t('uploadReceipt')}</span>
          </button>
          <Link
            href="/calendar"
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border hover:bg-accent transition-colors"
          >
            <div className="h-9 w-9 rounded-full bg-blue-500/10 flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-blue-500" />
            </div>
            <span className="text-[11px] font-medium">{t('viewCalendar')}</span>
          </Link>
        </div>
      </motion.div>

      {/* 3-Column Layout: Upcoming | Needs+Unpaid | Availability (golden ratio) */}
      <motion.div
        variants={itemVariants}
        className="grid gap-4"
        style={{
          ...(gridHeight ? { height: gridHeight, maxHeight: gridHeight, overflow: 'hidden' } : {}),
          gridTemplateColumns: gridHeight ? '2.618fr 1.618fr 1fr' : undefined,
          gridTemplateRows: gridHeight ? 'minmax(0, 1fr)' : undefined,
        }}
      >

        {/* Column 1: Upcoming Gigs */}
        <Card className="overflow-hidden md:h-full md:flex md:flex-col md:min-h-0">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {t('upcoming')}
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {upcomingGigs.length} {t('gigs')} · {upcomingDays} {tc('days')}
              </span>
            </div>
            <div className="text-2xl font-bold">
              {upcomingRevenue.toLocaleString(formatLocale)} <span className="text-sm font-normal text-muted-foreground">{tc('kr')}</span>
            </div>
          </CardHeader>
          <CardContent className="pb-4 md:flex-1 md:flex md:flex-col" style={{ minHeight: 0 }}>
            {loading ? (
              <div className="h-[120px] flex items-center justify-center text-muted-foreground text-sm">
                {tc('loading')}
              </div>
            ) : upcomingGigs.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Music className="h-6 w-6 mx-auto mb-1 opacity-50" />
                <p className="text-xs">{t('noUpcoming')}</p>
              </div>
            ) : (
              <div className="md:flex-1 md:relative" style={{ minHeight: 0 }}>
                <div className="md:absolute md:inset-0 space-y-1 md:overflow-y-auto md:pr-1">
                  {upcomingGigs.map((gig) => (
                    <Link
                      key={gig.id}
                      href="/gigs"
                      className="flex items-center justify-between py-2 px-3 rounded-lg text-xs bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="font-mono text-muted-foreground shrink-0">
                          {format(new Date(gig.date), 'd MMM', { locale: dateLocale })}
                        </span>
                        <span className="font-medium truncate">
                          {gig.project_name || gig.client?.name || gig.gig_type?.name || '—'}
                        </span>
                      </div>
                      {gig.fee && (
                        <span className="text-muted-foreground shrink-0 ml-2">
                          {gig.fee.toLocaleString(formatLocale)} {tc('kr')}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Column 2: Needs Response + Unpaid Invoices */}
        <div className="flex flex-col gap-4 overflow-hidden md:h-full md:min-h-0">
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t('needsResponse')}
                </CardTitle>
                <span className="text-xs text-muted-foreground">{t('pendingCount', { count: pendingGigs.length })}</span>
              </div>
            </CardHeader>
            <CardContent className="pb-4 flex-1 flex flex-col" style={{ minHeight: 0 }}>
              {loading ? (
                <div className="h-[120px] flex items-center justify-center text-muted-foreground text-sm">
                  {tc('loading')}
                </div>
              ) : pendingGigs.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
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
                              {tGig('response')}: {deadlineInfo.isKey ? t(deadlineInfo.label) : deadlineInfo.label}
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

          <UpcomingPayments className="flex-1 flex flex-col min-h-0" />
        </div>

        {/* Column 3: Availability */}
        <AvailableWeeks />
      </motion.div>

      {/* Quick Action Dialogs */}
      <GigDialog
        gig={null}
        open={showGigDialog}
        onOpenChange={setShowGigDialog}
        onSuccess={loadDashboardData}
      />
      <UploadReceiptDialog
        open={showReceiptDialog}
        onOpenChange={setShowReceiptDialog}
        onSuccess={() => {}}
      />
    </motion.div>
  )
}
