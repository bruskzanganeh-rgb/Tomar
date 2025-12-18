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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { MultiDayDatePicker } from '@/components/ui/multi-day-date-picker'
import { format } from 'date-fns'

type CreateGigDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

type Client = { id: string; name: string }
type GigType = { id: string; name: string; vat_rate: number }
type Position = { id: string; name: string }

export function CreateGigDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateGigDialogProps) {
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
    venue: '',
    fee: '',
    travel_expense: '',
    project_name: '',
    notes: '',
    status: 'pending',
  })

  const supabase = createClient()

  useEffect(() => {
    if (open) {
      loadClients()
      loadGigTypes()
      loadPositions()
    }
  }, [open])

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

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

    // Use first date for the main date field (with time)
    const primaryDate = selectedDates[0]
    const dateTime = `${format(primaryDate, 'yyyy-MM-dd')}T${formData.time}:00`

    // Calculate start and end dates
    const startDate = format(selectedDates[0], 'yyyy-MM-dd')
    const endDate = format(selectedDates[selectedDates.length - 1], 'yyyy-MM-dd')

    // Create gig
    const { data: gig, error } = await supabase.from('gigs').insert([
      {
        client_id: formData.client_id && formData.client_id !== 'none' ? formData.client_id : null,
        gig_type_id: formData.gig_type_id,
        position_id: formData.position_id && formData.position_id !== 'none' ? formData.position_id : null,
        date: dateTime,
        start_date: startDate,
        end_date: endDate,
        total_days: selectedDates.length,
        venue: formData.venue || null,
        fee: formData.fee ? parseFloat(formData.fee) : null,
        travel_expense: formData.travel_expense ? parseFloat(formData.travel_expense) : null,
        project_name: formData.project_name || null,
        notes: formData.notes || null,
        status: formData.status,
      },
    ]).select().single()

    if (error?.message || !gig) {
      setLoading(false)
      console.error('Error creating gig:', error)
      alert('Kunde inte skapa uppdrag: ' + (error?.message || 'Okänt fel'))
      return
    }

    // Insert gig_dates
    const gigDates = selectedDates.map(date => ({
      gig_id: gig.id,
      date: format(date, 'yyyy-MM-dd'),
    }))

    const { error: datesError } = await supabase.from('gig_dates').insert(gigDates)

    if (datesError) {
      console.error('Error creating gig dates:', datesError)
      // Gig was created but dates failed - still considered partial success
    }

    setLoading(false)
    setSelectedDates([])
    setFormData({
      client_id: '',
      gig_type_id: '',
      position_id: '',
      time: '19:00',
      venue: '',
      fee: '',
      travel_expense: '',
      project_name: '',
      notes: '',
      status: 'pending',
    })
    onSuccess()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nytt uppdrag</DialogTitle>
            <DialogDescription>
              Registrera ett nytt gig eller uppdrag
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="client_id">
                Uppdragsgivare {formData.status !== 'tentative' && <span className="text-destructive">*</span>}
              </Label>
              <Select
                value={formData.client_id}
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

            <div className="grid gap-2">
              <Label htmlFor="gig_type_id">
                Typ av uppdrag <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.gig_type_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, gig_type_id: value })
                }
                required
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

            {positions.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="position_id">Position (valfritt)</Label>
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

            <div className="space-y-4">
              <MultiDayDatePicker
                selectedDates={selectedDates}
                onDatesChange={setSelectedDates}
                disabled={loading}
              />

              <div className="grid gap-2">
                <Label htmlFor="time">Tid (första dagen)</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) =>
                    setFormData({ ...formData, time: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="venue">Plats</Label>
              <Input
                id="venue"
                placeholder="T.ex. Konserthuset, Stockholm"
                value={formData.venue}
                onChange={(e) =>
                  setFormData({ ...formData, venue: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="project_name">Projektnamn</Label>
              <Input
                id="project_name"
                placeholder="T.ex. Julkonsert 2025"
                value={formData.project_name}
                onChange={(e) =>
                  setFormData({ ...formData, project_name: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fee">Arvode (kr)</Label>
                <Input
                  id="fee"
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
                <Label htmlFor="travel_expense">Reseersättning (kr)</Label>
                <Input
                  id="travel_expense"
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

            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
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
                  <SelectItem value="tentative">Ej bekräftat</SelectItem>
                  <SelectItem value="pending">Väntar på svar</SelectItem>
                  <SelectItem value="accepted">Accepterat</SelectItem>
                  <SelectItem value="declined">Avböjt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Anteckningar</Label>
              <Textarea
                id="notes"
                placeholder="T.ex. Extra repetition kl 14, sololåt"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
              />
            </div>
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
              Skapa uppdrag
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
