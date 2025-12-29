"use client"

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarCheck, CheckCircle, Clock, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfWeek, endOfWeek, addWeeks, eachDayOfInterval, isSameDay, getWeek } from 'date-fns'
import { sv } from 'date-fns/locale'

type GigDate = {
  date: string
  gig: {
    status: string
  }
}

type WeekStatus = 'free' | 'partial' | 'busy'

type WeekInfo = {
  weekNumber: number
  startDate: Date
  endDate: Date
  status: WeekStatus
  gigDays: number
}

export function AvailableWeeks() {
  const [weeks, setWeeks] = useState<WeekInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const currentWeekRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()
  const currentYear = new Date().getFullYear()
  const currentWeekNumber = getWeek(new Date(), { weekStartsOn: 1 })
  const minYear = 2020
  const maxYear = currentYear + 1

  useEffect(() => {
    loadWeeks()
  }, [selectedYear])

  // Auto-scroll till nuvarande vecka när data laddats
  useEffect(() => {
    if (!loading && currentWeekRef.current && selectedYear === currentYear) {
      currentWeekRef.current.scrollIntoView({ block: 'center', behavior: 'auto' })
    }
  }, [loading, selectedYear])

  async function loadWeeks() {
    setLoading(true)
    const yearStart = new Date(selectedYear, 0, 1)
    const yearEnd = new Date(selectedYear, 11, 31)

    const start = format(yearStart, 'yyyy-MM-dd')
    const end = format(yearEnd, 'yyyy-MM-dd')

    const { data: dates } = await supabase
      .from('gig_dates')
      .select(`
        date,
        gig:gigs(status)
      `)
      .gte('date', start)
      .lte('date', end)

    const filtered = (dates || []).filter((d: any) =>
      d.gig && !['cancelled', 'declined'].includes(d.gig.status)
    ) as unknown as GigDate[]

    // Beräkna alla veckor i året
    const weekInfos: WeekInfo[] = []
    let currentWeekStart = startOfWeek(yearStart, { weekStartsOn: 1 })

    while (currentWeekStart <= yearEnd) {
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })
      const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd })

      const weekGigs = filtered.filter(gd => {
        const gigDate = new Date(gd.date)
        return weekDays.some(d => isSameDay(d, gigDate))
      })

      const gigDaysCount = new Set(weekGigs.map(g => g.date)).size

      let status: WeekStatus = 'free'
      if (gigDaysCount >= 4) {
        status = 'busy'
      } else if (gigDaysCount > 0) {
        status = 'partial'
      }

      weekInfos.push({
        weekNumber: getWeek(currentWeekStart, { weekStartsOn: 1 }),
        startDate: currentWeekStart,
        endDate: weekEnd,
        status,
        gigDays: gigDaysCount,
      })

      currentWeekStart = addWeeks(currentWeekStart, 1)
    }

    setWeeks(weekInfos)
    setLoading(false)
  }

  function getStatusStyle(status: WeekStatus) {
    switch (status) {
      case 'free':
        return { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle }
      case 'partial':
        return { bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock }
      case 'busy':
        return { bg: 'bg-red-50', text: 'text-red-700', icon: AlertCircle }
    }
  }

  const freeCount = weeks.filter(w => w.status === 'free').length
  const partialCount = weeks.filter(w => w.status === 'partial').length
  const busyCount = weeks.filter(w => w.status === 'busy').length
  const totalWeeks = weeks.length

  return (
    <Card className="bg-gradient-to-br from-white to-emerald-50/30 border-emerald-100/50 self-start">
      <CardHeader className="pb-2 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-emerald-700 flex items-center gap-1.5">
            <CalendarCheck className="h-3.5 w-3.5" />
            Tillgänglighet
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setSelectedYear(y => Math.max(minYear, y - 1))}
              disabled={selectedYear <= minYear}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-medium min-w-[40px] text-center">{selectedYear}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setSelectedYear(y => Math.min(maxYear, y + 1))}
              disabled={selectedYear >= maxYear}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        {loading ? (
          <div className="h-[100px] flex items-center justify-center text-muted-foreground text-sm">
            Laddar...
          </div>
        ) : (
          <>
            {/* Säsongssammanfattning */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center p-2 rounded-lg bg-emerald-50">
                <p className="text-lg font-bold text-emerald-700">{freeCount}</p>
                <p className="text-[10px] text-emerald-600">Lediga</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-amber-50">
                <p className="text-lg font-bold text-amber-700">{partialCount}</p>
                <p className="text-[10px] text-amber-600">Delvis</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-red-50">
                <p className="text-lg font-bold text-red-700">{busyCount}</p>
                <p className="text-[10px] text-red-600">Fulla</p>
              </div>
            </div>

            {/* Alla veckor - scrollbar */}
            <div
              ref={scrollContainerRef}
              className="space-y-1 h-[168px] overflow-y-auto pr-1"
            >
              {weeks.map((week, index) => {
                const style = getStatusStyle(week.status)
                const Icon = style.icon
                const isCurrentWeek = selectedYear === currentYear && week.weekNumber === currentWeekNumber
                return (
                  <div
                    key={`${selectedYear}-${index}`}
                    ref={isCurrentWeek ? currentWeekRef : null}
                    className={`flex items-center justify-between py-1 px-2 rounded-lg text-xs ${style.bg} ${isCurrentWeek ? 'ring-2 ring-emerald-400' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-3 w-3 ${style.text}`} />
                      <span className="font-medium">V{week.weekNumber}</span>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${style.text} ${style.bg} border-0`}
                    >
                      {week.status === 'free' ? 'Ledig' :
                       week.status === 'partial' ? `${week.gigDays}d` :
                       'Full'}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </>
        )}
        <div className="mt-2 pt-2 border-t text-center">
          <p className="text-[10px] text-muted-foreground">
            jan–dec {selectedYear} • {totalWeeks} veckor totalt
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
