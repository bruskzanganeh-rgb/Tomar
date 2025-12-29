"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { EditGigDialog } from '@/components/gigs/edit-gig-dialog'
import { cn } from '@/lib/utils'

type Gig = {
  id: string
  date: string
  start_date: string | null
  end_date: string | null
  total_days: number
  venue: string | null
  fee: number | null
  travel_expense: number | null
  project_name: string | null
  conductor: string | null
  status: string
  notes: string | null
  client_id: string
  gig_type_id: string
  client: { name: string }
  gig_type: { name: string; color: string | null }
  gig_dates: { date: string }[]
  gig_works: { work: { title: string; composer: string; catalog_number: string | null } }[]
}

// Helper function to format date as local YYYY-MM-DD (avoids timezone issues with toISOString)
function formatDateLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-400',
  accepted: 'bg-green-500',
  declined: 'bg-red-400',
  completed: 'bg-blue-500',
  invoiced: 'bg-purple-500',
  paid: 'bg-green-800',
}

const statusLabels: Record<string, string> = {
  pending: 'Väntar',
  accepted: 'Accepterat',
  declined: 'Avböjt',
  completed: 'Genomfört',
  invoiced: 'Fakturerat',
  paid: 'Betalt',
}

type ViewMode = 'month' | 'year'

export default function CalendarPage() {
  const [gigs, setGigs] = useState<Gig[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const supabase = createClient()

  useEffect(() => {
    loadGigs()
  }, [])

  async function loadGigs() {
    setLoading(true)
    const { data, error } = await supabase
      .from('gigs')
      .select(`
        *,
        client:clients(name),
        gig_type:gig_types(name, color),
        gig_dates(date),
        gig_works(work:works(title, composer, catalog_number))
      `)
      .order('date', { ascending: true })

    if (error) {
      console.error('Error loading gigs:', error)
    } else {
      setGigs(data || [])
    }
    setLoading(false)
  }

  // Get days in month
  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate()
  }

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  function getFirstDayOfMonth(year: number, month: number) {
    const day = new Date(year, month, 1).getDay()
    // Convert to Monday-first (0 = Monday, 6 = Sunday)
    return day === 0 ? 6 : day - 1
  }

  // Check if a date has gigs
  function getGigsForDate(date: Date): Gig[] {
    const dateStr = formatDateLocal(date)

    return gigs.filter(gig => {
      // If gig has specific dates in gig_dates, use those
      if (gig.gig_dates && gig.gig_dates.length > 0) {
        return gig.gig_dates.some(gd => gd.date === dateStr)
      }
      // Fallback for single day gig without gig_dates
      return gig.date.split('T')[0] === dateStr
    })
  }

  // Navigate months/years
  function previous() {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    } else {
      setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1))
    }
  }

  function next() {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    } else {
      setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1))
    }
  }

  function goToToday() {
    setCurrentDate(new Date())
  }

  // Get gigs for a specific month (for year view)
  function getGigsForMonth(year: number, month: number): Gig[] {
    return gigs.filter(gig => {
      // If gig has specific dates in gig_dates, check if any fall in this month
      if (gig.gig_dates && gig.gig_dates.length > 0) {
        return gig.gig_dates.some(gd => {
          const d = new Date(gd.date + 'T12:00:00') // Add noon to avoid timezone issues
          return d.getFullYear() === year && d.getMonth() === month
        })
      }
      // Fallback for single day gig without gig_dates
      const gigDate = new Date(gig.date)
      return gigDate.getFullYear() === year && gigDate.getMonth() === month
    })
  }

  // Navigate to specific month from year view
  function goToMonth(month: number) {
    setCurrentDate(new Date(year, month, 1))
    setViewMode('month')
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDayOfMonth = getFirstDayOfMonth(year, month)

  const monthNames = [
    'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
    'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
  ]

  const dayNames = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']

  // Generate calendar days
  const calendarDays: (number | null)[] = []

  // Add empty cells for days before the first day of month
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null)
  }

  // Add days of month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  // Check if date is today
  function isToday(day: number): boolean {
    const today = new Date()
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kalender</h1>
          <p className="text-muted-foreground">
            Översikt över alla bokade uppdrag
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        {Object.entries(statusLabels).map(([status, label]) => (
          <div key={status} className="flex items-center gap-2">
            <div className={cn('w-3 h-3 rounded-full', statusColors[status])} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {viewMode === 'year' ? year : `${monthNames[month]} ${year}`}
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border overflow-hidden">
                <Button
                  variant={viewMode === 'month' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none"
                  onClick={() => setViewMode('month')}
                >
                  Månad
                </Button>
                <Button
                  variant={viewMode === 'year' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none"
                  onClick={() => setViewMode('year')}
                >
                  År
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Idag
              </Button>
              <Button variant="outline" size="icon" onClick={previous}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={next}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Laddar...
            </div>
          ) : viewMode === 'year' ? (
            /* Year View */
            <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
              {monthNames.map((monthName, monthIndex) => {
                const monthGigs = getGigsForMonth(year, monthIndex)
                const isCurrentMonth = new Date().getMonth() === monthIndex && new Date().getFullYear() === year

                return (
                  <div
                    key={monthIndex}
                    className={cn(
                      'border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors',
                      isCurrentMonth && 'bg-blue-50 border-blue-300'
                    )}
                    onClick={() => goToMonth(monthIndex)}
                  >
                    <h3 className={cn(
                      'font-semibold mb-2',
                      isCurrentMonth && 'text-blue-600'
                    )}>
                      {monthName}
                    </h3>
                    {monthGigs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Inga uppdrag</p>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{monthGigs.length} uppdrag</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(
                            monthGigs.reduce((acc, gig) => {
                              acc[gig.status] = (acc[gig.status] || 0) + 1
                              return acc
                            }, {} as Record<string, number>)
                          ).map(([status, count]) => (
                            <div
                              key={status}
                              className={cn(
                                'w-5 h-5 rounded-full flex items-center justify-center text-xs text-white font-medium',
                                statusColors[status]
                              )}
                              title={`${statusLabels[status]}: ${count}`}
                            >
                              {count}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            /* Month View */
            <div className="grid grid-cols-7 gap-1">
              {/* Day headers */}
              {dayNames.map(day => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="min-h-24 bg-gray-50" />
                }

                const date = new Date(year, month, day)
                const dayGigs = getGigsForDate(date)
                const today = isToday(day)

                return (
                  <div
                    key={day}
                    className={cn(
                      'min-h-24 border rounded-lg p-1 transition-colors',
                      today ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50',
                      dayGigs.length > 0 && 'cursor-pointer'
                    )}
                  >
                    <div className={cn(
                      'text-sm font-medium mb-1',
                      today && 'text-blue-600'
                    )}>
                      {day}
                    </div>
                    <div className="space-y-1">
                      {dayGigs.slice(0, 3).map(gig => (
                        <div
                          key={gig.id}
                          className={cn(
                            'text-xs p-1 rounded truncate cursor-pointer text-white',
                            statusColors[gig.status]
                          )}
                          onClick={() => setSelectedGig(gig)}
                          title={`${gig.client.name} - ${gig.project_name || gig.gig_type.name}`}
                        >
                          {gig.project_name || gig.client.name}
                        </div>
                      ))}
                      {dayGigs.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayGigs.length - 3} till
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected gig details */}
      {selectedGig && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedGig.project_name || selectedGig.gig_type.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Kund:</strong> {selectedGig.client.name}</p>
            <p><strong>Typ:</strong> {selectedGig.gig_type.name}</p>
            <p><strong>Datum:</strong> {selectedGig.start_date && selectedGig.total_days > 1
              ? `${selectedGig.start_date} - ${selectedGig.end_date} (${selectedGig.total_days} dagar)`
              : new Date(selectedGig.date).toLocaleDateString('sv-SE')
            }</p>
            {selectedGig.venue && <p><strong>Plats:</strong> {selectedGig.venue}</p>}
            <p><strong>Arvode:</strong> {selectedGig.fee !== null ? `${selectedGig.fee.toLocaleString('sv-SE')} kr` : 'Ej angivet'}</p>
            <p><strong>Status:</strong> {statusLabels[selectedGig.status]}</p>
            {selectedGig.conductor && <p><strong>Dirigent:</strong> {selectedGig.conductor}</p>}
            {selectedGig.gig_works && selectedGig.gig_works.length > 0 && (
              <div>
                <strong>Program:</strong>
                <ul className="list-disc list-inside ml-2 mt-1">
                  {selectedGig.gig_works.map((gw, idx) => (
                    <li key={idx} className="text-sm">
                      {gw.work.composer}: {gw.work.title}
                      {gw.work.catalog_number && <span className="text-muted-foreground"> ({gw.work.catalog_number})</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {selectedGig.notes && <p><strong>Anteckningar:</strong> {selectedGig.notes}</p>}
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={() => {
                // This will open the edit dialog
                const editGig = gigs.find(g => g.id === selectedGig.id)
                if (editGig) setSelectedGig(editGig)
              }}>
                Redigera
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedGig(null)}>
                Stäng
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <EditGigDialog
        gig={selectedGig}
        open={false}
        onOpenChange={() => {}}
        onSuccess={loadGigs}
      />
    </div>
  )
}
