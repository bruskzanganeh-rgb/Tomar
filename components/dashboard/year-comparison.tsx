'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

type YearData = {
  year: number
  total: number
  count: number
  ytdTotal: number
  ytdCount: number
}

export function YearComparison() {
  const [currentYear, setCurrentYear] = useState<YearData | null>(null)
  const [previousYear, setPreviousYear] = useState<YearData | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadYearComparison()
  }, [])

  async function loadYearComparison() {
    setLoading(true)

    const now = new Date()
    const currentYearNum = now.getFullYear()
    const previousYearNum = currentYearNum - 1
    const currentMonth = now.getMonth() + 1
    const currentDay = now.getDate()

    // Fetch all invoices for current and previous year
    const { data: invoices } = await supabase
      .from('invoices')
      .select('invoice_date, total')
      .in('status', ['sent', 'paid'])
      .gte('invoice_date', `${previousYearNum}-01-01`)
      .lte('invoice_date', `${currentYearNum}-12-31`)

    if (invoices) {
      // Calculate totals for each year
      const currentYearInvoices = invoices.filter(inv => {
        const date = new Date(inv.invoice_date)
        return date.getFullYear() === currentYearNum
      })

      const previousYearInvoices = invoices.filter(inv => {
        const date = new Date(inv.invoice_date)
        return date.getFullYear() === previousYearNum
      })

      // YTD calculation - same period comparison
      const ytdEndDate = `${previousYearNum}-${currentMonth.toString().padStart(2, '0')}-${currentDay.toString().padStart(2, '0')}`

      const previousYearYTD = previousYearInvoices.filter(inv => {
        return inv.invoice_date <= ytdEndDate
      })

      setCurrentYear({
        year: currentYearNum,
        total: currentYearInvoices.reduce((sum, inv) => sum + inv.total, 0),
        count: currentYearInvoices.length,
        ytdTotal: currentYearInvoices.reduce((sum, inv) => sum + inv.total, 0),
        ytdCount: currentYearInvoices.length,
      })

      setPreviousYear({
        year: previousYearNum,
        total: previousYearInvoices.reduce((sum, inv) => sum + inv.total, 0),
        count: previousYearInvoices.length,
        ytdTotal: previousYearYTD.reduce((sum, inv) => sum + inv.total, 0),
        ytdCount: previousYearYTD.length,
      })
    }

    setLoading(false)
  }

  function getChangePercent(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  function ChangeIndicator({ current, previous }: { current: number; previous: number }) {
    const change = getChangePercent(current, previous)

    if (Math.abs(change) < 1) {
      return (
        <span className="flex items-center text-muted-foreground text-sm">
          <Minus className="w-4 h-4 mr-1" />
          Oförändrat
        </span>
      )
    }

    if (change > 0) {
      return (
        <span className="flex items-center text-green-600 text-sm">
          <TrendingUp className="w-4 h-4 mr-1" />
          +{change.toFixed(1)}%
        </span>
      )
    }

    return (
      <span className="flex items-center text-red-600 text-sm">
        <TrendingDown className="w-4 h-4 mr-1" />
        {change.toFixed(1)}%
      </span>
    )
  }

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-white to-purple-50/30 border-purple-100/50">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-sm font-medium text-purple-700">Årsjämförelse</CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="h-[120px] flex items-center justify-center text-muted-foreground text-sm">
            Laddar...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-white to-purple-50/30 border-purple-100/50">
      <CardHeader className="pb-2 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-purple-700">Årsjämförelse</CardTitle>
          <span className="text-xs text-muted-foreground">{currentYear?.year} vs {previousYear?.year}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pb-3">
        {/* YTD Comparison */}
        <div className="space-y-1">
          <h4 className="text-xs font-medium text-muted-foreground">YTD</h4>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-lg font-bold">{currentYear?.ytdTotal.toLocaleString('sv-SE')}</span>
              <span className="text-xs text-muted-foreground ml-1">kr</span>
            </div>
            <ChangeIndicator
              current={currentYear?.ytdTotal || 0}
              previous={previousYear?.ytdTotal || 0}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {previousYear?.year}: {previousYear?.ytdTotal.toLocaleString('sv-SE')} kr
          </p>
        </div>

        {/* Full Year */}
        <div className="space-y-1 pt-2 border-t">
          <h4 className="text-xs font-medium text-muted-foreground">Helår {previousYear?.year}</h4>
          <p className="text-lg font-bold">
            {previousYear?.total.toLocaleString('sv-SE')} <span className="text-xs font-normal">kr</span>
          </p>
        </div>

        {/* Average */}
        <div className="space-y-1 pt-2 border-t">
          <h4 className="text-xs font-medium text-muted-foreground">Snitt/faktura</h4>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">
              {currentYear && currentYear.count > 0
                ? Math.round(currentYear.ytdTotal / currentYear.ytdCount).toLocaleString('sv-SE')
                : 0} kr
            </span>
            <ChangeIndicator
              current={currentYear && currentYear.count > 0 ? currentYear.ytdTotal / currentYear.ytdCount : 0}
              previous={previousYear && previousYear.count > 0 ? previousYear.total / previousYear.count : 0}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
