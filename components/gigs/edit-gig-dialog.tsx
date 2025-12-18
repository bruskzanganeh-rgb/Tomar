"use client"

import { useState, useEffect } from 'react'
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
import { Loader2 } from 'lucide-react'
import { GigAttachments } from './gig-attachments'
import { MultiDayDatePicker } from '@/components/ui/multi-day-date-picker'
import { format } from 'date-fns'

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
  client_id: string
  gig_type_id: string
  position_id?: string | null
  client: { name: string }
  gig_type: { name: string }
}

type Client = { id: string; name: string }
type GigType = { id: string; name: string; vat_rate: number }
type Position = { id: string; name: string }

type EditGigDialogProps = {
  gig: Gig | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditGigDialog({
  gig,
  open,
  onOpenChange,
  onSuccess,
}: EditGigDialogProps) {
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [gigTypes, setGigTypes] = useState<GigType[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [formData, setFormData] = useState({
    client_id: '',
    gig_type_id: '',
    position_id: '',
    time: '19:00',
    fee: '',
    travel_expense: '',
    venue: '',
    project_name: '',
    notes: '',
    status: 'pending',
  })

  const supabase = createClient()

  // Load clients, gig types and positions when dialog opens
  useEffect(() => {
    if (open) {
      loadClients()
      loadGigTypes()
      loadPositions()
    }
  }, [open])

  // Populate form when gig changes
  useEffect(() => {
    if (gig && open) {
      // Extract time from date
      const gigDate = new Date(gig.date)
      const time = `${gigDate.getHours().toString().padStart(2, '0')}:${gigDate.getMinutes().toString().padStart(2, '0')}`

      setFormData({
        client_id: gig.client_id || '',
        gig_type_id: gig.gig_type_id || '',
        position_id: gig.position_id || '',
        time: time,
        fee: gig.fee?.toString() || '',
        travel_expense: gig.travel_expense?.toString() || '',
        venue: gig.venue || '',
        project_name: gig.project_name || '',
        notes: gig.notes || '',
        status: gig.status || 'pending',
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

  async function loadGigDates(gigId: string) {
    const { data } = await supabase
      .from('gig_dates')
      .select('date')
      .eq('gig_id', gigId)
      .order('date')

    if (data && data.length > 0) {
      const dates = data.map(d => new Date(d.date + 'T12:00:00'))
      setSelectedDates(dates)
    } else {
      // Fallback to start_date if no gig_dates
      if (gig?.start_date) {
        setSelectedDates([new Date(gig.start_date + 'T12:00:00')])
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!gig) return

    if (selectedDates.length === 0) {
      alert('Välj minst ett datum')
      return
    }

    // Kräv uppdragsgivare om inte tentative
    if (formData.status !== 'tentative' && (!formData.client_id || formData.client_id === 'none')) {
      alert('Välj en uppdragsgivare (krävs för alla statusar utom "Ej bekräftat")')
      return
    }

    setLoading(true)

    // Sort dates
    const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime())

    // Use first date for the main date field (with time)
    const primaryDate = sortedDates[0]
    const dateTime = `${format(primaryDate, 'yyyy-MM-dd')}T${formData.time}:00`

    // Calculate start and end dates
    const startDate = format(sortedDates[0], 'yyyy-MM-dd')
    const endDate = format(sortedDates[sortedDates.length - 1], 'yyyy-MM-dd')

    // Update gig
    const { error } = await supabase
      .from('gigs')
      .update({
        client_id: formData.client_id && formData.client_id !== 'none' ? formData.client_id : null,
        gig_type_id: formData.gig_type_id,
        position_id: formData.position_id && formData.position_id !== 'none' ? formData.position_id : null,
        date: dateTime,
        start_date: startDate,
        end_date: endDate,
        total_days: sortedDates.length,
        fee: formData.fee ? parseFloat(formData.fee) : null,
        travel_expense: formData.travel_expense ? parseFloat(formData.travel_expense) : null,
        venue: formData.venue || null,
        project_name: formData.project_name || null,
        notes: formData.notes || null,
        status: formData.status,
      })
      .eq('id', gig.id)

    if (error) {
      setLoading(false)
      console.error('Error updating gig:', error)
      alert('Kunde inte uppdatera uppdrag: ' + error.message)
      return
    }

    // Delete old gig_dates and insert new ones
    await supabase.from('gig_dates').delete().eq('gig_id', gig.id)

    const gigDates = sortedDates.map(date => ({
      gig_id: gig.id,
      date: format(date, 'yyyy-MM-dd'),
    }))

    const { error: datesError } = await supabase.from('gig_dates').insert(gigDates)

    if (datesError) {
      console.error('Error updating gig dates:', datesError)
    }

    setLoading(false)
    onSuccess()
    onOpenChange(false)
  }

  const statusOptions = [
    { value: 'tentative', label: 'Ej bekräftat' },
    { value: 'pending', label: 'Väntar på svar' },
    { value: 'accepted', label: 'Accepterat' },
    { value: 'declined', label: 'Avböjt' },
    { value: 'completed', label: 'Genomfört' },
    { value: 'invoiced', label: 'Fakturerat' },
    { value: 'paid', label: 'Betalt' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Redigera uppdrag</DialogTitle>
            <DialogDescription>
              Ändra information för detta uppdrag
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Client selector */}
            <div className="grid gap-2">
              <Label htmlFor="edit-client_id">
                Uppdragsgivare {formData.status !== 'tentative' && <span className="text-destructive">*</span>}
              </Label>
              <Select
                value={formData.client_id || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, client_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj uppdragsgivare" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ingen uppdragsgivare än</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.status === 'tentative' && (
                <p className="text-xs text-muted-foreground">Valfritt för ej bekräftade uppdrag</p>
              )}
            </div>

            {/* Gig type selector */}
            <div className="grid gap-2">
              <Label htmlFor="edit-gig_type_id">
                Typ av uppdrag <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.gig_type_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, gig_type_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj typ" />
                </SelectTrigger>
                <SelectContent>
                  {gigTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name} ({type.vat_rate}% moms)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Position selector */}
            {positions.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="edit-position_id">Position (valfritt)</Label>
                <Select
                  value={formData.position_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, position_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Välj position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ingen position</SelectItem>
                    {positions.map((pos) => (
                      <SelectItem key={pos.id} value={pos.id}>
                        {pos.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date picker */}
            <div className="space-y-4">
              <MultiDayDatePicker
                selectedDates={selectedDates}
                onDatesChange={setSelectedDates}
                disabled={loading}
              />

              <div className="grid gap-2">
                <Label htmlFor="edit-time">Tid (första dagen)</Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={formData.time}
                  onChange={(e) =>
                    setFormData({ ...formData, time: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Venue */}
            <div className="grid gap-2">
              <Label htmlFor="edit-venue">Plats</Label>
              <Input
                id="edit-venue"
                placeholder="T.ex. Konserthuset, Stockholm"
                value={formData.venue}
                onChange={(e) =>
                  setFormData({ ...formData, venue: e.target.value })
                }
              />
            </div>

            {/* Project name */}
            <div className="grid gap-2">
              <Label htmlFor="edit-project_name">Projektnamn</Label>
              <Input
                id="edit-project_name"
                placeholder="T.ex. Julkonsert 2025"
                value={formData.project_name}
                onChange={(e) =>
                  setFormData({ ...formData, project_name: e.target.value })
                }
              />
            </div>

            {/* Fee and travel expense */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-fee">Arvode (kr)</Label>
                <Input
                  id="edit-fee"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ej angivet"
                  value={formData.fee}
                  onChange={(e) =>
                    setFormData({ ...formData, fee: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-travel_expense">Reseersättning (kr)</Label>
                <Input
                  id="edit-travel_expense"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={formData.travel_expense}
                  onChange={(e) =>
                    setFormData({ ...formData, travel_expense: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Status */}
            <div className="grid gap-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
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

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Anteckningar</Label>
              <Textarea
                id="edit-notes"
                placeholder="T.ex. Extra repetition, sololåt"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
              />
            </div>

            {/* Attachments */}
            {gig && (
              <div className="border-t pt-4">
                <GigAttachments gigId={gig.id} disabled={loading} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Spara ändringar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
