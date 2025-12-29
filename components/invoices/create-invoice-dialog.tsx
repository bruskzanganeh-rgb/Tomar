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
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

type InitialGig = {
  id: string
  fee: number
  travel_expense: number | null
  date: string
  start_date: string | null
  end_date: string | null
  total_days: number
  project_name: string | null
  client_id: string
  client_name: string
  gig_type_name: string
  gig_type_vat_rate: number
  client_payment_terms: number
}

type CreateInvoiceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  initialGig?: InitialGig
}

type Client = { id: string; name: string; payment_terms: number }
type Gig = { id: string; date: string; fee: number | null; travel_expense: number | null; client: { name: string }; gig_type: { vat_rate: number } }
type GigType = { id: string; name: string; vat_rate: number }

type InvoiceLine = {
  description: string
  amount: string
  is_vat_exempt: boolean
}

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  onSuccess,
  initialGig,
}: CreateInvoiceDialogProps) {
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [completedGigs, setCompletedGigs] = useState<Gig[]>([])
  const [gigTypes, setGigTypes] = useState<GigType[]>([])
  const [selectedVatRate, setSelectedVatRate] = useState<number>(25)
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState<number>(46)
  const [formData, setFormData] = useState({
    client_id: '',
    gig_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    payment_terms: '30',
  })
  const [lines, setLines] = useState<InvoiceLine[]>([
    { description: '', amount: '', is_vat_exempt: false },
  ])

  const supabase = createClient()

  useEffect(() => {
    if (open) {
      loadClients()
      loadCompletedGigs()
      loadGigTypes()
      loadNextInvoiceNumber()
    }
  }, [open])

  // Auto-populate form when initialGig is provided
  useEffect(() => {
    if (open && initialGig) {
      // Set form data
      setFormData({
        client_id: initialGig.client_id,
        gig_id: initialGig.id,
        invoice_date: new Date().toISOString().split('T')[0],
        payment_terms: initialGig.client_payment_terms.toString(),
      })
      // Set VAT rate from gig type
      setSelectedVatRate(initialGig.gig_type_vat_rate)

      // Format date for description based on single vs multi-day
      let dateDescription: string
      if (initialGig.total_days && initialGig.total_days > 1 && initialGig.start_date && initialGig.end_date) {
        const startFormatted = new Date(initialGig.start_date).toLocaleDateString('sv-SE')
        const endFormatted = new Date(initialGig.end_date).toLocaleDateString('sv-SE')
        dateDescription = `${startFormatted} - ${endFormatted} (${initialGig.total_days} dagar)`
      } else {
        dateDescription = new Date(initialGig.date).toLocaleDateString('sv-SE')
      }

      // Create invoice lines
      const newLines: InvoiceLine[] = [
        {
          description: initialGig.project_name
            ? `${initialGig.gig_type_name} - ${initialGig.project_name} - ${dateDescription}`
            : `${initialGig.gig_type_name} - ${dateDescription}`,
          amount: initialGig.fee.toString(),
          is_vat_exempt: false,
        },
      ]

      // Add travel expense if present
      if (initialGig.travel_expense && initialGig.travel_expense > 0) {
        newLines.push({
          description: 'Reseersättning',
          amount: initialGig.travel_expense.toString(),
          is_vat_exempt: true,
        })
      }

      setLines(newLines)
    }
  }, [open, initialGig])

  async function loadClients() {
    const { data } = await supabase
      .from('clients')
      .select('id, name, payment_terms')
      .order('name')
    setClients(data || [])
  }

  async function loadCompletedGigs() {
    const { data } = await supabase
      .from('gigs')
      .select(`
        id,
        date,
        fee,
        travel_expense,
        client:clients(name),
        gig_type:gig_types(vat_rate)
      `)
      .in('status', ['accepted', 'completed'])
      .order('date', { ascending: false })
    setCompletedGigs((data || []) as unknown as Gig[])
  }

  async function loadGigTypes() {
    const { data } = await supabase
      .from('gig_types')
      .select('id, name, vat_rate')
      .order('name')
    setGigTypes(data || [])
  }

  async function loadNextInvoiceNumber() {
    // Get all existing invoice numbers to find gaps
    const { data: invoices } = await supabase
      .from('invoices')
      .select('invoice_number')
      .order('invoice_number', { ascending: true })

    // Get the starting number from company settings
    const { data: settings } = await supabase
      .from('company_settings')
      .select('next_invoice_number')
      .single()

    const startingNumber = settings?.next_invoice_number || 1
    const existingNumbers = new Set((invoices || []).map(i => i.invoice_number))

    // Find the lowest available number (either a gap or the next in sequence)
    let nextNumber = startingNumber

    // Check if there are any gaps below the current "next" number
    for (let i = 1; i < startingNumber; i++) {
      if (!existingNumbers.has(i)) {
        nextNumber = i
        break
      }
    }

    // If no gap found, find the first available number from startingNumber onwards
    if (nextNumber === startingNumber) {
      while (existingNumbers.has(nextNumber)) {
        nextNumber++
      }
    }

    setNextInvoiceNumber(nextNumber)
  }

  function addLine() {
    setLines([...lines, { description: '', amount: '', is_vat_exempt: false }])
  }

  function removeLine(index: number) {
    setLines(lines.filter((_, i) => i !== index))
  }

  function updateLine(index: number, field: keyof InvoiceLine, value: string | boolean) {
    const newLines = [...lines]
    newLines[index] = { ...newLines[index], [field]: value }
    setLines(newLines)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    // Calculate totals - only VAT-able lines
    const vatableSubtotal = lines
      .filter(line => !line.is_vat_exempt)
      .reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0)
    const subtotal = lines.reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0)

    // Use selected VAT rate
    const vatRate = selectedVatRate

    // VAT only applies to non-exempt lines
    const vatAmount = vatableSubtotal * (vatRate / 100)
    const total = subtotal + vatAmount

    // Calculate due date
    const dueDate = new Date(formData.invoice_date)
    dueDate.setDate(dueDate.getDate() + parseInt(formData.payment_terms))

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert([
        {
          client_id: formData.client_id,
          gig_id: formData.gig_id || null,
          invoice_number: nextInvoiceNumber,
          invoice_date: formData.invoice_date,
          due_date: dueDate.toISOString().split('T')[0],
          subtotal,
          vat_rate: vatRate,
          vat_amount: vatAmount,
          total,
          status: 'draft',
        },
      ])
      .select()
      .single()

    if (invoiceError) {
      console.error('Error creating invoice:', invoiceError)
      toast.error('Kunde inte skapa faktura: ' + invoiceError.message)
      setLoading(false)
      return
    }

    // Create invoice lines
    const linesData = lines.map((line, index) => ({
      invoice_id: invoice.id,
      description: line.description,
      amount: parseFloat(line.amount),
      is_vat_exempt: line.is_vat_exempt,
      sort_order: index,
    }))

    const { error: linesError } = await supabase
      .from('invoice_lines')
      .insert(linesData)

    if (linesError) {
      console.error('Error creating invoice lines:', linesError)
      toast.error('Kunde inte skapa fakturarader: ' + linesError.message)
      setLoading(false)
      return
    }

    // Update next invoice number only if we used the highest number
    const { data: settings } = await supabase
      .from('company_settings')
      .select('id, next_invoice_number')
      .single()

    if (settings && nextInvoiceNumber >= settings.next_invoice_number) {
      await supabase
        .from('company_settings')
        .update({ next_invoice_number: nextInvoiceNumber + 1 })
        .eq('id', settings.id)
    }

    // Update gig status if gig was selected
    if (formData.gig_id) {
      await supabase
        .from('gigs')
        .update({ status: 'invoiced' })
        .eq('id', formData.gig_id)
    }

    setLoading(false)
    setFormData({
      client_id: '',
      gig_id: '',
      invoice_date: new Date().toISOString().split('T')[0],
      payment_terms: '30',
    })
    setSelectedVatRate(25)
    setLines([{ description: '', amount: '', is_vat_exempt: false }])
    onSuccess()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Ny faktura</DialogTitle>
            <DialogDescription>
              Fakturanummer: #{nextInvoiceNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="client_id">
                Kund <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => {
                  const client = clients.find(c => c.id === value)
                  setFormData({
                    ...formData,
                    client_id: value,
                    payment_terms: client?.payment_terms.toString() || '30',
                  })
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj kund" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="gig_id">Koppla till uppdrag (valfritt)</Label>
              <Select
                value={formData.gig_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, gig_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj uppdrag" />
                </SelectTrigger>
                <SelectContent>
                  {completedGigs.map((gig) => (
                    <SelectItem key={gig.id} value={gig.id}>
                      {gig.client.name} - {new Date(gig.date).toLocaleDateString('sv-SE')} ({gig.fee !== null ? `${gig.fee.toLocaleString('sv-SE')} kr` : 'Ej angivet'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="invoice_date">Fakturadatum</Label>
                <Input
                  id="invoice_date"
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) =>
                    setFormData({ ...formData, invoice_date: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="payment_terms">Betalningsvillkor (dagar)</Label>
                <Input
                  id="payment_terms"
                  type="number"
                  min="1"
                  value={formData.payment_terms}
                  onChange={(e) =>
                    setFormData({ ...formData, payment_terms: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Uppdragstyp (moms)</Label>
              <Select
                value={selectedVatRate.toString()}
                onValueChange={(value) => setSelectedVatRate(parseFloat(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj momssats" />
                </SelectTrigger>
                <SelectContent>
                  {gigTypes.map((type) => (
                    <SelectItem key={type.id} value={type.vat_rate.toString()}>
                      {type.name} ({type.vat_rate}% moms)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <Label>Fakturarader</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="h-4 w-4 mr-1" />
                  Lägg till rad
                </Button>
              </div>

              <div className="space-y-2">
                {lines.map((line, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <div className="flex-1">
                      <Input
                        placeholder="Beskrivning"
                        value={line.description}
                        onChange={(e) =>
                          updateLine(index, 'description', e.target.value)
                        }
                        required
                      />
                    </div>
                    <div className="w-28">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Belopp"
                        value={line.amount}
                        onChange={(e) =>
                          updateLine(index, 'amount', e.target.value)
                        }
                        required
                      />
                    </div>
                    <div className="flex items-center gap-1.5 min-w-[80px]">
                      <Checkbox
                        id={`vat-exempt-${index}`}
                        checked={line.is_vat_exempt}
                        onCheckedChange={(checked) => updateLine(index, 'is_vat_exempt', !!checked)}
                      />
                      <label htmlFor={`vat-exempt-${index}`} className="text-xs text-muted-foreground cursor-pointer">
                        Momsfri
                      </label>
                    </div>
                    {lines.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLine(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
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
              Skapa faktura
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
