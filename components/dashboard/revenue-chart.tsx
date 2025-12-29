'use client'

import { useEffect, useState } from 'react'
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

type MonthlyRevenue = {
  month: string
  monthName: string
  revenue: number
  cumulative: number
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'
]

type ViewMode = 'invoice' | 'workday'

export function RevenueChart() {
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
    // Hämta år från fakturor
    const { data: invoices } = await supabase
      .from('invoices')
      .select('invoice_date')
      .order('invoice_date', { ascending: true })

    // Hämta år från gig_dates (för kommande gigs)
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

    // Kombinera och sortera unika år
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
      .select('invoice_date, total')
      .gte('invoice_date', startDate)
      .lte('invoice_date', endDate)
      .in('status', ['sent', 'paid'])

    // Group by month
    const monthlyData: { [key: number]: number } = {}
    for (let i = 0; i < 12; i++) {
      monthlyData[i] = 0
    }

    invoices?.forEach(inv => {
      const month = new Date(inv.invoice_date).getMonth()
      monthlyData[month] += inv.total
    })

    let cumulative = 0
    const chartData: MonthlyRevenue[] = Object.entries(monthlyData).map(([month, revenue]) => {
      cumulative += revenue
      return {
        month: (parseInt(month) + 1).toString().padStart(2, '0'),
        monthName: MONTH_NAMES[parseInt(month)],
        revenue,
        cumulative,
      }
    })

    setData(chartData)
    setLoading(false)
  }

  async function loadWorkdayData(year: number) {
    setLoading(true)

    // Hämta gigs med fee, total_days och gig_dates
    const { data: gigs } = await supabase
      .from('gigs')
      .select('fee, total_days, gig_dates(date)')
      .in('status', ['completed', 'invoiced', 'paid'])

    // Gruppera per månad baserat på gig_dates
    const monthlyData: { [key: number]: number } = {}
    for (let i = 0; i < 12; i++) {
      monthlyData[i] = 0
    }

    gigs?.forEach((gig: any) => {
      if (!gig.fee || !gig.total_days || gig.total_days === 0) return

      const dayRate = gig.fee / gig.total_days

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
        monthName: MONTH_NAMES[parseInt(month)],
        revenue: Math.round(revenue),
        cumulative: Math.round(cumulative),
      }
    })

    setData(chartData)
    setLoading(false)
  }

  const totalYearRevenue = data.reduce((sum, d) => sum + d.revenue, 0)

  return (
    <Card variant="glass" className="col-span-full border-blue-500/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
        <div className="flex items-center gap-3">
          <CardTitle className="text-sm font-medium text-blue-400">
            {viewMode === 'invoice' ? 'Fakturerat' : 'Arbetat'} {selectedYear}
          </CardTitle>
          <span className="text-sm font-semibold text-white">{totalYearRevenue.toLocaleString('sv-SE')} kr</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-white/20 overflow-hidden">
            <button
              onClick={() => setViewMode('invoice')}
              className={`px-3 py-1.5 text-xs transition-colors ${
                viewMode === 'invoice'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/5 text-blue-300 hover:bg-white/10'
              }`}
            >
              Fakturerat
            </button>
            <button
              onClick={() => setViewMode('workday')}
              className={`px-3 py-1.5 text-xs transition-colors ${
                viewMode === 'workday'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/5 text-blue-300 hover:bg-white/10'
              }`}
            >
              Arbetat
            </button>
          </div>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[70px] h-7 text-xs border-white/20 bg-white/5">
              <SelectValue placeholder="År" />
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
          <div className="h-[160px] flex items-center justify-center text-muted-foreground">
            Laddar...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis
                dataKey="monthName"
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.6)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.6)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                width={35}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.6)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                width={35}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString('sv-SE')} kr`,
                  name === 'revenue'
                    ? (viewMode === 'invoice' ? 'Fakturerat' : 'Arbetat')
                    : 'Totalt'
                ]}
                labelFormatter={(label) => `${label} ${selectedYear}`}
                contentStyle={{
                  backgroundColor: 'rgba(30, 41, 59, 0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#fff',
                }}
                labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
              />
              <Bar
                yAxisId="left"
                dataKey="revenue"
                fill="#60a5fa"
                radius={[3, 3, 0, 0]}
                maxBarSize={30}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulative"
                stroke="#34d399"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
