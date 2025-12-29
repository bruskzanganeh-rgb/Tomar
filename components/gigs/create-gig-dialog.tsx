"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createGigSchema, type CreateGigFormData } from '@/lib/schemas/gig'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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

  const supabase = createClient()

  const form = useForm<CreateGigFormData>({
    resolver: zodResolver(createGigSchema),
    defaultValues: {
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
      response_deadline: '',
    },
  })

  const watchStatus = form.watch('status')

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

  async function onSubmit(data: CreateGigFormData) {
    if (selectedDates.length === 0) {
      toast.warning('Välj minst ett datum')
      return
    }

    setLoading(true)

    // Use first date for the main date field (with time)
    const primaryDate = selectedDates[0]
    const dateTime = `${format(primaryDate, 'yyyy-MM-dd')}T${data.time}:00`

    // Calculate start and end dates
    const startDate = format(selectedDates[0], 'yyyy-MM-dd')
    const endDate = format(selectedDates[selectedDates.length - 1], 'yyyy-MM-dd')

    // Create gig
    const { data: gig, error } = await supabase.from('gigs').insert([
      {
        client_id: data.client_id && data.client_id !== 'none' ? data.client_id : null,
        gig_type_id: data.gig_type_id,
        position_id: data.position_id && data.position_id !== 'none' ? data.position_id : null,
        date: dateTime,
        start_date: startDate,
        end_date: endDate,
        total_days: selectedDates.length,
        venue: data.venue || null,
        fee: data.fee ? parseFloat(data.fee) : null,
        travel_expense: data.travel_expense ? parseFloat(data.travel_expense) : null,
        project_name: data.project_name || null,
        notes: data.notes || null,
        status: data.status,
        response_deadline: data.response_deadline || null,
      },
    ]).select().single()

    if (error?.message || !gig) {
      setLoading(false)
      console.error('Error creating gig:', error)
      toast.error('Kunde inte skapa uppdrag: ' + (error?.message || 'Okänt fel'))
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
    }

    setLoading(false)
    setSelectedDates([])
    form.reset()
    onSuccess()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Nytt uppdrag</DialogTitle>
              <DialogDescription>
                Registrera ett nytt gig eller uppdrag
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Uppdragsgivare {watchStatus !== 'tentative' && <span className="text-destructive">*</span>}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Välj uppdragsgivare" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Ingen uppdragsgivare än</SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {watchStatus === 'tentative' && (
                      <p className="text-xs text-muted-foreground">Valfritt för ej bekräftade uppdrag</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gig_type_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Typ av uppdrag <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Välj typ" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {gigTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name} ({type.vat_rate}% moms)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {positions.length > 0 && (
                <FormField
                  control={form.control}
                  name="position_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position (valfritt)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Välj position" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Ingen position</SelectItem>
                          {positions.map((pos) => (
                            <SelectItem key={pos.id} value={pos.id}>
                              {pos.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="space-y-4">
                <MultiDayDatePicker
                  selectedDates={selectedDates}
                  onDatesChange={setSelectedDates}
                  disabled={loading}
                />

                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tid (första dagen)</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="venue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plats</FormLabel>
                    <FormControl>
                      <Input placeholder="T.ex. Konserthuset, Stockholm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="project_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Projektnamn</FormLabel>
                    <FormControl>
                      <Input placeholder="T.ex. Julkonsert 2025" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Arvode (kr)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" placeholder="Ej angivet" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="travel_expense"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reseersättning (kr)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="tentative">Ej bekräftat</SelectItem>
                          <SelectItem value="pending">Väntar på svar</SelectItem>
                          <SelectItem value="accepted">Accepterat</SelectItem>
                          <SelectItem value="declined">Avböjt</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(watchStatus === 'pending' || watchStatus === 'tentative') && (
                  <FormField
                    control={form.control}
                    name="response_deadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Svara senast</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">När behöver orkestern svar?</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anteckningar</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="T.ex. Extra repetition kl 14, sololåt"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
        </Form>
      </DialogContent>
    </Dialog>
  )
}
