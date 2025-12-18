"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, FileText, Download, Mail, Check, Trash2 } from 'lucide-react'
import { CreateInvoiceDialog } from '@/components/invoices/create-invoice-dialog'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'

type Invoice = {
  id: string
  invoice_number: number
  invoice_date: string
  due_date: string
  paid_date: string | null
  total: number
  vat_rate: number
  status: string
  gig_id: string | null
  client: { name: string }
}

const statusConfig = {
  draft: { label: 'Utkast', color: 'bg-gray-100 text-gray-800' },
  sent: { label: 'Skickad', color: 'bg-blue-100 text-blue-800' },
  paid: { label: 'Betald', color: 'bg-green-100 text-green-800' },
  overdue: { label: 'Försenad', color: 'bg-red-100 text-red-800' },
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadInvoices()
  }, [])

  async function updateOverdueInvoices() {
    const today = new Date().toISOString().split('T')[0]

    // Uppdatera fakturor som har passerat förfallodatum
    await supabase
      .from('invoices')
      .update({ status: 'overdue' })
      .eq('status', 'sent')
      .lt('due_date', today)
  }

  async function loadInvoices() {
    setLoading(true)

    // Uppdatera förfallna fakturor först
    await updateOverdueInvoices()

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        client:clients(name)
      `)
      .order('invoice_number', { ascending: false })

    if (error) {
      console.error('Error loading invoices:', error)
    } else {
      setInvoices(data || [])
    }
    setLoading(false)
  }

  async function markAsPaid(id: string) {
    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', id)

    if (error) {
      console.error('Error marking as paid:', error)
      alert('Kunde inte uppdatera status')
    } else {
      loadInvoices()
    }
  }

  async function deleteInvoice(invoice: Invoice) {
    if (!confirm(`Är du säker på att du vill ta bort faktura #${invoice.invoice_number}?\n\nDetta går inte att ångra.`)) {
      return
    }

    // First delete invoice_lines (cascade should handle this, but let's be explicit)
    await supabase
      .from('invoice_lines')
      .delete()
      .eq('invoice_id', invoice.id)

    // Delete the invoice
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoice.id)

    if (error) {
      console.error('Error deleting invoice:', error)
      alert('Kunde inte ta bort faktura: ' + error.message)
    } else {
      // Revert gig status back to 'completed' if invoice was linked to a gig
      if (invoice.gig_id) {
        await supabase
          .from('gigs')
          .update({ status: 'completed' })
          .eq('id', invoice.gig_id)
      }
      loadInvoices()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fakturor</h1>
          <p className="text-muted-foreground">
            Hantera dina utgående fakturor
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Ny faktura
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Totalt fakturerat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices
                .filter((i) => i.status !== 'draft')
                .reduce((sum, i) => sum + i.total, 0)
                .toLocaleString('sv-SE')}{' '}
              kr
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Obetalda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices
                .filter((i) => i.status === 'sent' || i.status === 'overdue')
                .reduce((sum, i) => sum + i.total, 0)
                .toLocaleString('sv-SE')}{' '}
              kr
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Betalda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices
                .filter((i) => i.status === 'paid')
                .reduce((sum, i) => sum + i.total, 0)
                .toLocaleString('sv-SE')}{' '}
              kr
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Antal fakturor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Alla fakturor ({invoices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Laddar...
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Inga fakturor än</p>
              <p className="text-sm">Klicka på "Ny faktura" för att skapa en</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fakturanr</TableHead>
                  <TableHead>Kund</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Förfallodatum</TableHead>
                  <TableHead>Belopp</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Åtgärder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      #{invoice.invoice_number}
                    </TableCell>
                    <TableCell>{invoice.client.name}</TableCell>
                    <TableCell>
                      {format(new Date(invoice.invoice_date), 'PPP', {
                        locale: sv,
                      })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(invoice.due_date), 'PPP', { locale: sv })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {invoice.total.toLocaleString('sv-SE')} kr
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          statusConfig[
                            invoice.status as keyof typeof statusConfig
                          ]?.color
                        }
                      >
                        {
                          statusConfig[
                            invoice.status as keyof typeof statusConfig
                          ]?.label
                        }
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {invoice.status !== 'paid' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsPaid(invoice.id)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Markera betald
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            window.open(`/api/invoices/${invoice.id}/pdf`, '_blank')
                          }}
                          title="Ladda ner PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            alert('Email-funktionen kommer snart!')
                          }}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteInvoice(invoice)}
                          title="Ta bort faktura"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateInvoiceDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={loadInvoices}
      />
    </div>
  )
}
