"use client"

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { GigAttachments } from './gig-attachments'
import { uploadGigAttachment } from '@/lib/supabase/storage'
import { GigReceipts } from './gig-receipts'
import { MultiDayDatePicker } from '@/components/ui/multi-day-date-picker'
import { format } from 'date-fns'
import { SUPPORTED_CURRENCIES, type SupportedCurrency, getRate } from '@/lib/currency/exchange'

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
  status: string
  notes?: string | null
  invoice_notes?: string | null
  response_deadline?: string | null
  client_id: string | null
  gig_type_id: string
  position_id?: string | null
  currency?: string | null
  client: { name: string } | null
  gig_type: { name: string } | null
}

type Client = { id: string; name: string }
type GigType = { id: string; name: string; vat_rate: number }
type Position = { id: string; name: string }

type InitialValues = {
  client_id?: string
  gig_type_id?: string
  position_id?: string
  fee?: string
  currency?: string
  venue?: string
  project_name?: string
}

type GigDialogProps = {
  gig: Gig | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  onCreated?: (gigId: string) => void
  initialDate?: Date
  initialValues?: InitialValues
}

const defaultFormData = {
  client_id: '',
  gig_type_id: '',
  position_id: '',
  fee: '',
  travel_expense: '',
  currency: 'SEK' as string,
  venue: '',
  project_name: '',
  notes: '',
  invoice_notes: '',
  status: 'pending',
  response_deadline: '',
}

export function GigDialog({
  gig,
  open,
  onOpenChange,
  onSuccess,
  onCreated,
  initialDate,
  initialValues,
}: GigDialogProps) {
  const t = useTranslations('gig')
  const tc = useTranslations('common')
  const tStatus = useTranslations('status')
  const tToast = useTranslations('toast')
  const isEditing = gig !== null
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [gigTypes, setGigTypes] = useState<GigType[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [formData, setFormData] = useState({ ...defaultFormData })
  const [baseCurrency, setBaseCurrency] = useState<SupportedCurrency>('SEK')
  const [scheduleTexts, setScheduleTexts] = useState<Record<string, string>>({})
  const [scanningSchedule, setScanningSchedule] = useState(false)
  const [scheduleFile, setScheduleFile] = useState<File | null>(null)
  const scheduleFileRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  // Load clients, gig types and positions when dialog opens
  useEffect(() => {
    if (open) {
      loadClients()
      loadGigTypes()
      loadPositions()
      loadBaseCurrency()

      // Reset form for create mode
      if (!gig) {
        setFormData({
          ...defaultFormData,
          ...(initialValues ? {
            client_id: initialValues.client_id || '',
            gig_type_id: initialValues.gig_type_id || '',
            position_id: initialValues.position_id || '',
            fee: initialValues.fee || '',
            currency: initialValues.currency || 'SEK',
            venue: initialValues.venue || '',
            project_name: initialValues.project_name || '',
          } : {}),
        })
        setSelectedDates(initialDate ? [initialDate] : [])
        setScheduleTexts({})
        setScheduleFile(null)
      }
    }
  }, [open])

  // Populate form when gig changes (edit mode)
  useEffect(() => {
    if (gig && open) {
      setFormData({
        client_id: gig.client_id || '',
        gig_type_id: gig.gig_type_id || '',
        position_id: gig.position_id || '',
        fee: gig.fee?.toString() || '',
        travel_expense: gig.travel_expense?.toString() || '',
        currency: gig.currency || 'SEK',
        venue: gig.venue || '',
        project_name: gig.project_name || '',
        notes: gig.notes || '',
        invoice_notes: gig.invoice_notes || '',
        status: gig.status || 'pending',
        response_deadline: gig.response_deadline || '',
      })

      // Load gig dates
      loadGigDates(gig.id)
    }
  }, [gig, open])

  async function loadClients() {
    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .order('name')
    setClients(data || [])
  }

  async function loadGigTypes() {
    const { data } = await supabase
      .from('gig_types')
      .select('id, name, vat_rate')
      .order('name')
    setGigTypes(data || [])
  }

  async function loadPositions() {
    const { data } = await supabase
      .from('positions')
      .select('id, name')
      .order('sort_order')
    setPositions(data || [])
  }

  async function loadBaseCurrency() {
    const { data: membership } = await supabase
      .from('company_members')
      .select('company_id')
      .single()
    if (membership) {
      const { data } = await supabase
        .from('companies')
        .select('base_currency')
        .eq('id', membership.company_id)
        .single()
      if (data?.base_currency) {
        setBaseCurrency(data.base_currency as SupportedCurrency)
        if (!gig) {
          setFormData(f => ({ ...f, currency: data.base_currency }))
        }
      }
    }
  }

  async function loadGigDates(gigId: string) {
    const { data } = await supabase
      .from('gig_dates')
      .select('date, schedule_text, sessions')
      .eq('gig_id', gigId)
      .order('date')

    if (data && data.length > 0) {
      const dates = data.map(d => new Date(d.date + 'T12:00:00'))
      setSelectedDates(dates)

      // Load schedule texts
      const texts: Record<string, string> = {}
      data.forEach(d => {
        if (d.schedule_text) texts[d.date] = d.schedule_text
      })
      setScheduleTexts(texts)
    } else {
      // Fallback to start_date if no gig_dates
      if (gig?.start_date) {
        setSelectedDates([new Date(gig.start_date + 'T12:00:00')])
      }
      setScheduleTexts({})
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (selectedDates.length === 0) {
      toast.warning(t('selectDate'))
      return
    }

    const needsClient = ['completed', 'invoiced', 'paid'].includes(formData.status)
    if (needsClient && (!formData.client_id || formData.client_id === 'none')) {
      toast.warning(t('clientRequired'))
      return
    }

    setLoading(true)

    // Sort dates
    const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime())

    // Use first date for the main date field
    const primaryDate = sortedDates[0]
    const dateTime = `${format(primaryDate, 'yyyy-MM-dd')}T00:00:00`

    // Calculate start and end dates
    const startDate = format(sortedDates[0], 'yyyy-MM-dd')
    const endDate = format(sortedDates[sortedDates.length - 1], 'yyyy-MM-dd')

    const fee = formData.fee ? parseFloat(formData.fee) : null
    const travelExpense = formData.travel_expense ? parseFloat(formData.travel_expense) : null
    const currency = (formData.currency || baseCurrency) as SupportedCurrency

    // Convert to base currency if different
    let feeBase = fee
    let travelExpenseBase = travelExpense
    let exchangeRate = 1.0

    if (currency !== baseCurrency && (fee || travelExpense)) {
      try {
        exchangeRate = await getRate(currency, baseCurrency, startDate)
        if (fee) feeBase = Math.round(fee * exchangeRate * 100) / 100
        if (travelExpense) travelExpenseBase = Math.round(travelExpense * exchangeRate * 100) / 100
      } catch {
        toast.warning(tToast('exchangeRateError'))
        feeBase = fee
        travelExpenseBase = travelExpense
        exchangeRate = 1.0
      }
    }

    const gigData = {
      client_id: formData.client_id && formData.client_id !== 'none' ? formData.client_id : null,
      gig_type_id: formData.gig_type_id,
      position_id: formData.position_id && formData.position_id !== 'none' ? formData.position_id : null,
      date: dateTime,
      start_date: startDate,
      end_date: endDate,
      total_days: sortedDates.length,
      fee,
      travel_expense: travelExpense,
      currency,
      fee_base: feeBase,
      travel_expense_base: travelExpenseBase,
      exchange_rate: exchangeRate,
      venue: formData.venue || null,
      project_name: formData.project_name || null,
      notes: formData.notes || null,
      invoice_notes: formData.invoice_notes || null,
      status: formData.status,
      response_deadline: formData.response_deadline || null,
    }

    // Parse schedule texts with AI if any exist
    let parsedSessions: Record<string, unknown[]> = {}
    const scheduleEntries = Object.entries(scheduleTexts)
      .filter(([_, text]) => text.trim())
      .map(([date, text]) => ({ date, text }))

    if (scheduleEntries.length > 0) {
      try {
        const res = await fetch('/api/gigs/parse-schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries: scheduleEntries }),
        })
        if (res.ok) {
          const data = await res.json()
          parsedSessions = data.sessions || {}
        }
      } catch (err) {
        console.error('Schedule parse error:', err)
        // Continue saving without parsed sessions
      }
    }

    // Build gig_dates with schedule data
    function buildGigDates(gigId: string) {
      return sortedDates.map(date => {
        const key = format(date, 'yyyy-MM-dd')
        return {
          gig_id: gigId,
          date: key,
          schedule_text: scheduleTexts[key] || null,
          sessions: parsedSessions[key] || [],
        }
      })
    }

    if (isEditing) {
      // Update existing gig
      const { error } = await supabase
        .from('gigs')
        .update(gigData)
        .eq('id', gig.id)

      if (error) {
        setLoading(false)
        console.error('Error updating gig:', error)
        toast.error(tToast('gigUpdateError', { error: error.message }))
        return
      }

      // Delete old gig_dates and insert new ones
      await supabase.from('gig_dates').delete().eq('gig_id', gig.id)

      const gigDates = buildGigDates(gig.id)
      const { error: datesError } = await supabase.from('gig_dates').insert(gigDates)
      if (datesError) {
        console.error('Error updating gig dates:', datesError)
      }

      // Upload schedule file if imported
      if (scheduleFile) {
        try {
          await uploadGigAttachment(gig.id, scheduleFile, 'schedule')
        } catch (err) {
          console.error('Schedule file upload error:', err)
        }
      }
    } else {
      // Create new gig
      const { data: newGig, error } = await supabase
        .from('gigs')
        .insert([gigData])
        .select()
        .single()

      if (error) {
        setLoading(false)
        console.error('Error creating gig:', error)
        toast.error(tToast('gigCreateError', { error: error.message }))
        return
      }

      // Insert gig_dates
      const gigDates = buildGigDates(newGig.id)
      const { error: datesError } = await supabase.from('gig_dates').insert(gigDates)
      if (datesError) {
        console.error('Error inserting gig dates:', datesError)
      }

      // Upload schedule file if imported
      if (scheduleFile) {
        try {
          await uploadGigAttachment(newGig.id, scheduleFile, 'schedule')
        } catch (err) {
          console.error('Schedule file upload error:', err)
        }
      }

      toast.success(tToast('gigCreated'))
      onCreated?.(newGig.id)
    }

    setLoading(false)
    onSuccess()
    onOpenChange(false)
  }

  async function handleScanSchedule() {
    scheduleFileRef.current?.click()
  }

  async function handleScheduleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setScanningSchedule(true)
    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)

      const res = await fetch('/api/gigs/scan-schedule', {
        method: 'POST',
        body: formDataUpload,
      })

      if (!res.ok) {
        throw new Error('Scan failed')
      }

      const result = await res.json()

      // Set dates from scan result
      if (result.dates) {
        const dates = Object.keys(result.dates)
          .sort()
          .map(d => new Date(d + 'T12:00:00'))
        setSelectedDates(dates)
      }

      // Set schedule texts
      if (result.scheduleTexts) {
        setScheduleTexts(result.scheduleTexts)
      }

      // Pre-fill project name and venue if empty
      if (result.projectName && !formData.project_name) {
        setFormData(f => ({ ...f, project_name: result.projectName }))
      }
      if (result.venue && !formData.venue) {
        setFormData(f => ({ ...f, venue: result.venue }))
      }

      setScheduleFile(file)
      toast.success(tToast('scheduleScanned') || 'Schema importerat')
    } catch (err) {
      console.error('Schedule scan error:', err)
      toast.error(tToast('scheduleScanError') || 'Kunde inte läsa schemat')
    } finally {
      setScanningSchedule(false)
      // Reset file input
      if (scheduleFileRef.current) {
        scheduleFileRef.current.value = ''
      }
    }
  }

  const statusOptions = [
    { value: 'tentative', label: tStatus('tentative') },
    { value: 'pending', label: tStatus('pending') },
    { value: 'accepted', label: tStatus('accepted') },
    { value: 'declined', label: tStatus('declined') },
    { value: 'completed', label: tStatus('completed') },
    { value: 'invoiced', label: tStatus('invoiced') },
    { value: 'paid', label: tStatus('paid') },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto p-0 gap-0 w-[calc(100vw-2rem)] md:max-w-5xl" style={{ maxWidth: 1100 }}>
        <form onSubmit={handleSubmit}>
          {/* Header — spans full width */}
          <div className="px-8 pt-7 pb-2">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                {isEditing ? t('editGig') : t('newGig')}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {isEditing ? t('editGigDescription') : t('createGigDescription')}
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Main layout: form fields left, calendar right */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_380px]">

            {/* LEFT — Form fields */}
            <div>
              {/* Grupp 1: Vem & Vad */}
              <div className="px-8 py-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {t('client')} {['completed', 'invoiced', 'paid'].includes(formData.status) && <span className="text-destructive">*</span>}
                  </Label>
                  <Select
                    value={formData.client_id || 'none'}
                    onValueChange={(value) =>
                      setFormData({ ...formData, client_id: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('selectClient')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('noClient')}</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      {t('type')} <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.gig_type_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, gig_type_id: value })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('selectType')} />
                      </SelectTrigger>
                      <SelectContent>
                        {gigTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name} ({type.vat_rate}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {positions.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t('position')}</Label>
                      <Select
                        value={formData.position_id}
                        onValueChange={(value) =>
                          setFormData({ ...formData, position_id: value })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t('selectPosition')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t('none')}</SelectItem>
                          {positions.map((pos) => (
                            <SelectItem key={pos.id} value={pos.id}>
                              {pos.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {/* Grupp 2: Var */}
              <div className="px-8 py-6 border-t border-gray-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t('projectName')}</Label>
                    <Input
                      placeholder={t('projectNamePlaceholder')}
                      value={formData.project_name}
                      onChange={(e) =>
                        setFormData({ ...formData, project_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t('venue')}</Label>
                    <Input
                      placeholder={t('venuePlaceholder')}
                      value={formData.venue}
                      onChange={(e) =>
                        setFormData({ ...formData, venue: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Grupp 3: Ekonomi & Status */}
              <div className="px-8 py-6 border-t border-gray-100 space-y-4">
                <div className="grid grid-cols-[1fr_auto] gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t('fee')}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={formData.fee}
                      onChange={(e) =>
                        setFormData({ ...formData, fee: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t('currency')}</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) =>
                        setFormData({ ...formData, currency: value })
                      }
                    >
                      <SelectTrigger className="w-[90px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPORTED_CURRENCIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t('status')}</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {(formData.status === 'pending' || formData.status === 'tentative') && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t('responseDeadline')}</Label>
                      <Input
                        type="date"
                        value={formData.response_deadline}
                        onChange={(e) =>
                          setFormData({ ...formData, response_deadline: e.target.value })
                        }
                      />
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* RIGHT — Calendar (always visible) */}
            <div className="border-t md:border-t-0 md:border-l border-blue-100 bg-blue-50/40 p-6 flex flex-col">
              <MultiDayDatePicker
                selectedDates={selectedDates}
                onDatesChange={setSelectedDates}
                disabled={loading || scanningSchedule}
                scheduleTexts={scheduleTexts}
                onScheduleTextsChange={setScheduleTexts}
                onScanSchedule={handleScanSchedule}
              />
              {/* Hidden file input for schedule scan */}
              <input
                ref={scheduleFileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.gif"
                className="hidden"
                onChange={handleScheduleFileSelected}
              />
            </div>
          </div>

          {/* Anteckningar — full width, two columns */}
          <div className="px-8 py-4 border-t border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('notes')}</Label>
                <Textarea
                  placeholder={t('notesPlaceholder')}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={2}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('invoiceNotes')}</Label>
                <Textarea
                  placeholder={t('invoiceNotesPlaceholder')}
                  value={formData.invoice_notes}
                  onChange={(e) =>
                    setFormData({ ...formData, invoice_notes: e.target.value })
                  }
                  rows={2}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {t('invoiceNotesHint')}
                </p>
              </div>
            </div>
          </div>

          {/* Kvitton & Bilagor — full width, edit only */}
          {isEditing && (
            <div className="px-8 py-6 border-t border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <GigReceipts
                  gigId={gig.id}
                  gigTitle={formData.project_name || gig.gig_type?.name}
                  disabled={loading}
                />
                <GigAttachments gigId={gig.id} disabled={loading} />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-8 py-5 border-t flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? t('saveChanges') : t('createGig')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
