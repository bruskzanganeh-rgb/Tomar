'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { useDateLocale } from '@/lib/hooks/use-date-locale'
import { useGigFilter } from '@/lib/hooks/use-gig-filter'
import { cn } from '@/lib/utils'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-400',
  accepted: 'bg-green-500',
  declined: 'bg-red-400',
  completed: 'bg-blue-500',
  invoiced: 'bg-purple-500',
  paid: 'bg-green-800',
}

type DayGig = {
  date: string
  status: string
  label: string
}

export function MiniCalendar() {
  const dateLocale = useDateLocale()
  const router = useRouter()
  const { shouldFilter, currentUserId } = useGigFilter()
  const supabase = createClient()

  const now = new Date()
  const [currentDate, setCurrentDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [dayGigs, setDayGigs] = useState<DayGig[]>([])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => {
    async function load() {
      const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const lastDay = new Date(year, month + 1, 0).getDate()
      const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

      const { data } = await supabase
        .from('gig_dates')
        .select('date, gig:gigs(status, user_id, project_name, client:clients(name))')
        .gte('date', start)
        .lte('date', end)

      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filtered = (data as any[])
          .filter((d) => {
            if (!d.gig) return false
            if (d.gig.status === 'cancelled' || d.gig.status === 'declined') return false
            if (shouldFilter && currentUserId && d.gig.user_id !== currentUserId) return false
            return true
          })
          .map((d) => ({
            date: d.date,
            status: d.gig.status,
            label: d.gig.project_name || d.gig.client?.name || '',
          }))
        setDayGigs(filtered)
      }
    }
    load()
  }, [year, month, shouldFilter, currentUserId, supabase])

  // Calendar grid
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const firstDayMon = firstDay === 0 ? 6 : firstDay - 1

  const calendarDays: (number | null)[] = []
  for (let i = 0; i < firstDayMon; i++) calendarDays.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d)

  // Day names (Mon-Sun, single letter)
  const dayNames = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, 1 + i)
    return format(d, 'EEEEE', { locale: dateLocale })
  })

  function getGigsForDay(day: number): DayGig[] {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return dayGigs.filter((g) => g.date === dateStr)
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()
  const todayDate = now.getDate()
  const monthLabel = format(currentDate, 'LLLL yyyy', { locale: dateLocale })

  return (
    <Card className="h-full flex flex-col min-h-0">
      <CardHeader className="pb-1 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <span className="capitalize">{monthLabel}</span>
          </CardTitle>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-1 flex-1 min-h-0 overflow-hidden">
        <div className="grid grid-cols-7 gap-1 h-full" style={{ gridAutoRows: 'minmax(0, 1fr)' }}>
          {/* Day headers */}
          {dayNames.map((name, i) => (
            <div key={i} className="text-center text-[10px] font-medium text-muted-foreground">
              {name}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((day, i) => {
            if (day === null) {
              return <div key={`e-${i}`} />
            }

            const gigs = getGigsForDay(day)
            const isToday = isCurrentMonth && day === todayDate

            return (
              <div
                key={day}
                className={cn(
                  'rounded-md p-0.5 cursor-pointer transition-colors hover:bg-secondary/80 overflow-hidden min-h-0',
                  isToday && 'bg-blue-50 ring-1 ring-blue-400',
                )}
                onClick={() => router.push('/calendar')}
              >
                <div
                  className={cn(
                    'text-[10px] leading-tight',
                    isToday ? 'font-bold text-blue-600' : 'text-foreground',
                    gigs.length === 0 && !isToday && 'text-muted-foreground',
                  )}
                >
                  {day}
                </div>
                {gigs.length > 0 && (
                  <div className="space-y-px mt-px overflow-hidden">
                    {gigs.slice(0, 2).map((gig, j) => (
                      <div
                        key={j}
                        className={cn(
                          'text-[8px] leading-tight px-0.5 rounded truncate text-white',
                          statusColors[gig.status] || 'bg-gray-400',
                        )}
                        title={gig.label}
                      >
                        {gig.label || '—'}
                      </div>
                    ))}
                    {gigs.length > 2 && (
                      <div className="text-[8px] leading-tight text-muted-foreground">+{gigs.length - 2}</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
