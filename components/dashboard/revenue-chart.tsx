'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useFormatLocale } from '@/lib/hooks/use-format-locale'

type MonthlyRevenue = {
  month: string
  monthName: string
  revenue: number
  cumulative: number
}

type ViewMode = 'invoice' | 'workday'

export function RevenueChart() {
  const t = useTranslations('dashboard')
  const tc = useTranslations('common')
  const monthNames = t.raw('monthNames') as string[]
  const formatLocale = useFormatLocale()
  const [data, setData] = useState<MonthlyRevenue[]>([])
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [availableYears, setAvailableYears] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('invoice')
  const supabase = createClient()

  useEffect(() => {
    loadAvailableYears()
  }, [])

  useEffect(() => {
    if (selectedYear) {
      if (viewMode === 'invoice') {
        loadRevenueData(parseInt(selectedYear))
      } else {
        loadWorkdayData(parseInt(selectedYear))
      }
    }
  }, [selectedYear, viewMode])

  async function loadAvailableYears() {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('invoice_date')
      .order('invoice_date', { ascending: true })

    const { data: gigDates } = await supabase
      .from('gig_dates')
      .select('date')
      .order('date', { ascending: true })

    const invoiceYears = invoices?.map(inv =>
      new Date(inv.invoice_date).getFullYear().toString()
    ) || []

    const gigYears = gigDates?.map(gd =>
      new Date(gd.date).getFullYear().toString()
    ) || []

    const years = [...new Set([...invoiceYears, ...gigYears])].sort()

    setAvailableYears(years)
    if (years.length > 0 && !years.includes(selectedYear)) {
      setSelectedYear(years[years.length - 1])
    }
  }

  async function loadRevenueData(year: number) {
    setLoading(true)

    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`

    const { data: invoices } = await supabase
      .from('invoices')
      .select('invoice_date, total, total_base')
      .gte('invoice_date', startDate)
      .lte('invoice_date', endDate)
      .in('status', ['sent', 'paid'])

    const monthlyData: { [key: number]: number } = {}
    for (let i = 0; i < 12; i++) {
      monthlyData[i] = 0
    }

    invoices?.forEach((inv: any) => {
      const month = new Date(inv.invoice_date).getMonth()
      monthlyData[month] += (inv.total_base || inv.total)
    })

    let cumulative = 0
    const chartData: MonthlyRevenue[] = Object.entries(monthlyData).map(([month, revenue]) => {
      cumulative += revenue
      return {
        month: (parseInt(month) + 1).toString().padStart(2, '0'),
        monthName: monthNames[parseInt(month)],
        revenue,
        cumulative,
      }
    })

    setData(chartData)
    setLoading(false)
  }

  async function loadWorkdayData(year: number) {
    setLoading(true)

    const { data: gigs } = await supabase
      .from('gigs')
      .select('fee, fee_base, total_days, gig_dates(date)')
      .in('status', ['completed', 'invoiced', 'paid'])

    const monthlyData: { [key: number]: number } = {}
    for (let i = 0; i < 12; i++) {
      monthlyData[i] = 0
    }

    gigs?.forEach((gig: any) => {
      const fee = gig.fee_base || gig.fee
      if (!fee || !gig.total_days || gig.total_days === 0) return

      const dayRate = fee / gig.total_days

      gig.gig_dates?.forEach((gd: { date: string }) => {
        const date = new Date(gd.date)
        if (date.getFullYear() === year) {
          const month = date.getMonth()
          monthlyData[month] += dayRate
        }
      })
    })

    let cumulative = 0
    const chartData: MonthlyRevenue[] = Object.entries(monthlyData).map(([month, revenue]) => {
      cumulative += revenue
      return {
        month: (parseInt(month) + 1).toString().padStart(2, '0'),
        monthName: monthNames[parseInt(month)],
        revenue: Math.round(revenue),
        cumulative: Math.round(cumulative),
      }
    })

    setData(chartData)
    setLoading(false)
  }

  const totalYearRevenue = data.reduce((sum, d) => sum + d.revenue, 0)

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
        <div className="flex items-center gap-3">
          <CardTitle className="text-sm font-medium">
            {viewMode === 'invoice' ? t('invoiced') : t('worked')} {selectedYear}
          </CardTitle>
          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{totalYearRevenue.toLocaleString(formatLocale)} {tc('kr')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            <button
              onClick={() => setViewMode('invoice')}
              className={`px-3 py-1.5 text-xs transition-colors ${
                viewMode === 'invoice'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('invoiced')}
            </button>
            <button
              onClick={() => setViewMode('workday')}
              className={`px-3 py-1.5 text-xs transition-colors ${
                viewMode === 'workday'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('worked')}
            </button>
          </div>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[70px] h-7 text-xs">
              <SelectValue placeholder={t('year')} />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {loading ? (
          <div className="h-[160px] flex items-end gap-2 px-8 pb-4">
            {[40, 65, 85, 50, 70, 45, 55, 75, 60, 90, 72, 95].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <Skeleton
                  className="w-full rounded-t"
                  style={{ height: `${height}px` }}
                />
                <Skeleton className="h-2 w-6" />
              </div>
            ))}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="monthName"
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                width={35}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                width={35}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString(formatLocale)} ${tc('kr')}`,
                  name === 'revenue'
                    ? (viewMode === 'invoice' ? t('invoiced') : t('worked'))
                    : t('total')
                ]}
                labelFormatter={(label) => `${label} ${selectedYear}`}
                contentStyle={{
                  backgroundColor: 'var(--popover)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'var(--foreground)',
                }}
              />
              <Bar
                yAxisId="left"
                dataKey="revenue"
                fill="#3b82f6"
                radius={[3, 3, 0, 0]}
                maxBarSize={30}
                animationDuration={800}
                animationEasing="ease-out"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulative"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                animationDuration={1200}
                animationEasing="ease-out"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
