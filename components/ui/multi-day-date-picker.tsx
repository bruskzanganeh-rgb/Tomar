"use client"

import { useState, useEffect, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
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
import { ChevronLeft, ChevronRight, Clock, Upload } from 'lucide-react'

type MultiDayDatePickerProps = {
  selectedDates: Date[]
  onDatesChange: (dates: Date[]) => void
  disabled?: boolean
  scheduleTexts?: Record<string, string>
  onScheduleTextsChange?: (texts: Record<string, string>) => void
  onScanSchedule?: () => void
}

export function MultiDayDatePicker({
  selectedDates,
  onDatesChange,
  disabled = false,
  scheduleTexts,
  onScheduleTextsChange,
  onScanSchedule,
}: MultiDayDatePickerProps) {
  const t = useTranslations('datePicker')
  const appLocale = useLocale()
  const dateLocale = appLocale === 'sv' ? sv : enUS

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const initialized = useRef(false)
  const [showTimes, setShowTimes] = useState(false)
  const [allSameText, setAllSameText] = useState(true)
  const [sharedText, setSharedText] = useState('')

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

  // Auto-open times section if scheduleTexts has values (edit mode or after import)
  const prevScheduleTextsCount = useRef(0)
  useEffect(() => {
    if (scheduleTexts) {
      const texts = Object.values(scheduleTexts).filter(t => t.trim())
      const hasTexts = texts.length > 0
      if (hasTexts && (!showTimes || texts.length !== prevScheduleTextsCount.current)) {
        prevScheduleTextsCount.current = texts.length
        setShowTimes(true)
        // Check if all texts are the same
        const allSame = texts.every(t => t === texts[0])
        setAllSameText(allSame)
        if (allSame) {
          setSharedText(texts[0])
        }
      }
    }
  }, [scheduleTexts])

  function toggleDate(date: Date) {
    if (disabled) return

    const isSelected = selectedDates.some(d => isSameDay(d, date))
    const key = format(date, 'yyyy-MM-dd')

    if (isSelected) {
      const newDates = selectedDates.filter(d => !isSameDay(d, date))
      onDatesChange(newDates)
      // Clean up schedule text for removed date
      if (onScheduleTextsChange && scheduleTexts && scheduleTexts[key]) {
        const newTexts = { ...scheduleTexts }
        delete newTexts[key]
        onScheduleTextsChange(newTexts)
      }
    } else {
      const newDates = [...selectedDates, date].sort((a, b) => a.getTime() - b.getTime())
      onDatesChange(newDates)
      // If "all same" is on, populate new date with shared text
      if (onScheduleTextsChange && allSameText && sharedText && showTimes) {
        onScheduleTextsChange({ ...(scheduleTexts || {}), [key]: sharedText })
      }
    }
  }

  function handleSharedTextChange(text: string) {
    setSharedText(text)
    if (onScheduleTextsChange) {
      const newTexts: Record<string, string> = {}
      const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime())
      for (const date of sortedDates) {
        newTexts[format(date, 'yyyy-MM-dd')] = text
      }
      onScheduleTextsChange(newTexts)
    }
  }

  function handlePerDayTextChange(key: string, text: string) {
    if (onScheduleTextsChange) {
      onScheduleTextsChange({ ...(scheduleTexts || {}), [key]: text })
    }
  }

  function handleAllSameToggle(checked: boolean) {
    setAllSameText(checked)
    if (checked && onScheduleTextsChange) {
      // Copy first day's text to shared text
      const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime())
      const firstKey = sortedDates.length > 0 ? format(sortedDates[0], 'yyyy-MM-dd') : ''
      const firstText = scheduleTexts?.[firstKey] || ''
      setSharedText(firstText)
      // Apply to all dates
      const newTexts: Record<string, string> = {}
      for (const date of sortedDates) {
        newTexts[format(date, 'yyyy-MM-dd')] = firstText
      }
      onScheduleTextsChange(newTexts)
    } else if (!checked && onScheduleTextsChange) {
      // Copy shared text to all dates
      const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime())
      const newTexts: Record<string, string> = {}
      for (const date of sortedDates) {
        newTexts[format(date, 'yyyy-MM-dd')] = sharedText
      }
      onScheduleTextsChange(newTexts)
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

  const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime())

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
        <div className="flex items-center gap-2">
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
          {selectedDates.length > 0 && onScheduleTextsChange && (
            <button
              type="button"
              className="text-xs text-primary hover:underline underline-offset-2 flex items-center gap-1"
              onClick={() => setShowTimes(v => !v)}
            >
              <Clock className="h-3 w-3" />
              {showTimes ? t('hideTimes') : t('addTimes')}
            </button>
          )}
        </div>
      </div>

      {/* Import schedule - always visible when onScanSchedule exists */}
      {onScanSchedule && !showTimes && (
        <button
          type="button"
          className="w-full text-sm text-primary hover:underline underline-offset-2 flex items-center justify-center gap-1.5 py-1"
          onClick={onScanSchedule}
          disabled={disabled}
        >
          <Upload className="h-3.5 w-3.5" />
          {t('importSchedule')}
        </button>
      )}

      {/* Schedule times section */}
      {showTimes && selectedDates.length > 0 && onScheduleTextsChange && (
        <div className="space-y-3 bg-muted/30 rounded-lg p-3">
          {/* Top row: toggle + import */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={allSameText}
                onCheckedChange={(checked) => handleAllSameToggle(checked === true)}
                disabled={disabled}
              />
              <span className="text-muted-foreground">{t('allDaysSameSchedule')}</span>
            </label>
            {onScanSchedule && (
              <button
                type="button"
                className="text-xs text-primary hover:underline underline-offset-2 flex items-center gap-1"
                onClick={onScanSchedule}
                disabled={disabled}
              >
                <Upload className="h-3 w-3" />
                {t('importSchedule')}
              </button>
            )}
          </div>

          {allSameText ? (
            /* Single input for all days */
            <Input
              value={sharedText}
              onChange={e => handleSharedTextChange(e.target.value)}
              placeholder={t('schedulePlaceholder')}
              className="text-sm h-9"
              disabled={disabled}
            />
          ) : (
            /* Per-day inputs */
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {sortedDates.map(date => {
                const key = format(date, 'yyyy-MM-dd')
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="w-[75px] text-xs text-muted-foreground shrink-0">
                      {format(date, 'EEE d MMM', { locale: dateLocale })}
                    </span>
                    <Input
                      value={scheduleTexts?.[key] ?? ''}
                      onChange={e => handlePerDayTextChange(key, e.target.value)}
                      placeholder={t('schedulePlaceholder')}
                      className="text-sm h-8"
                      disabled={disabled}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
