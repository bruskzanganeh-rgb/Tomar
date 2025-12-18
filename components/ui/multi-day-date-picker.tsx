"use client"

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isWithinInterval,
  getDay,
  startOfWeek,
  endOfWeek,
  startOfDay,
} from 'date-fns'
import { sv } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type MultiDayDatePickerProps = {
  selectedDates: Date[]
  onDatesChange: (dates: Date[]) => void
  disabled?: boolean
}

export function MultiDayDatePicker({
  selectedDates,
  onDatesChange,
  disabled = false,
}: MultiDayDatePickerProps) {
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [excludedDates, setExcludedDates] = useState<Set<string>>(new Set())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const initialized = useRef(false)

  // Initialize internal state from selectedDates prop (for editing existing gigs)
  useEffect(() => {
    if (selectedDates.length > 0 && !initialized.current) {
      initialized.current = true

      // Sort dates
      const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime())
      const firstDate = sortedDates[0]
      const lastDate = sortedDates[sortedDates.length - 1]

      // Set start and end dates
      setStartDate(format(firstDate, 'yyyy-MM-dd'))
      if (sortedDates.length > 1) {
        setEndDate(format(lastDate, 'yyyy-MM-dd'))
      }

      // Calculate excluded dates (dates in range but not selected)
      if (sortedDates.length > 1) {
        const allDaysInRange = eachDayOfInterval({ start: firstDate, end: lastDate })
        const selectedDateStrings = new Set(sortedDates.map(d => format(d, 'yyyy-MM-dd')))
        const excluded = new Set<string>()

        allDaysInRange.forEach(day => {
          const dayStr = format(day, 'yyyy-MM-dd')
          if (!selectedDateStrings.has(dayStr)) {
            excluded.add(dayStr)
          }
        })

        setExcludedDates(excluded)
      }

      // Set current month to start date's month
      setCurrentMonth(firstDate)
    }
  }, [selectedDates])

  // Reset initialized flag when component unmounts or selectedDates becomes empty
  useEffect(() => {
    if (selectedDates.length === 0) {
      initialized.current = false
    }
  }, [selectedDates])

  // Calculate selected dates whenever range or exclusions change
  useEffect(() => {
    // Skip if we just initialized from props
    if (!startDate) {
      if (selectedDates.length === 0) {
        return
      }
      onDatesChange([])
      return
    }

    const start = new Date(startDate + 'T12:00:00')
    const end = endDate ? new Date(endDate + 'T12:00:00') : start

    if (start > end) {
      onDatesChange([])
      return
    }

    const allDays = eachDayOfInterval({ start, end })
    const includedDays = allDays.filter(
      (day) => !excludedDates.has(format(day, 'yyyy-MM-dd'))
    )

    onDatesChange(includedDays)
  }, [startDate, endDate, excludedDates])

  // Update current month when start date changes
  useEffect(() => {
    if (startDate) {
      setCurrentMonth(new Date(startDate + 'T12:00:00'))
    }
  }, [startDate])

  function toggleDate(date: Date) {
    if (disabled) return

    const dateKey = format(date, 'yyyy-MM-dd')

    // Can only toggle dates within the range
    if (!startDate) return
    const start = new Date(startDate + 'T12:00:00')
    const end = endDate ? new Date(endDate + 'T12:00:00') : start
    if (!isWithinInterval(date, { start, end })) return

    const newExcluded = new Set(excludedDates)
    if (newExcluded.has(dateKey)) {
      newExcluded.delete(dateKey)
    } else {
      // Don't allow excluding all dates
      const allDays = eachDayOfInterval({ start, end })
      if (allDays.length - newExcluded.size <= 1) return
      newExcluded.add(dateKey)
    }
    setExcludedDates(newExcluded)
  }

  function isDateSelected(date: Date): boolean {
    return selectedDates.some((d) => isSameDay(d, date))
  }

  function isDateInRange(date: Date): boolean {
    if (!startDate) return false
    const normalizedDate = startOfDay(date)
    const start = startOfDay(new Date(startDate + 'T12:00:00'))
    const end = endDate ? startOfDay(new Date(endDate + 'T12:00:00')) : start
    return isWithinInterval(normalizedDate, { start, end })
  }

  function isDateExcluded(date: Date): boolean {
    return excludedDates.has(format(date, 'yyyy-MM-dd'))
  }

  // Get calendar days for current month view
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const weekDays = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']

  // Show calendar if there's a date range (more than one day)
  const showCalendar = startDate && endDate && startDate !== endDate

  return (
    <div className="space-y-4">
      {/* Date inputs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">Startdatum *</Label>
          <Input
            id="start_date"
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value)
              setExcludedDates(new Set())
              // If end date is before start date, clear it
              if (endDate && e.target.value > endDate) {
                setEndDate('')
              }
            }}
            disabled={disabled}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">Slutdatum</Label>
          <Input
            id="end_date"
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => {
              setEndDate(e.target.value)
              setExcludedDates(new Set())
            }}
            disabled={disabled || !startDate}
          />
          <p className="text-xs text-muted-foreground">Lämna tomt för endagsuppdrag</p>
        </div>
      </div>

      {/* Calendar view - show if we have a date range */}
      {showCalendar && (
        <div className="border rounded-lg p-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              disabled={disabled}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium">
              {format(currentMonth, 'MMMM yyyy', { locale: sv })}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              disabled={disabled}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const inRange = isDateInRange(day)
              const isExcluded = isDateExcluded(day)
              const isCurrentMonth = isSameMonth(day, currentMonth)

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => inRange && toggleDate(day)}
                  disabled={disabled || !inRange}
                  className={cn(
                    'aspect-square p-1 text-sm rounded-md transition-colors',
                    !isCurrentMonth && 'text-muted-foreground/30',
                    isCurrentMonth && !inRange && 'text-muted-foreground hover:bg-muted/50',
                    inRange && !isExcluded && 'bg-primary text-primary-foreground hover:bg-primary/90',
                    inRange && isExcluded && 'bg-muted text-muted-foreground line-through hover:bg-muted/80',
                    disabled && 'cursor-not-allowed opacity-50'
                  )}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>

          {/* Help text */}
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Klicka på en dag för att avmarkera den
          </p>
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between text-sm bg-muted/50 rounded-lg px-3 py-2">
        <span className="text-muted-foreground">Valda dagar:</span>
        <span className="font-medium">
          {selectedDates.length === 0 && 'Inga dagar valda'}
          {selectedDates.length === 1 && format(selectedDates[0], 'd MMMM yyyy', { locale: sv })}
          {selectedDates.length > 1 && (
            <>
              {format(selectedDates[0], 'd', { locale: sv })}-
              {format(selectedDates[selectedDates.length - 1], 'd MMMM yyyy', { locale: sv })}
              {` (${selectedDates.length} dagar)`}
            </>
          )}
        </span>
      </div>
    </div>
  )
}
