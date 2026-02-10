"use client"

import { useState, useEffect, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
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
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import { sv } from 'date-fns/locale'
import { enUS } from 'date-fns/locale/en-US'
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
  const t = useTranslations('datePicker')
  const appLocale = useLocale()
  const dateLocale = appLocale === 'sv' ? sv : enUS

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const initialized = useRef(false)

  // Set current month from selectedDates prop (for editing existing gigs)
  useEffect(() => {
    if (selectedDates.length > 0 && !initialized.current) {
      initialized.current = true
      const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime())
      setCurrentMonth(sortedDates[0])
    }
  }, [selectedDates])

  useEffect(() => {
    if (selectedDates.length === 0) {
      initialized.current = false
    }
  }, [selectedDates])

  function toggleDate(date: Date) {
    if (disabled) return

    const isSelected = selectedDates.some(d => isSameDay(d, date))

    if (isSelected) {
      const newDates = selectedDates.filter(d => !isSameDay(d, date))
      onDatesChange(newDates)
    } else {
      const newDates = [...selectedDates, date].sort((a, b) => a.getTime() - b.getTime())
      onDatesChange(newDates)
    }
  }

  // Get calendar days for current month view
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, i + 1) // Mon Jan 1 2024
    return format(d, 'EEE', { locale: dateLocale })
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center mb-2">
        <p className="text-sm font-medium">{t('dates')}</p>
        <p className="text-xs text-muted-foreground">{t('selectDays')}</p>
      </div>

      {/* Calendar */}
      <div className="p-4">
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
            {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
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
        <div className="grid grid-cols-7 gap-1.5 mb-2">
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
        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((day) => {
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isSelected = selectedDates.some(d => isSameDay(d, day))

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => isCurrentMonth && toggleDate(day)}
                disabled={disabled || !isCurrentMonth}
                className={cn(
                  'aspect-square p-1.5 text-sm rounded-md transition-colors',
                  !isCurrentMonth && 'text-muted-foreground/30',
                  isCurrentMonth && !isSelected && 'hover:bg-muted/50',
                  isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90',
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
          {t('clickToToggle')}
        </p>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm bg-muted/50 rounded-lg px-3 py-2">
        <span className="text-muted-foreground">{t('selectedDays')}</span>
        <span className="font-medium">
          {selectedDates.length === 0 && t('noDaysSelected')}
          {selectedDates.length === 1 && format(selectedDates[0], 'd MMMM yyyy', { locale: dateLocale })}
          {selectedDates.length > 1 && (
            <>
              {format(selectedDates[0], 'd', { locale: dateLocale })}-
              {format(selectedDates[selectedDates.length - 1], 'd MMMM yyyy', { locale: dateLocale })}
              {` (${selectedDates.length} ${t('daysCount')})`}
            </>
          )}
        </span>
      </div>
    </div>
  )
}
